import { Controller, Get, Post, Body, Param, Patch, Req, Query, UseGuards } from '@nestjs/common';
import { GoodsReceiptService } from './goods-receipt.service';
import { CreateGoodsReceiptDto } from './dto/create-grn.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature } from '../subscription/subscription.decorators';
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Controller('api/goods-receipts')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('PURCHASE')
export class GoodsReceiptController {
  constructor(
    private readonly grnService: GoodsReceiptService,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  private async getOwnerId(req: any): Promise<string> {
    const ownerEmail = req.user.tenantEmail || req.user.email;
    const owner = await this.subscriptionRepository.findUserByEmail(ownerEmail);
    if (!owner) {
      throw new Error('Owner user not found in database');
    }
    return owner.id;
  }

  @Post()
  async create(@Req() req: any, @Body() createDto: CreateGoodsReceiptDto) {
    const ownerId = await this.getOwnerId(req);
    const operatorName = req.user.name || req.user.email;
    return this.grnService.create(ownerId, operatorName, createDto);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const ownerId = await this.getOwnerId(req);
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;

    return this.grnService.list(ownerId, {
      page: parsedPage,
      pageSize: parsedPageSize,
      search,
    });
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.grnService.findById(id, ownerId);
  }

  @Patch(':id/receive')
  async receive(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.grnService.receive(id, ownerId);
  }

  @Patch(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.grnService.cancel(id, ownerId);
  }
}
