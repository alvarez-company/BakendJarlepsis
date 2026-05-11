import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger/winston.logger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/** Puerto HTTP: Cloud Run inyecta PORT; si viene vacío o inválido, no usar 4100 en Cloud Run (enrutamiento fallaría). */
function resolveListenPort(): number {
  const raw = process.env.PORT;
  const parsed =
    raw !== undefined && String(raw).trim() !== '' ? Number.parseInt(String(raw), 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  if (process.env.K_SERVICE) {
    return 8080;
  }
  return 4100;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new WinstonLogger(),
    bodyParser: false, // Deshabilitar body parser por defecto para configurarlo manualmente
  });

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

  // Security
  app.use(helmet());

  // Configurar CORS para permitir múltiples orígenes (Frontend principal y MiniApp móvil)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4173';
  const miniappUrl = process.env.MINIAPP_URL || 'http://localhost:4174';
  const allowedOrigins = [frontendUrl, miniappUrl];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // En desarrollo, permitir cualquier origin localhost
        if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Impersonate-User-Id'],
  });

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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Jarlepsis API')
    .setDescription('API robusta con NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = resolveListenPort();
  // JSON en una línea para Cloud Logging (diagnóstico de despliegues).
  console.log(
    JSON.stringify({
      severity: 'INFO',
      message: 'HTTP server binding',
      port,
      host: '0.0.0.0',
      kService: process.env.K_SERVICE ?? null,
    }),
  );
  await app.listen(port, '0.0.0.0');
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
