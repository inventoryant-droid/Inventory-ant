import { Controller, Get, Post, Body, Param, Put, Delete, Req, UseGuards, Query, Res } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';

@Controller('api/user/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private validateUser(req: any): string {
    if (!req.user) {
      throw new Error("User context is missing in token payload");
    }
    const userEmail = req.user.tenantEmail || req.user.email;
    if (!userEmail) {
      throw new Error("Email context is missing in token payload");
    }
    return userEmail.toLowerCase();
  }

  @UseGuards(JwtAuthGuard)
  @Post('scan-bill')
  async scanBill(@Req() req: any, @Body() scanPayload: any) {
    const tenantEmail = this.validateUser(req);
    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    return this.productsService.processBillWithGemini(tenantEmail, scanPayload, operatorName);
  }

  @UseGuards(JwtAuthGuard)
  @Post('agent-command-v2')
  async agentCommandV2(@Req() req: any, @Body() payload: any) {
    const tenantEmail = this.validateUser(req);
    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    return this.productsService.processAgentCommandV2(tenantEmail, payload, operatorName);
  }

  @Get('tts')
  async getTTS(@Query('text') text: string, @Res() res: any) {
    return this.productsService.getGoogleTTS(text, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  async createBulk(@Req() req: any, @Body() productsArray: any[]) {
    return this.productsService.createBulk(this.validateUser(req), productsArray);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sell')
  async sellProducts(@Req() req: any, @Body() payload: any) {
    const tenantEmail = this.validateUser(req);
    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    return this.productsService.sellProducts(tenantEmail, payload, operatorName);
  }

  @UseGuards(JwtAuthGuard)
  @Get('scan-history')
  async getScanHistory(@Req() req: any) {
    return this.productsService.getScanHistory(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getInventoryHistory(@Req() req: any) {
    return this.productsService.getInventoryHistory(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('bills')
  async getBills(@Req() req: any) {
    return this.productsService.getBills(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() createProductDto: any) {
    return this.productsService.create(this.validateUser(req), createProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: any) {
    return this.productsService.findAll(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.productsService.findOne(this.validateUser(req), id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Delete('all')
  async removeAll(@Req() req: any) {
    return this.productsService.removeAll(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateProductDto: any) {
    return this.productsService.update(this.validateUser(req), id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.productsService.remove(this.validateUser(req), id);
  }
}
