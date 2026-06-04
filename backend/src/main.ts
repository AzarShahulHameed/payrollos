import { NestFactory } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],  // Suppress verbose logs in production
  });

  // ── Security headers via Helmet ─────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"],
        imgSrc:         ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc:     ["'self'", 'https://api.cloudinary.com'],
        frameSrc:       ["'none'"],
        objectSrc:      ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,  // Allow Cloudinary images
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // ── CORS — strict origin whitelist ─────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.APP_URL || 'http://localhost:3000').split(',');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl) only in dev
      if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,  // Cache preflight for 24h
  });

  // ── Global validation pipe — strict input sanitisation ─────
  app.useGlobalPipes(new ValidationPipe({
    whitelist:           true,   // Strip any fields not in DTO
    forbidNonWhitelisted:true,   // Reject requests with extra fields (400)
    transform:           true,   // Auto-transform types
    transformOptions:    { enableImplicitConversion: true },
    disableErrorMessages: process.env.NODE_ENV === 'production',  // Hide internals in prod
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    stopAtFirstError:    false,
  }));

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 PayrollOS backend running on http://localhost:${port}/api/v1`);
}
bootstrap();
