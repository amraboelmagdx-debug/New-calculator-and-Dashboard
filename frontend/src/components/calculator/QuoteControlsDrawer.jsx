import { useState } from 'react';
import { Shield, Target, ChevronDown, SlidersHorizontal, TrendingUp, Zap, Plus, Trash2, Puzzle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import ScopeRiskPanel from './ScopeRiskPanel';
import PricingGuidelinesPanel from '@/components/PricingGuidelinesPanel';
import { formatCurrencyCompact } from '@/lib/utils';
import { createPaymentTerm, deletePaymentTerm } from '@/lib/api';
import {
  MARGIN_MODES,
  getDealComposition,
  getPrimaryGuidelineCategory,
} from '@/lib/marginEngine';

function riskBarColor(multiplier) {
  if (multiplier >= 1.2) return '#ef4444';
  if (multiplier >= 1.1) return '#f59e0b';
  return '#10b981';
}

const RISK_NUM = { none: 0, low: 1, medium: 2, high: 3 };

function CustomDonutTooltip({ active, payload, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={`px-3 py-2 rounded-lg text-xs border shadow-lg ${
      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-slate-200 text-slate-700'
    }`}>
      <p className="font-semibold">{d.name}</p>
      <p>{formatCurrencyCompact(d.value, true)}</p>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label, isDarkMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-lg text-xs border shadow-lg ${
      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-slate-200 text-slate-700'
    }`}>
      <p className="font-semibold mb-0.5">{label}</p>
      <p>{Number(payload[0]?.value).toFixed(1)}%</p>
    </div>
  );
}

function CustomRadarTooltip({ active, payload, isDarkMode }) {
  if (!active || !payload?.length) return null;
  const labels = ['None', 'Low', 'Medium', 'High'];
  return (
    <div className={`px-3 py-2 rounded-lg text-xs border shadow-lg ${
      isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-slate-200 text-slate-700'
    }`}>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke }}>
          {p.name}: {labels[p.value] || p.value}
        </p>
      ))}
    </div>
  );
}

export default function QuoteControlsDrawer({
  open,
  onOpenChange,
  isDarkMode,
  calcData,
  setCalcData,
  projectInfo,
  setProjectInfo,
  paymentTerms = [],
  setPaymentTerms,
  onOpenQuoteSettings,
  selectedProducts = [],
  setSelectedProducts,
  findCatalogProduct,
  getSegmentPayload,
  results,
}) {
  const [forceMarginPct, setForceMarginPct] = useState('');
  const [forceMarginScope, setForceMarginScope] = useState('all');
  const [marginUndoSnapshot, setMarginUndoSnapshot] = useState(null); // [{id,margin_percent,margin_source}]
  const [newTermForm, setNewTermForm] = useState({ name: '', advance_percent: '', payment_days: '30' });
  const [savingTerm, setSavingTerm] = useState(false);
  const [deletingTermId, setDeletingTermId] = useState(null);
  const [manageTermsOpen, setManageTermsOpen] = useState(false);

  const hasQuoteVendors = (calcData?.vendors?.length || 0) > 0;
  const vendorRiskActive =
    calcData?.vendor_risk &&
    [calcData.vendor_risk.complexity, calcData.vendor_risk.rush, calcData.vendor_risk.execution].filter(
      r => r !== 'none'
    ).length > 0;

  const composition =
    findCatalogProduct && getSegmentPayload
      ? getDealComposition(selectedProducts, calcData, findCatalogProduct, getSegmentPayload)
      : { hasProducts: (selectedProducts || []).some(p => p.product_name && p.size) };
  const hasProducts = composition.hasProducts;
  const target = Number(calcData?.target_margin_percent) || 30;
  const splitOn = calcData?.margin_mode === MARGIN_MODES.SPLIT;

  const guidelineCategory =
    findCatalogProduct ? getPrimaryGuidelineCategory(selectedProducts, findCatalogProduct) : 'general';

  const inputClass = isDarkMode
    ? 'bg-neutral-900 border-neutral-800 text-white font-mono'
    : 'bg-white border-slate-300 text-slate-900 font-mono';
  const sectionBorder = isDarkMode ? 'border-neutral-800' : 'border-slate-200';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';

  // Chart styling constants
  const gridColor = isDarkMode ? '#262626' : '#e2e8f0';
  const axisTickColor = isDarkMode ? '#737373' : '#94a3b8';
  const tooltipStyle = {
    backgroundColor: isDarkMode ? '#171717' : '#fff',
    border: `1px solid ${isDarkMode ? '#404040' : '#e2e8f0'}`,
    borderRadius: 10,
    fontSize: 11,
  };

  const handleCreateTerm = async () => {
    const name = newTermForm.name.trim();
    const adv = parseFloat(newTermForm.advance_percent);
    const days = parseInt(newTermForm.payment_days, 10);
    if (!name || isNaN(adv) || adv < 0 || adv > 100) return;
    setSavingTerm(true);
    try {
      const created = await createPaymentTerm({ name, advance_percent: adv, payment_days: isNaN(days) ? 30 : days });
      if (created?.id && setPaymentTerms) {
        setPaymentTerms(prev => [...prev, created]);
      }
      setNewTermForm({ name: '', advance_percent: '', payment_days: '30' });
    } catch (e) {
      console.error('Failed to create payment term', e);
    } finally {
      setSavingTerm(false);
    }
  };

  const handleDeleteTerm = async (termId) => {
    setDeletingTermId(termId);
    try {
      await deletePaymentTerm(termId);
      if (setPaymentTerms) {
        setPaymentTerms(prev => prev.filter(t => t.id !== termId));
      }
      if (projectInfo?.payment_term_id === termId) {
        setProjectInfo?.(p => ({ ...p, payment_term_id: '' }));
      }
    } catch (e) {
      console.error('Failed to delete payment term', e);
    } finally {
      setDeletingTermId(null);
    }
  };

  const applySheetMinimums = () => {
    if (!setSelectedProducts) return;
    setSelectedProducts(prev =>
      prev.map(p => {
        if (!p.product_name || !p.size) return p;
        const product = findCatalogProduct?.(p.product_name);
        const seg = getSegmentPayload?.(product, p.size);
        const min = Number(seg?.minimum_margin_percent) || 0;
        return min > 0 ? { ...p, margin_percent: min, margin_source: 'sheet', locked: false } : p;
      })
    );
  };

  const syncFromTarget = () => {
    if (!setSelectedProducts) return;
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product_name && p.size
          ? { ...p, margin_percent: target, margin_source: 'global', locked: false }
          : p
      )
    );
  };

  const setSplit = on => {
    setCalcData(prev => ({
      ...prev,
      margin_mode: on ? MARGIN_MODES.SPLIT : MARGIN_MODES.UNIFIED,
      use_split_margins: on,
    }));
  };

  const handleForceMargin = () => {
    const pct = parseFloat(forceMarginPct);
    if (!pct || pct <= 0 || pct >= 100) return;

    // Save undo snapshot before applying
    if (setSelectedProducts && selectedProducts.length > 0) {
      setMarginUndoSnapshot(
        selectedProducts.map(p => ({ id: p.id, margin_percent: p.margin_percent, margin_source: p.margin_source }))
      );
    }

    // In granular (product-owned) mode, margin must be applied directly to each product
    // line as margin_source='custom' — the SPLIT mode flags are ignored in granular mode.
    if (setSelectedProducts) {
      setSelectedProducts(prev =>
        prev.map(p => p.product_name ? { ...p, margin_percent: pct, margin_source: 'custom' } : p)
      );
    }
    setCalcData(prev => ({ ...prev, target_margin_percent: pct }));
    setForceMarginPct('');
  };

  const handleUndoMargin = () => {
    if (!marginUndoSnapshot || !setSelectedProducts) return;
    setSelectedProducts(prev =>
      prev.map(p => {
        const snap = marginUndoSnapshot.find(s => s.id === p.id);
        return snap ? { ...p, margin_percent: snap.margin_percent, margin_source: snap.margin_source } : p;
      })
    );
    setMarginUndoSnapshot(null);
  };

  // === Chart data ===

  // Donut: cost structure
  const sellingPrice = results?.selling_price || 0;
  const laborCost    = results?.labor_cost    || 0;
  const vendorCost   = results?.vendor_cost   || 0;
  const marginAmt    = Math.max(0, sellingPrice - laborCost - vendorCost);
  const donutData = [
    { name: 'Team',    value: laborCost,  color: '#6366f1' },
    { name: 'Vendors', value: vendorCost, color: '#f59e0b' },
    { name: 'Margin',  value: marginAmt,  color: '#10b981' },
  ].filter(d => d.value > 0);
  const hasDonut = sellingPrice > 0 && donutData.length > 0;

  // BarChart: margin per service
  const marginBars = (results?.margin_breakdown?.products || []).map(p => ({
    name: (p.product_name || '').split(' ').slice(0, 2).join(' '),
    margin: Number(p.margin_percent) || 0,
  }));

  // RadarChart: internal vs vendor risk factors
  const radarData = ['complexity', 'rush', 'execution'].map(f => ({
    factor: f.charAt(0).toUpperCase() + f.slice(1),
    internal: RISK_NUM[calcData?.internal_risk?.[f] || 'none'],
    vendor:   RISK_NUM[calcData?.vendor_risk?.[f]   || 'none'],
  }));
  const hasAnyRisk = radarData.some(d => d.internal > 0 || d.vendor > 0);

  // Per-product risk bars from results
  const productRiskBars = (results?.margin_breakdown?.products || [])
    .map(p => ({
      id: p.id,
      shortName: (p.product_name || '').split(' ').slice(0, 2).join(' '),
      multiplier: Number(p.risk_multiplier) || 1.0,
    }))
    .filter(p => p.multiplier > 1.0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`w-full sm:max-w-xl overflow-y-auto ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : ''}`}
        data-testid="quote-controls-drawer"
      >
        <SheetHeader>
          <SheetTitle className={isDarkMode ? 'text-white' : ''}>Quote controls</SheetTitle>
          <SheetDescription className={isDarkMode ? 'text-neutral-500' : ''}>
            Deal-level settings that affect the whole quote. Edit each product's team, vendors, risk, and margin on its
            portfolio row.
          </SheetDescription>
        </SheetHeader>

        {/* Deal snapshot — live economics from the last calculation */}
        {results && (
          <div className={`mt-4 rounded-xl border p-3 grid grid-cols-3 divide-x text-center ${sectionBorder} ${
            isDarkMode ? 'bg-neutral-900/50 divide-neutral-800' : 'bg-slate-50 divide-slate-200'
          }`}>
            <div className="px-2">
              <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${muted}`}>Selling</p>
              <p className={`text-sm font-bold font-mono tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrencyCompact(results.selling_price, true)}
              </p>
            </div>
            <div className="px-2">
              <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${muted}`}>Margin</p>
              <p className={`text-sm font-bold font-mono tabular-nums ${
                (results.contribution_margin_percent ?? 0) >= 30
                  ? isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                  : isDarkMode ? 'text-amber-400' : 'text-amber-600'
              }`}>
                {(results.contribution_margin_percent ?? 0).toFixed(1)}%
              </p>
            </div>
            <div className="px-2">
              <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${muted}`}>Deal</p>
              <p className={`text-xs font-mono uppercase font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                {results.incentive_breakdown?.deal_size || '—'}
              </p>
            </div>
          </div>
        )}

        {/* ═══ COST STRUCTURE — Donut Chart ═══ */}
        <div className={`mt-3 rounded-xl border p-4 ${sectionBorder} ${isDarkMode ? 'bg-neutral-900/30' : 'bg-slate-50/80'}`}>
          <p className={`text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1.5 font-semibold ${muted}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            Cost structure
          </p>
          {hasDonut ? (
            <div className="flex items-center gap-4">
              <PieChart width={150} height={150}>
                <Pie
                  data={donutData}
                  cx={75}
                  cy={75}
                  innerRadius={44}
                  outerRadius={68}
                  dataKey="value"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip isDarkMode={isDarkMode} />} />
              </PieChart>
              <div className="space-y-2.5 flex-1">
                {donutData.map(d => {
                  const pct = sellingPrice > 0 ? Math.round(d.value / sellingPrice * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className={`text-xs ${muted}`}>{d.name}</span>
                      <span className={`text-xs font-mono font-semibold ml-auto pl-2 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                        {formatCurrencyCompact(d.value, true)}
                      </span>
                      <span className={`text-[10px] font-mono w-7 text-right shrink-0 ${muted}`}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Placeholder when not yet calculated */
            <div className="flex items-center gap-4">
              <div className={`w-[150px] h-[150px] rounded-full border-[14px] shrink-0 flex items-center justify-center ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className={`w-14 h-14 rounded-full ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
              </div>
              <div className="space-y-3 flex-1">
                {[{ label: 'Team', color: '#6366f1' }, { label: 'Vendors', color: '#f59e0b' }, { label: 'Margin', color: '#10b981' }].map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 opacity-30" style={{ background: d.color }} />
                    <span className={`text-xs ${muted}`}>{d.label}</span>
                    <div className={`ml-auto h-2 w-14 rounded-full ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-200'}`} />
                  </div>
                ))}
                <p className={`text-[10px] ${muted} pt-1`}>Calculate quote to see breakdown</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-6">
          {/* ═══ MARGIN POLICY ═══ */}
          <div className={`rounded-xl border p-4 ${sectionBorder}`} data-testid="quote-controls-margin-policy">
            <p className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              <Target className="w-4 h-4" />
              Margin policy
            </p>

            <div>
              <Label className={`text-xs ${muted}`}>Quote target margin %</Label>
              <Input
                type="number"
                value={calcData?.target_margin_percent ?? 30}
                onChange={e => setCalcData(p => ({ ...p, target_margin_percent: parseFloat(e.target.value) || 0 }))}
                className={`mt-1.5 ${inputClass}`}
                data-testid="quote-target-margin-input"
              />
              <p className={`text-[11px] mt-1.5 ${muted}`}>
                Default margin for product lines and the &ldquo;sync&rdquo; action below.
              </p>
            </div>

            {/* BarChart: margin per service vs target */}
            <div className="mt-4">
              <p className={`text-[10px] uppercase tracking-wider mb-2 ${muted}`}>Margin by service</p>
              {marginBars.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={marginBars.length > 3 ? 110 : 80}>
                    <BarChart
                      data={marginBars}
                      barSize={marginBars.length > 4 ? 12 : 18}
                      margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 8, fill: axisTickColor }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 8, fill: axisTickColor }}
                        tickFormatter={v => `${v}%`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<CustomBarTooltip isDarkMode={isDarkMode} />}
                        cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                      />
                      <ReferenceLine y={target} stroke="#6366f1" strokeDasharray="4 2" strokeWidth={1.5} />
                      <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
                        {marginBars.map((e, i) => (
                          <Cell
                            key={i}
                            fill={e.margin >= target ? '#10b981' : e.margin >= 20 ? '#f59e0b' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className={`text-[9px] mt-1 ${muted}`}>— target {target}%</p>
                </>
              ) : (
                <div className={`rounded-lg border p-3 flex flex-col gap-2 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/30' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-end gap-1.5 h-10">
                    {[40, 70, 55, 85, 45].map((h, i) => (
                      <div key={i} className={`flex-1 rounded-t opacity-20 ${isDarkMode ? 'bg-neutral-400' : 'bg-slate-400'}`}
                        style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <p className={`text-[10px] text-center ${muted}`}>Add services & calculate to see margin bars</p>
                </div>
              )}
            </div>

            {/* Force fixed margin controls */}
            <div className={`mt-4 rounded-lg border p-3 space-y-2 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 ${muted}`}>
                <Zap className="w-3 h-3" />
                Force fixed margin
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: 'All quote' },
                  { key: 'team', label: 'Team only' },
                  { key: 'vendors', label: 'Vendors only' },
                ].map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setForceMarginScope(s.key)}
                    className={`h-6 px-2.5 text-[10px] font-semibold rounded-full border transition-all ${
                      forceMarginScope === s.key
                        ? isDarkMode
                          ? 'bg-indigo-500/25 border-indigo-500/60 text-indigo-300'
                          : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : isDarkMode
                        ? 'border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300'
                        : 'border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="99"
                  value={forceMarginPct}
                  onChange={e => setForceMarginPct(e.target.value)}
                  placeholder="e.g. 35"
                  className={`flex-1 h-8 text-sm ${inputClass}`}
                />
                <span className={`self-center text-xs ${muted}`}>%</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleForceMargin}
                  disabled={!forceMarginPct || Number(forceMarginPct) <= 0}
                  className="h-8 px-3 text-xs"
                >
                  Apply
                </Button>
              </div>
              {marginUndoSnapshot && (
                <button
                  type="button"
                  onClick={handleUndoMargin}
                  className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                    isDarkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a6 6 0 0 1 0 12h-1"/></svg>
                  Undo last force apply
                </button>
              )}
            </div>

            {hasProducts && setSelectedProducts && (
              <div className="mt-4">
                <p className={`text-[11px] uppercase tracking-wider mb-2 ${muted}`}>Apply to all product lines</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applySheetMinimums}
                    className={isDarkMode ? 'border-neutral-700' : ''}
                    data-testid="bulk-apply-sheet-min"
                  >
                    Apply sheet minimums
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={syncFromTarget}
                    className={isDarkMode ? 'border-neutral-700' : ''}
                    data-testid="bulk-sync-target"
                  >
                    Sync from target {target}%
                  </Button>
                </div>
                <p className={`text-[11px] mt-2 ${muted}`}>
                  Fine-tune individual lines on each portfolio card&rsquo;s Margin tab.
                </p>

                {/* Per-product margin progress bars */}
                {results?.margin_breakdown?.products?.length > 0 && (
                  <div className={`mt-3 space-y-2.5 rounded-lg border p-3 ${sectionBorder} ${isDarkMode ? 'bg-neutral-900/30' : 'bg-slate-50/80'}`}>
                    {results.margin_breakdown.products.map(p => {
                      const pct = Number(p.margin_percent) || 0;
                      const min = Number(p.sheet_min_margin_percent) || 0;
                      const below = min > 0 && pct < min;
                      const barColor = below ? 'bg-rose-500' : pct >= 30 ? 'bg-emerald-500' : 'bg-amber-500';
                      const textColor = below ? 'text-rose-400' : pct >= 30
                        ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
                        : (isDarkMode ? 'text-amber-400' : 'text-amber-600');
                      return (
                        <div key={p.id} className="space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                              {p.product_name}
                            </span>
                            <span className={`text-[11px] font-mono font-semibold tabular-nums shrink-0 ${textColor}`}>
                              {pct.toFixed(1)}%{below ? ' ↓' : ''}
                            </span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <Collapsible className="mt-4">
              <CollapsibleTrigger
                className={`flex w-full items-center justify-between py-1.5 text-xs font-medium ${
                  isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Advanced
                </span>
                <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                {hasProducts ? (
                  <p className={`text-[11px] ${muted}`}>
                    Product quotes price each catalog line automatically; the line margins above drive the total.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                          Split internal vs vendor margins
                        </Label>
                        <p className={`text-[11px] ${muted}`}>Apply separate margins to labor and vendor costs.</p>
                      </div>
                      <Switch checked={splitOn} onCheckedChange={setSplit} data-testid="margin-split-toggle" />
                    </div>
                    {splitOn ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className={`text-xs ${muted}`}>Internal margin %</Label>
                          <Input
                            type="number"
                            value={calcData?.internal_margin_percent ?? 30}
                            onChange={e =>
                              setCalcData(p => ({ ...p, internal_margin_percent: parseFloat(e.target.value) || 0 }))
                            }
                            className={`mt-1.5 ${inputClass}`}
                          />
                        </div>
                        <div>
                          <Label className={`text-xs ${muted}`}>Vendor margin %</Label>
                          <Input
                            type="number"
                            value={calcData?.vendor_margin_percent ?? 15}
                            onChange={e =>
                              setCalcData(p => ({ ...p, vendor_margin_percent: parseFloat(e.target.value) || 0 }))
                            }
                            className={`mt-1.5 ${inputClass}`}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className={`text-[11px] ${muted}`}>
                        Unified mode applies the quote target margin to internal labor and overhead.
                      </p>
                    )}
                  </>
                )}
                <Collapsible>
                  <CollapsibleTrigger
                    className={`flex w-full items-center justify-between py-1.5 text-xs font-medium ${
                      isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                    }`}
                  >
                    Pricing guidelines
                    <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <PricingGuidelinesPanel
                      currentMargin={results?.contribution_margin_percent ?? 0}
                      dealSize={results?.selling_price ?? 0}
                      category={guidelineCategory}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Payment terms */}
          <div data-testid="quote-controls-payment-terms" className="space-y-2">
            <Label className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>Payment terms</Label>
            <Select
              value={projectInfo?.payment_term_id || ''}
              onValueChange={v => setProjectInfo?.(p => ({ ...p, payment_term_id: v }))}
            >
              <SelectTrigger
                className={`${
                  isDarkMode
                    ? 'bg-neutral-900 border-neutral-800 text-white'
                    : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                {paymentTerms.map(term => (
                  <SelectItem
                    key={term.id}
                    value={term.id}
                    className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}
                  >
                    {term.name}
                    {term.advance_percent > 0 ? ` · ${term.advance_percent}% advance` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Manage terms collapsible */}
            <Collapsible open={manageTermsOpen} onOpenChange={setManageTermsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                    isDarkMode ? 'text-neutral-500 hover:text-neutral-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${manageTermsOpen ? '' : '-rotate-90'}`} />
                  Manage terms
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {/* Existing terms with delete */}
                {paymentTerms.length > 0 && (
                  <div className={`rounded-lg border divide-y ${sectionBorder} ${isDarkMode ? 'divide-neutral-800' : 'divide-slate-100'}`}>
                    {paymentTerms.map(term => (
                      <div key={term.id} className="flex items-center justify-between px-3 py-2 gap-2">
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                            {term.name}
                          </p>
                          <p className={`text-[10px] ${muted}`}>
                            {term.advance_percent > 0 ? `${term.advance_percent}% advance` : 'No advance'}
                            {term.payment_days ? ` · ${term.payment_days}d` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTerm(term.id)}
                          disabled={deletingTermId === term.id}
                          className={`shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors ${
                            isDarkMode
                              ? 'text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10'
                              : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'
                          } disabled:opacity-40`}
                          title="Delete term"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new term form */}
                <div className={`rounded-lg border p-3 space-y-2 ${sectionBorder}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>New term</p>
                  <Input
                    placeholder="Name (e.g. 50% Advance)"
                    value={newTermForm.name}
                    onChange={e => setNewTermForm(f => ({ ...f, name: e.target.value }))}
                    className={`h-8 text-xs ${inputClass}`}
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className={`text-[9px] uppercase tracking-wider mb-1 ${muted}`}>Advance %</p>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={newTermForm.advance_percent}
                        onChange={e => setNewTermForm(f => ({ ...f, advance_percent: e.target.value }))}
                        className={`h-8 text-xs ${inputClass}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[9px] uppercase tracking-wider mb-1 ${muted}`}>Pay days</p>
                      <Input
                        type="number"
                        min="0"
                        placeholder="30"
                        value={newTermForm.payment_days}
                        onChange={e => setNewTermForm(f => ({ ...f, payment_days: e.target.value }))}
                        className={`h-8 text-xs ${inputClass}`}
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreateTerm}
                    disabled={savingTerm || !newTermForm.name.trim() || newTermForm.advance_percent === ''}
                    className="w-full h-8 text-xs gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    {savingTerm ? 'Saving…' : 'Add term'}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* ═══ ADD-ONS SUMMARY ═══ */}
          {(() => {
            const addonLines = (selectedProducts || []).filter(p => p.is_addon);
            if (addonLines.length === 0) return null;
            const pricingLines = results?.margin_breakdown?.products || [];
            let totalSelling = 0;
            const addonDetails = addonLines.map(a => {
              const line = pricingLines.find(l => l.id === a.id);
              const selling = Number(line?.selling ?? 0);
              totalSelling += selling;
              return { ...a, selling, margin: Number(line?.margin_percent ?? 0) };
            });
            const quotePct = (results?.selling_price || 0) > 0
              ? (totalSelling / results.selling_price) * 100
              : 0;
            return (
              <Collapsible>
                <div className={`rounded-xl border ${sectionBorder}`}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      isDarkMode ? 'hover:bg-neutral-800/50' : 'hover:bg-slate-50'
                    }`}>
                      <p className={`text-sm font-medium flex items-center gap-2 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                        <Puzzle className="w-4 h-4" />
                        Add-ons
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs tabular-nums ${muted}`}>
                          {addonLines.length} · {totalSelling > 0 ? formatCurrencyCompact(totalSelling, true) : '—'}
                          {quotePct > 0 && ` · ${quotePct.toFixed(1)}% of quote`}
                        </span>
                        <ChevronDown className={`w-4 h-4 ${muted}`} />
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className={`border-t px-4 pb-4 pt-3 space-y-3 ${sectionBorder}`}>
                      {/* Contribution bar */}
                      {quotePct > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex h-2 rounded-full overflow-hidden gap-px">
                            <div
                              className="bg-indigo-500 transition-all"
                              style={{ width: `${Math.min(100, quotePct)}%` }}
                            />
                            <div className={`flex-1 ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`} />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`flex items-center gap-1 ${muted}`}>
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              Add-ons {quotePct.toFixed(1)}%
                            </span>
                            <span className={`flex items-center gap-1 ${muted}`}>
                              Services {(100 - quotePct).toFixed(1)}%
                              <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-neutral-700' : 'bg-slate-300'}`} />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Per-add-on rows */}
                      {addonDetails.map(a => (
                        <div key={a.id} className={`flex items-center justify-between gap-2 text-xs border rounded-lg px-3 py-2 ${sectionBorder}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                              isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {a.parent_id ? 'LINKED' : 'STANDALONE'}
                            </span>
                            <span className={`truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                              {a.product_name}
                            </span>
                            {a.size && (
                              <span className={`text-[9px] font-mono uppercase shrink-0 ${muted}`}>{a.size}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 tabular-nums">
                            {a.selling > 0 && (
                              <span className={`font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                {formatCurrencyCompact(a.selling, true)}
                              </span>
                            )}
                            {a.margin > 0 && (
                              <span className={`font-mono text-[11px] font-semibold ${
                                a.margin >= 30
                                  ? isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                  : isDarkMode ? 'text-amber-400' : 'text-amber-600'
                              }`}>
                                {a.margin.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })()}

          {/* ═══ QUOTE RISK FACTORS ═══ */}
          <div
            className={`rounded-xl border p-4 ${sectionBorder}`}
            data-testid="quote-controls-internal-risk"
          >
            <p className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              <Shield className="w-4 h-4" />
              Quote risk factors
            </p>
            <ScopeRiskPanel isDarkMode={isDarkMode} calcData={calcData} setCalcData={setCalcData} compact />

            {/* RadarChart: internal vs vendor risk overlay */}
            <div className="mt-4">
              <p className={`text-[10px] uppercase tracking-wider mb-1 ${muted}`}>
                Internal vs Vendor risk profile
              </p>
              {hasAnyRisk ? (
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart data={radarData} margin={{ top: 12, right: 28, left: 28, bottom: 12 }}>
                    <PolarGrid stroke={gridColor} />
                    <PolarAngleAxis
                      dataKey="factor"
                      tick={{ fontSize: 10, fill: axisTickColor }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 3]}
                      tick={false}
                      axisLine={false}
                      tickCount={4}
                    />
                    <Radar
                      name="Internal"
                      dataKey="internal"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Vendor"
                      dataKey="vendor"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Legend
                      iconSize={8}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                    />
                    <Tooltip content={<CustomRadarTooltip isDarkMode={isDarkMode} />} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                /* Placeholder: show ghosted radar when all factors are none */
                <div className={`rounded-lg border p-3 flex flex-col items-center gap-2 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/30' : 'border-slate-200 bg-slate-50'}`}>
                  <svg width="160" height="130" viewBox="0 0 160 130" className="opacity-15">
                    <polygon points="80,10 140,100 20,100" fill="none" stroke={isDarkMode ? '#6366f1' : '#6366f1'} strokeWidth="1.5" />
                    <polygon points="80,35 122,82 38,82" fill="none" stroke={isDarkMode ? '#525252' : '#cbd5e1'} strokeWidth="1" strokeDasharray="3 2" />
                    <polygon points="80,58 104,65 56,65" fill="none" stroke={isDarkMode ? '#525252' : '#cbd5e1'} strokeWidth="1" strokeDasharray="3 2" />
                    <line x1="80" y1="10" x2="80" y2="100" stroke={isDarkMode ? '#525252' : '#cbd5e1'} strokeWidth="1" />
                    <line x1="80" y1="10" x2="20" y2="100" stroke={isDarkMode ? '#525252' : '#cbd5e1'} strokeWidth="1" />
                    <line x1="80" y1="10" x2="140" y2="100" stroke={isDarkMode ? '#525252' : '#cbd5e1'} strokeWidth="1" />
                  </svg>
                  <p className={`text-[10px] text-center ${muted}`}>Set a risk factor above to activate radar</p>
                </div>
              )}
            </div>

            {/* Per-product risk mini-bars */}
            {productRiskBars.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Service risk levels</p>
                {productRiskBars.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`text-[10px] truncate w-24 shrink-0 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      {p.shortName}
                    </span>
                    <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, (p.multiplier - 1) * 250))}%`,
                          backgroundColor: riskBarColor(p.multiplier),
                        }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono tabular-nums w-10 text-right shrink-0 ${muted}`}>
                      {p.multiplier.toFixed(2)}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(hasQuoteVendors || vendorRiskActive) && (
            <Collapsible defaultOpen={hasQuoteVendors} className={`rounded-xl border ${sectionBorder}`}>
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium ${
                  isDarkMode ? 'text-neutral-200' : 'text-slate-800'
                }`}
              >
                <span>Vendor risk factors</span>
                <Badge className={`text-xs ${isDarkMode ? 'badge-neutral' : 'bg-slate-100 text-slate-600'}`}>
                  {vendorRiskActive ? 'Active' : 'None'}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <p className={`text-xs mb-3 ${muted}`}>
                  Applies to quote-level deal vendors. Product vendors are configured per service row.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {['complexity', 'rush', 'execution'].map(factor => (
                    <div key={factor}>
                      <Label className={`text-xs capitalize ${muted}`}>{factor}</Label>
                      <Select
                        value={calcData.vendor_risk[factor]}
                        onValueChange={v =>
                          setCalcData(p => ({
                            ...p,
                            vendor_risk: { ...p.vendor_risk, [factor]: v },
                          }))
                        }
                      >
                        <SelectTrigger
                          className={`mt-1 text-sm ${
                            isDarkMode
                              ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                          {['none', 'low', 'medium', 'high'].map(level => (
                            <SelectItem
                              key={level}
                              value={level}
                              className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {onOpenQuoteSettings && (
            <div className={`pt-4 border-t ${sectionBorder}`}>
              <p className={`text-xs mb-3 ${muted}`}>
                Manage every vendor and link each to a service in the Resources workspace.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  onOpenQuoteSettings();
                }}
                data-testid="quote-controls-open-settings"
              >
                Manage resources
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
