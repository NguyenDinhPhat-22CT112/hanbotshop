import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);

  if (trustProxy !== undefined) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  }

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: [
      'http://hanbotorder.id.vn',
      'http://admin.hanbotorder.id.vn',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Hanbotorder API')
      .setDescription('API documentation for Hanbotorder e-commerce platform')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addServer('http://localhost:3001', 'Local development')
      .addTag('Auth', 'Authentication and authorization endpoints')
      .addTag('Audit', 'Admin audit log endpoints')
      .addTag('Catalog', 'Products, categories, and variants management')
      .addTag('Cart', 'Shopping cart endpoints')
      .addTag('Checkout', 'Checkout and order creation endpoints')
      .addTag('Orders', 'Order management, tracking, and timeline endpoints')
      .addTag('Payment', 'Payment gateway integration')
      .addTag('Production', 'Production job management')
      .addTag('Users', 'User management')
      .addTag('Files', 'File upload and management')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Hanbotorder API Documentation',
      customfavIcon: 'https://nestjs.com/favicon.ico',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });

    // Export OpenAPI JSON
    if (process.env.NODE_ENV === 'development') {
      console.log('API Documentation: http://localhost:3001/api/docs');
      console.log('OpenAPI JSON: http://localhost:3001/api/docs-json');
    }
  }

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

function parseTrustProxy(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  const numeric = Number(normalized);

  return Number.isInteger(numeric) && numeric >= 0 ? numeric : value.trim();
}

void bootstrap();
