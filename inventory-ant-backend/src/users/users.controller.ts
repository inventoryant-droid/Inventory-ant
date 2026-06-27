import { Controller, Post, Body, Get, Delete, Param, UseGuards, Query, Req, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('api')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('auth/google')
  async googleLogin(@Body('code') code: string) {
    return this.usersService.handleGoogleLogin(code);
  }

  @Post('auth/signup')
  async signup(@Body() body: { name: string; email: string; phone?: string; password?: string }) {
    return this.usersService.userSignup(body.name, body.email, body.password, body.phone);
  }

  @Post('auth/login')
  async login(@Body() body: { email: string; password?: string }) {
    return this.usersService.login(body.email, body.password);
  }

  @Post('auth/refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.usersService.refreshToken(refreshToken);
  }

  @Post('admin/login')
  async adminLogin(@Body() body: { username: string; password?: string }) {
    return this.usersService.login(body.username, body.password);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/change-password')
  async changeAdminPassword(@Req() req: any, @Body() body: { oldPass: string; newPass: string }) {
    return this.usersService.changeAdminPassword(req.user.email, body.oldPass, body.newPass);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/users')
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/users/search')
  async searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query || '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/users/:email')
  async getUserProfile(@Param('email') email: string) {
    return this.usersService.findUserByEmail(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/users/:email')
  async removeUser(@Param('email') email: string) {
    return this.usersService.hardDeleteUser(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('admin/users/:email/deactivate')
  async deactivateUser(@Param('email') email: string) {
    return this.usersService.deactivateUser(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('admin/users/:email/activate')
  async activateUser(@Param('email') email: string) {
    return this.usersService.activateUser(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/stats')
  async getStats() {
    return this.usersService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'staff')
  @Get('user/profile')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Put('user/profile')
  async updateProfile(@Req() req: any, @Body() profileData: any) {
    return this.usersService.updateProfile(req.user.sub, profileData);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/change-password')
  async changeUserPassword(@Req() req: any, @Body() body: { oldPass: string; newPass: string }) {
    return this.usersService.changeUserPassword(req.user.email, body.oldPass, body.newPass);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Post('user/staff')
  async createStaff(@Req() req: any, @Body() staffData: any) {
    return this.usersService.createStaff(req.user.email, staffData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Get('user/staff')
  async getStaff(@Req() req: any) {
    return this.usersService.findStaffByOwner(req.user.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Put('user/staff/:id')
  async updateStaff(@Req() req: any, @Param('id') staffId: string, @Body() staffData: any) {
    return this.usersService.updateStaff(req.user.email, staffId, staffData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Put('user/staff/:id/password')
  async updateStaffPassword(@Req() req: any, @Param('id') staffId: string, @Body() body: { newPass: string }) {
    return this.usersService.updateStaffPassword(req.user.email, staffId, body.newPass);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Delete('user/staff/:id')
  async deleteStaff(@Req() req: any, @Param('id') staffId: string) {
    return this.usersService.deleteStaff(req.user.email, staffId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/impersonate/:email')
  async impersonate(@Param('email') email: string) {
    return this.usersService.impersonateUser(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('admin/users/:email/plan')
  async updatePlan(@Param('email') email: string, @Body() body: { plan: 'free' | 'basic' | 'pro' | 'enterprise'; validityInDays: number }) {
    return this.usersService.updateUserPlan(email, body.plan, body.validityInDays);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/users/:email/reset-password')
  async resetPassword(@Param('email') email: string, @Body() body: { newPass: string }) {
    return this.usersService.adminResetUserPassword(email, body.newPass);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/tickets')
  async getTickets() {
    return this.usersService.getTickets();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('admin/tickets/:id/status')
  async updateTicketStatus(@Param('id') ticketId: string, @Body() body: { status: string }) {
    return this.usersService.updateTicketStatus(ticketId, body.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('admin/tickets/:id/assign')
  async assignTicket(@Param('id') ticketId: string, @Req() req: any) {
    return this.usersService.assignTicket(ticketId, req.user.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/logs')
  async getLogs() {
    return this.usersService.getLogs();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/payments')
  async getPayments() {
    return this.usersService.getPayments();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/payments/refund')
  async refundPayment(@Body('txnId') txnId: string) {
    return this.usersService.refundPayment(txnId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/notifications')
  async getAdminNotifications() {
    return this.usersService.getNotifications();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/notifications')
  async createAnnouncement(@Body() body: { target: string; title: string; message: string }) {
    return this.usersService.createAnnouncement(body.target, body.title, body.message);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/system')
  async getSystemStatus() {
    return this.usersService.getSystemStatus();
  }

  // --- Endpoints for standard Users/Owners to create and see tickets, and see notifications ---
  @UseGuards(JwtAuthGuard)
  @Get('user/tickets')
  async getUserTickets(@Req() req: any) {
    return this.usersService.getTicketsForUser(req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/tickets')
  async createUserTicket(@Req() req: any, @Body() body: { subject: string; description: string; priority: 'low' | 'medium' | 'high' }) {
    return this.usersService.createTicket(req.user.email, body.subject, body.description, body.priority);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/notifications')
  async getUserNotifications() {
    return this.usersService.getNotifications();
  }
}
