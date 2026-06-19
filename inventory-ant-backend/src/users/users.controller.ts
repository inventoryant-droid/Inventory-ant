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
    return this.usersService.softDeleteUser(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/stats')
  async getStats() {
    return this.usersService.getStats();
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/profile')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('user/profile')
  async updateProfile(@Req() req: any, @Body() profileData: any) {
    return this.usersService.updateProfile(req.user.sub, profileData);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/change-password')
  async changeUserPassword(@Req() req: any, @Body() body: { oldPass: string; newPass: string }) {
    return this.usersService.changeUserPassword(req.user.email, body.oldPass, body.newPass);
  }
}
