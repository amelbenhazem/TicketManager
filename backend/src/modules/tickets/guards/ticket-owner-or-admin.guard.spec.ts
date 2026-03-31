import { TicketOwnerOrAdminGuard } from './ticket-owner-or-admin.guard';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../users/schemas/user.schema';

describe('TicketOwnerOrAdminGuard (unit)', () => {
  const makeCtx = (user: any, id: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params: { id } }),
      }),
    }) as any;

  it('allows admin', async () => {
    const guard = new TicketOwnerOrAdminGuard({ getTicketForGuard: jest.fn() } as any);
    await expect(
      guard.canActivate(makeCtx({ id: 'a', role: UserRole.ADMIN }, 't1')),
    ).resolves.toBe(true);
  });

  it('denies client', async () => {
    const guard = new TicketOwnerOrAdminGuard({ getTicketForGuard: jest.fn() } as any);
    await expect(
      guard.canActivate(makeCtx({ id: 'c', role: UserRole.CLIENT }, 't1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows technician only if assigned', async () => {
    const getTicketForGuard = jest.fn().mockResolvedValue({ assignedToId: 'tech1' });
    const guard = new TicketOwnerOrAdminGuard({ getTicketForGuard } as any);
    await expect(
      guard.canActivate(makeCtx({ id: 'tech1', role: UserRole.TECHNICIAN }, 't1')),
    ).resolves.toBe(true);
  });

  it('denies technician if not assigned', async () => {
    const getTicketForGuard = jest.fn().mockResolvedValue({ assignedToId: 'other' });
    const guard = new TicketOwnerOrAdminGuard({ getTicketForGuard } as any);
    await expect(
      guard.canActivate(makeCtx({ id: 'tech1', role: UserRole.TECHNICIAN }, 't1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

