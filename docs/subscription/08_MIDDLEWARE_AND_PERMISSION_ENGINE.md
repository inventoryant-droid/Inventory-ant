# Inventory Ant
# Enterprise Subscription System
# 08_MIDDLEWARE_AND_PERMISSION_ENGINE.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines the complete authorization,
subscription validation,
feature validation,
usage validation,
and permission engine.

Every protected API inside Inventory Ant MUST pass through
this engine before executing business logic.

This engine is the central security layer of the platform.

------------------------------------------------------------
CORE PRINCIPLE
------------------------------------------------------------

Controllers must never know

Current Plan

Feature Limits

AI Limits

Staff Permissions

Subscription Expiry

Controllers should only contain business logic.

Everything else belongs to middleware.

------------------------------------------------------------
REQUEST PIPELINE
------------------------------------------------------------

Every protected request follows the same pipeline.

Incoming Request

↓

JWT Authentication

↓

Load User

↓

Load Active Subscription

↓

Check Subscription Status

↓

Load Enabled Features

↓

Check Feature Permission

↓

Check Usage Limit

↓

Check Staff Permission

↓

Check Feature Flag

↓

Business Controller

↓

Database

↓

Response

------------------------------------------------------------
MIDDLEWARE EXECUTION ORDER
------------------------------------------------------------

1

Authentication

↓

2

Subscription Middleware

↓

3

Plan Middleware

↓

4

Feature Middleware

↓

5

Usage Middleware

↓

6

Role Middleware

↓

7

Feature Flag Middleware

↓

8

Business Controller

Order must never change.

------------------------------------------------------------
AUTHENTICATION MIDDLEWARE
------------------------------------------------------------

Responsibilities

Verify JWT

Load User

Validate Session

Attach User to Request

Reject invalid tokens.

------------------------------------------------------------
SUBSCRIPTION MIDDLEWARE
------------------------------------------------------------

Responsibilities

Load Subscription

Check Active Status

Check Expiry

Check Grace Period

Return Subscription Context

Never execute business logic.

------------------------------------------------------------
PLAN MIDDLEWARE
------------------------------------------------------------

Responsibilities

Load Plan

Load Plan Features

Load Plan Limits

Attach to Request Context

------------------------------------------------------------
FEATURE MIDDLEWARE
------------------------------------------------------------

Responsibilities

Check if feature exists.

Check if feature enabled.

Check feature visibility.

Check feature availability.

Return

403

if feature unavailable.

------------------------------------------------------------
USAGE MIDDLEWARE
------------------------------------------------------------

Responsibilities

Read Current Usage

Read Limit

Compare

Allow

or

Reject

Should support

Monthly

Yearly

Lifetime

Usage Types

------------------------------------------------------------
ROLE MIDDLEWARE
------------------------------------------------------------

Responsibilities

Owner

Admin

Manager

Cashier

Staff

Viewer

Every request must verify role permission.

------------------------------------------------------------
FEATURE FLAG MIDDLEWARE
------------------------------------------------------------

Responsibilities

Evaluate Feature Flags

Enable

Disable

Beta Rollout

Business Type

Plan

Region

Version

------------------------------------------------------------
PERMISSION ENGINE
------------------------------------------------------------

Permission has three levels.

Business Level

↓

Role Level

↓

Feature Level

Example

Business

Gold

↓

Feature

Analytics

↓

Role

Cashier

↓

Denied

------------------------------------------------------------
REQUEST CONTEXT
------------------------------------------------------------

Every middleware should enrich request.

Example

Request

↓

User

Subscription

Plan

Limits

Permissions

Usage

Business

Staff Role

Everything available to controller.

------------------------------------------------------------
PERMISSION RESOLUTION
------------------------------------------------------------

Request

↓

Business Plan

↓

Enabled Feature

↓

Role Permission

↓

Usage

↓

Final Decision

Controllers never repeat this logic.

------------------------------------------------------------
FEATURE CHECK
------------------------------------------------------------

Example

POST

/ai/chat

↓

Requires

AI_CHAT

↓

Check

Subscription

↓

Enabled

↓

Usage

↓

Remaining

↓

Execute

------------------------------------------------------------
USAGE CHECK
------------------------------------------------------------

Current Usage

↓

Current Limit

↓

Limit Remaining

↓

Allow

Else

Return

AI_LIMIT_EXCEEDED

------------------------------------------------------------
ROLE CHECK
------------------------------------------------------------

Owner

Everything

Manager

Inventory

Billing

Reports

Cashier

Billing Only

Viewer

Read Only

Custom Role

Configured by Owner

------------------------------------------------------------
CUSTOM PERMISSIONS
------------------------------------------------------------

Business Owners should be able to configure

Inventory

Billing

Analytics

Purchase

Warehouse

Staff

AI

History

Reports

Notification

Settings

Each role independently.

------------------------------------------------------------
FEATURE FLAGS
------------------------------------------------------------

Example

Demand Forecast

↓

Gold

↓

Restaurant

↓

Enabled

Medical

↓

Disabled

No code changes required.

------------------------------------------------------------
MIDDLEWARE RESPONSE FORMAT
------------------------------------------------------------

Every middleware returns

Success

↓

Next Middleware

or

Failure

↓

JSON Error

Never throw raw exceptions.

------------------------------------------------------------
ERROR CODES
------------------------------------------------------------

INVALID_TOKEN

SUBSCRIPTION_EXPIRED

PLAN_NOT_FOUND

FEATURE_DISABLED

ROLE_DENIED

USAGE_EXCEEDED

FEATURE_FLAG_DISABLED

INVALID_BUSINESS

------------------------------------------------------------
PERFORMANCE
------------------------------------------------------------

Cache

Plan

Features

Permissions

Feature Flags

Never cache

Usage

Payments

Inventory

------------------------------------------------------------
AUDIT
------------------------------------------------------------

Log

Permission Denied

Subscription Expired

Limit Exceeded

Role Denied

Suspicious Access

------------------------------------------------------------
OWNER PERMISSIONS
------------------------------------------------------------

Owner always has access
to every feature included in the subscription.

Owner cannot access
disabled subscription features.

------------------------------------------------------------
STAFF PERMISSIONS
------------------------------------------------------------

Staff cannot exceed

Business Plan

Even if owner grants permission.

Example

Free Plan

Analytics Disabled

↓

Owner Enables

Analytics

↓

Still Denied

Subscription has higher priority.

------------------------------------------------------------
SUPER ADMIN
------------------------------------------------------------

Super Admin bypasses

Subscription

Limits

Usage

Role

Feature Flags

Used only for support
and administration.

------------------------------------------------------------
API DECORATORS
------------------------------------------------------------

Every protected endpoint should use decorators.

Example

RequireFeature()

RequirePermission()

RequireUsage()

RequireRole()

Controllers stay clean.

------------------------------------------------------------
EDGE CASES
------------------------------------------------------------

Expired Subscription

↓

Allow Login

↓

Block Premium Features

--------------------------------

Grace Period

↓

Limited Access

--------------------------------

Feature Removed

↓

Hide UI

↓

Reject API

--------------------------------

Usage Reset Day

↓

Reset

↓

Continue

------------------------------------------------------------
FAIL SAFE
------------------------------------------------------------

If middleware fails

Never corrupt inventory.

Never modify billing.

Never update stock.

Reject request safely.

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Single permission engine.

No duplicated permission logic.

No hardcoded plan checks.

Every request validated.

Controllers contain business logic only.

------------------------------------------------------------

END OF DOCUMENT