import { Controller, Get, Post, Body, Param, Patch, Req, Query, UseGuards } from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature } from '../subscription/subscription.decorators';
import { SubscriptionRepository } from '../subscription/subscription.repository';
import { PurchaseStatus } from '@prisma/client';

@Controller('api/purchase-orders')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('PURCHASE')
export class PurchaseOrderController {
  constructor(
    private readonly poService: PurchaseOrderService,
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
  async create(@Req() req: any, @Body() createDto: CreatePurchaseOrderDto) {
    const ownerId = await this.getOwnerId(req);
    return this.poService.create(ownerId, req.user.sub, createDto);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const ownerId = await this.getOwnerId(req);
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;

    let parsedStatus: PurchaseStatus | undefined;
    if (status && Object.values(PurchaseStatus).includes(status as PurchaseStatus)) {
      parsedStatus = status as PurchaseStatus;
    }

    return this.poService.list(ownerId, {
      page: parsedPage,
      pageSize: parsedPageSize,
      search,
      status: parsedStatus,
    });
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.poService.findById(id, ownerId);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateDto: UpdatePurchaseOrderDto) {
    const ownerId = await this.getOwnerId(req);
    return this.poService.update(id, ownerId, updateDto);
  }

  @Patch(':id/submit')
  async submit(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.poService.submit(id, ownerId);
  }

  @Patch(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.poService.cancel(id, ownerId);
  }
}
