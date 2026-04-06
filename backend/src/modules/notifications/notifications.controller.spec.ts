import { NotificationsController } from './notifications.controller';

describe('NotificationsController (unit)', () => {
  it('parseBoolean(): parses true/false and returns undefined otherwise', () => {
    const controller = new NotificationsController({} as any);

    expect((controller as any).parseBoolean('true')).toBe(true);
    expect((controller as any).parseBoolean('false')).toBe(false);
    expect((controller as any).parseBoolean('')).toBeUndefined();
    expect((controller as any).parseBoolean(undefined)).toBeUndefined();
  });
});

