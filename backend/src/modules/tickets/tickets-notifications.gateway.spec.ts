import { TicketsNotificationsGateway } from './tickets-notifications.gateway';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/schemas/user.schema';
import { TicketStatus } from './schemas/ticket.schema';

describe('TicketsNotificationsGateway (unit)', () => {
  it('handleConnection joins rooms and emits ready when token valid', () => {
    const jwt = { verify: jest.fn().mockReturnValue({ sub: 'u1', role: UserRole.ADMIN, email: 'a' }) } as unknown as JwtService;
    const gw = new TicketsNotificationsGateway(jwt);
    const join = jest.fn();
    const emit = jest.fn();
    const disconnect = jest.fn();
    const client: any = {
      id: 's1',
      handshake: { auth: { token: 't' }, headers: {} },
      join,
      emit,
      disconnect,
    };

    gw.handleConnection(client);
    expect(jwt.verify).toHaveBeenCalledWith('t');
    expect(join).toHaveBeenCalledWith('user:u1');
    expect(join).toHaveBeenCalledWith('role:admin');
    expect(emit).toHaveBeenCalledWith('notifications.ready', expect.objectContaining({ userId: 'u1', role: UserRole.ADMIN }));
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('notifyTicketStatusChanged emits to admin room', () => {
    const jwt = { verify: jest.fn() } as unknown as JwtService;
    const gw = new TicketsNotificationsGateway(jwt);
    const to = jest.fn().mockReturnValue({ emit: jest.fn() });
    (gw as any).server = { to };

    const ticket: any = { id: 't1', title: 'X', status: TicketStatus.OPEN };
    gw.notifyTicketStatusChanged(ticket, TicketStatus.OPEN, 'actor');
    expect(to).toHaveBeenCalledWith('role:admin');
  });
});

