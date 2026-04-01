# Opportunity Pricing Engine (OPE) - PRD

## Overview
A modern web application for creative agencies to calculate project pricing, profitability, and deal intelligence. Built for ZAN with SAR (Saudi Riyal) currency.

## User Personas
1. **Sales Managers** - Create quick pricing estimates and detailed proposals
2. **Finance Teams** - Configure overhead rates, margins, and financial parameters
3. **Account Managers** - Build opportunities with scopes and track profitability
4. **Admin Users** - Manage roles, templates, incentive rules, and system configuration

## What's Been Implemented

### Completed (2025-12) - Dark/Light Mode Toggle ✅
- [x] **Theme Toggle** - Sun/Moon button to switch between Dark and Light modes
- [x] **White Dashboard** - Right panel always stays white for maximum readability
- [x] **Full Theme Support** - All sections (Project Info, Team, Vendors, Pricing) adapt to selected theme
- [x] **Consistent Styling** - Inputs, labels, cards, and navigation all theme-aware

### Completed (2026-03-27) - Major UI Overhaul ✅
**NEW UNIFIED INTERFACE - DARK SWISS THEME**

- [x] **Merged Simple + Structured** - All features now in ONE unified calculator
- [x] **Dark Swiss Theme** - Professional dark UI with neutral-950 background
- [x] **Light Mode Option** - Clean slate-100 background with white cards
- [x] **3-Column Layout** - Left nav (220px), Center content (flex), Right dashboard (380px)
- [x] **Project Information Section** - Client Name, Project Name, Sales Owner, Payment Terms
- [x] **Client Type & Lead Source** - New/Existing Customer, Direct/Referral dropdowns
- [x] **Internal Team Section** - Roles, Hours/Utilization toggle, Risk Factors
- [x] **Vendors Section** - Services, Cost/Markup, Risk Factors
- [x] **Pricing Settings** - Split Margins toggle, Target Margin
- [x] **Template Loader** - Load scope templates to populate Team
- [x] **Real-time Dashboard** - Revenue, Profit, Margin, Cost Breakdown, Deductions, Warnings

### Previous Features (Still Working)
- [x] Dynamic Sales Incentive Engine (per-role, per-deal-size)
- [x] Incentive Rules Manager in Admin
- [x] Client/Lead Source Multipliers (Existing 0.9x, Referral 0.5x)
- [x] Deal Size Auto-Detection
- [x] Max Caps per role
- [x] Pricing Guidelines with margin thresholds
- [x] Risk Engine with 3 factors
- [x] PDF Export

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER: Logo + ZAN + Export + Admin                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────┐  ┌─────────────────────────┐  ┌──────────────────┐  │
│  │ NAVIGATION │  │ PROJECT INFO            │  │ DASHBOARD        │  │
│  │            │  │ Client, Project, Owner  │  │                  │  │
│  │ • Project  │  │ Payment Terms           │  │ Revenue          │  │
│  │ • Team     │  │ Client Type, Lead Source│  │ Net Profit       │  │
│  │ • Vendors  │  ├─────────────────────────┤  │ Margin %         │  │
│  │ • Pricing  │  │ INTERNAL TEAM           │  │ Deal Size        │  │
│  │            │  │ + Add Role              │  │                  │  │
│  │ ─────────  │  │ [Role rows]             │  │ Cost Breakdown   │  │
│  │            │  │ Risk Factors            │  │ • Labor          │  │
│  │ TEMPLATE   │  ├─────────────────────────┤  │ • Vendor         │  │
│  │ [Dropdown] │  │ VENDORS                 │  │ • Overhead       │  │
│  │            │  │ + Add Vendor            │  │                  │  │
│  │            │  │ [Vendor rows]           │  │ Deductions       │  │
│  │            │  │ Risk Factors            │  │ • Sales Rep      │  │
│  │            │  ├─────────────────────────┤  │ • Sales Manager  │  │
│  │            │  │ PRICING SETTINGS        │  │                  │  │
│  │            │  │ Split Margins toggle    │  │ Selling Price    │  │
│  │            │  │ Target/Internal/Vendor  │  │                  │  │
│  └────────────┘  └─────────────────────────┘  │ Warnings         │  │
│                                                │ Risk Summary     │  │
│                                                └──────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **Theme**: Dark/Light Mode Toggle (Dark default, Light available)
  - Dark: neutral-950 background, white text
  - Light: slate-100 background, dark text
  - Dashboard: Always white for readability
- **Fonts**: Manrope (headings), Inter (body), JetBrains Mono (numbers)

## Admin Access
- URL: /admin
- Password: Amr123

## Key Database Collections
- `roles` - Team member roles
- `incentive_rules` - Rules by deal_size and role
- `incentive_multipliers` - Existing/Referral multipliers
- `pricing_guidelines` - Margin thresholds
- `risk_config` - Risk weights and impact modes
- `scope_templates` - Templates with default products/roles
- `payment_terms` - Payment options with financing

## Prioritized Backlog

### P0 - Critical
- [x] ~~Merge Simple + Structured into unified interface~~ DONE
- [x] ~~Dark/Light Mode Toggle with White Dashboard~~ DONE
- [ ] Add ability to save/load opportunities
- [ ] Opportunity list view

### P1 - High Priority
- [ ] Refactor Calculator.jsx (~1000 lines) into smaller components
- [ ] Refactor server.py (~1900 lines) into proper FastAPI structure
- [ ] Multi-currency support
- [ ] User accounts with roles
- [ ] Approval workflow

### P2 - Nice to Have
- [ ] Auto-format Imgur URLs in Theme Settings
- [ ] Dashboard analytics
- [ ] CRM integration
- [ ] Mobile app
