import bcrypt from 'bcrypt';
import { db } from './database';
import { User, LoginRequest } from '../types/auth';

export class UserService {
  static async findByEmail(email: string): Promise<User | null> {
    const user = await db('users').where({ email }).first();
    return user || null;
  }

  static async findById(id: number): Promise<User | null> {
    const user = await db('users').where({ id }).first();
    return user || null;
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async authenticate(credentials: LoginRequest): Promise<User | null> {
    const user = await this.findByEmail(credentials.email);
    
    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(credentials.password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    return user;
  }

  static async createUser(email: string, password: string, firstName?: string, lastName?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [user] = await db('users').insert({
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
    }).returning('*');

    return user;
  }
}