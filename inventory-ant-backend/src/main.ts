import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { validateEnv } from './saas/config/env-validation';

async function bootstrap() {
  // Part 10: Environment Variables Validation
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // High limit for Base64 Image Processing
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Part 1: Security Hardening - Secure Headers & CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.razorpay.com', 'https://api.brevo.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Part 1: Security Hardening - Compression
  app.use(compression());

  // Part 1: Security Hardening - Trusted Proxy Support
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Part 1: Security Hardening - Strict CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : true, // true lets it reflect request origin (good for dev/multi-domain)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization,x-user-id,x-request-id',
  });

  // app.setGlobalPrefix('api');
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  // Part 11: Swagger Documentation Improvements
  const config = new DocumentBuilder()
    .setTitle('Inventory Ant Enterprise SaaS API')
    .setDescription('The API specification for the Inventory Ant Enterprise SaaS Warehouse and Billing Management Platform.')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-user-id', in: 'header' }, 'x-user-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
