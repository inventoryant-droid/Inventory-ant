# Inventory Ant
# Enterprise Subscription System
# 02_DATABASE_SCHEMA.md

Version: 1.0

------------------------------------------------------------

# PURPOSE

This document defines every database object required for the Subscription System.

The goal is to extend the current database.

Existing tables MUST NOT be removed.

Only new tables should be added.

------------------------------------------------------------

# DATABASE PRINCIPLES

Database is the Source of Truth.

Plans must NOT exist inside code.

Features must NOT exist inside code.

Prices must NOT exist inside code.

Permissions must NOT exist inside code.

Everything must be configurable through database.

------------------------------------------------------------

# EXISTING TABLES

These tables already exist.

User

Product

Bill

ChatThread

ChatMessage

Notification

Payment

ActivityLog

InventoryHistory

SupportTicket

These tables remain unchanged.

------------------------------------------------------------

NEW TABLES

The following tables will be added.

Plan

Feature

PlanFeature

Subscription

FeatureUsage

Coupon

Addon

SubscriptionAddon

FeatureFlag

PlanHistory

AuditEvent

------------------------------------------------------------

TABLE

Plan

Purpose

Stores all subscription plans.

Columns

id

uuid

Primary Key

---------------------------------

name

Free

Silver

Gold

Enterprise

---------------------------------

slug

free

silver

gold

enterprise

---------------------------------

description

Long description

---------------------------------

monthlyPrice

decimal

---------------------------------

yearlyPrice

decimal

---------------------------------

trialDays

integer

---------------------------------

isActive

boolean

---------------------------------

displayOrder

integer

---------------------------------

createdAt

timestamp

---------------------------------

updatedAt

timestamp

------------------------------------------------------------

TABLE

Feature

Purpose

Stores every capability of the software.

Columns

id

uuid

---------------------------------

code

Unique

Examples

AI_CHAT

VOICE_ASSISTANT

SMART_SCAN

ANALYTICS

BARCODE

WAREHOUSE

BILLING

PURCHASE

REPORT

STAFF

NOTIFICATION

---------------------------------

name

Display Name

---------------------------------

category

AI

Inventory

Billing

Reports

Analytics

Admin

---------------------------------

description

---------------------------------

isActive

boolean

------------------------------------------------------------

TABLE

PlanFeature

Purpose

Connects Plans with Features.

Columns

id

uuid

---------------------------------

planId

FK

---------------------------------

featureId

FK

---------------------------------

enabled

boolean

---------------------------------

limitValue

integer

Nullable

NULL means Unlimited

---------------------------------

metadata

json

Future settings

------------------------------------------------------------

Examples

Free

AI Chat

Enabled

20

---------------------------------

Silver

AI Chat

Enabled

500

---------------------------------

Gold

AI Chat

Enabled

3000

------------------------------------------------------------

TABLE

Subscription

Purpose

Stores user subscriptions.

Columns

id

uuid

---------------------------------

userId

FK User

---------------------------------

planId

FK Plan

---------------------------------

status

trial

active

expired

cancelled

grace

suspended

---------------------------------

billingCycle

monthly

yearly

---------------------------------

startDate

---------------------------------

expiryDate

---------------------------------

renewalDate

---------------------------------

autoRenew

boolean

---------------------------------

paymentId

nullable

---------------------------------

createdAt

---------------------------------

updatedAt

------------------------------------------------------------

TABLE

FeatureUsage

Purpose

Tracks monthly usage.

Columns

id

uuid

---------------------------------

userId

---------------------------------

featureId

---------------------------------

used

integer

---------------------------------

month

---------------------------------

year

---------------------------------

resetDate

------------------------------------------------------------

Examples

AI Chat

Used

145

Month

July

------------------------------------------------------------

Voice

Used

32

------------------------------------------------------------

Scanner

Used

19

------------------------------------------------------------

TABLE

Coupon

Purpose

Discount system.

Columns

id

uuid

---------------------------------

code

---------------------------------

discountType

percentage

fixed

---------------------------------

discountValue

---------------------------------

maximumDiscount

---------------------------------

minimumAmount

---------------------------------

usageLimit

---------------------------------

usedCount

---------------------------------

validFrom

---------------------------------

validTill

---------------------------------

active

------------------------------------------------------------

TABLE

Addon

Purpose

Additional purchasable services.

Examples

Extra AI

Extra Staff

Extra Warehouse

Extra Storage

Columns

id

name

description

price

billingCycle

active

------------------------------------------------------------

TABLE

SubscriptionAddon

Purpose

Maps purchased addons.

Columns

id

subscriptionId

addonId

quantity

expiryDate

------------------------------------------------------------

TABLE

FeatureFlag

Purpose

Gradual rollout.

Columns

id

code

name

enabled

conditions

json

Examples

Gold Only

Restaurant Only

First 100 Users

------------------------------------------------------------

TABLE

PlanHistory

Purpose

Records every plan change.

Columns

id

userId

oldPlan

newPlan

reason

changedBy

timestamp

------------------------------------------------------------

TABLE

AuditEvent

Purpose

Subscription audit.

Examples

Plan Changed

Coupon Applied

Renewal Failed

Payment Success

Feature Enabled

Feature Disabled

------------------------------------------------------------

RELATIONSHIPS

User

↓

Subscription

↓

Plan

↓

PlanFeature

↓

Feature

---------------------------------

Subscription

↓

SubscriptionAddon

↓

Addon

---------------------------------

User

↓

FeatureUsage

↓

Feature

---------------------------------

Subscription

↓

Payment

------------------------------------------------------------

INDEXES

Plan

slug

UNIQUE

---------------------------------

Feature

code

UNIQUE

---------------------------------

Subscription

userId

INDEX

---------------------------------

FeatureUsage

userId

featureId

month

year

COMPOSITE INDEX

---------------------------------

Coupon

code

UNIQUE

------------------------------------------------------------

CASCADE RULES

Delete User

↓

Delete Subscription

↓

Delete Usage

↓

Delete Addons

------------------------------------------------------------

Delete Plan

Not Allowed

If subscriptions exist.

------------------------------------------------------------

Delete Feature

Not Allowed

Must be archived.

------------------------------------------------------------

SOFT DELETE POLICY

Plans

Soft Delete

Features

Soft Delete

Coupons

Soft Delete

Addons

Soft Delete

Never permanently delete production data.

------------------------------------------------------------

SEED DATA

During first migration automatically create:

Plans

Free

Silver

Gold

Enterprise

---------------------------------

Features

Inventory

Billing

Analytics

AI Chat

Voice

Scanner

History

Reports

Barcode

Warehouse

Purchase

Supplier

Customer

Notification

Staff

API

Export

Import

Forecast

Prediction

------------------------------------------------------------

MIGRATION RULES

Existing users

↓

Automatically receive

↓

Free Plan

---------------------------------

Existing payment history

Must remain untouched.

---------------------------------

Existing inventory

Must remain untouched.

---------------------------------

Existing staff

Must remain untouched.

------------------------------------------------------------

DATABASE PRINCIPLES

No hardcoded plan.

No hardcoded feature.

No hardcoded limit.

Everything must be configurable.

------------------------------------------------------------

END OF DOCUMENT