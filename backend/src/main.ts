import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const corsOrigin = config.get<string>('cors.origin');
  const isDev = config.get<string>('nodeEnv') !== 'production';
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map((o) => o.trim());
    app.enableCors({
      origin: isDev
        ? [...origins, 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']
        : origins,
      credentials: true,
    });
  }

  const port = config.get<number>('port', 3000);
  await app.listen(port);
  console.log(`[Backend] Running at http://localhost:${port}`);
  if (isDev) {
    console.log(`[Backend] CORS allowed for: ${corsOrigin}`);
  }
}

void bootstrap();
