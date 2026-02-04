import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001'], // Vite dev server
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MyCowFarm API')
    .setDescription(`
## Dairy Farm Management API

A comprehensive RESTful API for managing dairy farm operations including:

- **Authentication** - JWT-based user authentication
- **Farm Management** - Multi-tenant farm setup with member invitations
- **Herd Management** - Cow profiles, lifecycle tracking, lineage
- **Health & Events** - Vaccination, health records, breeding tracking
- **Milk Production** - Daily milk records with analytics
- **Financial Tracking** - Income/expense management with reports
- **Dashboard** - Real-time farm overview and smart alerts

### Authentication
All endpoints (except auth) require a Bearer JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-access-token>
\`\`\`

### Roles
- **Owner**: Full access to all farm features including financials
- **Worker**: Access to herd management, events, and milk records
    `)
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
      'JWT-auth',
    )
    .addTag('Auth', 'User authentication endpoints')
    .addTag('Users', 'User profile management')
    .addTag('Farms', 'Farm management and member invitations')
    .addTag('Invitations', 'Farm invitation acceptance')
    .addTag('Cows', 'Herd management - cow profiles and lifecycle')
    .addTag('Cow Events', 'Health, vaccination, breeding, and notes')
    .addTag('Milk Records', 'Daily milk production tracking')
    .addTag('Financial', 'Income and expense management (owner only)')
    .addTag('Dashboard', 'Farm summary and alerts')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'MyCowFarm API Documentation',
  });

  await app.listen(port);
  console.log(`🚀 MyCowFarm API is running on: http://localhost:${port}`);
  console.log(`📚 API Base URL: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
