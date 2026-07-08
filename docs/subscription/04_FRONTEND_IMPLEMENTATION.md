# Inventory Ant
# Enterprise Subscription System
# 04_FRONTEND_IMPLEMENTATION.md

Version: 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines the complete frontend implementation
of the Enterprise Subscription System.

The frontend should NEVER contain business logic.

The frontend is only responsible for:

Displaying data

Showing permissions

Showing limits

Showing upgrade screens

Sending API requests

All subscription decisions must come from Backend.

------------------------------------------------------------
DESIGN PRINCIPLES
------------------------------------------------------------

The frontend must be

Dynamic

Configuration Driven

API Driven

Scalable

Maintainable

Never Hardcoded

------------------------------------------------------------
CURRENT FRONTEND
------------------------------------------------------------

The existing application already contains

Authentication

Dashboard

Inventory

Billing

History

Staff

Analytics

Settings

Profile

AI Chat

Voice Assistant

Scanner

Admin Panel

These pages must remain functional.

------------------------------------------------------------
NEW FRONTEND MODULES
------------------------------------------------------------

Create

Subscription

Pricing

Upgrade

Current Plan

Usage

Invoices

Payment History

Feature Availability

------------------------------------------------------------
FOLDER STRUCTURE
------------------------------------------------------------

src/

components/

subscription/

PricingCard.jsx

PlanCard.jsx

UpgradeModal.jsx

UsageCard.jsx

UsageProgress.jsx

LockedFeature.jsx

PlanBadge.jsx

FeatureList.jsx

SubscriptionBanner.jsx

CurrentPlanCard.jsx

pages/

Pricing.jsx

Subscription.jsx

PaymentHistory.jsx

Invoices.jsx

hooks/

useSubscription.js

useFeatures.js

useUsage.js

usePermissions.js

context/

SubscriptionContext.jsx

services/

subscriptionService.js

------------------------------------------------------------
GLOBAL SUBSCRIPTION CONTEXT
------------------------------------------------------------

Create

SubscriptionContext

It should store

Current Plan

Subscription Status

Expiry Date

Available Features

Usage

Limits

Addons

Permissions

This context should be loaded after login.

------------------------------------------------------------
LOGIN FLOW
------------------------------------------------------------

User Login

↓

JWT

↓

GET /subscription/current

↓

GET /features/me

↓

GET /usage/me

↓

Store in Context

↓

Render Application

------------------------------------------------------------
DYNAMIC SIDEBAR
------------------------------------------------------------

Sidebar must NEVER be hardcoded.

Wrong

const menu=[...]

Correct

Backend

↓

Returns

Dashboard

Inventory

Billing

Analytics

History

AI

↓

React builds Sidebar dynamically.

------------------------------------------------------------
MENU VISIBILITY
------------------------------------------------------------

If feature disabled

Hide menu

or

Show Locked Icon

depending on configuration.

------------------------------------------------------------
LOCKED FEATURE
------------------------------------------------------------

When user opens unavailable feature

Show

Upgrade Modal

Never show

404

Never show

Internal Error

------------------------------------------------------------
UPGRADE MODAL
------------------------------------------------------------

Display

Current Plan

Required Plan

Benefits

Pricing

Upgrade Button

Compare Plans

Close Button

------------------------------------------------------------
CURRENT PLAN CARD
------------------------------------------------------------

Display

Current Plan

Monthly/Yearly

Expiry Date

Renewal Date

Status

Trial Days Remaining

Upgrade Button

------------------------------------------------------------
USAGE PAGE
------------------------------------------------------------

Display

AI Chat Usage

Voice Usage

Scanner Usage

Storage Used

Exports

Imports

API Calls

------------------------------------------------------------
USAGE PROGRESS BAR
------------------------------------------------------------

Example

AI Chat

250 / 500

Voice

50 / 500

Storage

2.3 GB / 20 GB

------------------------------------------------------------
PLAN BADGE
------------------------------------------------------------

Every dashboard should show

FREE

SILVER

GOLD

ENTERPRISE

------------------------------------------------------------
PRICING PAGE
------------------------------------------------------------

Show

Free

Silver

Gold

Enterprise

Each card contains

Price

Monthly

Yearly

Features

Limits

Upgrade Button

------------------------------------------------------------
COMPARE PLANS
------------------------------------------------------------

Create comparison table.

Rows

Inventory

Billing

Analytics

AI Chat

Voice

Scanner

Warehouse

Staff

Storage

Support

Columns

Free

Silver

Gold

Enterprise

------------------------------------------------------------
FEATURE COMPONENT
------------------------------------------------------------

Create reusable component

FeatureAvailable

FeatureLocked

FeatureLoading

Every page should use same component.

------------------------------------------------------------
CUSTOM HOOKS
------------------------------------------------------------

useSubscription()

Returns

Current Plan

Status

Expiry

useFeatures()

Returns

Feature List

useUsage()

Returns

Usage

Remaining

Limits

usePermission()

Returns

True

False

------------------------------------------------------------
PROTECTED COMPONENT
------------------------------------------------------------

Instead of

if(plan=="Gold")

Create

<ProtectedFeature
feature="AI_CHAT">

Children

</ProtectedFeature>

Component should automatically

Check permission

Check limits

Render

or

Show Upgrade Modal

------------------------------------------------------------
AI USAGE CARD
------------------------------------------------------------

Dashboard should display

AI Requests

Remaining

Voice Usage

Scanner Usage

Current Month Usage

------------------------------------------------------------
SUBSCRIPTION BANNER
------------------------------------------------------------

Examples

Trial expires in 2 days

Subscription expires tomorrow

Renew now

Upgrade to Gold

------------------------------------------------------------
PAYMENT HISTORY PAGE
------------------------------------------------------------

Show

Invoices

Payments

Refunds

Transactions

Download Invoice

------------------------------------------------------------
SETTINGS PAGE
------------------------------------------------------------

Add

Subscription

Billing

Invoices

Coupons

Payment Method

------------------------------------------------------------
LOADING RULES
------------------------------------------------------------

Subscription

↓

Load First

↓

Render Pages

Never render protected pages before subscription loads.

------------------------------------------------------------
ERROR HANDLING
------------------------------------------------------------

Subscription Failed

↓

Retry

↓

Fallback

↓

Contact Support

------------------------------------------------------------
UI COMPONENTS
------------------------------------------------------------

Plan Card

Feature Card

Usage Card

Upgrade Banner

Locked Screen

Subscription Banner

Usage Progress

Invoice Card

Payment Card

------------------------------------------------------------
THEME
------------------------------------------------------------

Follow existing UI.

Glassmorphism

Gradient

Dark Mode

Light Mode

Framer Motion

Responsive

------------------------------------------------------------
CODING RULES
------------------------------------------------------------

No Hardcoded Plans

No Hardcoded Prices

No Hardcoded Features

Everything comes from Backend.

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Sidebar is Dynamic

Routes are Protected

Upgrade Flow Works

Usage Updates Live

No Hardcoded Logic

Frontend works with any future plan without modification.

------------------------------------------------------------

END OF DOCUMENT