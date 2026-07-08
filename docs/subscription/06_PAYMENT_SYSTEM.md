# Inventory Ant
# Enterprise Subscription System
# 06_PAYMENT_SYSTEM.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines the complete payment architecture
for Inventory Ant.

The objective is to create a secure, scalable and
enterprise-ready subscription payment system.

Payments must NEVER directly activate subscriptions.

Subscriptions should only become active after successful
payment verification.

------------------------------------------------------------
SUPPORTED PAYMENT GATEWAYS
------------------------------------------------------------

Primary

Razorpay

Future

Stripe

Cashfree

PayPal

PhonePe Business

------------------------------------------------------------
PAYMENT FLOW
------------------------------------------------------------

User

↓

Choose Plan

↓

Choose Billing Cycle

↓

Apply Coupon (Optional)

↓

Price Calculation

↓

Create Order

↓

Payment Gateway

↓

Payment Success

↓

Webhook Verification

↓

Subscription Activation

↓

Invoice Generation

↓

Email Confirmation

↓

Audit Log

------------------------------------------------------------
IMPORTANT RULE
------------------------------------------------------------

Frontend payment success

≠

Subscription Active

Only verified webhook events
can activate subscriptions.

------------------------------------------------------------
PAYMENT STATES
------------------------------------------------------------

CREATED

↓

PENDING

↓

SUCCESS

↓

FAILED

↓

REFUNDED

↓

CANCELLED

↓

EXPIRED

------------------------------------------------------------
ORDER CREATION FLOW
------------------------------------------------------------

User selects

Plan

↓

Billing Cycle

↓

Coupon

↓

Backend validates

↓

Backend calculates amount

↓

Backend creates payment order

↓

Returns

Order ID

Amount

Currency

Gateway Key

------------------------------------------------------------
PAYMENT VERIFICATION
------------------------------------------------------------

Frontend sends

Payment ID

Order ID

Signature

↓

Backend verifies signature

↓

Webhook verifies transaction

↓

Update payment status

↓

Activate subscription

------------------------------------------------------------
WEBHOOK EVENTS
------------------------------------------------------------

Payment Success

Payment Failed

Refund Created

Refund Processed

Subscription Renewed

Subscription Cancelled

------------------------------------------------------------
DATABASE TABLES
------------------------------------------------------------

Existing

Payment

New

Subscription

SubscriptionHistory

CouponUsage

Invoice

PaymentWebhookLog

------------------------------------------------------------
PAYMENT TABLE
------------------------------------------------------------

Store

Payment ID

Gateway

Amount

Currency

Status

Order ID

Invoice ID

User ID

Created At

Updated At

------------------------------------------------------------
INVOICE GENERATION
------------------------------------------------------------

Automatically generate

Invoice Number

GST Invoice

Payment Receipt

Download PDF

Email Copy

------------------------------------------------------------
SUBSCRIPTION ACTIVATION
------------------------------------------------------------

Only after

Verified Payment

↓

Update Subscription

↓

Reset Usage

↓

Update Expiry Date

↓

Generate Invoice

↓

Send Email

------------------------------------------------------------
RENEWAL FLOW
------------------------------------------------------------

7 Days Before Expiry

↓

Reminder

↓

3 Days Before

↓

Reminder

↓

Expiry Day

↓

Reminder

↓

Grace Period

↓

Suspend Premium Features

------------------------------------------------------------
AUTO RENEWAL
------------------------------------------------------------

If Auto Renew

↓

Attempt Payment

↓

Success

↓

Extend Subscription

↓

Reset Usage

↓

Email User

If Failed

↓

Retry

↓

Grace Period

------------------------------------------------------------
FAILED PAYMENT FLOW
------------------------------------------------------------

Payment Failed

↓

Retry Button

↓

Retry Payment

↓

Success

↓

Activate

Else

↓

Keep Current Status

------------------------------------------------------------
REFUND FLOW
------------------------------------------------------------

Admin

↓

Approve Refund

↓

Gateway Refund

↓

Webhook

↓

Update Payment

↓

Downgrade Subscription

↓

Audit Log

------------------------------------------------------------
COUPON FLOW
------------------------------------------------------------

User Applies Coupon

↓

Validate

↓

Expiry

↓

Usage Limit

↓

Minimum Amount

↓

Calculate Discount

↓

Generate Final Amount

------------------------------------------------------------
TRIAL FLOW
------------------------------------------------------------

New User

↓

Free Trial

↓

No Payment Required

↓

Trial Ends

↓

Upgrade Screen

------------------------------------------------------------
PLAN UPGRADE
------------------------------------------------------------

Current

Silver

↓

Upgrade

Gold

↓

Calculate Remaining Value

↓

Adjust Price

↓

Pay Difference

↓

Activate Gold

------------------------------------------------------------
PLAN DOWNGRADE
------------------------------------------------------------

Current

Gold

↓

Downgrade

Silver

↓

Effective After Expiry

No Immediate Downgrade

------------------------------------------------------------
ADDON PURCHASE
------------------------------------------------------------

User

↓

Extra AI

↓

Payment

↓

Verification

↓

Increase AI Limit

------------------------------------------------------------
PAYMENT SECURITY
------------------------------------------------------------

Never trust frontend amount.

Always calculate amount in backend.

Verify payment signature.

Verify webhook signature.

Prevent duplicate payments.

Prevent replay attacks.

------------------------------------------------------------
ERROR HANDLING
------------------------------------------------------------

Invalid Signature

↓

Reject

--------------------------------

Duplicate Payment

↓

Ignore

--------------------------------

Expired Order

↓

Create New Order

--------------------------------

Invalid Coupon

↓

Reject

--------------------------------

Gateway Timeout

↓

Retry

------------------------------------------------------------
ADMIN CONTROLS
------------------------------------------------------------

View Payments

Refund

Retry

Force Activate

Force Cancel

Export Payments

Payment Analytics

------------------------------------------------------------
NOTIFICATIONS
------------------------------------------------------------

Payment Success

Payment Failed

Subscription Activated

Renewal Reminder

Invoice Generated

Refund Completed

------------------------------------------------------------
EMAILS
------------------------------------------------------------

Payment Receipt

Invoice

Renewal Reminder

Expiry Reminder

Refund Confirmation

Plan Upgrade

Plan Downgrade

------------------------------------------------------------
AUDIT LOGS
------------------------------------------------------------

Every payment action
must generate audit logs.

------------------------------------------------------------
REPORTS
------------------------------------------------------------

Daily Revenue

Monthly Revenue

Yearly Revenue

Refund Report

Gateway Report

Coupon Report

Subscription Report

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Payment cannot activate subscription directly.

Webhook verification mandatory.

Every payment generates invoice.

Every subscription generates history.

Everything is auditable.

------------------------------------------------------------

END OF DOCUMENT