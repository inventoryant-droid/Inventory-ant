# Inventory Ant
# Enterprise Subscription System
# 07_AI_USAGE_SYSTEM.md

Version : 1.0

------------------------------------------------------------
PURPOSE
------------------------------------------------------------

This document defines the complete AI Usage System for
Inventory Ant.

The objective is to create a scalable AI platform
that can support thousands of businesses
without uncontrolled API costs.

AI is considered a Premium Resource.

Every AI request must be tracked.

Every AI request must be measurable.

Every AI request must be billable.

------------------------------------------------------------
AI SERVICES
------------------------------------------------------------

Inventory Ant currently supports

AI Chat

Voice Assistant

Smart Scanner

Invoice Scanner

OCR

Future Services

Forecasting

Demand Prediction

Dead Stock Detection

Purchase Recommendation

Sales Prediction

Business Insights

Customer Insights

------------------------------------------------------------
AI REQUEST LIFECYCLE
------------------------------------------------------------

User

↓

Authentication

↓

Subscription Validation

↓

Feature Validation

↓

Usage Validation

↓

Rate Limit Validation

↓

AI Provider

↓

Response

↓

Save History

↓

Increase Usage

↓

Analytics

------------------------------------------------------------
IMPORTANT RULE
------------------------------------------------------------

AI Request

≠

Free Request

Every request
must pass through Usage Engine.

------------------------------------------------------------
AI FEATURES
------------------------------------------------------------

Every AI capability should be treated as
an independent feature.

Examples

AI_CHAT

VOICE_ASSISTANT

SMART_SCAN

OCR_SCAN

FORECAST

PREDICTION

BUSINESS_ANALYTICS

DEMAND_FORECAST

Each feature has
its own quota.

------------------------------------------------------------
USAGE TRACKING
------------------------------------------------------------

Track

User

Business

Feature

Timestamp

Prompt Size

Response Size

Processing Time

Status

Cost

Model Used

------------------------------------------------------------
AI REQUEST LOG
------------------------------------------------------------

Each request stores

Request ID

Business ID

Feature

Gemini Model

Prompt Tokens

Response Tokens

Image Count

Voice Duration

Latency

Estimated Cost

------------------------------------------------------------
MONTHLY QUOTA
------------------------------------------------------------

Example

Free

AI Chat

20

Voice

20

Scanner

20

--------------------------------

Silver

AI Chat

500

Voice

500

Scanner

500

--------------------------------

Gold

AI Chat

3000

Voice

3000

Scanner

3000

------------------------------------------------------------
UNLIMITED PLANS
------------------------------------------------------------

Never provide true unlimited AI.

Instead

Very High Limits

Example

100000 Requests

This prevents abuse.

------------------------------------------------------------
USAGE ENGINE
------------------------------------------------------------

Before every AI request

Read Current Usage

↓

Read Plan Limit

↓

Compare

↓

Allow

or

Reject

------------------------------------------------------------
LIMIT EXCEEDED
------------------------------------------------------------

If limit exceeded

Return

403

Reason

AI_LIMIT_EXCEEDED

Frontend should display

Upgrade Plan

or

Buy Extra AI Pack

------------------------------------------------------------
EXTRA AI PACKS
------------------------------------------------------------

Users may purchase

100 Requests

500 Requests

1000 Requests

5000 Requests

Addon immediately increases quota.

------------------------------------------------------------
MONTHLY RESET
------------------------------------------------------------

Every billing cycle

↓

Reset Monthly Usage

↓

Keep Historical Data

↓

Generate Usage Report

------------------------------------------------------------
USAGE HISTORY
------------------------------------------------------------

Never delete usage.

Archive monthly.

Store

Month

Year

Usage

Cost

------------------------------------------------------------
RATE LIMIT
------------------------------------------------------------

Protect APIs.

Example

Maximum

30 Requests

Per Minute

Per Business

Prevent abuse.

------------------------------------------------------------
AI COST ESTIMATION
------------------------------------------------------------

Store estimated cost

Per Request

Per Day

Per Month

Per Business

Per Feature

Never rely only on provider dashboard.

------------------------------------------------------------
TOKEN TRACKING
------------------------------------------------------------

Track

Prompt Tokens

Completion Tokens

Total Tokens

Store with every request.

------------------------------------------------------------
MODEL TRACKING
------------------------------------------------------------

Track which model handled request.

Examples

gemini-2.5-flash

gemini-2.0-flash

Future

OpenAI

Claude

DeepSeek

Llama

------------------------------------------------------------
VOICE TRACKING
------------------------------------------------------------

Track

Audio Length

Processing Time

Characters

Estimated Cost

------------------------------------------------------------
SCANNER TRACKING
------------------------------------------------------------

Track

Image Count

OCR Time

AI Time

Confidence Score

Estimated Cost

------------------------------------------------------------
COST DASHBOARD
------------------------------------------------------------

Admin Dashboard

Today's Cost

Monthly Cost

Cost Per User

Cost Per Plan

Cost Per Feature

Highest AI Consumers

Lowest AI Consumers

------------------------------------------------------------
BUSINESS DASHBOARD
------------------------------------------------------------

Owner should see

Current Usage

Remaining Usage

Usage History

Next Reset Date

Purchased AI Packs

------------------------------------------------------------
AI ANALYTICS
------------------------------------------------------------

Generate

Daily Usage

Weekly Usage

Monthly Usage

Average Cost

Peak Hours

Popular Features

------------------------------------------------------------
ABUSE DETECTION
------------------------------------------------------------

Detect

Too Many Requests

Repeated Prompts

Bot Usage

Continuous Requests

Automatically flag suspicious accounts.

------------------------------------------------------------
EMERGENCY CONTROLS
------------------------------------------------------------

Super Admin can

Disable AI Globally

Disable Voice

Disable Scanner

Disable OCR

Disable Forecast

Enable Maintenance Mode

------------------------------------------------------------
FALLBACK STRATEGY
------------------------------------------------------------

If AI Provider fails

Inventory

Billing

Staff

Reports

must continue working.

Only AI functionality should fail.

------------------------------------------------------------
AI HISTORY
------------------------------------------------------------

Store

Question

Response

Timestamp

Duration

Feature

Cost

Model

Useful for debugging.

------------------------------------------------------------
CACHING
------------------------------------------------------------

Cache

Repeated Prompts

Static Responses

Business Configuration

Do NOT cache

Inventory Updates

Billing

Sensitive Data

------------------------------------------------------------
PROMPT OPTIMIZATION
------------------------------------------------------------

Reduce tokens.

Avoid unnecessary context.

Reuse cached prompts.

Compress conversation history.

Keep prompts deterministic.

------------------------------------------------------------
SECURITY
------------------------------------------------------------

Never expose API Keys.

Never trust frontend usage.

Always validate usage in backend.

Log every AI request.

------------------------------------------------------------
ALERTS
------------------------------------------------------------

Notify Admin when

Daily Cost exceeds threshold

Monthly Budget reached

AI Provider unavailable

High Error Rate

------------------------------------------------------------
FUTURE SUPPORT
------------------------------------------------------------

Architecture should support

Multiple AI Providers

Provider Switching

Cost Based Routing

Model Selection

Offline AI

Local LLM

------------------------------------------------------------
SUCCESS CRITERIA
------------------------------------------------------------

Every AI request tracked.

Every request cost estimated.

Every quota enforced.

Every request auditable.

No uncontrolled AI spending.

------------------------------------------------------------

END OF DOCUMENT