# Inventory Ant
# Enterprise Subscription System
# 05_ADMIN_PANEL.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines the complete Super Admin Panel.

The Admin Panel is the central configuration system of Inventory Ant.

The Admin Panel must NEVER contain business logic.

The Admin Panel only manages data.

The database remains the single source of truth.

------------------------------------------------------------
ADMIN PANEL OBJECTIVES
------------------------------------------------------------

The Super Admin should be able to manage the entire SaaS platform without writing code.

Everything should be configurable.

Nothing should be hardcoded.

------------------------------------------------------------
ACCESS LEVELS
------------------------------------------------------------

There are two types of administrators.

1.

Super Admin

Complete access.

Can manage the entire platform.

2.

Support Admin

Limited access.

Can view users

Reply tickets

View payments

Cannot modify plans.

------------------------------------------------------------
ADMIN DASHBOARD
------------------------------------------------------------

The Dashboard should display

Total Businesses

Active Businesses

Inactive Businesses

Today's Revenue

Monthly Revenue

Yearly Revenue

Total AI Requests

Today's AI Requests

Today's Signups

New Businesses

Plan Distribution

Upcoming Renewals

Expired Plans

Pending Payments

Failed Payments

Support Tickets

Average Revenue Per User

Monthly Recurring Revenue

Annual Recurring Revenue

------------------------------------------------------------
DASHBOARD WIDGETS
------------------------------------------------------------

Revenue Graph

User Growth

AI Usage

Plan Distribution

Payment Status

Business Categories

Top Customers

Recent Activities

Server Status

API Health

------------------------------------------------------------
USER MANAGEMENT
------------------------------------------------------------

View all businesses

Search users

Filter by plan

Filter by expiry

Filter by status

Suspend business

Activate business

Delete business

Reset password

Reset AI usage

Reset subscription

Change subscription

Extend subscription

Impersonate business

------------------------------------------------------------
BUSINESS PROFILE
------------------------------------------------------------

Each business page should display

Business Name

Owner

Email

Phone

GST

Current Plan

Expiry Date

Storage Used

AI Usage

Staff Count

Warehouse Count

Invoices Generated

Revenue

Payment History

Activity Timeline

------------------------------------------------------------
PLAN MANAGEMENT
------------------------------------------------------------

Create Plan

Edit Plan

Delete Plan

Archive Plan

Activate Plan

Deactivate Plan

Duplicate Plan

Change Pricing

Change Trial Days

Change Display Order

------------------------------------------------------------
FEATURE MANAGEMENT
------------------------------------------------------------

Every software capability is managed here.

Examples

Inventory

Billing

Analytics

AI Chat

Voice Assistant

Scanner

Reports

History

Warehouse

Staff

Notifications

Export

Import

Barcode

API Access

Forecast

Prediction

------------------------------------------------------------
PLAN FEATURE MAPPING
------------------------------------------------------------

Example

Silver

↓

Inventory

Enabled

Unlimited

↓

Billing

Enabled

Unlimited

↓

Analytics

Enabled

↓

AI Chat

Enabled

500

↓

Voice

Enabled

500

↓

Scanner

Enabled

500

↓

Forecast

Disabled

------------------------------------------------------------
LIMIT MANAGEMENT
------------------------------------------------------------

Every plan should define limits.

Products

Warehouses

Staff

Invoices

Storage

AI Chat

Voice

Scanner

Exports

Imports

API Calls

Everything should be editable.

------------------------------------------------------------
PRICING MANAGEMENT
------------------------------------------------------------

Configure

Monthly Price

Yearly Price

Discount

Launch Offer

Trial Period

Renewal Rules

Display Price

Hidden Plans

------------------------------------------------------------
SUBSCRIPTION MANAGEMENT
------------------------------------------------------------

Upgrade

Downgrade

Renew

Cancel

Pause

Resume

Force Activate

Force Expire

Grant Trial

------------------------------------------------------------
PAYMENT MANAGEMENT
------------------------------------------------------------

View Payments

Payment Status

Refund

Invoices

Failed Payments

Retry Payments

Manual Payments

Payment Logs

------------------------------------------------------------
COUPON MANAGEMENT
------------------------------------------------------------

Create Coupon

Edit Coupon

Delete Coupon

Disable Coupon

Coupon Types

Percentage

Fixed Amount

Free Trial

Launch Offer

Referral

Student

Festival

------------------------------------------------------------
ADDON MANAGEMENT
------------------------------------------------------------

Create Addons

Examples

Extra AI

Extra Staff

Extra Warehouse

Extra Storage

Extra API Calls

WhatsApp Integration

SMS Pack

Premium Reports

Enable

Disable

Edit Price

------------------------------------------------------------
FEATURE FLAGS
------------------------------------------------------------

Create Feature Flag

Enable

Disable

Schedule

Target

Examples

Only Gold

Only Enterprise

Only Restaurant

Only Medical

Only First 100 Users

Only Beta Users

------------------------------------------------------------
AI MANAGEMENT
------------------------------------------------------------

Dashboard

Total AI Requests

Today's AI Requests

Average AI Cost

Gemini Cost

OCR Cost

Voice Cost

Most Active Businesses

Highest AI Consumers

Lowest AI Consumers

------------------------------------------------------------
AI LIMIT CONTROL
------------------------------------------------------------

Configure

AI Chat Limit

Voice Limit

Scanner Limit

Token Limit

Cost Alerts

Emergency Disable

------------------------------------------------------------
ANNOUNCEMENT MANAGEMENT
------------------------------------------------------------

Create Announcement

Maintenance Notice

New Features

Security Alerts

Plan Changes

Discount Campaigns

Announcements should target

All

Free

Silver

Gold

Enterprise

------------------------------------------------------------
SUPPORT CENTER
------------------------------------------------------------

View Tickets

Assign Tickets

Reply

Close

Reopen

Internal Notes

Priority

Status

------------------------------------------------------------
AUDIT LOGS
------------------------------------------------------------

Every admin action must be recorded.

Examples

Price Updated

Plan Deleted

Coupon Created

Feature Enabled

Business Suspended

Subscription Extended

Admin Login

------------------------------------------------------------
REPORTS
------------------------------------------------------------

Revenue Report

Subscription Report

Renewal Report

Coupon Usage

AI Usage

Business Growth

Feature Usage

Top Customers

------------------------------------------------------------
NOTIFICATION CENTER
------------------------------------------------------------

Notify Businesses

Notify Specific Plans

Notify Specific Users

Email

In-App

Push (Future)

------------------------------------------------------------
SEARCH SYSTEM
------------------------------------------------------------

Global Search

Businesses

Payments

Coupons

Plans

Invoices

Support Tickets

Features

------------------------------------------------------------
SETTINGS
------------------------------------------------------------

Platform Name

Support Email

SMTP

Payment Gateway

AI Provider

Storage

Backup

Maintenance Mode

------------------------------------------------------------
ROLE MANAGEMENT
------------------------------------------------------------

Super Admin

Support Admin

Finance Admin

Technical Admin

Each role should have independent permissions.

------------------------------------------------------------
SECURITY
------------------------------------------------------------

Every admin action requires authentication.

Critical actions require confirmation.

Delete operations should be soft delete.

Every request should generate audit logs.

------------------------------------------------------------
DESIGN RULES
------------------------------------------------------------

Responsive

Fast

Minimal

Glassmorphism

Dark Mode

Light Mode

Framer Motion

Consistent Design

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Every configurable value comes from Admin Panel.

No deployment required after changing plans.

No hardcoded prices.

No hardcoded limits.

No hardcoded features.

Everything is database driven.

------------------------------------------------------------

END OF DOCUMENT