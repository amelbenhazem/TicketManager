import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth (e2e)', () => {
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

  it('POST /auth/login (demo) -> returns token + role', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@rfc.tn', password: 'demo123' })
      .expect(200);

    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('expiresIn');
    expect(res.body).toHaveProperty('role');
  });

  it('GET /auth/me without token -> 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});

