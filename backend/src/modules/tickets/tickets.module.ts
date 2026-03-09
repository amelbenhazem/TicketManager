import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketOwnerOrAdminGuard } from './guards/ticket-owner-or-admin.guard';
import { TicketsAttachmentsService } from './tickets-attachments.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema }]),
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketOwnerOrAdminGuard,
    TicketsAttachmentsService,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
