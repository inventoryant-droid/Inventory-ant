import { Controller, Get, Post, Body, Param, Patch, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature } from '../subscription/subscription.decorators';
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Controller('api/suppliers')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('SUPPLIER')
export class SupplierController {
  constructor(
    private readonly supplierService: SupplierService,
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
  async create(@Req() req: any, @Body() createSupplierDto: CreateSupplierDto) {
    const ownerId = await this.getOwnerId(req);
    return this.supplierService.create(ownerId, createSupplierDto);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    const ownerId = await this.getOwnerId(req);
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;
    
    let parsedActive: boolean | undefined;
    if (active === 'true') parsedActive = true;
    if (active === 'false') parsedActive = false;

    return this.supplierService.list(ownerId, {
      page: parsedPage,
      pageSize: parsedPageSize,
      search,
      active: parsedActive,
    });
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.supplierService.findById(id, ownerId);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    const ownerId = await this.getOwnerId(req);
    return this.supplierService.update(id, ownerId, updateSupplierDto);
  }

  @Patch(':id/activate')
  async activate(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.supplierService.activate(id, ownerId);
  }

  @Patch(':id/deactivate')
  async deactivate(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.supplierService.deactivate(id, ownerId);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const ownerId = await this.getOwnerId(req);
    return this.supplierService.softDelete(id, ownerId);
  }
}
