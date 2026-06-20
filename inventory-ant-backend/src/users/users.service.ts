import { Injectable, NotFoundException, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  phone?: string;
  password?: string;
  name: string;
  picture: string;
  role: 'user' | 'admin';
  active: boolean;
  createdAt: number;
  updatedAt: number;
  // Profile onboarding fields
  profileCompleted?: boolean;
  businessName?: string;
  businessLogo?: string;
  gstNumber?: string;
  businessAddress?: string;
  showPhoneOnBills?: boolean;
  showEmailOnBills?: boolean;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly usersPath = path.join(process.cwd(), 'users.json');
  private readonly adminPath = path.join(process.cwd(), 'admin.json');
  private readonly oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );

  constructor(private readonly jwtService: JwtService) {}

  private async getDb(): Promise<User[]> {
    try {
      const data = await fs.readFile(this.usersPath, 'utf8');
      if (!data || !data.trim()) return [];
      return JSON.parse(data);
    } catch (e: any) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  private async saveDb(data: User[]): Promise<void> {
    await fs.writeFile(this.usersPath, JSON.stringify(data, null, 2), 'utf8');
  }

  async onModuleInit() {
    const db = await this.getDb();
    let changed = false;

    // Migrate existing users to have new fields and bcrypt passwords
    for (const user of db) {
      if (!user.role) {
        user.role = 'user';
        changed = true;
      }
      if (user.active === undefined) {
        user.active = true;
        changed = true;
      }
      if (!user.createdAt) {
        user.createdAt = (user as any).joinedAt || Date.now();
        changed = true;
      }
      if (!user.updatedAt) {
        user.updatedAt = user.createdAt || Date.now();
        changed = true;
      }
      if (user.password && !this.isBCryptHash(user.password)) {
        user.password = await bcrypt.hash(user.password, 10);
        changed = true;
      }
      if (user.profileCompleted === undefined) {
        user.profileCompleted = user.role === 'admin';
        changed = true;
      }
    }

    // Seed default admin if it doesn't exist
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@inventoryant.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const adminExists = db.some(u => u.email.toLowerCase() === adminEmail && u.role === 'admin');
    if (!adminExists) {
      const hashedPass = await bcrypt.hash(adminPassword, 10);
      const defaultAdmin: User = {
        id: 'admin-' + Math.random().toString(36).substring(2, 10),
        email: adminEmail,
        name: 'Super Admin',
        password: hashedPass,
        picture: '',
        role: 'admin',
        active: true,
        profileCompleted: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      db.push(defaultAdmin);
      changed = true;
    }

    if (changed) {
      await this.saveDb(db);
    }
  }

  private isBCryptHash(str: string): boolean {
    return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
  }

  async login(identifier: string, password?: string): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const db = await this.getDb();
    const user = db.find(u => 
      u.email.toLowerCase() === identifier.toLowerCase() || 
      (u.phone && u.phone === identifier)
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.active) {
      throw new UnauthorizedException('Account is deactivated. Please contact administrator.');
    }

    if (!password || !user.password) {
      throw new UnauthorizedException('Authentication details missing');
    }

    const passMatch = await bcrypt.compare(password, user.password);
    if (!passMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    const { password: _, ...userWithoutPass } = user;
    return {
      access_token: token,
      user: userWithoutPass
    };
  }

  async userSignup(name: string, email: string, password?: string, phone?: string): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const db = await this.getDb();
    const existingUser = db.find(u => 
      u.email.toLowerCase() === email.toLowerCase() || 
      (phone && u.phone === phone)
    );
    if (existingUser) {
      throw new UnauthorizedException('User with this email or phone already exists');
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const newUser: User = {
      id: Math.random().toString(36).substring(2, 10),
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      name,
      picture: '',
      role: 'user', // Public signup strictly user
      active: true,
      profileCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.push(newUser);
    await this.saveDb(db);

    const payload = { sub: newUser.id, email: newUser.email, role: newUser.role };
    const token = await this.jwtService.signAsync(payload);

    const { password: _, ...userWithoutPass } = newUser;
    return {
      access_token: token,
      user: userWithoutPass
    };
  }

  async changeAdminPassword(adminEmail: string, oldPass: string, newPass: string): Promise<{ success: boolean }> {
    const db = await this.getDb();
    const admin = db.find(u => u.email.toLowerCase() === adminEmail.toLowerCase() && u.role === 'admin');
    if (!admin || !admin.password) {
      throw new UnauthorizedException('Admin account not found');
    }

    const passMatch = await bcrypt.compare(oldPass, admin.password);
    if (!passMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    admin.password = await bcrypt.hash(newPass, 10);
    admin.updatedAt = Date.now();
    await this.saveDb(db);
    return { success: true };
  }

  async handleGoogleLogin(code: string): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      if (!tokens.id_token) throw new UnauthorizedException('No ID Token returned');

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new UnauthorizedException('Invalid Google token');
      const googleEmail = payload.email;

      const db = await this.getDb();
      let user = db.find(u => u.email.toLowerCase() === googleEmail.toLowerCase());

      if (!user) {
        user = {
          id: payload.sub,
          email: payload.email.toLowerCase(),
          name: payload.name || payload.email,
          picture: payload.picture || '',
          role: 'user',
          active: true,
          profileCompleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        db.push(user);
        await this.saveDb(db);
      }

      if (!user.active) {
        throw new UnauthorizedException('Account is deactivated. Please contact administrator.');
      }

      const jwtPayload = { sub: user.id, email: user.email, role: user.role };
      const token = await this.jwtService.signAsync(jwtPayload);

      const { password: _, ...userWithoutPass } = user;
      return {
        access_token: token,
        user: userWithoutPass
      };
    } catch (error: any) {
      console.error('Google Auth Error:', error.message);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    const db = await this.getDb();
    return db.map(({ password: _, ...u }) => u);
  }

  async searchUsers(query: string): Promise<Omit<User, 'password'>[]> {
    const db = await this.getDb();
    const q = query.toLowerCase();
    return db
      .filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .map(({ password: _, ...u }) => u);
  }

  async findUserByEmail(email: string): Promise<Omit<User, 'password'>> {
    const db = await this.getDb();
    const user = db.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new NotFoundException('User not found');
    const { password: _, ...userWithoutPass } = user;
    return userWithoutPass;
  }

  async softDeleteUser(email: string): Promise<{ success: boolean; active: boolean }> {
    const db = await this.getDb();
    const user = db.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new NotFoundException('User not found');
    
    // Soft delete / deactivate user
    user.active = false;
    user.updatedAt = Date.now();
    await this.saveDb(db);
    
    return { success: true, active: false };
  }

  async getStats(): Promise<any> {
    const db = await this.getDb();
    const totalUsers = db.length;
    const activeUsers = db.filter(u => u.active).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    let totalProducts = 0;
    const dbPath = path.join(process.cwd(), 'database.json');
    try {
      const data = await fs.readFile(dbPath, 'utf8');
      const products = JSON.parse(data);
      totalProducts = products.length;
    } catch (e) {}

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalProducts
    };
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const db = await this.getDb();
    const user = db.find(u => u.id === userId);
    if (!user) throw new NotFoundException('User not found');
    const { password: _, ...userWithoutPass } = user;
    return userWithoutPass;
  }

  async updateProfile(userId: string, profileData: Partial<User>): Promise<Omit<User, 'password'>> {
    const db = await this.getDb();
    const user = db.find(u => u.id === userId);
    if (!user) throw new NotFoundException('User not found');

    const email = profileData.email?.toLowerCase();
    const phone = profileData.phone;

    // Check if new email is taken
    if (email && email !== user.email) {
      const taken = db.some(u => u.id !== userId && u.email.toLowerCase() === email);
      if (taken) {
        throw new UnauthorizedException('Email is already in use by another account');
      }
    }

    // Check if new phone is taken
    if (phone && phone !== user.phone) {
      const taken = db.some(u => u.id !== userId && u.phone === phone);
      if (taken) {
        throw new UnauthorizedException('Phone number is already in use by another account');
      }
    }

    // Validate required fields if profileCompleted is true
    if (profileData.profileCompleted === true) {
      if (!profileData.businessName || !profileData.businessName.trim()) {
        throw new UnauthorizedException('Business name is required');
      }
      if (!profileData.businessAddress || !profileData.businessAddress.trim()) {
        throw new UnauthorizedException('Business address is required');
      }
      if (!profileData.name || !profileData.name.trim()) {
        throw new UnauthorizedException('Name is required');
      }
      if (!email || !email.trim()) {
        throw new UnauthorizedException('Email is required');
      }
      if (!phone || !phone.trim()) {
        throw new UnauthorizedException('Phone number is required');
      }
    }

    const oldEmail = user.email;

    // Apply updates
    if (profileData.name !== undefined) user.name = profileData.name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (profileData.businessName !== undefined) user.businessName = profileData.businessName;
    if (profileData.businessLogo !== undefined) user.businessLogo = profileData.businessLogo;
    if (profileData.gstNumber !== undefined) user.gstNumber = profileData.gstNumber;
    if (profileData.businessAddress !== undefined) user.businessAddress = profileData.businessAddress;
    if (profileData.showPhoneOnBills !== undefined) user.showPhoneOnBills = profileData.showPhoneOnBills;
    if (profileData.showEmailOnBills !== undefined) user.showEmailOnBills = profileData.showEmailOnBills;
    if (profileData.profileCompleted !== undefined) user.profileCompleted = profileData.profileCompleted;

    user.updatedAt = Date.now();
    await this.saveDb(db);

    // If email changed, migrate their products in database.json
    if (email && email !== oldEmail) {
      const dbPath = path.join(process.cwd(), 'database.json');
      try {
        const data = await fs.readFile(dbPath, 'utf8');
        const products = JSON.parse(data);
        let migrated = false;
        products.forEach((p: any) => {
          if (p.userId && p.userId.toLowerCase() === oldEmail.toLowerCase()) {
            p.userId = email;
            migrated = true;
          }
        });
        if (migrated) {
          await fs.writeFile(dbPath, JSON.stringify(products, null, 2), 'utf8');
          console.log(`Migrated products owned by ${oldEmail} to ${email}`);
        }
      } catch (e) {
        console.error('Failed to migrate user products:', e);
      }
    }

    const { password: _, ...userWithoutPass } = user;
    return userWithoutPass;
  }

  async changeUserPassword(userEmail: string, oldPass: string, newPass: string): Promise<{ success: boolean }> {
    const db = await this.getDb();
    const user = db.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    if (!user || !user.password) {
      throw new UnauthorizedException('User account not found');
    }

    const passMatch = await bcrypt.compare(oldPass, user.password);
    if (!passMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    user.password = await bcrypt.hash(newPass, 10);
    user.updatedAt = Date.now();
    await this.saveDb(db);
    return { success: true };
  }
}
