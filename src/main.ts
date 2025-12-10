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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new WinstonLogger(),
    bodyParser: false, // Deshabilitar body parser por defecto para configurarlo manualmente
  });

  // Configurar carpeta pública para archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  // Configurar body parser con límite aumentado para imágenes base64
  app.use(json({ limit: '10mb' })); // Aumentar límite a 10MB
  app.use(urlencoded({ extended: true, limit: '10mb' }));

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
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  const port = process.env.PORT || 4100;
  await app.listen(port);
}

bootstrap();

