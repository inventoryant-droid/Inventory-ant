import { Controller, Get, Post, Body, Param, Patch, Req, Query, UseGuards } from '@nestjs/common';
import { PurchaseApprovalService } from './purchase-approval.service';
import { StartApprovalDto } from './dto/start-approval.dto';
import { ActionApprovalDto } from './dto/action-approval.dto';
import { CommentApprovalDto } from './dto/comment-approval.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature } from '../subscription/subscription.decorators';
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Controller('api/purchase-approvals')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('PURCHASE')
export class PurchaseApprovalController {
  constructor(
    private readonly approvalService: PurchaseApprovalService,
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

  @Post('start')
  async start(@Req() req: any, @Body() startDto: StartApprovalDto) {
    const ownerId = await this.getOwnerId(req);
    return this.approvalService.startWorkflow(startDto.purchaseOrderId, ownerId);
  }

  @Get('pending')
  async findPending(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const ownerId = await this.getOwnerId(req);
    const userRole = req.user.role || 'Manager'; // Default fallback role if not in token
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;

    return this.approvalService.listPending(ownerId, userRole, {
      page: parsedPage,
      pageSize: parsedPageSize,
    });
  }

  @Get('history/:purchaseOrderId')
  async findHistory(@Req() req: any, @Param('purchaseOrderId') purchaseOrderId: string) {
    const ownerId = await this.getOwnerId(req);
    return this.approvalService.getHistory(purchaseOrderId, ownerId);
  }

  @Patch(':id/approve')
  async approve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() actionDto: ActionApprovalDto,
  ) {
    const ownerId = await this.getOwnerId(req);
    const userRole = req.user.role || 'Manager';
    const userId = req.user.sub;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const deviceInfo = req.headers['user-agent'] || null;

    return this.approvalService.approve(
      id,
      ownerId,
      userRole,
      userId,
      actionDto.comment,
      ipAddress,
      deviceInfo,
    );
  }

  @Patch(':id/reject')
  async reject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() actionDto: ActionApprovalDto,
  ) {
    const ownerId = await this.getOwnerId(req);
    const userRole = req.user.role || 'Manager';
    const userId = req.user.sub;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;
    const deviceInfo = req.headers['user-agent'] || null;

    return this.approvalService.reject(
      id,
      ownerId,
      userRole,
      userId,
      actionDto.comment,
      ipAddress,
      deviceInfo,
    );
  }

  @Patch(':id/comment')
  async comment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() commentDto: CommentApprovalDto,
  ) {
    const ownerId = await this.getOwnerId(req);
    const userId = req.user.sub;

    return this.approvalService.addComment(
      id,
      ownerId,
      userId,
      commentDto.comment,
      commentDto.level,
    );
  }
}
