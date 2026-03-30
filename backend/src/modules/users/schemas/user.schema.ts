import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CLIENT = 'client',
  TECHNICIAN = 'technician',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ default: '' })
  lastName: string;

  @Prop({ default: '' })
  firstName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index pour accélérer les recherches par rôle (ex: createForAdmins)
UserSchema.index({ role: 1 });
