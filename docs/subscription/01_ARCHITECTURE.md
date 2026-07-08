# Inventory Ant
# Enterprise Subscription System
# 01_ARCHITECTURE.md

Version : 1.0

------------------------------------------------------------

# PURPOSE

This document defines the complete architecture of the Subscription System.

Every backend module,
frontend module,
database table,
middleware,
API,
and admin feature
must follow this architecture.

This document is the highest level technical design of the SaaS platform.

------------------------------------------------------------

# ARCHITECTURE GOAL

Inventory Ant is no longer just an Inventory Management System.

Inventory Ant becomes an Enterprise SaaS Platform.

The architecture must support:

• Unlimited Businesses

• Unlimited Subscription Plans

• Unlimited Features

• Unlimited AI Usage Packs

• Monthly Billing

• Yearly Billing

• Trial Plans

• Coupons

• Feature Flags

• Multi Organization

• Enterprise Customers

without changing existing business logic.

------------------------------------------------------------

# HIGH LEVEL ARCHITECTURE


                    Internet
                        │
                        │
                React Frontend
                        │
                        │
                 NestJS Backend
                        │
        ┌───────────────┼────────────────┐
        │               │                │
 Authentication   Subscription      Business Modules
        │               │                │
        │               │                │
        │         Permission Layer       │
        │               │                │
        └───────────────┼────────────────┘
                        │
                 PostgreSQL Database

------------------------------------------------------------

# APPLICATION LAYERS


Presentation Layer

↓

Authentication Layer

↓

Subscription Layer

↓

Permission Layer

↓

Business Layer

↓

Database Layer


Business modules should never directly check plans.

Every request must first pass through the Subscription Layer.

------------------------------------------------------------

# SUBSCRIPTION LAYER

The Subscription Layer is the heart of the SaaS platform.

Responsibilities:

Validate subscription

Check expiry

Check feature availability

Check limits

Track usage

Calculate remaining quota

Return feature permissions

This layer must remain completely independent from Inventory,
Billing,
Analytics,
AI,
and Staff modules.

------------------------------------------------------------

# REQUEST FLOW


User Request

↓

JWT Authentication

↓

Subscription Validation

↓

Plan Validation

↓

Feature Validation

↓

Usage Validation

↓

Role Permission Validation

↓

Business Controller

↓

Database


If any validation fails,
the request must stop immediately.

------------------------------------------------------------

# FEATURE ENGINE

Every capability inside Inventory Ant is considered a Feature.

Examples

Inventory

Billing

Analytics

AI Chat

Voice Assistant

Scanner

History

Reports

Barcode

Purchase

Supplier

Warehouse

Staff

Notification

Import

Export

API Access

Forecast

Prediction

Feature Flags

Nothing should be hardcoded.

------------------------------------------------------------

# PLAN ENGINE

A Plan is NOT a feature.

A Plan is only a collection of features.

Example


Silver

↓

Inventory

Billing

Analytics

AI Chat

Voice

Barcode

History


Gold

↓

Silver Features

+

Forecast

API

Multiple Warehouses

Priority Support

------------------------------------------------------------

# LIMIT ENGINE

Every feature may have limits.

Example

Inventory Products

100

1000

Unlimited


AI Chat

20

500

3000


Staff

1

10

Unlimited


Warehouses

1

3

Unlimited


Storage

500 MB

20 GB

Unlimited

Limits are independent from features.

------------------------------------------------------------

# PERMISSION ENGINE

Permission has two levels.


Level 1

Subscription

Can this Business use the feature?


↓

Level 2

Role

Can this Staff Member use the feature?


Example

Gold Plan

Analytics Enabled

↓

Staff Permission

Disabled

↓

Access Denied

------------------------------------------------------------

# USAGE ENGINE

Every limited feature must record usage.

Examples

AI Chat

Voice

Scanner

OCR

Storage

Exports

Imports

API Calls

Email Sending

Monthly usage automatically resets according to subscription rules.

------------------------------------------------------------

# FEATURE FLAGS

Feature Flags allow rolling out features without deployment.

Example

AI Voice V2

OFF


↓

Turn ON

↓

Only Gold Users


or

Only Restaurant Businesses


or

Only First 100 Users


Feature Flags are independent from Plans.

------------------------------------------------------------

# SUBSCRIPTION STATES


Trial

↓

Active

↓

Grace Period

↓

Expired

↓

Suspended

↓

Cancelled

↓

Deleted


Business logic must react according to state.

------------------------------------------------------------

# PAYMENT ARCHITECTURE


User

↓

Choose Plan

↓

Payment Gateway

↓

Webhook

↓

Verification

↓

Subscription Update

↓

Usage Reset

↓

Invoice Generation

↓

Email

Payment success alone should never activate subscription.

Only verified webhook events may activate subscriptions.

------------------------------------------------------------

# COUPON ENGINE

Coupons should never modify plans.

Coupons only affect pricing.

Example

20%

₹500 OFF

Free Trial

Launch Offer

Student Offer

Referral Offer

Coupons must remain reusable.

------------------------------------------------------------

# ADDON ENGINE

Plans remain simple.

Advanced functionality should be sold through Addons.

Examples

Extra AI Credits

Extra Warehouses

Extra Staff

Extra Storage

Extra API Calls

WhatsApp Integration

SMS Pack

Advanced Reports

Addon purchases never modify the base plan.

------------------------------------------------------------

# AI ARCHITECTURE

AI is a premium resource.

Every AI request must pass through:


Authentication

↓

Subscription

↓

Usage Check

↓

Gemini API

↓

Usage Increment

↓

Response

If AI fails,

Inventory must continue working.

AI must never become a dependency for normal inventory operations.

------------------------------------------------------------

# DATABASE PRINCIPLES

Every configurable item belongs in the database.

Never hardcode:

Plan Names

Feature Names

Limits

Prices

Storage

Usage

Trial Days

Coupons

Everything should be editable through Admin Panel.

------------------------------------------------------------

# ADMIN ARCHITECTURE

Admin Panel is NOT business logic.

Admin Panel only manages configuration.

Responsibilities:

Plans

Pricing

Coupons

Usage

Users

Payments

Announcements

Feature Flags

AI Costs

Support Tickets

Analytics

Everything should work instantly after saving.

No deployment required.

------------------------------------------------------------

# FRONTEND ARCHITECTURE

Frontend must never hardcode menus.

Example


GET /me/features


↓

Backend returns


Inventory

Billing

Analytics

History

AI


React builds Sidebar dynamically.

Hidden features should never appear.

Locked features should display Upgrade UI.

------------------------------------------------------------

# BACKEND MODULES


Authentication

Inventory

Billing

Analytics

Notifications

Staff

AI

History


↓

Subscription Layer


↓

Database

Subscription should behave like middleware.

------------------------------------------------------------

# FAILURE PRINCIPLES

If Subscription Module crashes,

Authentication should still work.

Inventory should not lose data.

Database should remain consistent.

Failures should degrade gracefully.

------------------------------------------------------------

# SCALABILITY GOALS

Support:

100 Businesses

↓

1,000 Businesses

↓

10,000 Businesses

↓

100,000 Businesses

without architectural changes.

------------------------------------------------------------

# FUTURE COMPATIBILITY

Architecture must support future additions:

Multi Tenant

White Label

Branch Management

Marketplace

Plugin System

API Marketplace

Accounting

POS Devices

GST Portal

Machine Learning

Predictive Analytics

ERP Integration

without redesigning the Subscription Engine.

------------------------------------------------------------

# CORE PRINCIPLES

Everything is Configurable.

Everything is Dynamic.

Nothing is Hardcoded.

Business Logic remains Independent.

Subscription acts as a Layer.

Database is the Source of Truth.

Admin Panel is only a Configuration Interface.

------------------------------------------------------------

END OF DOCUMENT