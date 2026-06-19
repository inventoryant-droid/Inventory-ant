import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OAuth2Client } from 'google-auth-library';

export interface User {
  id: string;
  email: string;
  phone?: string;
  password?: string;
  name: string;
  picture: string;
  role: 'user' | 'admin';
  joinedAt: number;
}

@Injectable()
export class UsersService {
  private readonly usersPath = path.join(process.cwd(), 'users.json');
  private readonly adminPath = path.join(process.cwd(), 'admin.json');
  private readonly oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );

  private async getDb(): Promise<User[]> {
    try {
      const data = await fs.readFile(this.usersPath, 'utf8');
      return JSON.parse(data);
    } catch (e: any) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  private async saveDb(data: User[]): Promise<void> {
    await fs.writeFile(this.usersPath, JSON.stringify(data, null, 2), 'utf8');
  }

  private async getAdminDb(): Promise<any> {
    try {
      const data = await fs.readFile(this.adminPath, 'utf8');
      return JSON.parse(data);
    } catch (e: any) {
      if (e.code === 'ENOENT') return { username: 'admin', password: 'admin123' };
      throw e;
    }
  }

  private async saveAdminDb(data: any): Promise<void> {
    await fs.writeFile(this.adminPath, JSON.stringify(data, null, 2), 'utf8');
  }

  async adminLogin(username: string, password: string): Promise<{ success: boolean; role: string; userId: string }> {
    const admin = await this.getAdminDb();
    if (admin.username === username && admin.password === password) {
      return { success: true, role: 'admin', userId: 'admin' };
    }
    throw new UnauthorizedException('Invalid admin credentials');
  }

  async userSignup(name: string, email: string, password?: string, phone?: string): Promise<User> {
    const db = await this.getDb();
    const existingUser = db.find(u => 
      u.email.toLowerCase() === email.toLowerCase() || 
      (phone && u.phone === phone)
    );
    if (existingUser) {
      throw new UnauthorizedException('User with this email or phone already exists');
    }

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 10),
      email: email.toLowerCase(),
      phone,
      password,
      name,
      picture: '',
      role: 'user',
      joinedAt: Date.now()
    };
    db.push(newUser);
    await this.saveDb(db);
    return newUser;
  }

  async userLogin(identifier: string, password?: string): Promise<User> {
    const db = await this.getDb();
    const user = db.find(u => 
      u.email.toLowerCase() === identifier.toLowerCase() || 
      (u.phone && u.phone === identifier)
    );
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.password !== password) {
      throw new UnauthorizedException('Invalid password');
    }
    return user;
  }

  async changeAdminPassword(oldPass: string, newPass: string): Promise<{ success: boolean }> {
    const admin = await this.getAdminDb();
    if (admin.password === oldPass) {
      admin.password = newPass;
      await this.saveAdminDb(admin);
      return { success: true };
    }
    throw new UnauthorizedException('Invalid old password');
  }

  async handleGoogleLogin(code: string): Promise<User> {
    try {
      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      if (!tokens.id_token) throw new UnauthorizedException('No ID Token returned');

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new UnauthorizedException('Invalid Google token');

      const db = await this.getDb();
      let user = db.find(u => u.email === payload.email);

      if (!user) {
        user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload.email,
          picture: payload.picture || '',
          role: 'user',
          joinedAt: Date.now()
        };
        db.push(user);
        await this.saveDb(db);
      }

      return user;
    } catch (error: any) {
      console.error('Google Auth Error:', error.message);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async findAllUsers(): Promise<User[]> {
    return this.getDb();
  }

  async removeUser(email: string): Promise<{ message: string }> {
    const db = await this.getDb();
    const idx = db.findIndex(u => u.email === email);
    if (idx === -1) throw new NotFoundException('User not found');
    db.splice(idx, 1);
    await this.saveDb(db);

    // Also remove their inventory
    const dbPath = path.join(process.cwd(), 'database.json');
    try {
      const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
      const newDb = dbData.filter((p: any) => p.userId !== email);
      await fs.writeFile(dbPath, JSON.stringify(newDb, null, 2), 'utf8');
    } catch(e) {}

    return { message: 'User deleted successfully' };
  }
}
