import { Controller, Get, Post, Body, Param, Put, Delete, Req, UseGuards, Query, Res } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('api/user/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private validateUser(req: any): string {
    if (!req.user || !req.user.email) {
      throw new Error("User context is missing in token payload");
    }
    return req.user.email.toLowerCase();
  }

  @UseGuards(JwtAuthGuard)
  @Post('scan-bill')
  async scanBill(@Req() req: any, @Body() scanPayload: any) {
    return this.productsService.processBillWithGemini(this.validateUser(req), scanPayload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('agent-command-v2')
  async agentCommandV2(@Req() req: any, @Body() payload: { text: string }) {
    return this.productsService.processAgentCommandV2(this.validateUser(req), payload);
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
  async sellProducts(@Req() req: any, @Body() cart: any[]) {
    return this.productsService.sellProducts(this.validateUser(req), cart);
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

  @UseGuards(JwtAuthGuard)
  @Delete('all')
  async removeAll(@Req() req: any) {
    return this.productsService.removeAll(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateProductDto: any) {
    return this.productsService.update(this.validateUser(req), id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.productsService.remove(this.validateUser(req), id);
  }
}
