import * as bcrypt from 'bcrypt';
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { UserRole } from '../modules/users/schemas/user.schema';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../modules/tickets/schemas/ticket.schema';

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ticketmanager';
const shouldReset = process.argv.includes('--reset');

const UserSchema = new Schema(
  {
    lastName: { type: String, default: '' },
    firstName: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
  },
  { timestamps: true, collection: 'users' },
);

const TicketSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.OPEN,
    },
    category: {
      type: String,
      enum: Object.values(TicketCategory),
      default: TicketCategory.AUTRE,
    },
    priority: {
      type: String,
      enum: Object.values(TicketPriority),
      default: TicketPriority.MEDIUM,
    },
    attachments: { type: [String], default: [] },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, collection: 'tickets' },
);

type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};
type TicketDoc = InferSchemaType<typeof TicketSchema> & {
  _id: mongoose.Types.ObjectId;
};

const UserModel = mongoose.model<UserDoc>('User', UserSchema);
const TicketModel = mongoose.model<TicketDoc>('Ticket', TicketSchema);

async function upsertUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<UserDoc> {
  const hash = await bcrypt.hash(input.password, 10);
  const user = await UserModel.findOneAndUpdate(
    { email: input.email },
    {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      password: hash,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).exec();
  if (!user) {
    throw new Error(`Cannot create or update user ${input.email}`);
  }
  return user;
}

void (async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB: ${MONGODB_URI}`);

    if (shouldReset) {
      await Promise.all([
        TicketModel.deleteMany({}).exec(),
        UserModel.deleteMany({}).exec(),
      ]);
      console.log('Reset done: users and tickets collections cleared.');
    }

    await upsertUser({
      firstName: 'Admin',
      lastName: 'System',
    email: 'admin@rfc.com',
      password: 'Admin123!',
      role: UserRole.ADMIN,
    });

  const technician1 = await upsertUser({
      firstName: 'Ali',
      lastName: 'Tech',
    email: 'tech1@rfc.com',
      password: 'Tech123!',
      role: UserRole.TECHNICIAN,
    });

  const technician2 = await upsertUser({
      firstName: 'Sara',
      lastName: 'Ops',
    email: 'tech2@rfc.com',
      password: 'Tech123!',
      role: UserRole.TECHNICIAN,
    });

  const client1 = await upsertUser({
      firstName: 'Amel',
      lastName: 'Client',
    email: 'client1@rfc.com',
      password: 'Client123!',
      role: UserRole.CLIENT,
    });

  const client2 = await upsertUser({
      firstName: 'Karim',
      lastName: 'Client',
    email: 'client2@rfc.com',
      password: 'Client123!',
      role: UserRole.CLIENT,
    });

    const ticketSeeds = [
      {
        title: 'Connexion VPN instable',
        description: 'La connexion coupe toutes les 10 minutes.',
        status: TicketStatus.OPEN,
        category: TicketCategory.RESEAU,
        priority: TicketPriority.HIGH,
        userId: client1._id,
        assignedTo: technician1._id,
      },
      {
        title: 'Erreur impression PDF',
        description: 'Impossible de générer le PDF depuis le CRM.',
        status: TicketStatus.IN_PROGRESS,
        category: TicketCategory.LOGICIEL,
        priority: TicketPriority.MEDIUM,
        userId: client2._id,
        assignedTo: technician2._id,
      },
      {
        title: 'PC ne démarre plus',
        description: 'Ecran noir au démarrage, bip continu.',
        status: TicketStatus.RESOLVED,
        category: TicketCategory.MATERIEL,
        priority: TicketPriority.HIGH,
        userId: client1._id,
        assignedTo: technician1._id,
      },
      {
        title: 'Demande accès application RH',
        description: 'Nouveau collaborateur sans accès RH.',
        status: TicketStatus.OPEN,
        category: TicketCategory.AUTRE,
        priority: TicketPriority.LOW,
        userId: client2._id,
        assignedTo: null,
      },
    ];

    if (shouldReset) {
      await TicketModel.insertMany(ticketSeeds);
    } else {
      const ticketCount = await TicketModel.countDocuments().exec();
      if (ticketCount === 0) {
        await TicketModel.insertMany(ticketSeeds);
      }
    }

    const [usersCount, ticketsCount] = await Promise.all([
      UserModel.countDocuments().exec(),
      TicketModel.countDocuments().exec(),
    ]);

    console.log(`Seed complete: ${usersCount} users, ${ticketsCount} tickets.`);
    console.log('Comptes de test (développement uniquement — changer les mots de passe en production):');
    console.log('- admin@rfc.com / Admin123!');
    console.log('- tech1@rfc.com / Tech123!');
    console.log('- tech2@rfc.com / Tech123!');
    console.log('- client1@rfc.com / Client123!');
    console.log('- client2@rfc.com / Client123!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
