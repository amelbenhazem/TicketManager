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
});

