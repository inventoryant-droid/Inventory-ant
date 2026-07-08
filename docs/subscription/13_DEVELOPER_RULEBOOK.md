# Inventory Ant
# Developer Rulebook

Version : 1.0

------------------------------------------------------------
GENERAL RULES
------------------------------------------------------------

Never rewrite working code.

Always extend.

Never duplicate logic.

Never hardcode values.

Always write reusable code.

------------------------------------------------------------
BACKEND RULES
------------------------------------------------------------

Use Dependency Injection.

Use Repository Pattern.

Use DTO Validation.

Use Guards.

Use Middleware.

Use Services.

Never access Prisma directly from Controllers.

------------------------------------------------------------
DATABASE RULES
------------------------------------------------------------

Never delete production tables.

Never remove columns without migration.

Never rename columns directly.

Always create migrations.

Seed data separately.

------------------------------------------------------------
API RULES
------------------------------------------------------------

Every endpoint

Authentication

Validation

Permission

Audit

Exception Handling

Standard Response

------------------------------------------------------------
FRONTEND RULES
------------------------------------------------------------

Never hardcode menus.

Never hardcode plans.

Never hardcode prices.

Everything from API.

------------------------------------------------------------
UI RULES
------------------------------------------------------------

Responsive

Dark Mode

Light Mode

Accessibility

Loading States

Empty States

Error States

------------------------------------------------------------
SECURITY
------------------------------------------------------------

Never expose secrets.

Never trust frontend.

Always validate backend.

------------------------------------------------------------
LOGGING
------------------------------------------------------------

Every important action

must generate logs.

------------------------------------------------------------
TESTING
------------------------------------------------------------

Every new feature

must include

Unit Test

Integration Test

Manual Test

------------------------------------------------------------
GIT
------------------------------------------------------------

Small commits.

Meaningful commit messages.

Never commit secrets.

------------------------------------------------------------
CODE REVIEW
------------------------------------------------------------

No duplicated logic.

No unused code.

No hardcoded values.

No console logs.

------------------------------------------------------------
SUCCESS
------------------------------------------------------------

Clean

Scalable

Maintainable

Enterprise Ready

------------------------------------------------------------

END