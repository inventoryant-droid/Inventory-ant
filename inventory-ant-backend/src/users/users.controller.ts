import { Controller, Post, Body, Get, Delete, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
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
    // The frontend sends the "Email or Phone Number" value in the `email` field
    return this.usersService.userLogin(body.email, body.password);
  }

  @Post('admin/login')
  async adminLogin(@Body() body: { username: string; password: string }) {
    return this.usersService.adminLogin(body.username, body.password);
  }

  @Post('admin/change-password')
  async changeAdminPassword(@Body() body: { oldPass: string; newPass: string }) {
    return this.usersService.changeAdminPassword(body.oldPass, body.newPass);
  }

  @Get()
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Delete(':email')
  async removeUser(@Param('email') email: string) {
    return this.usersService.removeUser(email);
  }
}
