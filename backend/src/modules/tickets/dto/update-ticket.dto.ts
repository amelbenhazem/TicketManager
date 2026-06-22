import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../schemas/ticket.schema';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le titre est requis' })
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketCategory, { message: 'Catégorie invalide' })
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority, { message: 'Priorité invalide' })
  priority?: TicketPriority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsEnum(TicketStatus, { message: 'Statut invalide' })
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  assignedTo?: string | null;
}
