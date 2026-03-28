import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UserRole } from '../users/schemas/user.schema';
import { TicketResponse } from './tickets.service';
import { TicketStatus } from './schemas/ticket.schema';

type SocketUser = {
  id: string;
  role: UserRole;
  email: string;
};

type TypedSocket = Socket & {
  data: {
    user?: SocketUser;
  };
};

type TicketEventPayload = {
  ticket: TicketResponse;
  timestamp: string;
  actorUserId?: string;
  previousStatus?: TicketStatus;
  previousAssignedTo?: string | null;
};

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: true, credentials: true },
})
export class TicketsNotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(TicketsNotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: TypedSocket): void {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{
        sub?: string;
        role?: string;
        email?: string;
      }>(token);
      if (!payload?.sub || !payload?.role) {
        client.disconnect();
        return;
      }
      const user = {
        id: payload.sub,
        role: payload.role as UserRole,
        email: payload.email ?? '',
      } satisfies SocketUser;
      client.data.user = user;
      void client.join(this.userRoom(user.id));
      void client.join(this.roleRoom(user.role));
      client.emit('notifications.ready', {
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: TypedSocket): void {
    const user = client.data.user;
    if (user) {
      this.logger.debug(`Socket disconnected for user ${user.id}`);
    }
  }

  @SubscribeMessage('notifications.ping')
  handlePing(@ConnectedSocket() client: TypedSocket, @MessageBody() body?: unknown) {
    client.emit('notifications.pong', {
      ok: true,
      timestamp: new Date().toISOString(),
      echo: body ?? null,
    });
  }

  notifyTicketCreated(ticket: TicketResponse, actorUserId?: string): void {
    const rooms = new Set<string>([
      this.userRoom(ticket.userId),
      this.roleRoom(UserRole.ADMIN),
    ]);
    this.emitToRooms(rooms, 'ticket.created', {
      ticket,
      actorUserId,
      timestamp: new Date().toISOString(),
    });
  }

  notifyTicketAssigned(
    ticket: TicketResponse,
    previousAssignedTo: string | null,
    actorUserId?: string,
  ): void {
    const rooms = new Set<string>([
      this.userRoom(ticket.userId),
      this.roleRoom(UserRole.ADMIN),
    ]);
    if (ticket.assignedTo) rooms.add(this.userRoom(ticket.assignedTo));
    if (previousAssignedTo) rooms.add(this.userRoom(previousAssignedTo));
    this.emitToRooms(rooms, 'ticket.assigned', {
      ticket,
      actorUserId,
      previousAssignedTo,
      timestamp: new Date().toISOString(),
    });
  }

  notifyTicketStatusChanged(
    ticket: TicketResponse,
    previousStatus: TicketStatus,
    actorUserId?: string,
  ): void {
    const rooms = new Set<string>([
      this.userRoom(ticket.userId),
      this.roleRoom(UserRole.ADMIN),
    ]);
    if (ticket.assignedTo) rooms.add(this.userRoom(ticket.assignedTo));
    this.emitToRooms(rooms, 'ticket.status_changed', {
      ticket,
      actorUserId,
      previousStatus,
      timestamp: new Date().toISOString(),
    });
  }

  private emitToRooms(
    rooms: Set<string>,
    event: 'ticket.created' | 'ticket.assigned' | 'ticket.status_changed',
    payload: TicketEventPayload,
  ): void {
    for (const room of rooms) {
      this.server.to(room).emit(event, payload);
    }
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private roleRoom(role: UserRole): string {
    return `role:${role}`;
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = typeof auth?.token === 'string' ? (auth.token as string) : null;
    if (authToken && authToken.trim()) return authToken;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }
    return null;
  }
}
