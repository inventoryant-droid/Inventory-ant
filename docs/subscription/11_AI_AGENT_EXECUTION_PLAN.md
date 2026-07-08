# Inventory Ant
# Enterprise Subscription System
# 11_AI_AGENT_EXECUTION_PLAN.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines the execution order for implementing
the Enterprise Subscription System.

Every AI Agent (Cursor, Claude Code, Codex, Gemini CLI, etc.)
must strictly follow this execution plan.

The implementation MUST be incremental.

The application must remain working after every phase.

------------------------------------------------------------
ABSOLUTE RULES
------------------------------------------------------------

DO NOT rewrite existing business logic.

DO NOT rename existing APIs.

DO NOT delete existing database tables.

DO NOT modify authentication flow.

DO NOT modify inventory algorithms.

DO NOT modify billing calculations.

DO NOT change AI prompt logic.

Only extend the project.

------------------------------------------------------------
GENERAL EXECUTION RULE
------------------------------------------------------------

Each task must complete before starting the next.

Each task must compile successfully.

Each task must pass verification.

Never work on multiple major modules simultaneously.

------------------------------------------------------------
PHASE 1
PROJECT ANALYSIS
------------------------------------------------------------

Objectives

Understand current project structure.

Identify existing APIs.

Identify existing modules.

Identify existing database schema.

Identify integration points.

Output

Architecture report.

Verification

No code changes.

------------------------------------------------------------
PHASE 2
DATABASE
------------------------------------------------------------

Tasks

Create new Prisma models.

Generate migration.

Create indexes.

Create relations.

Generate Prisma Client.

Seed plans.

Seed features.

Seed permissions.

Verification

Migration successful.

No data loss.

Existing tables unchanged.

Application starts successfully.

STOP.

Wait for confirmation.

------------------------------------------------------------
PHASE 3
SUBSCRIPTION ENGINE
------------------------------------------------------------

Tasks

Subscription Module

Subscription Service

Repository

DTO

Validation

Subscription APIs

Verification

Subscription APIs working.

No frontend changes.

STOP.

------------------------------------------------------------
PHASE 4
PLAN ENGINE
------------------------------------------------------------

Tasks

Plan Module

CRUD

Validation

Caching

Verification

Plans can be created.

Plans can be updated.

Plans load correctly.

STOP.

------------------------------------------------------------
PHASE 5
FEATURE ENGINE
------------------------------------------------------------

Tasks

Feature CRUD.

Plan Feature Mapping.

Feature Repository.

Validation.

Verification

Features assigned correctly.

STOP.

------------------------------------------------------------
PHASE 6
USAGE ENGINE
------------------------------------------------------------

Tasks

Usage Repository.

Usage Service.

Monthly Usage.

Yearly Usage.

Reset Logic.

Verification

Usage increases correctly.

Reset works.

STOP.

------------------------------------------------------------
PHASE 7
MIDDLEWARE
------------------------------------------------------------

Tasks

Subscription Middleware

Feature Middleware

Usage Middleware

Role Middleware

Feature Flag Middleware

Verification

Protected APIs working.

Inventory unaffected.

Billing unaffected.

STOP.

------------------------------------------------------------
PHASE 8
EXISTING MODULE INTEGRATION
------------------------------------------------------------

Integrate middleware into

Inventory

Billing

Analytics

History

Scanner

AI

Notifications

Verification

Every existing feature still works.

No regression.

STOP.

------------------------------------------------------------
PHASE 9
PAYMENT SYSTEM
------------------------------------------------------------

Tasks

Payment Gateway

Webhook

Verification

Invoice

Subscription Activation

Verification

Successful payment activates subscription.

Failed payment does not.

STOP.

------------------------------------------------------------
PHASE 10
COUPON ENGINE
------------------------------------------------------------

Tasks

Coupon CRUD

Coupon Validation

Discount Engine

Verification

Coupons apply correctly.

STOP.

------------------------------------------------------------
PHASE 11
ADDON ENGINE
------------------------------------------------------------

Tasks

AI Packs

Storage Packs

Staff Packs

Warehouse Packs

Verification

Addon limits increase correctly.

STOP.

------------------------------------------------------------
PHASE 12
FRONTEND FOUNDATION
------------------------------------------------------------

Tasks

Subscription Context

Usage Context

Permission Context

API Services

Verification

Frontend compiles.

No broken pages.

STOP.

------------------------------------------------------------
PHASE 13
DYNAMIC UI
------------------------------------------------------------

Tasks

Sidebar

Menus

Routes

Protected Components

Upgrade Modal

Verification

Hidden features stay hidden.

Locked features display upgrade.

STOP.

------------------------------------------------------------
PHASE 14
SUBSCRIPTION PAGES
------------------------------------------------------------

Tasks

Pricing

Current Plan

Usage

Invoices

Payment History

Verification

All pages functional.

STOP.

------------------------------------------------------------
PHASE 15
ADMIN PANEL
------------------------------------------------------------

Tasks

Dashboard

Plans

Features

Users

Payments

Coupons

Addons

Usage

Feature Flags

Verification

Every configuration updates database.

No hardcoded values.

STOP.

------------------------------------------------------------
PHASE 16
CRON JOBS
------------------------------------------------------------

Tasks

Renewal Reminder

Expiry Reminder

Usage Reset

Trial Expiry

Verification

Cron jobs execute correctly.

STOP.

------------------------------------------------------------
PHASE 17
AUDIT LOGGING
------------------------------------------------------------

Tasks

Log every admin action.

Log every subscription change.

Log payment events.

Verification

Audit logs complete.

STOP.

------------------------------------------------------------
PHASE 18
TESTING
------------------------------------------------------------

Database Tests

API Tests

Integration Tests

Permission Tests

Payment Tests

Subscription Tests

Regression Tests

Verification

All tests pass.

STOP.

------------------------------------------------------------
PHASE 19
OPTIMIZATION
------------------------------------------------------------

Tasks

Caching

Query Optimization

Indexes

Lazy Loading

Compression

Verification

Performance improved.

STOP.

------------------------------------------------------------
PHASE 20
DEPLOYMENT
------------------------------------------------------------

Deploy Database

Deploy Backend

Deploy Frontend

Seed Production

Verify Health

Verification

Production Ready.

------------------------------------------------------------
AFTER EVERY PHASE
------------------------------------------------------------

Compile Backend.

Compile Frontend.

Run Tests.

Verify Existing Features.

Check Logs.

Fix Errors.

Commit Changes.

Only then continue.

------------------------------------------------------------
AI AGENT RULES
------------------------------------------------------------

Never guess.

Never create duplicate logic.

Never create duplicate APIs.

Never hardcode plans.

Never hardcode prices.

Never hardcode limits.

Always use Repository Pattern.

Always use DTO Validation.

Always use Dependency Injection.

------------------------------------------------------------
CHANGE LIMIT
------------------------------------------------------------

Each execution should modify
only the files required for that phase.

Avoid unnecessary refactoring.

Keep commits small.

------------------------------------------------------------
ROLLBACK STRATEGY
------------------------------------------------------------

If a phase fails

Rollback only that phase.

Never rollback completed phases.

------------------------------------------------------------
FINAL ACCEPTANCE CRITERIA
------------------------------------------------------------

Existing Inventory System works.

Existing Billing System works.

Existing AI works.

Existing Authentication works.

Subscription Layer fully functional.

Admin Panel fully dynamic.

Payments verified.

Feature permissions working.

Usage tracking working.

Production deployment successful.

------------------------------------------------------------

END OF DOCUMENT
