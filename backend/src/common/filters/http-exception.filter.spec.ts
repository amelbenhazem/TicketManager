import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter (unit)', () => {
  it('formatMessage(): formats arrays, strings, objects and null', () => {
    const filter = new AllExceptionsFilter();

    expect((filter as any).formatMessage(['a', 'b'])).toBe('a. b');
    expect((filter as any).formatMessage('x')).toBe('x');
    expect((filter as any).formatMessage({ a: 1 })).toBe('{"a":1}');
    expect((filter as any).formatMessage(null)).toBe('Erreur inconnue');
  });
});

