import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestApplicationOptions } from '@nestjs/common/interfaces/nest-application-options.interface';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import express, { json, urlencoded } from 'express';
import * as http from 'node:http';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger/winston.logger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import {
  isCloudRunLike,
  isDevelopmentNodeEnv,
  normalizeBrowserOrigin,
} from './common/utils/node-env';

/** Puerto HTTP: Cloud Run inyecta PORT; si viene vacío o inválido, no usar 4100 en Cloud Run (enrutamiento fallaría). */
function resolveListenPort(): number {
  const raw = process.env.PORT;
  const parsed =
    raw !== undefined && String(raw).trim() !== '' ? Number.parseInt(String(raw), 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  if (isCloudRunLike()) {
    return 8080;
  }
  return 4100;
}

/**
 * Cloud Run exige que el proceso abra PORT antes del timeout; NestFactory.create(AppModule)
 * puede tardar mucho. Enlazamos TCP con el mismo Express + http.Server que usará Nest,
 * y hacemos que ExpressAdapter reutilice ese server (evita EADDRINUSE por un segundo listen).
 */
function listenAsync(server: http.Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onErr = (e: Error) => reject(e);
    server.once('error', onErr);
    server.listen(port, host, () => {
      server.removeListener('error', onErr);
      resolve();
    });
  });
}

function installExpressAdapterReusePreboundServer(sharedServer: http.Server): () => void {
  const proto = ExpressAdapter.prototype as unknown as {
    initHttpServer: (options?: Record<string, unknown>) => void;
    listen: (port: number, ...args: unknown[]) => unknown;
  };
  const origInit = proto.initHttpServer;
  const origListen = proto.listen;
  proto.initHttpServer = function (this: ExpressAdapter, options?: Record<string, unknown>) {
    (this as unknown as { httpServer: http.Server }).httpServer = sharedServer;
    const track = (this as unknown as { trackOpenConnections?: () => void }).trackOpenConnections;
    if (options?.forceCloseConnections && typeof track === 'function') {
      track.call(this);
    }
  };
  proto.listen = function (this: ExpressAdapter, port: number, ...args: unknown[]) {
    const httpServer = (this as unknown as { httpServer?: http.Server }).httpServer;
    if (httpServer?.listening) {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') {
        (cb as () => void)();
      }
      return httpServer;
    }
    return origListen.apply(this, [port, ...args] as never) as http.Server;
  };
  return () => {
    proto.initHttpServer = origInit;
    proto.listen = origListen;
  };
}

async function bootstrap() {
  const port = resolveListenPort();
  let restoreExpressAdapter: (() => void) | undefined;

  let expressApp: express.Express | undefined;
  if (isCloudRunLike()) {
    expressApp = express();
    const earlyServer = http.createServer(expressApp);
    console.log(
      JSON.stringify({
        severity: 'INFO',
        message: 'Cloud Run early TCP bind (before NestFactory.create)',
        port,
        host: '0.0.0.0',
        kService: process.env.K_SERVICE ?? null,
        kRevision: process.env.K_REVISION ?? null,
      }),
    );
    await listenAsync(earlyServer, port, '0.0.0.0');
    restoreExpressAdapter = installExpressAdapterReusePreboundServer(earlyServer);
  }

  const nestCreateOptions: NestApplicationOptions = {
    // En Cloud Run menos I/O en arranque; Winston sigue activo fuera de allí.
    logger: isCloudRunLike() ? false : new WinstonLogger(),
    bodyParser: false, // Deshabilitar body parser por defecto para configurarlo manualmente
  };

  const app = expressApp
    ? await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(expressApp),
        nestCreateOptions,
      )
    : await NestFactory.create<NestExpressApplication>(AppModule, nestCreateOptions);

  // Archivos subidos viven en `process.cwd()/public` (Multer usa cwd). Con `nest start`/`node dist`,
  // `__dirname/../public` apunta a `dist/public` (vacío) → 404. Usar siempre la carpeta `public` del proyecto.
  const publicRoot = join(process.cwd(), 'public');
  const frameAncestorsExtra = [
    process.env.FRONTEND_URL,
    process.env.MINIAPP_URL,
    'http://localhost:4173',
    'http://localhost:5173',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
  ]
    .filter((o): o is string => Boolean(o && String(o).trim()))
    .join(' ');
  app.useStaticAssets(publicRoot, {
    prefix: '/public/',
    setHeaders: (res, filePath) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // Permitir iframe / embed desde el SPA (otro puerto u origen) en vista previa de PDF, etc.
      if (filePath.endsWith('.pdf')) {
        res.setHeader(
          'Content-Security-Policy',
          `frame-ancestors 'self' ${frameAncestorsExtra}`.trim(),
        );
      }
    },
  });

  // Body parser: anexos PDF en data URL (base64) pueden superar 10MB
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // CORS antes que Helmet: preflight OPTIONS debe responder bien; no usar callback(Error) (puede cortar la conexión).
  const frontendUrl = normalizeBrowserOrigin(process.env.FRONTEND_URL || 'http://localhost:4173');
  const miniappUrl = normalizeBrowserOrigin(process.env.MINIAPP_URL || 'http://localhost:4174');
  /** Orígenes adicionales (p. ej. `https://jarlepsis.web.app`) separados por coma. Obligatorio si el SPA no coincide con FRONTEND_URL. */
  const corsExtraOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
    .split(',')
    .map((s) => normalizeBrowserOrigin(s.trim()))
    .filter((s) => s.length > 0);
  const allowedOrigins = Array.from(
    new Set([frontendUrl, miniappUrl, ...corsExtraOrigins].filter(Boolean)),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const o = normalizeBrowserOrigin(origin);
      if (allowedOrigins.includes(o)) {
        return callback(null, true);
      }
      if (isDevelopmentNodeEnv(process.env.NODE_ENV) && o.includes('localhost')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Impersonate-User-Id'],
  });

  // API consumida desde otros orígenes: no forzar CORP same-origin (Helmet por defecto).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Root endpoint (before global prefix)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (req: any, res: any) => {
    res.json({
      name: 'Jarlepsis API',
      version: '1.0.0',
      status: 'ok',
      timestamp: new Date().toISOString(),
      endpoints: {
        api: '/api/v1',
        docs: '/api/docs',
        health: '/api/v1/health',
      },
    });
  });

  httpAdapter.head('/', (req: any, res: any) => {
    res.status(200).end();
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger: createDocument escanea todos los controladores y puede superar el startup timeout de Cloud Run.
  const swaggerOnCloud =
    process.env.ENABLE_SWAGGER_ON_CLOUD_RUN === 'true' ||
    process.env.ENABLE_SWAGGER_ON_CLOUD_RUN === '1';
  if (!isCloudRunLike() || swaggerOnCloud) {
    const config = new DocumentBuilder()
      .setTitle('Jarlepsis API')
      .setDescription('API robusta con NestJS')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // JSON en una línea para Cloud Logging (diagnóstico de despliegues).
  console.log(
    JSON.stringify({
      severity: 'INFO',
      message: 'HTTP server binding (Nest listen / init)',
      port,
      host: '0.0.0.0',
      kService: process.env.K_SERVICE ?? null,
      kRevision: process.env.K_REVISION ?? null,
      cloudRun: isCloudRunLike(),
      earlyTcpBind: Boolean(expressApp),
    }),
  );
  await app.listen(port, '0.0.0.0');
  restoreExpressAdapter?.();

  const dataSource = app.get(DataSource);
  if (!dataSource.isInitialized) {
    console.log(
      JSON.stringify({
        severity: 'INFO',
        message: 'TypeORM initializing after HTTP listen',
        cloudRun: isCloudRunLike(),
      }),
    );
    try {
      await dataSource.initialize();
      console.log(
        JSON.stringify({
          severity: 'INFO',
          message: 'TypeORM initialized',
          cloudRun: isCloudRunLike(),
        }),
      );
    } catch (dbErr: unknown) {
      const e =
        dbErr instanceof Error
          ? dbErr
          : new Error(
              typeof dbErr === 'object' && dbErr !== null ? JSON.stringify(dbErr) : String(dbErr),
            );
      console.error(
        JSON.stringify({
          severity: 'ERROR',
          message:
            'TypeORM initialize failed — process stays up for /health and logs; fix DB env / network',
          error: e.message,
          stack: e.stack,
        }),
      );
    }
  }
}

bootstrap().catch((err: unknown) => {
  const e =
    err instanceof Error
      ? err
      : new Error(typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
  console.error(
    JSON.stringify({
      severity: 'ERROR',
      message: 'Nest bootstrap failed',
      error: e.message,
      stack: e.stack,
    }),
  );
  process.exit(1);
});
