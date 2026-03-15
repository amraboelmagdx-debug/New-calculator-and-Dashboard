# Opportunity Pricing Engine (OPE) - PRD

## Overview
A modern web application for creative agencies to calculate project pricing, profitability, and deal intelligence. Built for ZAN with SAR (Saudi Riyal) currency.

## User Personas
1. **Sales Managers** - Create quick pricing estimates and detailed proposals
2. **Finance Teams** - Configure overhead rates, margins, and financial parameters
3. **Account Managers** - Build opportunities with scopes and track profitability
4. **Admin Users** - Manage roles, templates, and system configuration

## Core Requirements (Static)
- Two calculation modes: Simple and Structured
- Internal team hours/roles pricing
- Vendor cost + markup calculations
- Dynamic overhead rate (Total Company Overhead ÷ Total Billable Hours)
- Sales incentive deduction
- Financing impact based on payment terms
- Risk multipliers
- Deal intelligence (Healthy/Risk/Underpriced)
- PDF export for client proposals
- Admin panel with password protection

## What's Been Implemented (2026-01-13)

### Backend (FastAPI + MongoDB)
- [x] Complete calculation engine for Simple and Structured modes
- [x] CRUD APIs for all configuration entities
- [x] Admin authentication via header password
- [x] Database seeded with realistic sample data:
  - 10 roles (Creative Director, Art Director, Designer, etc.)
  - 8 product templates (Logo Design, Brand Identity, etc.)
  - 6 scope templates (Branding Package, Campaign Film, etc.)
  - 8 vendor services (Production, Photography, Media, etc.)
  - 5 payment terms (50% Advance, Net 30, etc.)
  - 4 risk levels (Low 1.0x to Critical 1.5x)

### Frontend (React + Tailwind + Shadcn)
- [x] Simple Calculator with team members and vendors
- [x] Structured Opportunity Calculator with 3-panel layout
- [x] Scope templates loading with products and default roles
- [x] Real-time profitability dashboard
- [x] Deal intelligence badges
- [x] Admin panel with all configuration sections
- [x] Theme customization (colors, logo, company name)
- [x] PDF export for client price sheets

### Calculations Implemented
- Internal Labor Cost = Hours × Hourly Rate
- Vendor Client Price = Cost × (1 + Markup%)
- Overhead = Project Hours × OH Rate
- Selling Price = COGS ÷ (1 − Margin% − Sales%)
- Sales Incentive = Selling Price × Sales%
- Financing Cost = Uncovered × Interest × Days/365
- Risk-adjusted COGS = COGS × Risk Multiplier

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Staffing/Secondment scope type full implementation
- [ ] Save/Load opportunities to database
- [ ] Opportunity list view

### P1 - High Priority
- [ ] Multi-currency support (SAR, USD, EUR)
- [ ] User accounts with roles/permissions
- [ ] Opportunity versioning
- [ ] Approval workflow

### P2 - Nice to Have
- [ ] Dashboard analytics
- [ ] Historical deal comparison
- [ ] Email proposal sending
- [ ] CRM integration
- [ ] Mobile app

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **Fonts**: Manrope (headings), Inter (body), JetBrains Mono (numbers)

## Next Action Items
1. Test staffing/secondment calculations in UI
2. Add opportunity persistence (save/update)
3. Implement opportunity list with filtering
4. Add duplicate opportunity feature
5. Enhance PDF export with company branding
