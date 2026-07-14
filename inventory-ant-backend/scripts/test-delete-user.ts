import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseDelete(userId: string, email: string) {
  console.log(`Diagnosing deletion for User ID: ${userId}, Email: ${email}`);
  
  const staffUsers = await prisma.user.findMany({ where: { parentEmail: email.toLowerCase() } });
  const allEmails = [email.toLowerCase(), ...staffUsers.map(u => u.email.toLowerCase())];
  const allUserIds = [userId, ...staffUsers.map(u => u.id)];

  console.log('All emails to delete:', allEmails);
  console.log('All user IDs to delete:', allUserIds);

  const steps = [
    { name: '1. Products', fn: () => prisma.product.deleteMany({ where: { userId: { in: allEmails } } }) },
    { name: '2. Bills', fn: () => prisma.bill.deleteMany({ where: { userId: { in: allEmails } } }) },
    { name: '3. Scan History', fn: () => prisma.scanHistory.deleteMany({ where: { userId: { in: allEmails } } }) },
    { name: '4. Support Tickets', fn: () => prisma.supportTicket.deleteMany({ where: { userId: { in: allEmails } } }) },
    { name: '5. Payments', fn: () => prisma.payment.deleteMany({ where: { userId: { in: allEmails } } }) },
    { name: '6. Activity Logs', fn: () => prisma.activityLog.deleteMany({ where: { userId: { in: allEmails } } }) },
    { name: '7. Inventory History', fn: () => prisma.inventoryHistory.deleteMany({ where: { userId: { in: allEmails } } }) },
    { name: '8. Chat messages & threads', fn: async () => {
        const threads = await prisma.chatThread.findMany({ where: { userId: { in: allEmails } } });
        for (const t of threads) {
          await prisma.chatMessage.deleteMany({ where: { threadId: t.id } });
        }
        await prisma.chatThread.deleteMany({ where: { userId: { in: allEmails } } });
      }
    },
    { name: '9. Subscription addons', fn: async () => {
        const subs = await prisma.subscription.findMany({ where: { userId: { in: allUserIds } } });
        for (const s of subs) {
          await prisma.subscriptionAddon.deleteMany({ where: { subscriptionId: s.id } });
        }
      }
    },
    { name: '10. Subscriptions', fn: () => prisma.subscription.deleteMany({ where: { userId: { in: allUserIds } } }) },
    { name: '11. Feature Usages', fn: () => prisma.featureUsage.deleteMany({ where: { userId: { in: allUserIds } } }) },
    { name: '12. Plan History', fn: () => prisma.planHistory.deleteMany({ where: { userId: { in: allUserIds } } }) },
    { name: '13. Audit events', fn: () => prisma.auditEvent.deleteMany({ where: { userId: { in: allUserIds } } }) },
    { name: '14. Invoices', fn: () => prisma.invoice.deleteMany({ where: { userId: { in: allUserIds } } }) },
    { name: '15. Users', fn: () => prisma.user.deleteMany({ where: { id: { in: allUserIds } } }) },
  ];

  for (const step of steps) {
    try {
      console.log(`Running step: ${step.name}...`);
      await step.fn();
      console.log(`Step ${step.name} completed successfully.`);
    } catch (err: any) {
      console.error(`❌ Step ${step.name} FAILED!`);
      console.error(err);
      break;
    }
  }
}

const targetUserId = process.argv[2];
const targetEmail = process.argv[3];

if (!targetUserId || !targetEmail) {
  console.log('Usage: npx ts-node scripts/test-delete-user.ts <userId> <email>');
  process.exit(1);
}

diagnoseDelete(targetUserId, targetEmail)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
