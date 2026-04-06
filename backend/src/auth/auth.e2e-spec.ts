import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';

describe('Auth e2e (SuperTest)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /auth/login with invalid credentials returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'unknown@rfc.com', password: 'wrong' })
      .expect(401);
  });
});

