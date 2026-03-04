import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsArray,
} from 'class-validator';
import { TicketCategory, TicketPriority } from '../schemas/ticket.schema';

export class CreateTicketDto {
  @IsString()
  @MinLength(1, { message: 'Le titre est requis' })
  title: string;

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
}
