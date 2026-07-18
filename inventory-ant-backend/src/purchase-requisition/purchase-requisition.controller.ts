import { Controller, Get, Post, Body, Param, Patch, Req, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { PurchaseRequisitionService } from './purchase-requisition.service';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature } from '../subscription/subscription.decorators';
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Controller('api/purchase-requisitions')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('PURCHASE')
export class PurchaseRequisitionController {
  constructor(
    private readonly requisitionService: PurchaseRequisitionService,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  private async getOwnerDetails(req: any): Promise<{ id: string; email: string }> {
    const ownerEmail = req.user.tenantEmail || req.user.email;
    const owner = await this.subscriptionRepository.findUserByEmail(ownerEmail);
    if (!owner) {
      throw new Error('Owner user not found in database');
    }
    return {
      id: owner.id,
      email: owner.email.toLowerCase(),
    };
  }

  @Post()
  async create(@Req() req: any, @Body() createDto: CreateRequisitionDto) {
    const owner = await this.getOwnerDetails(req);
    return this.requisitionService.create(owner.id, owner.email, createDto);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const owner = await this.getOwnerDetails(req);
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;

    return this.requisitionService.list(owner.id, {
      page: parsedPage,
      pageSize: parsedPageSize,
      search,
      status,
    });
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.requisitionService.findById(id, owner.id);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateDto: UpdateRequisitionDto) {
    const owner = await this.getOwnerDetails(req);
    return this.requisitionService.update(id, owner.id, owner.email, updateDto);
  }

  @Patch(':id/submit')
  async submit(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.requisitionService.submit(id, owner.id);
  }

  @Patch(':id/approve')
  async approve(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.requisitionService.approve(id, owner.id);
  }

  @Patch(':id/reject')
  async reject(@Req() req: any, @Param('id') id: string, @Body('reason') reason?: string) {
    const owner = await this.getOwnerDetails(req);
    const rejectionReason = reason || 'No reason provided';
    return this.requisitionService.reject(id, owner.id, rejectionReason);
  }
}
