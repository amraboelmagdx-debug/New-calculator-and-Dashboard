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

## What's Been Implemented

### Completed (2026-03-27) - Advanced Governance Features ✅
- [x] **Pricing Guidelines Panel** - Shows margin guidelines by deal size (Tiny, Standard, Big, Mega) and service type (Branding, Campaign, Staffing)
- [x] **Split Margin Logic** - Toggle to set separate Internal and Vendor margin percentages
- [x] **Weighted Blended Margin** - Calculates blended margin from internal and vendor margins
- [x] **Risk Engine** - 3-factor risk assessment (Complexity, Rush, Execution) with weighted multipliers
- [x] **Separate Risk Inputs** - Internal Team Risk Factors and Vendor Risk Factors sections
- [x] **Risk Impact Modes** - Price Buffer, Cost Increase, or Margin Buffer
- [x] **Margin Warnings** - Red/Amber warnings when margin is below guideline minimum
- [x] **Admin: Pricing Guidelines Manager** - Full CRUD for margin thresholds by deal size and category
- [x] **Admin: Risk Configuration Manager** - Configure risk levels, weights, and impact modes

### Completed (2026-01-13) - Initial MVP ✅
- [x] Complete calculation engine for Simple and Structured modes
- [x] CRUD APIs for all configuration entities
- [x] Admin authentication via header password
- [x] HR Cost Configurations (Social/Medical Insurance, End of Service)
- [x] Monthly Utilization vs Hourly input modes
- [x] Internal vs Seconded employee types
- [x] Google Sheets import for roles
- [x] Inline add for Roles and Vendors
- [x] PDF export for client price sheets
- [x] Removed "Made with Emergent" badge

### Backend (FastAPI + MongoDB)
- Complete calculation engine with split margins and risk factors
- Pricing guidelines API (CRUD + applicable guideline lookup)
- Risk configuration API (levels, weights, impact mode)
- CRUD APIs for all configuration entities
- Admin authentication via header password
- Database seeded with:
  - 10 roles (Creative Director, Art Director, Designer, etc.)
  - 8 product templates (Logo Design, Brand Identity, etc.)
  - 6 scope templates (Branding Package, Campaign Film, etc.)
  - 8 vendor services (Production, Photography, Media, etc.)
  - 5 payment terms (50% Advance, Net 30, etc.)
  - 4 risk levels (Low 1.0x to Critical 1.5x)
  - 7 pricing guidelines (by deal size and service type)
  - Risk configuration (weights and impact modes)

### Frontend (React + Tailwind + Shadcn)
- Simple Calculator with team members and vendors
- Pricing Guidelines Panel (collapsible, shows margin status)
- Split Margins toggle with Internal/Vendor margin inputs
- Risk Factors inputs (collapsible sections for internal/vendor)
- Profitability Dashboard with Risk Summary
- Structured Opportunity Calculator with 3-panel layout
- Scope templates loading with products and default roles
- Real-time profitability dashboard with warnings
- Admin panel with all configuration sections:
  - Roles Manager (with HR benefits)
  - HR Cost Config (with Google Sheets integration)
  - **Pricing Guidelines Manager** (NEW)
  - **Risk Configuration Manager** (NEW)
  - Product/Scope Templates
  - Vendor Services
  - Payment Terms
  - Overhead Rates
  - Sales Incentives
  - Risk Multipliers
  - Theme Settings
  - Seed Data

### Calculations Implemented
- Internal Labor Cost = Hours × Hourly Rate (or Monthly Salary × Utilization × Duration)
- Vendor Client Price = Cost × (1 + Markup%)
- Overhead = Project Hours × OH Rate
- **Split Margins**: Internal Selling = Internal Cost ÷ (1 − Internal Margin% − Sales%)
- **Blended Margin** = (Internal Margin × Internal Weight) + (Vendor Margin × Vendor Weight)
- **Risk Multiplier** = 1 + Σ(Factor Risk × Factor Weight) where factors are Complexity, Rush, Execution
- **Risk-adjusted Price** = Base Price × Risk Multiplier (in Buffer mode)
- Sales Incentive = Selling Price × Sales%
- Financing Cost = Uncovered × Interest × Days/365

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Structured Opportunity: Integrate Split Margins and Risk Engine (same as Simple mode)
- [ ] UI Validation & Warnings: Highlight rows red if margin below minimum
- [ ] Staffing/Secondment scope type full implementation
- [ ] Save/Load opportunities to database

### P1 - High Priority
- [ ] Opportunity list view with filtering
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

## Admin Access
- URL: /admin
- Password: Amr123

## Next Action Items
1. Integrate Split Margins and Risk Engine into Structured Opportunity Calculator
2. Add row-level warnings when product/scope margin is below guideline
3. Implement opportunity persistence (save/update)
4. Add opportunity list with filtering
5. Enhance PDF export with risk assessment details
