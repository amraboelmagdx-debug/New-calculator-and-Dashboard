# Opportunity Pricing Engine (OPE) - PRD

## Overview
A modern web application for creative agencies to calculate project pricing, profitability, and deal intelligence. Built for ZAN with SAR (Saudi Riyal) currency.

## User Personas
1. **Sales Managers** - Create quick pricing estimates and detailed proposals
2. **Finance Teams** - Configure overhead rates, margins, and financial parameters
3. **Account Managers** - Build opportunities with scopes and track profitability
4. **Admin Users** - Manage roles, templates, incentive rules, and system configuration

## Core Requirements (Static)
- Two calculation modes: Simple and Structured
- Internal team hours/roles pricing
- Vendor cost + markup calculations
- Dynamic overhead rate (Total Company Overhead ÷ Total Billable Hours)
- Dynamic Sales Incentive Engine (per-role, per-deal-size)
- Financing impact based on payment terms
- Risk multipliers
- Deal intelligence (Healthy/Risk/Underpriced)
- PDF export for client proposals
- Admin panel with password protection

## What's Been Implemented

### Completed (2026-03-27) - Dynamic Sales Incentive Engine ✅
**NEW FEATURE - VALUE-BASED COMPENSATION ENGINE**

- [x] **Incentive Rules by Deal Size** - Separate rules for Tiny, Standard, Big, Mega deals
- [x] **Per-Role Percentages** - Sales Rep and Sales Manager get independent base percentages
- [x] **Max Caps** - Cap limits per role to control maximum payouts
- [x] **Client Type Multiplier** - Existing Customer gets 0.9x (10% discount)
- [x] **Lead Source Multiplier** - Referral gets 0.5x (50% discount)
- [x] **Combined Multipliers** - Existing + Referral = 0.45x
- [x] **Auto Deal Size Detection** - Based on estimated selling price
- [x] **Admin: Incentive Rules Manager** - Full CRUD for rules by deal size
- [x] **Admin: Multipliers Configuration** - Editable existing_customer and referral multipliers
- [x] **Calculator: Client Type & Lead Source Inputs** - Dropdowns with Arabic labels
- [x] **Calculator: Incentive Breakdown Panel** - Shows per-role values with caps
- [x] **Dashboard: Detailed Deductions** - Sales Rep and Sales Manager shown separately
- [x] **Arabic Calculation Methodology** - Collapsible explanation in Arabic

**Formula:**
```
Total_Incentive_% = Sales_Rep_% + Sales_Manager_%
Selling_Price = COGS / (1 - Margin% - Total_Incentive_%)
Incentive_Per_Role = Selling_Price × Adjusted_%
Apply Cap if defined
Contribution_Margin = Selling_Price - COGS - Total_Incentive
```

**Default Incentive Rules:**
| Deal Size | Sales Rep | Cap (SAR) | Sales Manager | Cap (SAR) |
|-----------|-----------|-----------|---------------|-----------|
| Tiny (<200K) | 5% | 5,000 | 2% | 2,000 |
| Standard (200K-500K) | 4% | 15,000 | 2% | 7,500 |
| Big (500K-2M) | 3% | 30,000 | 1.5% | 15,000 |
| Mega (2M+) | 2% | 50,000 | 1% | 25,000 |

### Completed (2026-03-27) - Advanced Governance Features ✅
- [x] Pricing Guidelines Panel - Shows margin guidelines by deal size and service type
- [x] Split Margin Logic - Toggle for separate Internal and Vendor margins
- [x] Risk Engine - 3-factor risk assessment (Complexity, Rush, Execution)
- [x] Margin Warnings - Red/Amber warnings when margin is below guideline minimum
- [x] Admin: Pricing Guidelines Manager - Full CRUD for margin thresholds
- [x] Admin: Risk Configuration Manager - Configure risk levels, weights, and impact modes

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

## API Endpoints

### Incentive Rules
- `GET /api/incentive-rules` - Get all rules
- `POST /api/incentive-rules` - Create rule (admin)
- `PUT /api/incentive-rules/{id}` - Update rule (admin)
- `DELETE /api/incentive-rules/{id}` - Delete rule (admin)
- `POST /api/incentive-rules/bulk` - Bulk update (admin)

### Incentive Multipliers
- `GET /api/incentive-multipliers` - Get multipliers config
- `PUT /api/incentive-multipliers` - Update multipliers (admin)

### Calculation
- `POST /api/calculate/simple` - Accepts client_type, lead_source, returns incentive_breakdown

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Structured Opportunity: Integrate Split Margins and Risk Engine
- [ ] Structured Opportunity: Integrate Dynamic Incentive Engine
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

## Technical Architecture
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, React Router
- **Backend**: FastAPI, Motor (async MongoDB driver)
- **Database**: MongoDB
- **Fonts**: Manrope (headings), Inter (body), JetBrains Mono (numbers)

## Admin Access
- URL: /admin
- Password: Amr123

## Key Database Collections
- `roles` - Team member roles with hourly rates
- `incentive_rules` - Rules by deal_size and role
- `incentive_multipliers` - Existing/Referral multipliers
- `deal_size_ranges` - Thresholds for auto-detection
- `pricing_guidelines` - Margin thresholds by deal size
- `risk_config` - Risk weights and impact modes
- `hr_config` - Benefits percentages

## Next Action Items
1. Integrate Dynamic Incentive Engine into Structured Opportunity Calculator
2. Integrate Split Margins and Risk Engine into Structured Opportunity Calculator
3. Implement opportunity persistence (save/update)
4. Add opportunity list with filtering
