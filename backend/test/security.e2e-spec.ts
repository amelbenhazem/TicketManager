import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /tickets without token -> 401', async () => {
    await request(app.getHttpServer()).get('/tickets').expect(401);
  });

  it('GET /users without token -> 401', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });
});

