# Inventory Ant
# Enterprise Subscription System
# 09_API_SPECIFICATION.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines every REST API required by the
Subscription System.

This document acts as the official API contract
between Frontend and Backend.

Every request and response must follow this document.

Breaking this contract requires version changes.

------------------------------------------------------------
API STANDARDS
------------------------------------------------------------

Protocol

HTTPS

--------------------------------

Content Type

application/json

--------------------------------

Authentication

JWT Bearer Token

--------------------------------

Response Format

{
 success,
 message,
 data,
 errors,
 timestamp,
 requestId
}

--------------------------------

Status Codes

200

201

204

400

401

403

404

409

422

429

500

------------------------------------------------------------
AUTHENTICATION
------------------------------------------------------------

POST

/auth/login

--------------------------------

POST

/auth/register

--------------------------------

POST

/auth/google

--------------------------------

POST

/auth/logout

--------------------------------

POST

/auth/refresh

--------------------------------

GET

/auth/me

------------------------------------------------------------
SUBSCRIPTION
------------------------------------------------------------

GET

/subscription/current

Purpose

Return active subscription.

--------------------------------

POST

/subscription/upgrade

Purpose

Upgrade subscription.

--------------------------------

POST

/subscription/downgrade

--------------------------------

POST

/subscription/cancel

--------------------------------

POST

/subscription/resume

--------------------------------

POST

/subscription/renew

--------------------------------

GET

/subscription/history

------------------------------------------------------------
PLANS
------------------------------------------------------------

GET

/plans

Return all public plans.

--------------------------------

GET

/plans/:id

--------------------------------

POST

/plans

Admin

--------------------------------

PATCH

/plans/:id

Admin

--------------------------------

DELETE

/plans/:id

Admin

------------------------------------------------------------
FEATURES
------------------------------------------------------------

GET

/features

Admin

--------------------------------

GET

/features/me

Current user

--------------------------------

PATCH

/features/:id

Admin

------------------------------------------------------------
PLAN FEATURES
------------------------------------------------------------

GET

/plans/:id/features

--------------------------------

PATCH

/plans/:id/features

--------------------------------

POST

/plans/:id/features

------------------------------------------------------------
USAGE
------------------------------------------------------------

GET

/usage/me

--------------------------------

GET

/usage/history

--------------------------------

POST

/usage/reset

Admin

--------------------------------

GET

/usage/admin

------------------------------------------------------------
PAYMENTS
------------------------------------------------------------

POST

/payment/create-order

--------------------------------

POST

/payment/verify

--------------------------------

POST

/payment/webhook

--------------------------------

GET

/payment/history

--------------------------------

GET

/payment/:id

------------------------------------------------------------
INVOICES
------------------------------------------------------------

GET

/invoices

--------------------------------

GET

/invoices/:id

--------------------------------

GET

/invoices/download/:id

------------------------------------------------------------
COUPONS
------------------------------------------------------------

POST

/coupons/apply

--------------------------------

GET

/coupons

--------------------------------

POST

/coupons

Admin

--------------------------------

PATCH

/coupons/:id

--------------------------------

DELETE

/coupons/:id

------------------------------------------------------------
ADDONS
------------------------------------------------------------

GET

/addons

--------------------------------

POST

/addons/purchase

--------------------------------

GET

/addons/history

------------------------------------------------------------
FEATURE FLAGS
------------------------------------------------------------

GET

/feature-flags

--------------------------------

POST

/feature-flags

--------------------------------

PATCH

/feature-flags/:id

--------------------------------

DELETE

/feature-flags/:id

------------------------------------------------------------
USER MANAGEMENT
------------------------------------------------------------

GET

/admin/users

--------------------------------

GET

/admin/users/:id

--------------------------------

PATCH

/admin/users/:id

--------------------------------

DELETE

/admin/users/:id

--------------------------------

POST

/admin/users/:id/change-plan

--------------------------------

POST

/admin/users/:id/reset-usage

--------------------------------

POST

/admin/users/:id/suspend

--------------------------------

POST

/admin/users/:id/activate

------------------------------------------------------------
ANALYTICS
------------------------------------------------------------

GET

/admin/analytics/dashboard

--------------------------------

GET

/admin/analytics/revenue

--------------------------------

GET

/admin/analytics/ai-cost

--------------------------------

GET

/admin/analytics/plans

--------------------------------

GET

/admin/analytics/payments

------------------------------------------------------------
AI
------------------------------------------------------------

POST

/ai/chat

--------------------------------

POST

/ai/voice

--------------------------------

POST

/ai/scanner

--------------------------------

POST

/ai/ocr

--------------------------------

GET

/ai/history

------------------------------------------------------------
NOTIFICATIONS
------------------------------------------------------------

GET

/notifications

--------------------------------

POST

/notifications

--------------------------------

PATCH

/notifications/:id

------------------------------------------------------------
SUPPORT
------------------------------------------------------------

POST

/support

--------------------------------

GET

/support/my

--------------------------------

GET

/admin/support

--------------------------------

PATCH

/admin/support/:id

------------------------------------------------------------
REQUEST HEADERS
------------------------------------------------------------

Authorization

Bearer JWT

--------------------------------

Content-Type

application/json

--------------------------------

Accept

application/json

------------------------------------------------------------
ERROR RESPONSE
------------------------------------------------------------

{
 success:false,

 errorCode,

 message,

 requestId,

 timestamp
}

------------------------------------------------------------
SUCCESS RESPONSE
------------------------------------------------------------

{
 success:true,

 message,

 data,

 timestamp,

 requestId
}

------------------------------------------------------------
PAGINATION
------------------------------------------------------------

page

limit

sort

search

filter

------------------------------------------------------------
FILTERS
------------------------------------------------------------

Every listing endpoint should support

Search

Sort

Pagination

Status

Date

------------------------------------------------------------
RATE LIMIT
------------------------------------------------------------

Authentication

10/min

--------------------------------

AI

30/min

--------------------------------

Payments

5/min

--------------------------------

Admin

100/min

------------------------------------------------------------
VERSIONING
------------------------------------------------------------

Every API

/api/v1/

Future

/api/v2/

------------------------------------------------------------
DOCUMENTATION
------------------------------------------------------------

Swagger

OpenAPI

Postman Collection

must automatically generate
from backend decorators.

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Every API documented.

Every endpoint versioned.

Every request validated.

Every response standardized.

------------------------------------------------------------

END OF DOCUMENT