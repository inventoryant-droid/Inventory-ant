import { Controller, Get, Post, Body, Param, Put, Delete, Req, UseGuards, Query, Res, ForbiddenException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { SubscriptionGuard } from '../subscription/subscription.guard';
import { RequireFeature, RequireLimit } from '../subscription/subscription.decorators';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionRepository } from '../subscription/subscription.repository';

@Controller('api/user/products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly aiService: AiService,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

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

  private async getOwnerId(req: any): Promise<string> {
    const ownerEmail = req.user.tenantEmail || req.user.email;
    const owner = await this.subscriptionRepository.findUserByEmail(ownerEmail);
    if (!owner) {
      throw new Error("Owner user not found in database");
    }
    return owner.id;
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireLimit('SMART_SCAN', 1)
  @Post('scan-bill')
  async scanBill(@Req() req: any, @Body() scanPayload: any) {
    const tenantEmail = this.validateUser(req);
    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    const res = await this.aiService.processBillWithGemini(tenantEmail, scanPayload, operatorName);

    // Increment SMART_SCAN count after successful execution
    const ownerId = await this.getOwnerId(req);
    await this.subscriptionService.incrementUsage(ownerId, 'SMART_SCAN');

    return res;
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('SMART_SCAN')
  @Post('confirm-bill')
  async confirmBill(@Req() req: any, @Body() confirmPayload: any) {
    const tenantEmail = this.validateUser(req);
    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    return this.aiService.confirmBillScan(tenantEmail, confirmPayload, operatorName);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @Post('agent-command-v2')
  async agentCommandV2(@Req() req: any, @Body() payload: any) {
    const tenantEmail = this.validateUser(req);
    const ownerId = await this.getOwnerId(req);
    const featureCode = payload.isVoice ? 'VOICE_ASSISTANT' : 'AI_CHAT';

    // Verify dynamic feature access
    const canAccess = await this.subscriptionService.canAccessFeature(ownerId, featureCode);
    if (!canAccess) {
      throw new ForbiddenException(`Your active plan does not permit access to feature: ${featureCode}`);
    }

    // Verify dynamic usage limit
    const usage = await this.subscriptionService.getUsage(ownerId, featureCode);
    if (usage.limitValue !== null && usage.remaining !== null && usage.remaining < 1) {
      throw new ForbiddenException({
        error: 'LIMIT_EXCEEDED',
        message: `Monthly limit exceeded for feature: ${featureCode}`,
      });
    }

    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    const res = await this.aiService.processAgentCommandV2(tenantEmail, payload, operatorName);

    // Increment usage after successful execution
    await this.subscriptionService.incrementUsage(ownerId, featureCode);

    return res;
  }

  // Speech playback endpoint - public access to play generated Hinglish audio
  @Get('tts')
  async getTTS(@Query('text') text: string, @Res() res: any) {
    return this.aiService.getGoogleTTS(text, res);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('IMPORT')
  @Post('bulk')
  async createBulk(@Req() req: any, @Body() productsArray: any[]) {
    const ownerId = await this.getOwnerId(req);
    const usage = await this.subscriptionService.getUsage(ownerId, 'INVENTORY');
    if (usage.limitValue !== null && usage.remaining !== null && usage.remaining < productsArray.length) {
      throw new ForbiddenException({
        error: 'LIMIT_EXCEEDED',
        message: `Bulk import size (${productsArray.length} items) exceeds your remaining stock capacity (${usage.remaining} items).`,
        limit: usage.limitValue,
        used: usage.used,
      });
    }
    return this.productsService.createBulk(this.validateUser(req), productsArray);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('BILLING')
  @Post('sell')
  async sellProducts(@Req() req: any, @Body() payload: any) {
    const tenantEmail = this.validateUser(req);
    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    return this.productsService.sellProducts(tenantEmail, payload, operatorName);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('SMART_SCAN')
  @Get('scan-history')
  async getScanHistory(@Req() req: any) {
    return this.productsService.getScanHistory(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('ANALYTICS')
  @Get('history')
  async getInventoryHistory(@Req() req: any) {
    return this.productsService.getInventoryHistory(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('BILLING')
  @Get('bills')
  async getBills(@Req() req: any) {
    return this.productsService.getBills(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('EXPORT')
  @Get('bills/:id/download')
  async downloadInvoicePdf(@Req() req: any, @Param('id') id: string, @Res() res: any) {
    try {
      const tenantEmail = this.validateUser(req);
      const pdfBuffer = await this.productsService.generateInvoicePdf(tenantEmail, id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Invoice PDF download failed:', error);
      res.status((error as any).status || 500).json({ message: (error as any).message || 'Failed to download PDF invoice' });
    }
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('BILLING')
  @Post('bills/:id/undo')
  async undoBill(@Req() req: any, @Param('id') id: string) {
    const tenantEmail = this.validateUser(req);
    const operatorName = req.user.role === 'staff' ? req.user.name || req.user.email : 'Owner';
    return this.productsService.undoBill(tenantEmail, id, operatorName);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireLimit('INVENTORY', 1)
  @Post()
  async create(@Req() req: any, @Body() createProductDto: any) {
    return this.productsService.create(this.validateUser(req), createProductDto);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('INVENTORY')
  @Get()
  async findAll(@Req() req: any) {
    return this.productsService.findAll(this.validateUser(req));
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('AI_CHAT')
  @Get('chat-threads')
  async getChatThreads(@Req() req: any) {
    const tenantEmail = this.validateUser(req);
    return this.aiService.getChatThreads(tenantEmail);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireLimit('AI_CHAT', 1)
  @Post('chat-threads')
  async createChatThread(@Req() req: any, @Body() body: { title?: string }) {
    const tenantEmail = this.validateUser(req);
    const res = await this.aiService.createChatThread(tenantEmail, body.title);

    // Increment AI Chat thread usage count on success
    const ownerId = await this.getOwnerId(req);
    await this.subscriptionService.incrementUsage(ownerId, 'AI_CHAT');

    return res;
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('AI_CHAT')
  @Delete('chat-threads/:id')
  async deleteChatThread(@Req() req: any, @Param('id') id: string) {
    const tenantEmail = this.validateUser(req);
    return this.aiService.deleteChatThread(tenantEmail, id);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('INVENTORY')
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.productsService.findOne(this.validateUser(req), id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('user', 'admin')
  @RequireFeature('INVENTORY')
  @Delete('all')
  async removeAll(@Req() req: any, @Query('password') password?: string) {
    return this.productsService.removeAll(this.validateUser(req), password);
  }

  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireFeature('INVENTORY')
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updateProductDto: any) {
    return this.productsService.update(this.validateUser(req), id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('user', 'admin')
  @RequireFeature('INVENTORY')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.productsService.remove(this.validateUser(req), id);
  }
}
