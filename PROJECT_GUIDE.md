# Inventory Ant: Comprehensive Project Guide (A-Z)

This document serves as an exhaustive reference and guide for **Inventory Ant**, an intelligent warehouse and inventory management platform. This manual contains all specifications, architecture details, schemas, directories, APIs, and key features, enabling any agent to replicate the project in its entirety.

---

## 1. Project Overview & Tech Stack

**Inventory Ant** is a modern multi-tenant inventory system with integrated Gemini AI for vocal (Hinglish/English) commands, smart invoice scanning, automated billing, and detailed auditing.

### Tech Stack
*   **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide React, React Hot Toast, PapaParse (CSV).
*   **Backend**: NestJS (TypeScript), Prisma ORM, PostgreSQL.
*   **AI Engine**: Google Gemini API (`gemini-2.5-flash` and `gemini-2.0-flash`), Google TTS (Hindi/Hinglish accent synthesis), Tesseract.js (Optical Character Recognition fallback).
*   **Payments Engine**: Razorpay subscription payments integration.
*   **Authentication**: Google OAuth 2.0 / JWT and Local Credentials with role isolation (`admin` | `user` | `staff`).

---

## 2. Directory Structure

```text
inventory-ant/
├── README.md                           # Core architectural specifications
├── PROJECT_GUIDE.md                    # This master replication guide
├── inventory-ant-frontend/             # React Vite Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                 # Sidebar, SiteHeader, SiteFooter, MarketingLayout, AdminLayout, DashboardLayout
│   │   │   ├── ui/                     # ScannerModal, WelcomeModal, PasswordInput, Button, AllFeaturesComparisonModal, PricingPlans, FeatureDemoModal, etc.
│   │   │   ├── AntAgentV2.jsx          # Voice AI agent Core (always-mounted)
│   │   │   └── AntXTerminal.jsx        # Conversational Terminal Interface
│   │   ├── pages/
│   │   │   ├── AuthScreen.jsx          # Login, Sign Up, and Social OAuth
│   │   │   ├── Dashboard.jsx           # Dashboard overview and metrics
│   │   │   ├── Inventory.jsx           # Master inventory registry view (Inbound/Outbound)
│   │   │   ├── Billing.jsx             # POS checkout, billing calculator, GST invoice generator
│   │   │   ├── AITools.jsx             # AI Playground, voice debug, schema mapper
│   │   │   ├── HistoryLogs.jsx         # System actions audit logs (Excel exportable)
│   │   │   ├── StaffManagement.jsx     # Owner interface to manage staff members
│   │   │   ├── Settings.jsx            # Custom business settings & CSV mapper
│   │   │   ├── Profile.jsx             # Profile completions
│   │   │   ├── Pricing.jsx             # Pricing structures & tiers
│   │   │   ├── Subscription.jsx        # Active subscription details
│   │   │   ├── PaymentHistory.jsx      # Payment ledger & invoices
│   │   │   ├── OnboardingScreen.jsx    # Custom profile creation portal
│   │   │   ├── UserGuide.jsx           # Step-by-step user onboarding details
│   │   │   ├── AdminDashboard.jsx      # System telemetry overview for Admins
│   │   │   ├── AdminPanel.jsx          # Super Admin central control console
│   │   │   ├── AdminAnalytics.jsx      # Advanced SaaS telemetry metrics
│   │   │   ├── AdminUsers.jsx          # Manage tenant profiles and status
│   │   │   ├── AdminAdmins.jsx         # Access hierarchy settings
│   │   │   ├── AdminSubscriptions.jsx  # Modify limits and expiry parameters
│   │   │   ├── AdminPlans.jsx          # Add/delete pricing levels
│   │   │   ├── AdminFeatures.jsx       # Register new platform features
│   │   │   ├── AdminCoupons.jsx        # System coupon administration
│   │   │   ├── AdminFlags.jsx          # System feature flags toggles
│   │   │   ├── AdminAIConfig.jsx       # Global Gemini LLM keys configs
│   │   │   ├── AdminPayments.jsx       # Razorpay transactions audits
│   │   │   ├── AdminAudits.jsx         # Detailed audit event tracing logs
│   │   │   └── AdminSystem.jsx         # System diagnostics & health parameters
│   │   ├── context/
│   │   │   ├── AppProviders.jsx        # Global React Context orchestrator
│   │   │   └── PermissionContext.jsx   # Role and permission access controls
│   │   ├── services/
│   │   │   ├── adminService.js         # Admin endpoints mappings
│   │   │   ├── aiService.js            # Gemini AI communications handler
│   │   │   ├── subscriptionService.js  # Subscription management calls
│   │   │   └── paymentService.js       # Razorpay gateway integrations
│   │   ├── utils/
│   │   │   ├── cn.js                   # Classnames utility
│   │   │   └── config.js               # API URL endpoint mapping
│   │   ├── App.jsx                     # Route definitions, session state, theme listeners
│   │   ├── App.css                     # Global styles
│   │   ├── index.css                   # Custom CSS classes (Glassmorphism, custom themes)
│   │   └── main.jsx                    # React entrypoint
│   ├── package.json
│   ├── vite.config.js
│   └── .env                            # Client configuration
│
├── inventory-ant-backend/              # NestJS Server Application
│   ├── prisma/
│   │   └── schema.prisma               # Prisma PostgreSQL schema definitions
│   ├── src/
│   │   ├── users/                      # User authentication, profiles, staff, admin logs
│   │   │   ├── users.controller.ts
│   │   │   ├── users.module.ts
│   │   │   └── users.service.ts
│   │   ├── products/                   # Core Inventory, Gemini AI orchestration, TTS & OCR
│   │   │   ├── products.controller.ts
│   │   │   ├── products.module.ts
│   │   │   └── products.service.ts     # Main transactional logic
│   │   ├── admin/                      # Central administration control APIs
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.dto.ts
│   │   │   ├── admin.guard.ts
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.repository.ts
│   │   │   └── admin.service.ts
│   │   ├── subscription/               # Multi-tier subscription model and limits checker
│   │   │   ├── subscription.controller.ts
│   │   │   ├── subscription.service.ts
│   │   │   ├── subscription.repository.ts
│   │   │   ├── subscription.guard.ts
│   │   │   ├── subscription.decorators.ts
│   │   │   ├── subscription-lifecycle.service.ts
│   │   │   ├── usage.service.ts
│   │   │   ├── plan.service.ts
│   │   │   ├── feature.service.ts
│   │   │   ├── price-calculation.service.ts
│   │   │   ├── audit.service.ts
│   │   │   └── subscription.scheduler.ts # Renewal tasks & trial management
│   │   ├── payment/                    # Payments checkout and gateway providers
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── payment.webhook.controller.ts
│   │   │   ├── payment.repository.ts
│   │   │   └── providers/
│   │   │       ├── payment-provider.interface.ts
│   │   │       └── razorpay.provider.ts
│   │   ├── saas/                       # Core backend middleware & security wrappers
│   │   │   ├── cache/                  # In-memory subscription caching
│   │   │   ├── security/               # Rate limit guards and Express sanitizers
│   │   │   ├── tracing/                # Correlation ID request tracing
│   │   │   ├── errors/                 # Global standardized exception filters
│   │   │   ├── storage/                # Storage system abstraction layers
│   │   │   └── saas.module.ts
│   │   ├── app.module.ts               # Core app orchestration
│   │   ├── main.ts                     # Server bootstrap
│   │   ├── prisma.service.ts           # Prisma client provider
│   │   └── voice.service.ts            # Optional extra voice integrations
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                            # Server secrets & environment
```

---

## 3. Database Schema (`schema.prisma`)

Inventory Ant uses PostgreSQL with Prisma. Below is the complete schema definition containing the core models and the multi-tenant SaaS subscription modules:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id               String   @id
  email            String   @unique
  phone            String?  @unique
  password         String?
  name             String
  picture          String?  @default("")
  role             String   // "user" | "admin" | "staff"
  active           Boolean  @default(true)
  createdAt        Float
  updatedAt        Float
  parentEmail      String?  // References owner email for staff members
  profileCompleted Boolean  @default(false)
  businessName     String?
  businessType     String?
  businessLogo     String?
  gstNumber        String?
  businessAddress  String?
  showPhoneOnBills Boolean  @default(false)
  showEmailOnBills Boolean  @default(false)
  plan             String?  @default("free") // "free" | "basic" | "pro" | "enterprise"
  validUntil       Float?
  storageUsed      Float?
  lastLogin        Float?
  adminRole        String?  // "super_admin" | "support_admin" | "finance_admin" | "tech_admin"
  businessNote     String?
  lowStockThreshold Int      @default(20)
  businessSignature String?

  // Subscription relations
  subscriptions    Subscription[]
  usages           FeatureUsage[]
  planHistory      PlanHistory[]
  auditEvents      AuditEvent[]
  invoices         Invoice[]
}

model Product {
  id               String   @id
  userId           String   // references user email
  productId        String?  // SKU / Item Code
  hsnSac           String?  // HSN/SAC Code
  name             String?
  details          String?
  mrp              String?  // Sale price (billing calculations)
  costPrice        String?  // Purchase price (owner side)
  paket            String?
  quantity         String?
  timestamp        Float    @map("_timestamp")
  extraAttributes  Json?    // custom attributes (e.g. expiry, colors)

  @@index([userId])
}

model Bill {
  id             String   @id
  userId         String
  date           Float
  items          Json     // array of billed items [{productId, name, qty, mrp}]
  subtotal       Float
  gst            Float
  total          Float
  buyerName      String?
  buyerPhone     String?
  buyerAddress   String?
  hasGst         Boolean  @default(true)
  hasBuyerInfo   Boolean  @default(false)
  operatorName   String   @default("Owner")
  orderId        String?
  invoiceId      String?

  @@index([userId])
}

model ScanHistory {
  id           String   @id
  userId       String
  timestamp    Float
  actionType   String
  operatorName String   @default("Owner")
  items        Json
  auditLog     Json

  @@index([userId])
}

model SupportTicket {
  id             String   @id
  userId         String
  businessName   String
  subject        String
  description    String
  priority       String
  status         String   @default("open")
  createdAt      Float
  assignedAdmin  String?  @default("")
}

model Notification {
  id        String @id
  target    String // "all" | "basic" | "pro" | "enterprise"
  title     String
  message   String
  createdAt Float
}

model Payment {
  id           String   @id
  userId       String
  businessName String
  amount       Float
  plan         String
  status       String   // "success" | "refunded"
  timestamp    Float
  invoiceId    String

  // Relation to new Invoice (backward compatible)
  invoice      Invoice?
}

model ActivityLog {
  id        String   @id
  userId    String
  userName  String
  role      String
  action    String
  ip        String   @default("127.0.0.1")
  device    String   @default("Desktop Web")
  timestamp Float
}

model InventoryHistory {
  id           String   @id
  userId       String
  timestamp    Float
  productId    String?
  productName  String
  actionType   String   // "CREATE" | "UPDATE" | "DELETE" | "STOCK_IN" | "STOCK_OUT" | "BULK_IMPORT"
  operatorName String   @default("Owner")
  beforeQty    String?
  afterQty     String?
  details      String?

  @@index([userId])
}

model ChatThread {
  id        String        @id
  userId    String
  title     String
  timestamp Float
  messages  ChatMessage[]

  @@index([userId])
}

model ChatMessage {
  id        String     @id
  threadId  String
  role      String     // "user" | "ai"
  text      String
  timestamp Float
  thread    ChatThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@index([threadId])
}

model Plan {
  id               String        @id @default(uuid())
  name             String
  slug             String        @unique
  description      String?
  monthlyPrice     Float
  yearlyPrice      Float
  trialDays        Int           @default(0)
  isActive         Boolean       @default(true)
  displayOrder     Int           @default(0)
  currency         String        @default("INR")
  popularBadge     Boolean       @default(false)
  recommendedBadge Boolean       @default(false)
  visibility       Boolean       @default(true)
  gracePeriod      Int           @default(3)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  features         PlanFeature[]
  subscriptions    Subscription[]
  coupons          Coupon[]
}

model Feature {
  id          String        @id @default(uuid())
  code        String        @unique
  name        String
  category    String?
  description String?
  isActive    Boolean       @default(true)
  plans       PlanFeature[]
  usages      FeatureUsage[]
}

model PlanFeature {
  id         String   @id @default(uuid())
  planId     String
  featureId  String
  enabled    Boolean  @default(true)
  limitValue Int?     // null means unlimited
  metadata   Json?
  plan       Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  feature    Feature  @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@unique([planId, featureId])
}

model Subscription {
  id              String              @id @default(uuid())
  userId          String
  planId          String
  status          String              // "trial" | "active" | "expired" | "cancelled" | "grace" | "suspended"
  billingCycle    String              // "monthly" | "yearly"
  startDate       DateTime
  expiryDate      DateTime
  renewalDate     DateTime?
  trialEndsAt     DateTime?
  graceEndsAt     DateTime?
  cancelledAt     DateTime?
  nextBillingDate DateTime?
  autoRenew       Boolean             @default(true)
  paymentId       String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan            Plan                @relation(fields: [planId], references: [id], onDelete: Restrict)
  addons          SubscriptionAddon[]
  invoices        Invoice[]

  @@index([userId])
}

model FeatureUsage {
  id        String   @id @default(uuid())
  userId    String
  featureId String
  used      Int      @default(0)
  month     Int
  year      Int
  resetDate DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  feature   Feature  @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@index([userId, featureId, month, year])
}

model Coupon {
  id              String   @id @default(uuid())
  code            String   @unique
  discountType    String   // "percentage" | "fixed"
  discountValue   Float
  maximumDiscount Float?
  minimumAmount   Float?
  usageLimit      Int?
  usedCount       Int      @default(0)
  validFrom       DateTime
  validTill       DateTime
  active          Boolean  @default(true)
  planId          String?
  plan            Plan?    @relation(fields: [planId], references: [id], onDelete: SetNull)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([planId])
}

model Addon {
  id           String              @id @default(uuid())
  name         String
  description  String?
  price        Float
  billingCycle String              // "monthly" | "yearly"
  active       Boolean             @default(true)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  subscriptions SubscriptionAddon[]
}

model SubscriptionAddon {
  id             String       @id @default(uuid())
  subscriptionId String
  addonId        String
  quantity       Int          @default(1)
  expiryDate     DateTime
  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  addon          Addon        @relation(fields: [addonId], references: [id], onDelete: Cascade)

  @@unique([subscriptionId, addonId])
}

model FeatureFlag {
  id         String   @id @default(uuid())
  code       String   @unique
  name       String
  enabled    Boolean  @default(false)
  conditions Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model PlanHistory {
  id        String   @id @default(uuid())
  userId    String
  oldPlan   String?
  newPlan   String
  reason    String?
  changedBy String   // "user" | "admin" | "system"
  timestamp DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model AuditEvent {
  id            String   @id @default(uuid())
  userId        String?
  action        String   // e.g. "PLAN_CHANGED", "COUPON_APPLIED", "PAYMENT_SUCCESS", "FEATURE_ENABLED", etc.
  details       String?
  performedBy   String
  ipAddress     String?
  timestamp     DateTime @default(now())
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  requestId     String?
  executionTime Float?
  userAgent     String?
  device        String?

  @@index([userId])
}

model Invoice {
  id            String       @id @default(uuid())
  userId        String
  subscriptionId String
  paymentId     String?      @unique
  invoiceNumber String       @unique
  amount        Float
  tax           Float
  total         Float
  status        String       // "paid" | "unpaid" | "void"
  pdfPath       String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  subscription  Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  payment       Payment?     @relation(fields: [paymentId], references: [id], onDelete: SetNull)

  @@index([userId])
}

model PaymentWebhookLog {
  id             String   @id @default(uuid())
  gateway        String   // "razorpay" | "stripe"
  gatewayEventId String?  @unique
  eventType      String
  payload        Json
  signature      String?
  verified       Boolean  @default(false)
  retryCount     Int      @default(0)
  status         String   // "processed" | "failed"
  error          String?
  createdAt      DateTime @default(now())
  processedAt    DateTime?
}

model AiConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model DeletedUser {
  id              String   @id @default(uuid())
  email           String   @unique
  name            String
  phone           String?
  businessName    String?
  businessType    String?
  gstNumber       String?
  businessAddress String?
  deletedAt       DateTime @default(now())
}
```

---

## 4. Key AI Specifications & Algorithms

### A. Dynamic Hinglish Voice Processor (Ant X V2 Engine)
The core voice command parsing is handled by `ProductsService.processAgentCommandV2` (in `inventory-ant-backend/src/products/products.service.ts`). It translates human voice input (Hinglish/English) into database modifications:

1.  **Session & Reference Binding**:
    Uses a memory-mapped session structure (`UserSession`) mapping user sessions. It saves `lastProductId` and `lastProductName`. When a query contains a relative command (*"usme 10 badha do"*, *"10 minus kar"*, *"iska stock badhao"*), it binds the target to the last referenced product.
2.  **Intent Parsing via Gemini**:
    Sends user text to Gemini (`gemini-2.5-flash`) under a JSON schema constraint.
    Gemini identifies:
    *   `action`: `IN` | `OUT` | `NAVIGATE` | `CHAT` | `QUERY` | `LOGIN` | `WIPE`
    *   `itemName` or `productId`
    *   `qty` (parsed quantity)
    *   `page` (target viewport slug)
3.  **Local Regular Expression Fallback**:
    If Gemini API fails, a local parser extracts intents using keywords (e.g. `add`, `plus`, `nikal`, `kam`, `remove`, `delete`) and numbers to prevent service blockage.
4.  **Ambiguity Resolution**:
    If query matches multiple products, it halts execution, flags `status: "ambiguity"`, and prompts the client to ask the user to clarify by code or exact specifications.
5.  **Exceeding & Batch Safeguards**:
    *   If `action` is `OUT` and quantity > current stock, it prompts: *"Aapke paas sirf X items hain. Kya unhe nikal doon?"*
    *   If quantity > 50, it stages a confirmation flag to prevent huge accidental updates.

### B. Multi-Step AI-Powered Document Scanner
Located under the `ScannerModal` UI component and backend `products.controller.ts` routes.
1.  **Selection Mode**: The user selects between file upload (PNG, JPG, PDF) or camera access. The camera feed captures images directly into a Canvas element and converts them to File blobs.
2.  **Vision Parsing**: Base64 payload is sent to Gemini (`gemini-2.5-flash` with the `parseOnly: true` query) to extract billing tables containing product codes, descriptions, quantities, and prices without modifying the DB directly.
3.  **OCR Fallback**: If Gemini Vision parsing fails, local `Tesseract.js` worker processes the document and parses text lines to find item code patterns.
4.  **Verify & Review Phase**: The parsed rows are mapped to a review grid in the frontend. The operator can edit rows, remove incorrect products, adjust stock quantities, update price thresholds, or add rows manually.
5.  **Synchronization**: Hitting "Sync to Inventory" commits the finalized array to the database via `/api/user/products/confirm-bill`.

### C. Hinglish Text-to-Speech (TTS) Proxy
Handled in `/products/tts`. Uses a Google Translate Speech proxy configured with target language setting `tl=hi` (Hindi/Hinglish accent) to return audio streams played by frontend components.

---

## 5. Security & SaaS Architecture

1.  **Rate Limiter Guard**:
    Endpoints are protected by `RateLimiterGuard` utilizing standard configurations for distinct API families:
    *   *Auth & Passwords*: 10 requests / 60 seconds (IP-based block).
    *   *AI Scanner & Voice Assistant*: 15 requests / 60 seconds (User-based block).
    *   *Billing & Payments*: 30 requests / 60 seconds (User-based block).
    *   *Admin APIs*: 40 requests / 60 seconds (User-based block).
2.  **Request Sanitization**:
    Express middleware sanitizes all request body, query params, and route parameters dynamically, replacing HTML symbols (`<` and `>`) to prevent injection attacks.
3.  **Request Tracing Interceptor**:
    Appends a unique UUID `requestId` header on all inbound transactions to trace requests through the global logger.
4.  **Global Exception Filter**:
    Catches all runtime errors, packages them in standardized JSON formats containing detailed error codes, trace logs, and correlation IDs.
5.  **User Deletion cascading**:
    Ensures safe data purging. Admin-driven user deletions delete users completely across child tables (invoices, products, bills, scan histories, activity logs, chat logs, subscriptions) in a single transaction with an optimized 25 seconds execution timeout constraint. A summary is archived in the `DeletedUser` table.
6.  **SaaS Caching**:
    Custom in-memory cache system invalidates cache records when plans are updated, features mapped, or plans reordered.

---

## 6. Environment Configuration

### Frontend Config (`inventory-ant-frontend/.env`)
```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_API_URL=http://localhost:3000
```

### Backend Config (`inventory-ant-backend/.env`)
```env
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/inventoryAnt"
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL_TEXT=gemini-2.5-flash
GEMINI_MODEL_SCANNER=gemini-2.5-flash
GEMINI_MODEL_VOICE=gemini-2.0-flash
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
BREVO_API_KEY=your-brevo-smtp-key
SMTP_SENDER=inventoryant@gmail.com
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

---

## 7. How to Recreate & Setup (Step-by-Step)

### Step 1: Initialize Database and Backend
1.  Go to `inventory-ant-backend`.
2.  Run dependencies installer:
    ```bash
    npm install
    ```
3.  Generate Prisma Client:
    ```bash
    npx prisma generate
    ```
4.  Push database structure to your local PostgreSQL instances:
    ```bash
    npx prisma db push
    ```
5.  Seed the subscription plans, tier permissions, and features mapping:
    ```bash
    npx ts-node scripts/seed-subscription.ts
    ```
6.  Start the server:
    ```bash
    npm run start:dev
    ```
    The backend will listen on `http://localhost:3000`.

### Step 2: Initialize Frontend
1.  Go to `inventory-ant-frontend`.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Ensure `.env` matches your Google Client ID and API endpoint.
4.  Run frontend dev server:
    ```bash
    npm run dev
    ```
    The client console will launch at `http://localhost:5173`.

### Step 3: Verify and Test
*   Use local credentials or Google Log In on `http://localhost:5173/login`.
*   Access settings to upload inventory master CSVs.
*   Interact with **Ant Agent** on the bottom right or via **Terminal** (`/ant_x` command viewport) for Hinglish command checks (e.g. *"Pencil box me 5 units add karo"*).
*   Test Super Admin dashboards on `/admin` to verify user details, payment records, and plan updates.

---

## 8. Crucial Guidelines for Recreating Style & UX

*   **Responsive Theme Handling**:
     respects system `prefers-color-scheme` automatically if no manual preference is saved in local storage.
*   **Aesthetics (Glassmorphism & Gradients)**:
    Refer to styles in index.css. Keep borders glass-like (`rgba(255, 255, 255, 0.1)`), use smooth gradients (`bg-gradient-to-br`), and maintain micro-animations using Framer Motion.

