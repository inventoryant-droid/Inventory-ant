# Inventory Ant
# Enterprise Subscription System
# 03_BACKEND_IMPLEMENTATION.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines how the Subscription System must be implemented inside the existing NestJS backend.

The implementation MUST NOT rewrite existing modules.

The implementation MUST extend the current backend architecture.

The Subscription System should work as a middleware layer above the existing business modules.

------------------------------------------------------------
EXISTING BACKEND
------------------------------------------------------------

The following backend modules already exist.

Authentication

Users

Products

Inventory

Billing

Scanner

AI

History

Notification

Staff

Admin

Settings

These modules are considered production-ready.

DO NOT rewrite them.

DO NOT move them.

DO NOT rename APIs.

------------------------------------------------------------
NEW MODULES
------------------------------------------------------------

Create a new folder

src/subscription

Inside create

subscription.module.ts

subscription.controller.ts

subscription.service.ts

subscription.repository.ts

subscription.guard.ts

subscription.middleware.ts

subscription.scheduler.ts

subscription.utils.ts

subscription.constants.ts

subscription.types.ts

------------------------------------------------------------
NEW MODULES
------------------------------------------------------------

Create additional modules

plans

features

usage

coupons

addons

feature-flags

payments

Each module should contain

controller

service

repository

dto

entities

validators

------------------------------------------------------------
ARCHITECTURE
------------------------------------------------------------

Request

↓

JWT Authentication

↓

Subscription Middleware

↓

Feature Middleware

↓

Usage Middleware

↓

Role Middleware

↓

Business Controller

↓

Database

------------------------------------------------------------
RESPONSIBILITY
------------------------------------------------------------

Authentication Module

Responsible only for identity.

Subscription Module

Responsible only for plan validation.

Feature Module

Responsible only for feature availability.

Usage Module

Responsible only for usage limits.

Role Module

Responsible only for staff permissions.

Business Modules

Responsible only for business logic.

------------------------------------------------------------
SUBSCRIPTION SERVICE
------------------------------------------------------------

Responsibilities

Load active subscription

Validate expiry

Validate status

Return current plan

Return billing cycle

Return remaining days

Return renewal date

------------------------------------------------------------
FEATURE SERVICE
------------------------------------------------------------

Responsibilities

Return enabled features

Return disabled features

Return feature limit

Return unlimited flag

Cache frequently used features

------------------------------------------------------------
USAGE SERVICE
------------------------------------------------------------

Responsibilities

Increment usage

Reset monthly usage

Reset yearly usage

Calculate remaining usage

Prevent overuse

------------------------------------------------------------
PLAN SERVICE
------------------------------------------------------------

Responsibilities

Create Plan

Update Plan

Delete Plan

Archive Plan

Activate Plan

Deactivate Plan

Duplicate Plan

------------------------------------------------------------
COUPON SERVICE
------------------------------------------------------------

Responsibilities

Validate coupon

Calculate discount

Check expiry

Check usage count

Increment usage

------------------------------------------------------------
ADDON SERVICE
------------------------------------------------------------

Responsibilities

Purchase addon

Activate addon

Expire addon

Increase limits

Remove addon

------------------------------------------------------------
FEATURE FLAG SERVICE
------------------------------------------------------------

Responsibilities

Enable flag

Disable flag

Evaluate conditions

Return feature state

------------------------------------------------------------
PAYMENT SERVICE
------------------------------------------------------------

Responsibilities

Verify webhook

Generate invoice

Update subscription

Generate receipt

Create audit logs

------------------------------------------------------------
SCHEDULER
------------------------------------------------------------

Daily Jobs

Expire subscriptions

Send expiry reminders

Deactivate expired trials

Generate renewal reminders

Reset monthly usage

Archive old logs

------------------------------------------------------------
MIDDLEWARE
------------------------------------------------------------

Create reusable middleware.

Never duplicate logic.

------------------------------------------------------------

checkSubscription()

Purpose

Verify subscription exists.

------------------------------------------------------------

checkSubscriptionStatus()

Purpose

Verify

Trial

Active

Grace

Expired

Suspended

------------------------------------------------------------

checkFeature()

Purpose

Verify feature availability.

------------------------------------------------------------

checkLimit()

Purpose

Verify usage limit.

------------------------------------------------------------

checkRolePermission()

Purpose

Verify staff permission.

------------------------------------------------------------

checkAddon()

Purpose

Verify addon availability.

------------------------------------------------------------
REQUEST FLOW
------------------------------------------------------------

User

↓

JWT

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

------------------------------------------------------------
API STRUCTURE
------------------------------------------------------------

Subscription APIs

GET

/subscription

-----------------------------------

GET

/subscription/current

-----------------------------------

POST

/subscription/upgrade

-----------------------------------

POST

/subscription/renew

-----------------------------------

POST

/subscription/cancel

------------------------------------------------------------
PLAN APIs
------------------------------------------------------------

GET

/plans

GET

/plans/public

POST

/plans

PATCH

/plans/:id

DELETE

/plans/:id

------------------------------------------------------------
FEATURE APIs
------------------------------------------------------------

GET

/features

GET

/features/me

PATCH

/features

------------------------------------------------------------
USAGE APIs
------------------------------------------------------------

GET

/usage

GET

/usage/me

POST

/usage/reset

------------------------------------------------------------
COUPON APIs
------------------------------------------------------------

POST

/coupons/apply

GET

/coupons

POST

/coupons

PATCH

/coupons/:id

------------------------------------------------------------
ADDON APIs
------------------------------------------------------------

GET

/addons

POST

/addons/purchase

GET

/addons/me

------------------------------------------------------------
PAYMENT APIs
------------------------------------------------------------

POST

/payment/create

POST

/payment/webhook

GET

/payment/history

------------------------------------------------------------
ADMIN APIs
------------------------------------------------------------

GET

/admin/plans

GET

/admin/users

GET

/admin/payments

GET

/admin/usage

GET

/admin/coupons

GET

/admin/addons

------------------------------------------------------------
CACHE STRATEGY
------------------------------------------------------------

Cache

Plans

Features

Limits

Feature Flags

Frequently accessed configuration.

Never cache usage.

------------------------------------------------------------
AUDIT LOGGING
------------------------------------------------------------

Every action must generate audit logs.

Examples

Plan Updated

Coupon Applied

Payment Success

Payment Failed

Feature Enabled

Feature Disabled

Plan Expired

Subscription Renewed

------------------------------------------------------------
ERROR CODES
------------------------------------------------------------

SUBSCRIPTION_EXPIRED

FEATURE_DISABLED

LIMIT_EXCEEDED

INVALID_COUPON

PAYMENT_FAILED

ADDON_REQUIRED

ROLE_NOT_ALLOWED

------------------------------------------------------------
RESPONSE FORMAT
------------------------------------------------------------

Every API must return

success

message

data

timestamp

requestId

Never return inconsistent responses.

------------------------------------------------------------
EXCEPTION RULES
------------------------------------------------------------

Business modules should never throw subscription errors.

Subscription module should throw its own exceptions.

------------------------------------------------------------
INTEGRATION RULES
------------------------------------------------------------

Existing Inventory APIs

↓

Insert Middleware

↓

Do NOT modify inventory logic.

Existing Billing APIs

↓

Insert Middleware

↓

Do NOT modify billing calculations.

Existing AI APIs

↓

Insert Usage Middleware

↓

Do NOT modify Gemini implementation.

------------------------------------------------------------
DEPENDENCY RULES
------------------------------------------------------------

Inventory module must never depend on Subscription module.

Subscription module may call Inventory only if absolutely required.

Keep dependencies one-directional.

------------------------------------------------------------
CODING RULES
------------------------------------------------------------

Use Dependency Injection.

Use Repository Pattern.

Use DTO Validation.

Use Strong Typing.

Never hardcode limits.

Never hardcode prices.

Never hardcode features.

Never hardcode plan names.

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Existing APIs continue working.

Existing database remains intact.

Existing users receive Free Plan.

Subscription works independently.

Application remains deployable after every phase.

------------------------------------------------------------

END OF DOCUMENT