import { FileText, Save, AlertTriangle, CheckCircle2, Circle, TrendingUp, Users, Truck, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEAL_STEPS, OPTIONAL_STEPS } from './quoteSteps';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';

function statCard(label, value, sub, accentClass, isDarkMode) {
  return (
    <div
      className={`flex-1 min-w-[110px] rounded-xl p-3 border ${
        isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <p className={`text-[10px] uppercase tracking-wide font-semibold mb-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className={`font-mono font-bold tabular-nums leading-tight ${accentClass}`}>{value}</p>
      {sub && <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

function marginColor(pct, isDarkMode) {
  if (pct >= 30) return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  if (pct >= 15) return isDarkMode ? 'text-amber-400' : 'text-amber-600';
  return isDarkMode ? 'text-rose-400' : 'text-rose-600';
}

export default function StepReview({
  isDarkMode,
  stepCompletion,
  results,
  selectedProducts = [],
  calcData = {},
  onGoToScope,
  onSaveTemplate,
  hasTemplateSaveContent,
  exportPdfSlot,
}) {
  // ─── Derived counts ────────────────────────────────────────────────────────
  const serviceCount = (selectedProducts || []).filter(p => !p.vendor_only).length;

  const totalTeamCount = (() => {
    const globalTeam = (calcData.team_members || []).length;
    const productTeam = (selectedProducts || []).reduce(
      (s, p) => s + (p.team_members || []).length,
      0
    );
    return globalTeam + productTeam;
  })();

  const totalVendorCount = (() => {
    const globalVendors = (calcData.vendors || []).length;
    const productVendors = (selectedProducts || []).reduce(
      (s, p) => s + (p.vendors || []).length,
      0
    );
    return globalVendors + productVendors;
  })();

  const exportDescription = [
    serviceCount > 0 ? `${serviceCount} service${serviceCount !== 1 ? 's' : ''}` : null,
    totalTeamCount > 0 ? `${totalTeamCount} team member${totalTeamCount !== 1 ? 's' : ''}` : null,
    totalVendorCount > 0 ? `${totalVendorCount} vendor${totalVendorCount !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  // ─── Quote numbers ─────────────────────────────────────────────────────────
  const margin = results?.contribution_margin_percent ?? results?.gross_margin_percent ?? 0;
  const sellingPrice = results?.total_revenue ?? results?.selling_price ?? 0;
  const laborCost = results?.labor_cost ?? 0;
  const vendorCost = results?.vendor_cost ?? 0;
  const cogs = laborCost + vendorCost;
  const dealSize = results?.deal_size || '';

  // ─── Warnings ──────────────────────────────────────────────────────────────
  const warnings = (results?.warnings || []).filter(w => w && String(w).trim());

  // ─── Margin approvals ───────────────────────────────────────────────────────
  // Only flag lines the user deliberately priced below policy:
  //   • below the sheet minimum margin, OR
  //   • needs_approval (actively priced below the base-min floor).
  // Pristine lines clamped UP to the floor (below_floor but not needs_approval) are fine.
  const approvalLines = (results?.margin_breakdown?.products || []).map(p => {
    const marginPct = Number(p.margin_percent) || 0;
    const minMargin = Number(p.sheet_min_margin_percent) || 0;
    const belowMargin = minMargin > 0 && marginPct < minMargin;
    const belowFloor = !!p.needs_approval;
    return { ...p, marginPct, minMargin, belowMargin, belowFloor, needs: belowMargin || belowFloor };
  });
  const needApproval = approvalLines.filter(p => p.needs);

  // ─── Step descriptions for pre-flight ──────────────────────────────────────
  const stepMeta = {
    frame: results?.opportunity_id || calcData?.opportunity_id
      ? 'Opportunity loaded'
      : serviceCount > 0
        ? `${serviceCount} service${serviceCount !== 1 ? 's' : ''} quoted`
        : 'Client info entered',
    compose: serviceCount > 0
      ? `${serviceCount} service${serviceCount !== 1 ? 's' : ''}, ${formatCurrencyCompact(sellingPrice, true)}`
      : '—',
    economics: totalTeamCount + totalVendorCount > 0
      ? `${totalTeamCount > 0 ? `${totalTeamCount} team` : ''}${totalTeamCount > 0 && totalVendorCount > 0 ? ' · ' : ''}${totalVendorCount > 0 ? `${totalVendorCount} vendors` : ''}`
      : 'No resources added',
    review: results ? 'Calculated' : 'Pending',
  };

  const panelBg = isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm';

  return (
    <section id="review" className="animate-fade-in quote-panel-enter">
      <Card
        className={`${isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}`}
        data-testid="review-section"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50'
              }`}
            >
              <FileText className={`w-5 h-5 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`} />
            </div>
            <div>
              <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Deal Summary
              </CardTitle>
              <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                Review your quote before exporting
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* ── Section 1: Quote Snapshot ─────────────────────────────────── */}
          {results ? (
            <div className="space-y-3">
              {/* Top KPIs */}
              <div className="flex flex-wrap gap-2">
                {statCard(
                  'Selling Price',
                  formatCurrency(sellingPrice, true),
                  null,
                  isDarkMode ? 'text-white text-base' : 'text-slate-900 text-base',
                  isDarkMode
                )}
                {statCard(
                  'Gross Margin',
                  `${margin.toFixed(1)}%`,
                  margin >= 30 ? 'Healthy' : margin >= 15 ? 'Tight' : 'Below target',
                  `${marginColor(margin, isDarkMode)} text-base`,
                  isDarkMode
                )}
                {dealSize && statCard(
                  'Deal Size',
                  dealSize.toUpperCase(),
                  null,
                  isDarkMode ? 'text-neutral-200 text-sm' : 'text-slate-700 text-sm',
                  isDarkMode
                )}
              </div>
              {/* COGS breakdown */}
              <div
                className={`flex flex-wrap gap-x-5 gap-y-1 px-3 py-2.5 rounded-lg text-[11px] tabular-nums ${
                  isDarkMode ? 'bg-neutral-800/50 text-neutral-400' : 'bg-slate-50 text-slate-500'
                }`}
              >
                <span>
                  COGS{' '}
                  <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                    {formatCurrency(cogs, true)}
                  </span>
                </span>
                {laborCost > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Labor{' '}
                    <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                      {formatCurrency(laborCost, true)}
                    </span>
                  </span>
                )}
                {vendorCost > 0 && (
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Vendors{' '}
                    <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                      {formatCurrency(vendorCost, true)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`rounded-xl border p-4 text-center ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-neutral-700' : 'text-slate-300'}`} />
              <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                No quote calculated yet
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
                Finish Portfolio and Resources — pricing updates automatically.
              </p>
              <Button
                variant="link"
                size="sm"
                className={`mt-2 h-auto p-0 text-xs gap-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                onClick={onGoToScope}
              >
                Go to Portfolio <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* ── Section 1.5: Margin approvals ─────────────────────────────── */}
          {results && (
            <div className="space-y-1.5">
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                Margin approvals
              </p>
              {needApproval.length > 0 ? (
                <ul className="space-y-1.5">
                  {needApproval.map(p => (
                    <li
                      key={p.id}
                      className={`flex items-start justify-between gap-3 text-xs px-3 py-2.5 rounded-lg border ${
                        isDarkMode ? 'bg-rose-500/8 border-rose-500/25 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold">
                            {p.product_name}
                            {p.segment ? <span className="opacity-70 font-normal"> · {String(p.segment).toUpperCase()}</span> : null}
                          </span>
                          <div className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-rose-400/80' : 'text-rose-600/90'}`}>
                            {p.belowMargin && `Margin ${p.marginPct.toFixed(1)}% vs min ${p.minMargin.toFixed(1)}%`}
                            {p.belowMargin && p.belowFloor && ' · '}
                            {p.belowFloor && 'Price below base min (floor)'}
                          </div>
                        </div>
                      </div>
                      <Badge className={isDarkMode ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 shrink-0' : 'bg-rose-100 text-rose-700 border-rose-200 shrink-0'}>
                        Needs approval
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
                    isDarkMode ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium">All services within policy — no approvals needed</span>
                </div>
              )}
            </div>
          )}

          {/* ── Section 2: Pre-flight Checklist ───────────────────────────── */}
          <div className="space-y-1.5">
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
              Pre-flight checklist
            </p>
            <ul className="space-y-1">
              {DEAL_STEPS.filter(s => s.id !== 'review').map(step => {
                const isComplete = stepCompletion[step.id];
                const isOptional = OPTIONAL_STEPS.has(step.id);
                return (
                  <li
                    key={step.id}
                    className={`flex items-center justify-between gap-2 text-sm py-2 px-3 rounded-lg ${
                      isDarkMode ? 'bg-neutral-900/60' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      ) : isOptional ? (
                        <Circle className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-neutral-600' : 'text-slate-300'}`} />
                      ) : (
                        <Circle className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-amber-500/70' : 'text-amber-400'}`} />
                      )}
                      <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>{step.label}</span>
                      {stepMeta[step.id] && (
                        <span className={`text-[11px] truncate ${isDarkMode ? 'text-neutral-600' : 'text-slate-400'}`}>
                          — {stepMeta[step.id]}
                        </span>
                      )}
                    </div>
                    <Badge
                      className={
                        isComplete
                          ? isDarkMode
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0'
                          : isOptional
                            ? isDarkMode
                              ? 'bg-neutral-800 text-neutral-500 border-neutral-700 shrink-0'
                              : 'bg-slate-100 text-slate-400 border-slate-200 shrink-0'
                            : isDarkMode
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 shrink-0'
                              : 'bg-amber-50 text-amber-600 border-amber-200 shrink-0'
                      }
                    >
                      {isComplete ? 'Complete' : isOptional ? 'Optional' : 'Incomplete'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Section 3: Risk warnings ───────────────────────────────────── */}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>
                Warnings
              </p>
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-amber-500/8 border-amber-500/20 text-amber-300'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{String(w)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Section 4: Ready banner ────────────────────────────────────── */}
          {results && warnings.length === 0 && (
            <div
              className={`px-4 py-3 rounded-xl border ${
                isDarkMode ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                  Ready to export
                </p>
              </div>
              {exportDescription && (
                <p className={`text-[11px] mt-0.5 ml-6 ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>
                  {exportDescription}
                </p>
              )}
            </div>
          )}

          {/* ── Section 5: Export Center ──────────────────────────────────── */}
          {exportPdfSlot && (
            <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-slate-200 bg-slate-50/60'}`}>
              {exportPdfSlot}
            </div>
          )}

          {/* ── Section 6: Save template button ──────────────────────────── */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className={`gap-2 ${isDarkMode ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' : ''}`}
              onClick={onSaveTemplate}
              disabled={!hasTemplateSaveContent}
            >
              <Save className="w-4 h-4" />
              Save as template
            </Button>
          </div>

        </CardContent>
      </Card>
    </section>
  );
}
