import { Controller, Get, Post, Body, Param, Patch, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { RequestForQuotationService } from './request-for-quotation.service';
import { CreateRFQDto } from './dto/create-rfq.dto';
import { UpdateRFQDto } from './dto/update-rfq.dto';
import { AddSupplierDto } from './dto/add-supplier.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature } from '../subscription/subscription.decorators';
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Controller('api/rfqs')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('PURCHASE')
export class RequestForQuotationController {
  constructor(
    private readonly rfqService: RequestForQuotationService,
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
      email: owner.email,
    };
  }

  @Post()
  async create(@Req() req: any, @Body() createDto: CreateRFQDto) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.create(owner.id, req.user.sub, createDto);
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

    return this.rfqService.list(owner.id, {
      page: parsedPage,
      pageSize: parsedPageSize,
      search,
      status,
    });
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.findById(id, owner.id);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateDto: UpdateRFQDto) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.update(id, owner.id, updateDto);
  }

  @Patch(':id/send')
  async send(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.send(id, owner.id);
  }

  @Patch(':id/close-responses')
  async closeResponses(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.closeResponses(id, owner.id);
  }

  @Patch(':id/close')
  async close(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.close(id, owner.id);
  }

  @Post(':id/suppliers')
  async addSupplier(@Req() req: any, @Param('id') id: string, @Body() addDto: AddSupplierDto) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.addSupplier(id, owner.id, addDto.supplierId);
  }

  @Delete(':id/suppliers/:supplierId')
  async removeSupplier(
    @Req() req: any,
    @Param('id') id: string,
    @Param('supplierId') supplierId: string,
  ) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.removeSupplier(id, owner.id, supplierId);
  }

  @Get(':id/suppliers')
  async getSuppliers(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.rfqService.getSuppliers(id, owner.id);
  }
}
