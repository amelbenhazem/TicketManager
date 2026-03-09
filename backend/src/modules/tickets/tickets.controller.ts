import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/schemas/user.schema';
import {
  TicketsService,
  TicketResponse,
  PaginatedTickets,
} from './tickets.service';
import { CreateTicketDto } from './dto';
import { UpdateTicketDto } from './dto';
import { TicketOwnerOrAdminGuard } from './guards/ticket-owner-or-admin.guard';
import { TicketsAttachmentsService } from './tickets-attachments.service';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type RequestWithUser = Request & {
  user: { id: string; email: string; role: UserRole };
};

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly attachmentsService: TicketsAttachmentsService,
  ) {}

  @Get()
  async findTickets(
    @Request() req: RequestWithUser,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ): Promise<PaginatedTickets> {
    const page = Math.max(
      1,
      parseInt(pageStr ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE,
    );
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(limitStr ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      ),
    );
    if (req.user.role === UserRole.ADMIN) {
      return this.ticketsService.findAll(page, limit);
    }
    if (req.user.role === UserRole.TECHNICIAN) {
      return this.ticketsService.findAllByAssignedTo(req.user.id, page, limit);
    }
    return this.ticketsService.findAllByUser(req.user.id, page, limit);
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

  @Post('attachments/upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: MAX_UPLOAD_SIZE },
    }),
  )
  async uploadAttachments(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    if (!files?.length) {
      throw new BadRequestException(
        'Aucun fichier envoyé (attendre le champ "files")',
      );
    }
    const urls = await this.attachmentsService.uploadMany(
      files.map((f) => ({
        buffer: f.buffer,
        mimetype: f.mimetype,
        originalname: f.originalname,
      })),
    );
    return { urls };
  }

  @Patch(':id')
  @UseGuards(TicketOwnerOrAdminGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Request() req: RequestWithUser,
  ): Promise<TicketResponse | null> {
    return this.ticketsService.update(id, dto, req.user);
  }
}
