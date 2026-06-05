import configuration from './configuration';

describe('configuration (unit)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('reads PORT and returns numeric port', () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '4005';
    const cfg = configuration();
    expect(cfg.port).toBe(4005);
  });

  it('rejects AUTH_DEMO_* in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.AUTH_DEMO_EMAIL = 'demo@rfc.tn';
    delete process.env.AUTH_DEMO_PASSWORD;
    expect(() => configuration()).toThrow(/AUTH_DEMO/);
  });
});

