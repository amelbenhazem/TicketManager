import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/schemas/user.schema';
import { TicketsService, TicketResponse } from './tickets.service';
import { CreateTicketDto } from './dto';
import { UpdateTicketDto } from './dto';

type RequestWithUser = Request & {
  user: { id: string; email: string; role: UserRole };
};

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async findTickets(
    @Request() req: RequestWithUser,
  ): Promise<TicketResponse[]> {
    if (req.user.role === UserRole.ADMIN) {
      return this.ticketsService.findAll();
    }
    if (req.user.role === UserRole.TECHNICIAN) {
      return this.ticketsService.findAllByAssignedTo(req.user.id);
    }
    return this.ticketsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<TicketResponse | null> {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.ticketsService.findOne(id, req.user.id, isAdmin);
  }

  @Post()
  async create(
    @Request() req: RequestWithUser,
    @Body() dto: CreateTicketDto,
  ): Promise<TicketResponse> {
    return this.ticketsService.create(req.user.id, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Request() req: RequestWithUser,
  ): Promise<TicketResponse | null> {
    if (req.user.role === UserRole.ADMIN) {
      return this.ticketsService.update(id, dto);
    }
    if (req.user.role === UserRole.TECHNICIAN && dto.status !== undefined) {
      const onlyStatus = { status: dto.status };
      return this.ticketsService.updateStatusByAssigned(
        id,
        req.user.id,
        onlyStatus.status,
      );
    }
    throw new ForbiddenException('Action non autorisée');
  }
}
