import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * Applies every global pipe/filter/interceptor/middleware that defines the
 * API's request/response contract. Shared between the real bootstrap below
 * and e2e tests so a test app can never silently drift from production
 * behavior (e.g. missing the {success, data} response envelope).
 */
export function configureApp(app: INestApplication, options: { apiPrefix?: string; corsOrigin?: string } = {}) {
  const apiPrefix = options.apiPrefix ?? process.env.API_PREFIX ?? 'api/v1';
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN ?? 'http://localhost:5183';

  if (process.env.TRUST_PROXY === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  return { apiPrefix };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
  const { apiPrefix } = configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Abyte E-Commerce API')
    .setDescription('REST API for the Abyte e-commerce platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(configPort);
  // eslint-disable-next-line no-console
  console.log(`Abyte API listening on http://localhost:${configPort}/${apiPrefix}`);
}

// Guard against the side-effecting bootstrap() running when this module is
// merely imported for `configureApp` (e.g. from e2e tests) rather than
// executed directly as the server entrypoint.
if (require.main === module) {
  bootstrap();
}
