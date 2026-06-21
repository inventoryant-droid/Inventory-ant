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
  role: 'user' | 'admin' | 'staff';
  active: boolean;
  createdAt: number;
  updatedAt: number;
  parentEmail?: string;
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

    const parentEmail = user.role === 'staff' ? user.parentEmail : user.email;
    const payload = { 
      sub: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role, 
      tenantEmail: (parentEmail || user.email).toLowerCase() 
    };
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

    const payload = { 
      sub: newUser.id, 
      email: newUser.email, 
      name: newUser.name,
      role: newUser.role,
      tenantEmail: newUser.email.toLowerCase()
    };
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

      const parentEmail = user.role === 'staff' ? user.parentEmail : user.email;
      const jwtPayload = { 
        sub: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role, 
        tenantEmail: (parentEmail || user.email).toLowerCase() 
      };
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

  async activateUser(email: string): Promise<{ success: boolean; active: boolean }> {
    const db = await this.getDb();
    const user = db.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new NotFoundException('User not found');
    
    // Activate user
    user.active = true;
    user.updatedAt = Date.now();
    await this.saveDb(db);
    
    return { success: true, active: true };
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

    if (user.role === 'staff' && user.parentEmail) {
      const parent = db.find(u => u.email.toLowerCase() === user.parentEmail!.toLowerCase());
      if (parent) {
        userWithoutPass.businessName = parent.businessName;
        userWithoutPass.businessLogo = parent.businessLogo;
        userWithoutPass.businessAddress = parent.businessAddress;
        userWithoutPass.gstNumber = parent.gstNumber;
      }
    }

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

  async createStaff(ownerEmail: string, staffData: { name: string; phone?: string; password?: string; picture?: string }): Promise<Omit<User, 'password'>> {
    const db = await this.getDb();
    const owner = db.find(u => u.email.toLowerCase() === ownerEmail.toLowerCase());
    if (!owner) {
      throw new NotFoundException('Owner account not found');
    }

    if (!owner.businessName || !owner.businessName.trim()) {
      throw new UnauthorizedException('Please complete your Business Profile onboarding first.');
    }

    const cleanedBiz = owner.businessName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanedName = staffData.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    let staffEmail = `${cleanedName}@${cleanedBiz}.ant`;
    let attempts = 0;
    while (db.some(u => u.email.toLowerCase() === staffEmail.toLowerCase())) {
      attempts++;
      staffEmail = `${cleanedName}${attempts}@${cleanedBiz}.ant`;
    }

    if (staffData.phone) {
      const phoneExists = db.some(u => u.phone === staffData.phone);
      if (phoneExists) {
        throw new UnauthorizedException('Phone number is already associated with another account');
      }
    }

    const hashedPassword = staffData.password ? await bcrypt.hash(staffData.password, 10) : await bcrypt.hash('staff123', 10);

    const newStaff: User = {
      id: 'staff-' + Math.random().toString(36).substring(2, 10),
      email: staffEmail.toLowerCase(),
      phone: staffData.phone,
      password: hashedPassword,
      name: staffData.name,
      picture: staffData.picture || '',
      role: 'staff',
      active: true,
      profileCompleted: true,
      parentEmail: ownerEmail.toLowerCase(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.push(newStaff);
    await this.saveDb(db);

    const { password: _, ...staffWithoutPass } = newStaff;
    return staffWithoutPass;
  }

  async findStaffByOwner(ownerEmail: string): Promise<Omit<User, 'password'>[]> {
    const db = await this.getDb();
    return db
      .filter(u => u.role === 'staff' && u.parentEmail?.toLowerCase() === ownerEmail.toLowerCase())
      .map(({ password: _, ...u }) => u);
  }

  async updateStaff(ownerEmail: string, staffId: string, updateData: Partial<User>): Promise<Omit<User, 'password'>> {
    const db = await this.getDb();
    const staff = db.find(u => u.id === staffId && u.role === 'staff' && u.parentEmail?.toLowerCase() === ownerEmail.toLowerCase());
    if (!staff) {
      throw new NotFoundException('Staff account not found or access denied');
    }

    if (updateData.phone && updateData.phone !== staff.phone) {
      const taken = db.some(u => u.id !== staffId && u.phone === updateData.phone);
      if (taken) {
        throw new UnauthorizedException('Phone number is already associated with another account');
      }
    }

    if (updateData.name !== undefined) staff.name = updateData.name;
    if (updateData.phone !== undefined) staff.phone = updateData.phone;
    if (updateData.picture !== undefined) staff.picture = updateData.picture;
    if (updateData.active !== undefined) staff.active = !!updateData.active;

    staff.updatedAt = Date.now();
    await this.saveDb(db);

    const { password: _, ...staffWithoutPass } = staff;
    return staffWithoutPass;
  }

  async updateStaffPassword(ownerEmail: string, staffId: string, newPass: string): Promise<{ success: boolean }> {
    const db = await this.getDb();
    const staff = db.find(u => u.id === staffId && u.role === 'staff' && u.parentEmail?.toLowerCase() === ownerEmail.toLowerCase());
    if (!staff) {
      throw new NotFoundException('Staff account not found or access denied');
    }

    if (!newPass || newPass.trim().length < 4) {
      throw new UnauthorizedException('Password must be at least 4 characters long');
    }

    staff.password = await bcrypt.hash(newPass, 10);
    staff.updatedAt = Date.now();
    await this.saveDb(db);
    return { success: true };
  }

  async deleteStaff(ownerEmail: string, staffId: string): Promise<{ success: boolean }> {
    const db = await this.getDb();
    const idx = db.findIndex(u => u.id === staffId && u.role === 'staff' && u.parentEmail?.toLowerCase() === ownerEmail.toLowerCase());
    if (idx === -1) {
      throw new NotFoundException('Staff account not found or access denied');
    }

    db.splice(idx, 1);
    await this.saveDb(db);
    return { success: true };
  }
}
