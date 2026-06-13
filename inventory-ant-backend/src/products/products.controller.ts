import { Controller, Get, Post, Body, Param, Put, Delete, Headers, UnauthorizedException, Query, Res } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private validateUser(userId: string) {
    if (!userId) throw new UnauthorizedException("Missing x-user-id header. You must be logged in.");
    return userId;
  }

  @Post('scan-bill')
  async scanBill(@Headers('x-user-id') userId: string, @Body() scanPayload: any) {
    if(!scanPayload.base64Image) {
        return this.productsService.processBillMock(this.validateUser(userId), scanPayload);
    }
    return this.productsService.processBillWithGemini(this.validateUser(userId), scanPayload);
  }

  @Post('agent-command-v2')
  async agentCommandV2(@Headers('x-user-id') userId: string, @Body() payload: { text: string }) {
    return this.productsService.processAgentCommandV2(this.validateUser(userId), payload);
  }

  @Get('tts')
  async getTTS(@Query('text') text: string, @Res() res: any) {
    return this.productsService.getGoogleTTS(text, res);
  }

  @Post('bulk')
  async createBulk(@Headers('x-user-id') userId: string, @Body() productsArray: any[]) {
    return this.productsService.createBulk(this.validateUser(userId), productsArray);
  }

  @Post('sell')
  async sellProducts(@Headers('x-user-id') userId: string, @Body() cart: any[]) {
    return this.productsService.sellProducts(this.validateUser(userId), cart);
  }

  @Post()
  async create(@Headers('x-user-id') userId: string, @Body() createProductDto: any) {
    return this.productsService.create(this.validateUser(userId), createProductDto);
  }

  @Get()
  async findAll(@Headers('x-user-id') userId: string) {
    return this.productsService.findAll(this.validateUser(userId));
  }

  @Get(':id')
  async findOne(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    return this.productsService.findOne(this.validateUser(userId), id);
  }

  @Delete('all')
  async removeAll(@Headers('x-user-id') userId: string) {
    return this.productsService.removeAll(this.validateUser(userId));
  }

  @Put(':id')
  async update(@Headers('x-user-id') userId: string, @Param('id') id: string, @Body() updateProductDto: any) {
    return this.productsService.update(this.validateUser(userId), id, updateProductDto);
  }

  @Delete(':id')
  async remove(@Headers('x-user-id') userId: string, @Param('id') id: string) {
    return this.productsService.remove(this.validateUser(userId), id);
  }
}
