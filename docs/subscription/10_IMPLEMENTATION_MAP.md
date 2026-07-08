# Inventory Ant
# Enterprise Subscription System
# 10_IMPLEMENTATION_MAP.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines the exact implementation map for integrating
the Enterprise Subscription System into the existing Inventory Ant project.

It tells every AI Agent and every developer

WHAT to create

WHAT to modify

WHAT to never touch

This document must be followed strictly.

------------------------------------------------------------
IMPLEMENTATION PHILOSOPHY
------------------------------------------------------------

Never rewrite.

Always extend.

Existing modules are production-ready.

Subscription should become a new layer above the current application.

------------------------------------------------------------
PROJECT STRUCTURE
------------------------------------------------------------

Current Project

inventory-ant-backend/

inventory-ant-frontend/

Do not change root structure.

------------------------------------------------------------
BACKEND
------------------------------------------------------------

Create

src/

subscription/

plans/

features/

usage/

addons/

coupons/

feature-flags/

payments/

cron/

common/

------------------------------------------------------------
DO NOT MODIFY
------------------------------------------------------------

Authentication Logic

Google OAuth

Inventory Logic

Billing Logic

Gemini Integration

Scanner Logic

Staff Logic

History Logic

Notification Logic

Unless absolutely necessary.

------------------------------------------------------------
SAFE FILES TO MODIFY
------------------------------------------------------------

app.module.ts

Register new modules.

--------------------------------

main.ts

Register middleware if required.

--------------------------------

users.service.ts

Only if subscription relation required.

--------------------------------

products.controller.ts

Only insert middleware.

No business logic changes.

--------------------------------

products.service.ts

Only usage tracking hooks.

Do not modify inventory algorithm.

------------------------------------------------------------
NEW FILES
------------------------------------------------------------

subscription.module.ts

subscription.controller.ts

subscription.service.ts

subscription.repository.ts

subscription.middleware.ts

subscription.guard.ts

subscription.scheduler.ts

subscription.constants.ts

subscription.types.ts

subscription.decorators.ts

------------------------------------------------------------
PLANS MODULE
------------------------------------------------------------

plans.controller.ts

plans.service.ts

plans.repository.ts

plans.dto.ts

------------------------------------------------------------
FEATURE MODULE
------------------------------------------------------------

features.controller.ts

features.service.ts

features.repository.ts

------------------------------------------------------------
USAGE MODULE
------------------------------------------------------------

usage.controller.ts

usage.service.ts

usage.repository.ts

------------------------------------------------------------
PAYMENT MODULE
------------------------------------------------------------

payments.controller.ts

payments.service.ts

payments.webhook.ts

payments.repository.ts

------------------------------------------------------------
COUPON MODULE
------------------------------------------------------------

coupon.controller.ts

coupon.service.ts

coupon.repository.ts

------------------------------------------------------------
ADDON MODULE
------------------------------------------------------------

addon.controller.ts

addon.service.ts

addon.repository.ts

------------------------------------------------------------
FEATURE FLAG MODULE
------------------------------------------------------------

feature-flag.controller.ts

feature-flag.service.ts

------------------------------------------------------------
DATABASE
------------------------------------------------------------

Create migration

001_subscription

002_feature

003_usage

004_coupon

005_addon

006_feature_flag

Never modify old migrations.

------------------------------------------------------------
SEEDER
------------------------------------------------------------

Create

seed/

plans.seed.ts

features.seed.ts

permissions.seed.ts

roles.seed.ts

Run automatically after migration.

------------------------------------------------------------
MIDDLEWARE REGISTRATION
------------------------------------------------------------

Authentication

↓

Subscription

↓

Feature

↓

Usage

↓

Role

↓

Controller

Never change execution order.

------------------------------------------------------------
DECORATORS
------------------------------------------------------------

Create

@RequireFeature()

@RequirePlan()

@RequirePermission()

@RequireUsage()

@CurrentSubscription()

@CurrentPlan()

------------------------------------------------------------
FRONTEND
------------------------------------------------------------

Create

src/

subscription/

hooks/

context/

pages/

components/

services/

------------------------------------------------------------
REACT CONTEXT
------------------------------------------------------------

Create

SubscriptionContext

UsageContext

PermissionContext

Never mix these with AuthContext.

------------------------------------------------------------
SAFE FRONTEND FILES TO MODIFY
------------------------------------------------------------

App.jsx

Register routes.

--------------------------------

Sidebar.jsx

Convert to dynamic menu.

--------------------------------

Dashboard.jsx

Add Current Plan Card.

--------------------------------

Settings.jsx

Add Subscription Menu.

------------------------------------------------------------
DO NOT MODIFY
------------------------------------------------------------

Authentication Flow

Login Screen

Theme System

Animation System

Existing UI Components

Unless required.

------------------------------------------------------------
ROUTES
------------------------------------------------------------

New Routes

/pricing

/subscription

/usage

/invoices

/payment-history

/admin/plans

/admin/features

/admin/payments

/admin/usage

------------------------------------------------------------
SERVICES
------------------------------------------------------------

subscriptionService.js

usageService.js

planService.js

paymentService.js

couponService.js

addonService.js

------------------------------------------------------------
HOOKS
------------------------------------------------------------

useSubscription()

usePlan()

useUsage()

useFeature()

usePermission()

------------------------------------------------------------
COMPONENTS
------------------------------------------------------------

PlanCard

UpgradeModal

UsageCard

UsageProgress

CurrentPlan

SubscriptionBanner

LockedFeature

FeatureBadge

------------------------------------------------------------
INTEGRATION ORDER
------------------------------------------------------------

STEP 1

Database

↓

STEP 2

Subscription Module

↓

STEP 3

Plan Module

↓

STEP 4

Feature Module

↓

STEP 5

Usage Module

↓

STEP 6

Middleware

↓

STEP 7

Payments

↓

STEP 8

Coupons

↓

STEP 9

Frontend Context

↓

STEP 10

Dynamic Sidebar

↓

STEP 11

Subscription Pages

↓

STEP 12

Admin Panel

------------------------------------------------------------
TESTING ORDER
------------------------------------------------------------

Database

↓

Backend APIs

↓

Middleware

↓

Payments

↓

Usage

↓

Frontend

↓

Admin

------------------------------------------------------------
DEPLOYMENT ORDER
------------------------------------------------------------

Database Migration

↓

Backend

↓

Frontend

↓

Seed Data

↓

Health Check

↓

Production

------------------------------------------------------------
ROLLBACK PLAN
------------------------------------------------------------

If migration fails

↓

Rollback migration

If backend fails

↓

Disable Subscription Module

If frontend fails

↓

Hide Subscription Routes

Existing Inventory System must continue working.

------------------------------------------------------------
FILES NEVER TO DELETE
------------------------------------------------------------

Existing Inventory

Existing Billing

Existing AI

Existing Authentication

Existing History

Existing Staff

Existing Database Tables

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Project compiles successfully.

Existing functionality works.

Subscription layer works independently.

No existing feature breaks.

System remains production-ready after every phase.

------------------------------------------------------------

END OF DOCUMENT