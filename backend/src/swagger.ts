import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** OpenAPI UI : http://localhost:3001/api (ou PORT configuré). */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TicketManager API')
    .setDescription(
      'Gestion de tickets IT — authentification JWT, rôles client / technicien / admin.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token renvoyé par POST /auth/login (champ access_token)',
      },
      'JWT',
    )
    .addTag('auth', 'Connexion et profil')
    .addTag('users', 'Utilisateurs (admin)')
    .addTag('tickets', 'Tickets et pièces jointes')
    .addTag('notifications', 'Notifications in-app')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
