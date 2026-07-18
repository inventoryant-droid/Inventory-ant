import { Controller, Get, Post, Body, Param, Patch, Req, Query, UseGuards } from '@nestjs/common';
import { SupplierQuotationService } from './supplier-quotation.service';
import { SubmitQuotationDto } from './dto/submit-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature } from '../subscription/subscription.decorators';
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Controller()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('PURCHASE')
export class SupplierQuotationController {
  constructor(
    private readonly quotationService: SupplierQuotationService,
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

  @Post('api/supplier-quotations')
  async submit(@Req() req: any, @Body() submitDto: SubmitQuotationDto) {
    const owner = await this.getOwnerDetails(req);
    return this.quotationService.submit(owner.id, owner.email, submitDto);
  }

  @Get('api/supplier-quotations')
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('rfqId') rfqId?: string,
  ) {
    const owner = await this.getOwnerDetails(req);
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;

    return this.quotationService.list(owner.id, {
      page: parsedPage,
      pageSize: parsedPageSize,
      search,
      rfqId,
    });
  }

  @Get('api/supplier-quotations/:id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.quotationService.findById(id, owner.id);
  }

  @Patch('api/supplier-quotations/:id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateDto: UpdateQuotationDto) {
    const owner = await this.getOwnerDetails(req);
    return this.quotationService.update(id, owner.id, owner.email, updateDto);
  }

  @Patch('api/supplier-quotations/:id/withdraw')
  async withdraw(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.quotationService.withdraw(id, owner.id);
  }

  @Patch('api/supplier-quotations/:id/review')
  async review(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.quotationService.review(id, owner.id);
  }

  @Patch('api/supplier-quotations/:id/select')
  async select(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.quotationService.select(id, owner.id);
  }

  @Patch('api/supplier-quotations/:id/reject')
  async reject(@Req() req: any, @Param('id') id: string) {
    const owner = await this.getOwnerDetails(req);
    return this.quotationService.reject(id, owner.id);
  }

  @Get('api/rfqs/:id/quotations')
  async findQuotationsForRFQ(
    @Req() req: any,
    @Param('id') rfqId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const owner = await this.getOwnerDetails(req);
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;

    return this.quotationService.list(owner.id, {
      page: parsedPage,
      pageSize: parsedPageSize,
      search,
      rfqId,
    });
  }
}
