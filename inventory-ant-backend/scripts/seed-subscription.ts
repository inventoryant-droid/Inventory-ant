import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'Free Plan',
    slug: 'free',
    description: 'Perfect for small shops or trial users.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 30,
    isActive: true,
    displayOrder: 0,
  },
  {
    name: 'Silver Plan',
    slug: 'basic',
    description: 'Great for growing businesses.',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    trialDays: 0,
    isActive: true,
    displayOrder: 1,
  },
  {
    name: 'Gold Plan',
    slug: 'pro',
    description: 'All premium features and high AI limits.',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    trialDays: 0,
    isActive: true,
    displayOrder: 2,
  },
  {
    name: 'Enterprise Plan',
    slug: 'enterprise',
    description: 'Custom setups and dedicated support.',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    trialDays: 0,
    isActive: true,
    displayOrder: 3,
  },
];

const FEATURES = [
  { code: 'INVENTORY', name: 'Inventory Management', category: 'Inventory', description: 'Track products and stocks.' },
  { code: 'BILLING', name: 'POS Billing Terminal', category: 'Billing', description: 'Checkout and billing terminal.' },
  { code: 'ANALYTICS', name: 'Standard Analytics', category: 'Analytics', description: 'Analytics and sales statistics.' },
  { code: 'AI_CHAT', name: 'Gemini Conversational Chat', category: 'AI', description: 'Conversational assistant.' },
  { code: 'VOICE_ASSISTANT', name: 'Hinglish Voice Assistant', category: 'AI', description: 'Voice command parser.' },
  { code: 'SMART_SCAN', name: 'Gemini Invoice Scanner', category: 'AI', description: 'Vision invoice parsing.' },
  { code: 'OCR_SCAN', name: 'OCR Fallback Scanner', category: 'AI', description: 'Local document OCR.' },
  { code: 'WAREHOUSE', name: 'Multiple Warehouses', category: 'Inventory', description: 'Create multi-warehouse mappings.' },
  { code: 'STAFF', name: 'Staff Management', category: 'Admin', description: 'Manage employee logins.' },
  { code: 'NOTIFICATION', name: 'Broadcast System', category: 'Admin', description: 'Receive broadcast alerts.' },
  { code: 'BARCODE', name: 'Barcode Processing', category: 'Inventory', description: 'Generate and scan barcodes.' },
  { code: 'REPORT', name: 'Advanced PDF Reports', category: 'Reports', description: 'Custom transactional reports.' },
  { code: 'PURCHASE', name: 'Purchase Ledger', category: 'Inventory', description: 'Purchase ledger tracking.' },
  { code: 'SUPPLIER', name: 'Supplier Management', category: 'Inventory', description: 'Manage suppliers.' },
  { code: 'CUSTOMER', name: 'Customer Registry', category: 'Billing', description: 'Manage buyers and directory.' },
  { code: 'API', name: 'External API Access', category: 'Admin', description: 'Connect third-party channels.' },
  { code: 'EXPORT', name: 'Data Export Options', category: 'Admin', description: 'Export inventory as Excel/CSV.' },
  { code: 'IMPORT', name: 'Data Import Options', category: 'Admin', description: 'Import inventory from Excel/CSV.' },
  { code: 'FORECAST', name: 'Inventory Forecasting', category: 'AI', description: 'Gemini-driven predictive metrics.' },
  { code: 'PREDICTION', name: 'Demand Prediction', category: 'AI', description: 'Calculate future demands.' },
];

const PLAN_FEATURES: Record<string, Array<{ code: string; enabled: boolean; limitValue: number | null }>> = {
  free: [
    { code: 'INVENTORY', enabled: true, limitValue: 50 },
    { code: 'BILLING', enabled: true, limitValue: null },
    { code: 'ANALYTICS', enabled: true, limitValue: null },
    { code: 'AI_CHAT', enabled: true, limitValue: 20 },
    { code: 'VOICE_ASSISTANT', enabled: false, limitValue: 0 },
    { code: 'SMART_SCAN', enabled: true, limitValue: 5 },
    { code: 'OCR_SCAN', enabled: true, limitValue: null },
    { code: 'STAFF', enabled: true, limitValue: 0 },
    { code: 'NOTIFICATION', enabled: true, limitValue: null },
    { code: 'EXPORT', enabled: true, limitValue: null },
    { code: 'IMPORT', enabled: true, limitValue: null },
  ],
  basic: [
    { code: 'INVENTORY', enabled: true, limitValue: 500 },
    { code: 'BILLING', enabled: true, limitValue: null },
    { code: 'ANALYTICS', enabled: true, limitValue: null },
    { code: 'AI_CHAT', enabled: true, limitValue: 500 },
    { code: 'VOICE_ASSISTANT', enabled: true, limitValue: 500 },
    { code: 'SMART_SCAN', enabled: true, limitValue: 100 },
    { code: 'OCR_SCAN', enabled: true, limitValue: null },
    { code: 'STAFF', enabled: true, limitValue: 2 },
    { code: 'NOTIFICATION', enabled: true, limitValue: null },
    { code: 'EXPORT', enabled: true, limitValue: null },
    { code: 'IMPORT', enabled: true, limitValue: null },
  ],
  pro: [
    { code: 'INVENTORY', enabled: true, limitValue: null },
    { code: 'BILLING', enabled: true, limitValue: null },
    { code: 'ANALYTICS', enabled: true, limitValue: null },
    { code: 'AI_CHAT', enabled: true, limitValue: 3000 },
    { code: 'VOICE_ASSISTANT', enabled: true, limitValue: 3000 },
    { code: 'SMART_SCAN', enabled: true, limitValue: 3000 },
    { code: 'OCR_SCAN', enabled: true, limitValue: null },
    { code: 'STAFF', enabled: true, limitValue: 10 },
    { code: 'NOTIFICATION', enabled: true, limitValue: null },
    { code: 'EXPORT', enabled: true, limitValue: null },
    { code: 'IMPORT', enabled: true, limitValue: null },
  ],
  enterprise: FEATURES.map(f => ({ code: f.code, enabled: true, limitValue: null })),
};

async function run() {
  console.log('🌱 Starting subscription database seeding...');

  // 1. Seed Features
  console.log('✨ Seeding Features...');
  const featureIdMap = new Map<string, string>();
  for (const f of FEATURES) {
    const feat = await prisma.feature.upsert({
      where: { code: f.code },
      update: {
        name: f.name,
        category: f.category,
        description: f.description,
      },
      create: {
        code: f.code,
        name: f.name,
        category: f.category,
        description: f.description,
        isActive: true,
      },
    });
    featureIdMap.set(f.code, feat.id);
  }
  console.log(`✅ Seeded ${featureIdMap.size} Features.`);

  // 2. Seed Plans
  console.log('✨ Seeding Plans...');
  const planIdMap = new Map<string, string>();
  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        trialDays: p.trialDays,
        displayOrder: p.displayOrder,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        trialDays: p.trialDays,
        displayOrder: p.displayOrder,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    planIdMap.set(p.slug, plan.id);
  }
  console.log(`✅ Seeded ${planIdMap.size} Plans.`);

  // 3. Seed PlanFeatures mapping
  console.log('✨ Mapping Plan Features...');
  for (const [planSlug, feats] of Object.entries(PLAN_FEATURES)) {
    const planId = planIdMap.get(planSlug);
    if (!planId) continue;

    for (const fMap of feats) {
      const featureId = featureIdMap.get(fMap.code);
      if (!featureId) continue;

      await prisma.planFeature.upsert({
        where: {
          planId_featureId: {
            planId,
            featureId,
          },
        },
        update: {
          enabled: fMap.enabled,
          limitValue: fMap.limitValue,
        },
        create: {
          planId,
          featureId,
          enabled: fMap.enabled,
          limitValue: fMap.limitValue,
        },
      });
    }
  }
  console.log('✅ Plan feature mapping completed.');

  // 4. Migrate/Sync existing users to subscriptions
  console.log('✨ Migrating existing users to subscription tiers...');
  const users = await prisma.user.findMany();
  let migratedCount = 0;
  for (const u of users) {
    let planSlug = u.plan || 'free';
    if (planSlug === 'pro') planSlug = 'pro';
    if (planSlug === 'basic') planSlug = 'basic';

    const planId = planIdMap.get(planSlug) || planIdMap.get('free')!;

    const existingSub = await prisma.subscription.findFirst({
      where: { userId: u.id },
    });

    if (!existingSub) {
      const startDate = u.createdAt ? new Date(u.createdAt) : new Date();
      const expiryDate = u.validUntil ? new Date(u.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.create({
        data: {
          userId: u.id,
          planId,
          status: 'active',
          billingCycle: 'monthly',
          startDate,
          expiryDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      migratedCount++;
    }
  }
  console.log(`✅ Synced/migrated ${migratedCount} Users to subscriptions.`);
  console.log('🎉 Seeding successfully completed!');
}

run()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
