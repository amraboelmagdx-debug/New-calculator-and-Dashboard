import { useMemo } from 'react';
import { Truck, Plus, Trash2, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import {
  listVendorPresets,
  presetToLineVendor,
  findVendorPresetByName,
} from '@/lib/vendorRegistry';

const UNASSIGNED = 'unassigned';
const PASS_THROUGH_NAME = 'Pass-through vendors';

function lineLabel(line) {
  if (!line) return '';
  if (line.is_standalone) return line.product_name || 'Standalone service';
  const tier = line.size ? ` · ${String(line.size).toUpperCase()}` : '';
  return `${line.product_name}${tier}`;
}

function vendorCost(v) {
  return (Number(v.cost) || 0) * (Number(v.quantity) || 1);
}
function vendorBilled(v) {
  return vendorCost(v) * (1 + (Number(v.markup_percent) || 0) / 100);
}

function createBucketLine(vendors) {
  return {
    id: `pp-passthru-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    product_name: PASS_THROUGH_NAME,
    size: 'standard',
    quantity: 1,
    team_members: [],
    vendors,
    risk: { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0, risk_mode: 'default' },
    margin_percent: null,
    margin_source: null,
    is_standalone: true,
    vendor_only: true,
  };
}

export default function ResourcesWorkspace({
  isDarkMode,
  selectedProducts = [],
  setSelectedProducts,
  vendorServices = [],
}) {
  const presets = useMemo(() => listVendorPresets(vendorServices), [vendorServices]);

  const linkableLines = useMemo(
    () => selectedProducts.filter(p => p.product_name && !p.vendor_only),
    [selectedProducts]
  );

  const vendorRows = useMemo(() => {
    const rows = [];
    selectedProducts.forEach(line => {
      (line.vendors || []).forEach(v => {
        rows.push({
          lineId: line.id,
          isUnassigned: !!line.vendor_only,
          lineName: lineLabel(line),
          vendor: v,
        });
      });
    });
    return rows;
  }, [selectedProducts]);

  const usedByMap = useMemo(() => {
    const map = {};
    vendorRows.forEach(({ lineName, vendor, isUnassigned }) => {
      const name = (vendor.service_name || '').toLowerCase();
      if (!name) return;
      if (!map[name]) map[name] = new Set();
      map[name].add(isUnassigned ? 'Pass-through' : lineName);
    });
    return map;
  }, [vendorRows]);

  const kpis = useMemo(() => {
    let totalCost = 0;
    let totalBilled = 0;
    let passThroughCost = 0;
    let passThroughCount = 0;
    vendorRows.forEach(({ vendor, isUnassigned }) => {
      const c = vendorCost(vendor);
      totalCost += c;
      totalBilled += vendorBilled(vendor);
      if (isUnassigned) {
        passThroughCost += c;
        passThroughCount += 1;
      }
    });
    const blendedMarkup = totalCost > 0 ? ((totalBilled - totalCost) / totalCost) * 100 : 0;
    return {
      totalCost,
      totalBilled,
      blendedMarkup,
      vendorCount: vendorRows.length,
      passThroughCost,
      passThroughCount,
    };
  }, [vendorRows]);

  const serviceSummaries = useMemo(() => {
    return selectedProducts
      .filter(line => (line.vendors || []).length > 0)
      .map(line => {
        const cost = (line.vendors || []).reduce((s, v) => s + vendorCost(v), 0);
        return {
          id: line.id,
          label: lineLabel(line),
          isUnassigned: !!line.vendor_only,
          count: (line.vendors || []).length,
          cost,
        };
      });
  }, [selectedProducts]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const updateVendorField = (lineId, vendorId, patch) => {
    setSelectedProducts(prev =>
      prev.map(line =>
        line.id === lineId
          ? { ...line, vendors: (line.vendors || []).map(v => (v.id === vendorId ? { ...v, ...patch } : v)) }
          : line
      )
    );
  };

  const applyPreset = (lineId, vendorId, presetName) => {
    const preset = findVendorPresetByName(presets, presetName);
    setSelectedProducts(prev =>
      prev.map(line =>
        line.id === lineId
          ? {
              ...line,
              vendors: (line.vendors || []).map(v => {
                if (v.id !== vendorId) return v;
                return {
                  ...v,
                  service_name: presetName,
                  preset_id: preset?.id || null,
                  service_id: preset?.id || v.service_id || '',
                  markup_percent: preset?.default_markup_percent ?? v.markup_percent ?? 15,
                  cost: (Number(v.cost) || 0) > 0 ? v.cost : preset?.default_cost ?? v.cost ?? 0,
                };
              }),
            }
          : line
      )
    );
  };

  const removeVendor = (lineId, vendorId) => {
    setSelectedProducts(prev =>
      prev
        .map(line =>
          line.id === lineId ? { ...line, vendors: (line.vendors || []).filter(v => v.id !== vendorId) } : line
        )
        .filter(line => !(line.vendor_only && (line.vendors || []).length === 0))
    );
  };

  const moveVendor = (fromLineId, vendorId, toLineId) => {
    if (fromLineId === toLineId) return;
    setSelectedProducts(prev => {
      let moving = null;
      let next = prev.map(line => {
        if (line.id !== fromLineId) return line;
        const found = (line.vendors || []).find(v => v.id === vendorId);
        if (found) moving = found;
        return { ...line, vendors: (line.vendors || []).filter(v => v.id !== vendorId) };
      });
      if (!moving) return prev;

      if (toLineId === UNASSIGNED) {
        const bucketIdx = next.findIndex(l => l.vendor_only);
        if (bucketIdx >= 0) {
          next = next.map((l, i) => (i === bucketIdx ? { ...l, vendors: [...l.vendors, moving] } : l));
        } else {
          next = [...next, createBucketLine([moving])];
        }
      } else {
        next = next.map(l => (l.id === toLineId ? { ...l, vendors: [...(l.vendors || []), moving] } : l));
      }
      return next.filter(l => !(l.vendor_only && (l.vendors || []).length === 0));
    });
  };

  const addVendor = () => {
    const blank = presetToLineVendor(null, {});
    setSelectedProducts(prev => {
      const bucketIdx = prev.findIndex(l => l.vendor_only);
      if (bucketIdx >= 0) {
        return prev.map((l, i) => (i === bucketIdx ? { ...l, vendors: [...l.vendors, blank] } : l));
      }
      return [...prev, createBucketLine([blank])];
    });
  };

  const inputClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';
  const card = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';

  const kpiTiles = [
    { label: 'Vendor cost', value: formatCurrencyCompact(kpis.totalCost, true) },
    { label: 'Client / billed', value: formatCurrencyCompact(kpis.totalBilled, true) },
    { label: 'Blended markup', value: `${kpis.blendedMarkup.toFixed(0)}%` },
    { label: 'Vendors', value: String(kpis.vendorCount) },
    {
      label: 'Pass-through cost',
      value: formatCurrencyCompact(kpis.passThroughCost, true),
      hint: `${kpis.passThroughCount} unassigned`,
      accent: true,
    },
  ];

  return (
    <div className="pb-28 md:pb-0">
      <section id="vendors" className="animate-fade-in quote-panel-enter">
        <Card
          className={isDarkMode ? 'dark-card' : 'bg-white border border-slate-200 shadow-sm rounded-xl'}
          data-testid="vendor-section"
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <Truck className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <div>
                  <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Resources</CardTitle>
                  <CardDescription className={isDarkMode ? 'text-neutral-500' : 'text-slate-500'}>
                    Manage every vendor in one place and link each to the service it supports.
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={addVendor}
                className={`font-semibold shadow-sm ${isDarkMode ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                data-testid="add-vendor-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add vendor
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {kpiTiles.map(t => (
                <div
                  key={t.label}
                  className={`rounded-xl border p-3 ${card} ${
                    t.accent ? (isDarkMode ? 'border-amber-500/30' : 'border-amber-200') : ''
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider ${muted}`}>{t.label}</p>
                  <p className={`text-base font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {t.value}
                  </p>
                  {t.hint && <p className={`text-[10px] ${muted}`}>{t.hint}</p>}
                </div>
              ))}
            </div>

            {/* Per-service summary */}
            {serviceSummaries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {serviceSummaries.map(s => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${card}`}
                  >
                    <span className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>{s.label}</span>
                    {s.isUnassigned && (
                      <Badge variant="outline" className={`text-[9px] ${isDarkMode ? 'border-amber-500/30 text-amber-300' : 'border-amber-200 text-amber-700'}`}>
                        Pass-through
                      </Badge>
                    )}
                    <span className={muted}>
                      {s.count} · {formatCurrencyCompact(s.cost, true)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Vendor rows */}
            {vendorRows.length === 0 ? (
              <div className={`text-center py-12 rounded-xl border border-dashed ${isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-slate-200 text-slate-500'}`}>
                <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No vendors yet. Add one and link it to a service.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vendorRows.map(({ lineId, vendor, isUnassigned }) => {
                  const usedBy = Array.from(usedByMap[(vendor.service_name || '').toLowerCase()] || []);
                  const billed = vendorBilled(vendor);
                  return (
                    <div key={vendor.id} className={`rounded-xl border p-3 ${card}`} data-testid="resource-vendor-row">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-[160px]">
                          <label className={`text-[10px] ${muted}`}>Provider</label>
                          {presets.length ? (
                            <Select
                              value={vendor.service_name || ''}
                              onValueChange={value => applyPreset(lineId, vendor.id, value)}
                            >
                              <SelectTrigger className={`h-9 ${inputClass}`}>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                              <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                                {presets.map(p => (
                                  <SelectItem key={p.id || p.name} value={p.name}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={vendor.service_name || ''}
                              onChange={e => updateVendorField(lineId, vendor.id, { service_name: e.target.value })}
                              placeholder="Vendor name"
                              className={`h-9 ${inputClass}`}
                            />
                          )}
                        </div>
                        <div className="w-[96px]">
                          <label className={`text-[10px] ${muted}`}>Cost</label>
                          <Input
                            type="number"
                            min="0"
                            value={vendor.cost ?? 0}
                            onChange={e => updateVendorField(lineId, vendor.id, { cost: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className={`h-9 ${inputClass}`}
                          />
                        </div>
                        <div className="w-[80px]">
                          <label className={`text-[10px] ${muted}`}>Markup %</label>
                          <Input
                            type="number"
                            min="0"
                            value={vendor.markup_percent ?? 0}
                            onChange={e => updateVendorField(lineId, vendor.id, { markup_percent: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className={`h-9 ${inputClass}`}
                          />
                        </div>
                        <div className="w-[96px]">
                          <label className={`text-[10px] ${muted}`}>Client price</label>
                          <p className={`h-9 flex items-center text-sm font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {formatCurrencyCompact(billed, true)}
                          </p>
                        </div>
                        <div className="min-w-[180px]">
                          <label className={`text-[10px] flex items-center gap-1 ${muted}`}>
                            <Link2 className="w-3 h-3" /> Linked service
                          </label>
                          <Select
                            value={isUnassigned ? UNASSIGNED : lineId}
                            onValueChange={value => moveVendor(lineId, vendor.id, value)}
                          >
                            <SelectTrigger className={`h-9 ${inputClass}`} data-testid="vendor-linked-service">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                              {linkableLines.map(l => (
                                <SelectItem key={l.id} value={l.id}>
                                  {lineLabel(l)}
                                </SelectItem>
                              ))}
                              <SelectItem value={UNASSIGNED}>Unassigned (pass-through)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVendor(lineId, vendor.id)}
                          className={`h-9 w-8 p-0 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {usedBy.length > 1 && (
                        <p className={`text-[10px] mt-2 ${muted}`}>Used by: {usedBy.join(', ')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className={`text-[11px] ${muted}`}>
              Vendors are priced through the service they&rsquo;re linked to. &ldquo;Unassigned&rdquo; vendors are billed as
              pass-through costs.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
