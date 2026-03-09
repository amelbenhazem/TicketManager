import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../users/schemas/user.schema';
import { TicketsService } from '../tickets.service';

type RequestWithUser = Request & {
  user: { id: string; email: string; role: UserRole };
};

/**
 * Vérifie si l'utilisateur a le droit de toucher CE ticket (PATCH /tickets/:id).
 * - Admin : toujours oui.
 * - Technicien : oui uniquement si le ticket lui est assigné.
 * - Client : non.
 */
@Injectable()
export class TicketOwnerOrAdminGuard implements CanActivate {
  constructor(private readonly ticketsService: TicketsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;
    const ticketId = req.params['id'];

    if (!user?.id || !ticketId) {
      throw new ForbiddenException('Accès refusé');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role === UserRole.CLIENT) {
      throw new ForbiddenException(
        'Seuls l’administrateur et le technicien assigné peuvent modifier un ticket.',
      );
    }

    if (user.role === UserRole.TECHNICIAN) {
      const ticket = await this.ticketsService.getTicketForGuard(ticketId);
      if (!ticket) {
        throw new ForbiddenException('Ticket introuvable ou accès refusé');
      }
      if (ticket.assignedToId !== user.id) {
        throw new ForbiddenException(
          'Seul le technicien assigné à ce ticket peut le modifier.',
        );
      }
      return true;
    }

    throw new ForbiddenException('Accès refusé');
  }
}
