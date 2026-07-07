# Inventory Ant: Comprehensive Project Guide (A-Z)

This document serves as an exhaustive reference and guide for **Inventory Ant**, an intelligent warehouse and inventory management platform. This manual contains all specifications, architecture details, schemas, directories, APIs, and key features, enabling any agent to replicate the project in its entirety.

---

## 1. Project Overview & Tech Stack

**Inventory Ant** is a modern multi-tenant inventory system with integrated Gemini AI for vocal (Hinglish/English) commands, smart invoice scanning, automated billing, and detailed auditing.

### Tech Stack
*   **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Lucide React, React Hot Toast, PapaParse (CSV).
*   **Backend**: NestJS (TypeScript), Prisma ORM, PostgreSQL.
*   **AI Engine**: Google Gemini API (`gemini-2.5-flash` and `gemini-2.0-flash`), Google TTS (Hindi/Hinglish accent synthesis), Tesseract.js (Optical Character Recognition fallback).
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
│   │   │   ├── layout/                 # Sidebar, SiteHeader, SiteFooter, MarketingLayout
│   │   │   ├── ui/                     # ScannerModal, WelcomeModal, PasswordInput, Button, etc.
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
│   │   │   ├── AdminPanel.jsx          # Admin overview, user impersonation, system telemetry
│   │   │   ├── Settings.jsx            # Custom business settings & CSV mapper
│   │   │   └── Profile.jsx             # Profile completions
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
│   │   ├── app.module.ts               # Core app orchestration
│   │   ├── main.ts                     # Server bootstrap
│   │   ├── prisma.service.ts           # Prisma client provider
│   │   └── voice.service.ts            # (Optional extra voice integrations)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                            # Server secrets & environment
```

---

## 3. Database Schema (`schema.prisma`)

Inventory Ant uses PostgreSQL with Prisma. Below is the complete schema definition:

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
  adminRole        String?  // "super_admin" | "support_admin" etc.
  businessNote     String?
  lowStockThreshold Int      @default(20)
  businessSignature String?
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

### B. Smart Invoice Scanner
Handled by `ProductsService.processBillWithGemini`.
1.  **Vision Parsing**: Base64 image payload sent directly to Gemini (`gemini-2.5-flash`) to parse billing grids containing product code, description, quantity, and price.
2.  **OCR Fallback**: If Gemini fails, it fires local `Tesseract.js` worker on the image. A regex parser runs through the text line-by-line to parse data columns, identifying items, code formats, and numbers.

### C. Hinglish Text-to-Speech (TTS) Proxy
Handled in `/products/tts`. Uses a Google Translate Speech proxy configured with target language setting `tl=hi` (Hindi/Hinglish accent) to return audio streams played by frontend components.

---

## 5. Environment Configuration

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
```

---

## 6. How to Recreate & Setup (Step-by-Step)

### Step 1: Clone and Initialize Backend
1.  Go to `inventory-ant-backend`.
2.  Run dependencies installer:
    ```bash
    npm install
    ```
3.  Configure database:
    Make sure your local PostgreSQL database matches `DATABASE_URL` in `.env`.
4.  Generate Prisma Client & Sync Database:
    ```bash
    npx prisma generate
    ```
    Push database structure:
    ```bash
    npx prisma db push
    ```
5.  Start the dev server:
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

---

## 7. Crucial Guidelines for Recreating Style & UX

*   **Responsive Theme Handling**:
    As defined in App.jsx and MarketingLayout.jsx, the app must respect system `prefers-color-scheme` automatically if no manual preference is saved in local storage.
*   **Aesthetics (Glassmorphism & Gradients)**:
    Refer to styles in index.css. Keep borders glass-like (`rgba(255, 255, 255, 0.1)`), use smooth gradients (`bg-gradient-to-br`), and maintain micro-animations using Framer Motion.
