import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users, Truck, Clock, Percent, AlertCircle } from 'lucide-react';
import { formatCurrency, formatPercent, getMarginColorClass } from '@/lib/utils';

export default function ProfitabilityPanel({ results, mode, calculating }) {
  if (calculating) {
    return (
      <Card className="sticky top-24" data-testid="profitability-loading">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card className="sticky top-24" data-testid="profitability-empty">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Add team members or vendors to see calculations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSimple = mode === 'simple';
  const marginPercent = results.contribution_margin_percent || 0;
  const marginColor = getMarginColorClass(marginPercent);

  return (
    <Card className="sticky top-24" data-testid="profitability-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-800 font-['Manrope']">Profitability Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg" data-testid="metric-revenue">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Revenue</p>
            <p className="text-xl font-bold font-mono text-slate-900">
              {formatCurrency(results.selling_price || results.total_revenue, false)}
            </p>
            <p className="text-xs text-slate-400">SAR</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg" data-testid="metric-profit">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Net Profit</p>
            <p className={`text-xl font-bold font-mono ${results.total_profit >= 0 || results.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(results.total_profit || results.net_profit, false)}
            </p>
            <p className="text-xs text-slate-400">SAR</p>
          </div>
        </div>

        {/* Margin Indicator */}
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100" data-testid="margin-indicator">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-900">Contribution Margin</span>
            {marginPercent >= 25 ? (
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <p className={`text-3xl font-bold font-mono ${marginColor}`}>
            {formatPercent(marginPercent)}
          </p>
          <div className="w-full bg-indigo-200 rounded-full h-2 mt-3">
            <div 
              className={`h-2 rounded-full transition-all ${marginPercent >= 30 ? 'bg-emerald-500' : marginPercent >= 20 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(marginPercent, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Cost Breakdown</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Internal Labor</span>
              </div>
              <span className="text-sm font-medium font-mono text-slate-900" data-testid="cost-labor">
                {formatCurrency(results.internal_labor_cost, false)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Vendor Cost</span>
              </div>
              <span className="text-sm font-medium font-mono text-slate-900" data-testid="cost-vendor">
                {formatCurrency(results.vendor_cost, false)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Overhead</span>
              </div>
              <span className="text-sm font-medium font-mono text-slate-900" data-testid="cost-overhead">
                {formatCurrency(results.overhead_cost, false)}
              </span>
            </div>

            {!isSimple && results.staffing_cost > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Staffing</span>
                </div>
                <span className="text-sm font-medium font-mono text-slate-900">
                  {formatCurrency(results.staffing_cost, false)}
                </span>
              </div>
            )}

            {!isSimple && results.tools_cost > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Tools & Extras</span>
                <span className="text-sm font-medium font-mono text-slate-900">
                  {formatCurrency(results.tools_cost + (results.extras_cost || 0), false)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 bg-slate-50 rounded-lg px-2 -mx-2">
              <span className="text-sm font-semibold text-slate-800">Total COGS</span>
              <span className="text-sm font-bold font-mono text-slate-900" data-testid="total-cogs">
                {formatCurrency(results.cogs || results.cogs_with_risk, false)}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Revenue Breakdown</h4>
          
          <div className="space-y-2">
            {results.vendor_revenue > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Vendor Revenue</span>
                <span className="text-sm font-medium font-mono text-slate-900" data-testid="vendor-revenue">
                  {formatCurrency(results.vendor_revenue, false)}
                </span>
              </div>
            )}

            {results.vendor_markup_revenue > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600 pl-4">↳ Markup Revenue</span>
                <span className="text-sm font-medium font-mono text-emerald-600">
                  +{formatCurrency(results.vendor_markup_revenue || results.vendor_markup, false)}
                </span>
              </div>
            )}

            {!isSimple && results.staffing_revenue > 0 && (
              <>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Staffing Revenue</span>
                  <span className="text-sm font-medium font-mono text-slate-900">
                    {formatCurrency(results.staffing_revenue, false)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600 pl-4">↳ Staffing Profit</span>
                  <span className="text-sm font-medium font-mono text-emerald-600">
                    +{formatCurrency(results.staffing_profit, false)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Deductions */}
        <div className="space-y-3">
          <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Deductions</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Sales Incentive ({results.sales_incentive_percent}%)</span>
              </div>
              <span className="text-sm font-medium font-mono text-red-600" data-testid="sales-incentive">
                -{formatCurrency(results.sales_incentive, false)}
              </span>
            </div>

            {!isSimple && results.financing_cost > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">Financing Cost</span>
                </div>
                <span className="text-sm font-medium font-mono text-red-600">
                  -{formatCurrency(results.financing_cost, false)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-2 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Selling Price</span>
            <span className="text-lg font-bold font-mono text-slate-900" data-testid="selling-price">
              SAR {formatCurrency(results.selling_price || results.total_revenue, false)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Contribution Margin</span>
            <span className={`text-lg font-bold font-mono ${marginColor}`} data-testid="contribution-margin">
              SAR {formatCurrency(results.contribution_margin, false)}
            </span>
          </div>
          
          {!isSimple && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Operating Margin</span>
                <span className="text-lg font-bold font-mono text-slate-900">
                  SAR {formatCurrency(results.operating_margin, false)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-medium text-slate-700">Net Profit</span>
                <span className={`text-lg font-bold font-mono ${results.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  SAR {formatCurrency(results.net_profit, false)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Info footer */}
        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          <p>Overhead Rate: {formatCurrency(results.overhead_rate, false)}/hr</p>
          <p>Total Hours: {results.total_hours?.toFixed(1) || 0} hrs</p>
        </div>
      </CardContent>
    </Card>
  );
}
