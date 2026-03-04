import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '../schemas/ticket.schema';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus, { message: 'Statut invalide' })
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  assignedTo?: string | null;
}
