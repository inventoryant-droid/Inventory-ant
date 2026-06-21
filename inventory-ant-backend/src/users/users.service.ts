import { Injectable, NotFoundException, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

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
  profileCompleted?: boolean;
  businessName?: string;
  businessType?: string;
  businessLogo?: string;
  gstNumber?: string;
  businessAddress?: string;
  showPhoneOnBills?: boolean;
  showEmailOnBills?: boolean;
  plan?: 'free' | 'basic' | 'pro' | 'enterprise';
  validUntil?: number;
  storageUsed?: number;
  lastLogin?: number;
  adminRole?: 'super_admin' | 'support_admin' | 'finance_admin' | 'tech_admin';
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  private isBCryptHash(str: string): boolean {
    return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
  }

  private mapUser(dbUser: any): Omit<User, 'password'> {
    return {
      id: dbUser.id,
      email: dbUser.email,
      phone: dbUser.phone || undefined,
      name: dbUser.name,
      picture: dbUser.picture || '',
      role: dbUser.role as any,
      active: dbUser.active,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      parentEmail: dbUser.parentEmail || undefined,
      profileCompleted: dbUser.profileCompleted,
      businessName: dbUser.businessName || undefined,
      businessType: dbUser.businessType || undefined,
      businessLogo: dbUser.businessLogo || undefined,
      gstNumber: dbUser.gstNumber || undefined,
      businessAddress: dbUser.businessAddress || undefined,
      showPhoneOnBills: dbUser.showPhoneOnBills,
      showEmailOnBills: dbUser.showEmailOnBills,
      plan: (dbUser.plan as any) || undefined,
      validUntil: dbUser.validUntil || undefined,
      storageUsed: dbUser.storageUsed || undefined,
      lastLogin: dbUser.lastLogin || undefined,
      adminRole: (dbUser.adminRole as any) || undefined,
    };
  }

  async onModuleInit() {
    // Seed default admin if it doesn't exist
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@inventoryant.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const admin = await this.prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!admin) {
      const hashedPass = await bcrypt.hash(adminPassword, 10);
      await this.prisma.user.create({
        data: {
          id: 'admin-' + Math.random().toString(36).substring(2, 10),
          email: adminEmail,
          name: 'Super Admin',
          password: hashedPass,
          picture: '',
          role: 'admin',
          active: true,
          profileCompleted: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          adminRole: 'super_admin'
        }
      });
    }

    const defaultAdminsList = [
      { email: 'support@inventoryant.com', name: 'Support Admin', role: 'support_admin' },
      { email: 'finance@inventoryant.com', name: 'Finance Admin', role: 'finance_admin' },
      { email: 'tech@inventoryant.com', name: 'Technical Admin', role: 'tech_admin' }
    ];

    for (const adm of defaultAdminsList) {
      const exists = await this.prisma.user.findUnique({
        where: { email: adm.email }
      });
      if (!exists) {
        const hashedPass = await bcrypt.hash('admin123', 10);
        await this.prisma.user.create({
          data: {
            id: 'admin-' + Math.random().toString(36).substring(2, 10),
            email: adm.email,
            name: adm.name,
            password: hashedPass,
            picture: '',
            role: 'admin',
            active: true,
            profileCompleted: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            adminRole: adm.role
          }
        });
      }
    }
  }

  async login(identifier: string, password?: string): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier }
        ]
      }
    });

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

    const updatedUser = await this.prisma.user.update({
      where: { email: user.email },
      data: { lastLogin: Date.now() }
    });

    const parentEmail = updatedUser.role === 'staff' ? updatedUser.parentEmail : updatedUser.email;
    const payload = { 
      sub: updatedUser.id, 
      email: updatedUser.email, 
      name: updatedUser.name,
      role: updatedUser.role, 
      tenantEmail: (parentEmail || updatedUser.email).toLowerCase(),
      adminRole: updatedUser.adminRole
    };
    const token = await this.jwtService.signAsync(payload);

    await this.logAction(updatedUser.email, updatedUser.name, updatedUser.role, `Logged in successfully`);

    return {
      access_token: token,
      user: this.mapUser(updatedUser)
    };
  }

  async userSignup(name: string, email: string, password?: string, phone?: string): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      throw new UnauthorizedException('User with this email or phone already exists');
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const newUser = await this.prisma.user.create({
      data: {
        id: Math.random().toString(36).substring(2, 10),
        email: email.toLowerCase(),
        phone: phone || null,
        password: hashedPassword || null,
        name,
        picture: '',
        role: 'user',
        active: true,
        profileCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        plan: 'free',
        validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
        storageUsed: Math.round((5 + Math.random() * 20) * 10) / 10
      }
    });

    const payload = { 
      sub: newUser.id, 
      email: newUser.email, 
      name: newUser.name,
      role: newUser.role,
      tenantEmail: newUser.email.toLowerCase()
    };
    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: this.mapUser(newUser)
    };
  }

  async changeAdminPassword(adminEmail: string, oldPass: string, newPass: string): Promise<{ success: boolean }> {
    const admin = await this.prisma.user.findFirst({
      where: { email: adminEmail.toLowerCase(), role: 'admin' }
    });

    if (!admin || !admin.password) {
      throw new UnauthorizedException('Admin account not found');
    }

    const passMatch = await bcrypt.compare(oldPass, admin.password);
    if (!passMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    const newHashed = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { email: adminEmail.toLowerCase() },
      data: {
        password: newHashed,
        updatedAt: Date.now()
      }
    });

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

      let user = await this.prisma.user.findUnique({
        where: { email: googleEmail.toLowerCase() }
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            id: payload.sub,
            email: payload.email.toLowerCase(),
            name: payload.name || payload.email,
            picture: payload.picture || '',
            role: 'user',
            active: true,
            profileCompleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            plan: 'free',
            validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000,
            storageUsed: Math.round((5 + Math.random() * 20) * 10) / 10
          }
        });
      }

      if (!user.active) {
        throw new UnauthorizedException('Account is deactivated. Please contact administrator.');
      }

      user = await this.prisma.user.update({
        where: { email: googleEmail.toLowerCase() },
        data: { lastLogin: Date.now() }
      });

      const parentEmail = user.role === 'staff' ? user.parentEmail : user.email;
      const jwtPayload = { 
        sub: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role, 
        tenantEmail: (parentEmail || user.email).toLowerCase(),
        adminRole: user.adminRole
      };
      const token = await this.jwtService.signAsync(jwtPayload);

      await this.logAction(user.email, user.name, user.role, `Logged in via Google`);

      return {
        access_token: token,
        user: this.mapUser(user)
      };
    } catch (error: any) {
      console.error('Google Auth Error:', error.message);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    const list = await this.prisma.user.findMany();
    return list.map((u: any) => this.mapUser(u));
  }

  async searchUsers(query: string): Promise<Omit<User, 'password'>[]> {
    const q = query.toLowerCase();
    const list = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      }
    });
    return list.map((u: any) => this.mapUser(u));
  }

  async findUserByEmail(email: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!user) throw new NotFoundException('User not found');
    return this.mapUser(user);
  }

  async softDeleteUser(email: string): Promise<{ success: boolean; active: boolean }> {
    await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        active: false,
        updatedAt: Date.now()
      }
    });
    return { success: true, active: false };
  }

  async deactivateUser(email: string): Promise<{ success: boolean; active: boolean }> {
    await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        active: false,
        updatedAt: Date.now()
      }
    });
    return { success: true, active: false };
  }

  async activateUser(email: string): Promise<{ success: boolean; active: boolean }> {
    await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        active: true,
        updatedAt: Date.now()
      }
    });
    return { success: true, active: true };
  }

  async hardDeleteUser(email: string): Promise<{ success: boolean }> {
    const targetEmail = email.toLowerCase();

    // 1. Delete user and their staff
    await this.prisma.user.deleteMany({
      where: {
        OR: [
          { email: targetEmail },
          { parentEmail: targetEmail }
        ]
      }
    });

    // 2. Delete products
    await this.prisma.product.deleteMany({
      where: { userId: targetEmail }
    });

    // 3. Delete bills
    await this.prisma.bill.deleteMany({
      where: { userId: targetEmail }
    });

    // 4. Delete scans
    await this.prisma.scanHistory.deleteMany({
      where: { userId: targetEmail }
    });

    return { success: true };
  }

  async getStats(): Promise<any> {
    const ownerUsersCount = await this.prisma.user.count({
      where: { role: 'user' }
    });

    const activeUsersCount = await this.prisma.user.count({
      where: { role: 'user', active: true }
    });

    const totalProductsCount = await this.prisma.product.count();

    return {
      totalUsers: ownerUsersCount,
      activeUsers: activeUsersCount,
      inactiveUsers: ownerUsersCount - activeUsersCount,
      totalProducts: totalProductsCount
    };
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('User not found');

    const mapped = this.mapUser(user);

    if (user.role === 'staff' && user.parentEmail) {
      const parent = await this.prisma.user.findUnique({
        where: { email: user.parentEmail.toLowerCase() }
      });
      if (parent) {
        mapped.businessName = parent.businessName || undefined;
        mapped.businessLogo = parent.businessLogo || undefined;
        mapped.businessAddress = parent.businessAddress || undefined;
        mapped.gstNumber = parent.gstNumber || undefined;
      }
    }

    return mapped;
  }

  async updateProfile(userId: string, profileData: Partial<User>): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('User not found');

    const email = profileData.email?.toLowerCase();
    const phone = profileData.phone;

    // Check if email taken
    if (email && email !== user.email) {
      const taken = await this.prisma.user.findFirst({
        where: {
          id: { not: userId },
          email: email
        }
      });
      if (taken) {
        throw new UnauthorizedException('Email is already in use by another account');
      }
    }

    // Check if phone taken
    if (phone && phone !== user.phone) {
      const taken = await this.prisma.user.findFirst({
        where: {
          id: { not: userId },
          phone: phone
        }
      });
      if (taken) {
        throw new UnauthorizedException('Phone number is already in use by another account');
      }
    }

    // Profile completion validation
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

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: profileData.name !== undefined ? profileData.name : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        businessName: profileData.businessName !== undefined ? profileData.businessName : undefined,
        businessType: profileData.businessType !== undefined ? profileData.businessType : undefined,
        businessLogo: profileData.businessLogo !== undefined ? profileData.businessLogo : undefined,
        gstNumber: profileData.gstNumber !== undefined ? profileData.gstNumber : undefined,
        businessAddress: profileData.businessAddress !== undefined ? profileData.businessAddress : undefined,
        showPhoneOnBills: profileData.showPhoneOnBills !== undefined ? !!profileData.showPhoneOnBills : undefined,
        showEmailOnBills: profileData.showEmailOnBills !== undefined ? !!profileData.showEmailOnBills : undefined,
        profileCompleted: profileData.profileCompleted !== undefined ? !!profileData.profileCompleted : undefined,
        updatedAt: Date.now()
      }
    });

    // Migrate products if email changed
    if (email && email !== oldEmail) {
      await this.prisma.product.updateMany({
        where: { userId: oldEmail },
        data: { userId: email }
      });
      console.log(`Migrated products owned by ${oldEmail} to ${email}`);
    }

    return this.mapUser(updated);
  }

  async changeUserPassword(userEmail: string, oldPass: string, newPass: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() }
    });
    if (!user || !user.password) {
      throw new UnauthorizedException('User account not found');
    }

    const passMatch = await bcrypt.compare(oldPass, user.password);
    if (!passMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { email: userEmail.toLowerCase() },
      data: {
        password: hashed,
        updatedAt: Date.now()
      }
    });

    return { success: true };
  }

  async createStaff(ownerEmail: string, staffData: { name: string; phone?: string; password?: string; picture?: string }): Promise<Omit<User, 'password'>> {
    const owner = await this.prisma.user.findUnique({
      where: { email: ownerEmail.toLowerCase() }
    });
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
    while (true) {
      const exists = await this.prisma.user.findUnique({
        where: { email: staffEmail.toLowerCase() }
      });
      if (!exists) break;
      attempts++;
      staffEmail = `${cleanedName}${attempts}@${cleanedBiz}.ant`;
    }

    if (staffData.phone) {
      const phoneExists = await this.prisma.user.findFirst({
        where: { phone: staffData.phone }
      });
      if (phoneExists) {
        throw new UnauthorizedException('Phone number is already associated with another account');
      }
    }

    const hashedPassword = staffData.password ? await bcrypt.hash(staffData.password, 10) : await bcrypt.hash('staff123', 10);

    const newStaff = await this.prisma.user.create({
      data: {
        id: 'staff-' + Math.random().toString(36).substring(2, 10),
        email: staffEmail.toLowerCase(),
        phone: staffData.phone || null,
        password: hashedPassword,
        name: staffData.name,
        picture: staffData.picture || '',
        role: 'staff',
        active: true,
        profileCompleted: true,
        parentEmail: ownerEmail.toLowerCase(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    });

    return this.mapUser(newStaff);
  }

  async findStaffByOwner(ownerEmail: string): Promise<Omit<User, 'password'>[]> {
    const list = await this.prisma.user.findMany({
      where: {
        role: 'staff',
        parentEmail: ownerEmail.toLowerCase()
      }
    });
    return list.map((u: any) => this.mapUser(u));
  }

  async updateStaff(ownerEmail: string, staffId: string, updateData: Partial<User>): Promise<Omit<User, 'password'>> {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        role: 'staff',
        parentEmail: ownerEmail.toLowerCase()
      }
    });
    if (!staff) {
      throw new NotFoundException('Staff account not found or access denied');
    }

    if (updateData.phone && updateData.phone !== staff.phone) {
      const taken = await this.prisma.user.findFirst({
        where: {
          id: { not: staffId },
          phone: updateData.phone
        }
      });
      if (taken) {
        throw new UnauthorizedException('Phone number is already associated with another account');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: {
        name: updateData.name !== undefined ? updateData.name : undefined,
        phone: updateData.phone !== undefined ? updateData.phone : undefined,
        picture: updateData.picture !== undefined ? updateData.picture : undefined,
        active: updateData.active !== undefined ? !!updateData.active : undefined,
        updatedAt: Date.now()
      }
    });

    return this.mapUser(updated);
  }

  async updateStaffPassword(ownerEmail: string, staffId: string, newPass: string): Promise<{ success: boolean }> {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        role: 'staff',
        parentEmail: ownerEmail.toLowerCase()
      }
    });
    if (!staff) {
      throw new NotFoundException('Staff account not found or access denied');
    }

    if (!newPass || newPass.trim().length < 4) {
      throw new UnauthorizedException('Password must be at least 4 characters long');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: staffId },
      data: {
        password: hashed,
        updatedAt: Date.now()
      }
    });

    return { success: true };
  }

  async deleteStaff(ownerEmail: string, staffId: string): Promise<{ success: boolean }> {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        role: 'staff',
        parentEmail: ownerEmail.toLowerCase()
      }
    });
    if (!staff) {
      throw new NotFoundException('Staff account not found or access denied');
    }

    await this.prisma.user.delete({
      where: { id: staffId }
    });

    return { success: true };
  }

  async getLogs(): Promise<any[]> {
    return this.prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' }
    });
  }

  async logAction(email: string, userName: string, role: string, action: string, ip: string = '127.0.0.1', device: string = 'Desktop Web'): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          id: 'LOG-' + Math.floor(100000 + Math.random() * 900000),
          userId: email,
          userName: userName || 'N/A',
          role,
          action,
          ip,
          device,
          timestamp: Date.now()
        }
      });

      // Keep under 500 logs
      const logsCount = await this.prisma.activityLog.count();
      if (logsCount > 500) {
        const oldest = await this.prisma.activityLog.findMany({
          orderBy: { timestamp: 'asc' },
          take: logsCount - 500
        });
        if (oldest.length > 0) {
          await this.prisma.activityLog.deleteMany({
            where: { id: { in: oldest.map((o: any) => o.id) } }
          });
        }
      }
    } catch (err ) {
      console.error('Failed to write activity log:', err);
    }
  }

  async impersonateUser(email: string): Promise<{ access_token: string; user: Omit<User, 'password'> }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'user' && user.role !== 'staff') {
      throw new UnauthorizedException('Can only impersonate business owners or staff');
    }
    const parentEmail = user.role === 'staff' ? user.parentEmail : user.email;
    const payload = { 
      sub: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role, 
      tenantEmail: (parentEmail || user.email).toLowerCase(),
      impersonated: true
    };
    const token = await this.jwtService.signAsync(payload);
    
    await this.logAction(user.email, user.name, user.role, `Impersonated by Administrator`);

    return {
      access_token: token,
      user: this.mapUser(user)
    };
  }

  async updateUserPlan(email: string, plan: 'free' | 'basic' | 'pro' | 'enterprise', validityInDays: number): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'user') {
      throw new UnauthorizedException('Can only modify plans for business owners');
    }

    const updated = await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        plan,
        validUntil: Date.now() + validityInDays * 24 * 60 * 60 * 1000,
        updatedAt: Date.now()
      }
    });

    await this.logAction(email, user.name, user.role, `Plan updated to ${plan} (validity: ${validityInDays} days) by Administrator`);

    return this.mapUser(updated);
  }

  async adminResetUserPassword(email: string, newPass: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!user) throw new NotFoundException('User not found');

    const hashed = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        password: hashed,
        updatedAt: Date.now()
      }
    });

    await this.logAction(email, user.name, user.role, `Password reset by Administrator`);
    return { success: true };
  }

  async getTickets(): Promise<any[]> {
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTicketsForUser(email: string): Promise<any[]> {
    return this.prisma.supportTicket.findMany({
      where: { userId: email.toLowerCase() },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTicket(email: string, subject: string, description: string, priority: 'low' | 'medium' | 'high'): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    const businessName = user?.businessName || 'N/A';
    
    const newTicket = await this.prisma.supportTicket.create({
      data: {
        id: 'TCK-' + Math.floor(100 + Math.random() * 900),
        userId: email.toLowerCase(),
        businessName,
        subject,
        description,
        priority,
        status: 'open',
        createdAt: Date.now(),
        assignedAdmin: ''
      }
    });
    
    await this.logAction(email, user?.name || email, user?.role || 'user', `Created support ticket: ${subject}`);
    return newTicket;
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    const t = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });
    if (!t) throw new NotFoundException('Ticket not found');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status }
    });
  }

  async assignTicket(ticketId: string, adminEmail: string): Promise<any> {
    const t = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });
    if (!t) throw new NotFoundException('Ticket not found');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedAdmin: adminEmail.toLowerCase(),
        status: 'in_progress'
      }
    });
  }

  async getNotifications(): Promise<any[]> {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createAnnouncement(target: string, title: string, message: string): Promise<any> {
    return this.prisma.notification.create({
      data: {
        id: 'NTF-' + Math.floor(100 + Math.random() * 900),
        target,
        title,
        message,
        createdAt: Date.now()
      }
    });
  }

  async getPayments(): Promise<any[]> {
    const count = await this.prisma.payment.count();
    if (count === 0) {
      // Seed default transactions if empty
      const list = [
        {
          id: 'TXN-881',
          userId: 'owner@biz.com',
          businessName: 'Apex Groceries',
          amount: 2999.00,
          plan: 'pro',
          status: 'success',
          timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
          invoiceId: 'INV-2026-001'
        },
        {
          id: 'TXN-882',
          userId: 'dk@warehouse.com',
          businessName: 'DK Warehouses',
          amount: 999.00,
          plan: 'basic',
          status: 'success',
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
          invoiceId: 'INV-2026-002'
        },
        {
          id: 'TXN-883',
          userId: 'owner@biz.com',
          businessName: 'Apex Groceries',
          amount: 2999.00,
          plan: 'pro',
          status: 'refunded',
          timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000,
          invoiceId: 'INV-2026-003'
        }
      ];
      await this.prisma.payment.createMany({
        data: list
      });
    }
    return this.prisma.payment.findMany({
      orderBy: { timestamp: 'desc' }
    });
  }

  async refundPayment(txnId: string): Promise<any> {
    const txn = await this.prisma.payment.findUnique({
      where: { id: txnId }
    });
    if (!txn) throw new NotFoundException('Transaction not found');

    const updated = await this.prisma.payment.update({
      where: { id: txnId },
      data: { status: 'refunded' }
    });

    await this.logAction(txn.userId, txn.businessName, 'user', `Payment refunded for invoice ${txn.invoiceId} (${txn.amount} INR)`);
    return updated;
  }

  async addPayment(email: string, amount: number, plan: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    return this.prisma.payment.create({
      data: {
        id: 'TXN-' + Math.floor(100 + Math.random() * 900),
        userId: email.toLowerCase(),
        businessName: user?.businessName || 'N/A',
        amount,
        plan,
        status: 'success',
        timestamp: Date.now(),
        invoiceId: 'INV-2026-' + Math.floor(1000 + Math.random() * 9000)
      }
    });
  }

  async getSystemStatus(): Promise<any> {
    const getFileSize = async (filePath: string): Promise<number> => {
      try {
        const stats = await fs.stat(filePath);
        return stats.size;
      } catch (e) {
        return 0;
      }
    };

    const cwd = process.cwd();
    const usersSize = await getFileSize(path.join(cwd, 'users.json'));
    const databaseSize = await getFileSize(path.join(cwd, 'database.json'));
    const billsSize = await getFileSize(path.join(cwd, 'bills.json'));
    const scanHistorySize = await getFileSize(path.join(cwd, 'scan_history.json'));
    const ticketsSize = await getFileSize(path.join(cwd, 'support_tickets.json'));
    const logsSize = await getFileSize(path.join(cwd, 'activity_logs.json'));
    const paymentsSize = await getFileSize(path.join(cwd, 'payments.json'));
    const notificationsSize = await getFileSize(path.join(cwd, 'notifications.json'));

    return {
      dbSizes: {
        users: usersSize,
        database: databaseSize,
        bills: billsSize,
        scanHistory: scanHistorySize,
        tickets: ticketsSize,
        logs: logsSize,
        payments: paymentsSize,
        notifications: notificationsSize,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };
  }
}
