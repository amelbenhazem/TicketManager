import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto';
import { UpdateUserDto } from './dto';

export type UserResponse = { id: string; lastName: string; firstName: string; email: string; role: UserRole };

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.userModel.findOne({ email: dto.email }).exec();
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      lastName: dto.lastName,
      firstName: dto.firstName,
      email: dto.email,
      password: hashed,
      role: dto.role,
    });
    return this.toResponse(user);
  }

  async findAll(filters?: { role?: UserRole; search?: string }): Promise<UserResponse[]> {
    const q: Record<string, unknown> = {};
    if (filters?.role) q.role = filters.role;
    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      q.$or = [
        { email: { $regex: term, $options: 'i' } },
        { firstName: { $regex: term, $options: 'i' } },
        { lastName: { $regex: term, $options: 'i' } },
      ];
    }
    const users = await this.userModel.find(q).sort({ createdAt: -1 }).exec();
    return users.map((u) => this.toResponse(u));
  }

  async getStats(): Promise<{ total: number; byRole: Record<string, number> }> {
    const total = await this.userModel.countDocuments().exec();
    const byRole: Record<string, number> = {};
    for (const r of Object.values(UserRole)) {
      byRole[r] = await this.userModel.countDocuments({ role: r }).exec();
    }
    return { total, byRole };
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.userModel.findOne({ email: dto.email }).exec();
      if (existing) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }
      user.email = dto.email;
    }
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.password !== undefined && dto.password.length > 0) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    await user.save();
    return this.toResponse(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Utilisateur non trouvé');
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  private toResponse(user: UserDocument): UserResponse {
    return {
      id: (user as any)._id?.toString(),
      lastName: user.lastName ?? '',
      firstName: user.firstName ?? '',
      email: user.email,
      role: user.role,
    };
  }
}
