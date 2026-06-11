import { useMemo, useState, useCallback } from 'react';
import {
  Truck, Plus, Trash2, ChevronDown, ChevronRight,
  Layers, LayoutTemplate, Save, Check, X, FolderOpen, Puzzle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrencyCompact } from '@/lib/utils';
import {
  listVendorPresets,
  presetToLineVendor,
  findVendorPresetByName,
  createGroupVendor,
  createSubItem,
  vendorTotals,
} from '@/lib/vendorRegistry';

const UNASSIGNED = 'unassigned';
const PASS_THROUGH_NAME = 'Pass-through vendors';

function lineLabel(line) {
  if (!line) return '';
  if (line.is_standalone) return line.product_name || 'Standalone service';
  const tier = line.size ? ` · ${String(line.size).toUpperCase()}` : '';
  return `${line.product_name}${tier}`;
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
  preferredVendors = [],
  vendorGroupTemplates = [],
  onSaveVendorTemplate,
  onDeleteVendorTemplate,
  onQuickCreateVendorService,
  onDeleteVendorService,
}) {
  const presets = useMemo(() => listVendorPresets(vendorServices), [vendorServices]);

  // Optimistically-created services (added via quick-create before DB refresh)
  const [localExtraPresets, setLocalExtraPresets] = useState([]);
  const allPresets = useMemo(
    () => [...presets, ...localExtraPresets.filter(ep => !presets.find(p => p.name.toLowerCase() === ep.name.toLowerCase()))],
    [presets, localExtraPresets]
  );

  // Parent (top-level) service lines only — add-ons are nested under their parent,
  // never a link target or a section of their own.
  const linkableLines = useMemo(
    () => selectedProducts.filter(p => p.product_name && !p.vendor_only && !p.is_addon),
    [selectedProducts]
  );

  // Add-on child lines grouped by parent_id.
  const addonsByParent = useMemo(() => {
    const map = {};
    selectedProducts.forEach(p => {
      if (p.is_addon && p.parent_id) (map[p.parent_id] ||= []).push(p);
    });
    return map;
  }, [selectedProducts]);

  // ─── Add Vendor dialog state ─────────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTargetLineId, setAddTargetLineId] = useState(UNASSIGNED);
  const [addVendorType, setAddVendorType] = useState('simple'); // 'simple' | 'group'
  const [addVendorName, setAddVendorName] = useState('');
  const [addVendorMarkup, setAddVendorMarkup] = useState(15);

  // ─── Quick-create new vendor service ────────────────────────────────────
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);

  const handleQuickCreate = async () => {
    const name = quickCreateName.trim();
    if (!name) return;
    setQuickCreateSaving(true);
    try {
      if (onQuickCreateVendorService) {
        await onQuickCreateVendorService(name);
      }
      // Optimistically add to local presets so it's immediately selectable
      setLocalExtraPresets(prev => [...prev, { id: null, name, default_markup_percent: 15, source: 'local' }]);
      setAddVendorName(name);
      setQuickCreateName('');
      setQuickCreateOpen(false);
    } catch {
      // error toasted by Calculator
    } finally {
      setQuickCreateSaving(false);
    }
  };

  // ─── Templates panel state ───────────────────────────────────────────────
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadTargetLineId, setLoadTargetLineId] = useState(UNASSIGNED);

  // ─── Expanded groups state ───────────────────────────────────────────────
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  // ─── Per-service bulk markup state ──────────────────────────────────────
  const [bulkMarkup, setBulkMarkup] = useState({}); // { lineId: string }

  const toggleGroupExpand = useCallback((vendorId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  }, []);

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalCost = 0;
    let totalRevenue = 0;
    let passThroughCost = 0;
    let passThroughCount = 0;
    let vendorCount = 0;
    selectedProducts.forEach(line => {
      const isPass = !!line.vendor_only;
      (line.vendors || []).forEach(v => {
        const t = vendorTotals(v);
        totalCost += t.cost;
        totalRevenue += t.revenue;
        if (isPass) {
          passThroughCost += t.cost;
          passThroughCount += 1;
        }
        vendorCount += 1;
      });
    });
    const blendedMarkup = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
    return { totalCost, totalRevenue, blendedMarkup, vendorCount, passThroughCost, passThroughCount };
  }, [selectedProducts]);

  // ─── Mutations ───────────────────────────────────────────────────────────
  const updateVendorField = (lineId, vendorId, patch) => {
    setSelectedProducts(prev =>
      prev.map(line =>
        line.id === lineId
          ? { ...line, vendors: (line.vendors || []).map(v => v.id === vendorId ? { ...v, ...patch } : v) }
          : line
      )
    );
  };

  const applyPreset = (lineId, vendorId, presetName) => {
    const preset = findVendorPresetByName(allPresets, presetName);
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
          line.id === lineId
            ? { ...line, vendors: (line.vendors || []).filter(v => v.id !== vendorId) }
            : line
        )
        .filter(line => !(line.vendor_only && (line.vendors || []).length === 0))
    );
  };

  const addVendorToLine = useCallback((lineId, vendor) => {
    if (lineId === UNASSIGNED) {
      setSelectedProducts(prev => {
        const bucketIdx = prev.findIndex(l => l.vendor_only);
        if (bucketIdx >= 0) {
          return prev.map((l, i) => i === bucketIdx ? { ...l, vendors: [...l.vendors, vendor] } : l);
        }
        return [...prev, createBucketLine([vendor])];
      });
    } else {
      setSelectedProducts(prev =>
        prev.map(line =>
          line.id === lineId
            ? { ...line, vendors: [...(line.vendors || []), vendor] }
            : line
        )
      );
    }
  }, [setSelectedProducts]);

  const openAddDialog = (targetLineId = UNASSIGNED) => {
    setAddTargetLineId(targetLineId);
    setAddVendorType('simple');
    setAddVendorName('');
    setAddVendorMarkup(15);
    setQuickCreateOpen(false);
    setQuickCreateName('');
    setAddDialogOpen(true);
  };

  const commitAddVendor = () => {
    const preset = findVendorPresetByName(allPresets, addVendorName);
    let vendor;
    if (addVendorType === 'group') {
      vendor = createGroupVendor({ service_name: addVendorName, markup_percent: addVendorMarkup });
      // Add one blank sub-item so the group isn't empty
      vendor.sub_items = [createSubItem({ markup_percent: addVendorMarkup })];
    } else {
      vendor = presetToLineVendor(preset, {
        service_name: addVendorName,
        markup_percent: addVendorMarkup,
        cost: preset?.default_cost ?? 0,
      });
    }
    addVendorToLine(addTargetLineId, vendor);
    setAddDialogOpen(false);
  };

  // ─── Sub-item mutations ──────────────────────────────────────────────────
  const addSubItem = (lineId, vendorId) => {
    setSelectedProducts(prev =>
      prev.map(line =>
        line.id === lineId
          ? {
              ...line,
              vendors: (line.vendors || []).map(v =>
                v.id === vendorId
                  ? {
                      ...v,
                      sub_items: [
                        ...(v.sub_items || []),
                        createSubItem({ markup_percent: v.markup_percent }),
                      ],
                    }
                  : v
              ),
            }
          : line
      )
    );
  };

  const updateSubItem = (lineId, vendorId, subItemId, patch) => {
    setSelectedProducts(prev =>
      prev.map(line =>
        line.id === lineId
          ? {
              ...line,
              vendors: (line.vendors || []).map(v =>
                v.id === vendorId
                  ? {
                      ...v,
                      sub_items: (v.sub_items || []).map(si =>
                        si.id === subItemId ? { ...si, ...patch } : si
                      ),
                    }
                  : v
              ),
            }
          : line
      )
    );
  };

  const removeSubItem = (lineId, vendorId, subItemId) => {
    setSelectedProducts(prev =>
      prev.map(line =>
        line.id === lineId
          ? {
              ...line,
              vendors: (line.vendors || []).map(v =>
                v.id === vendorId
                  ? { ...v, sub_items: (v.sub_items || []).filter(si => si.id !== subItemId) }
                  : v
              ),
            }
          : line
      )
    );
  };

  // ─── Bulk markup ─────────────────────────────────────────────────────────
  const applyBulkMarkup = (lineId, pct) => {
    const value = Number(pct) || 0;
    setSelectedProducts(prev =>
      prev.map(line =>
        line.id === lineId
          ? {
              ...line,
              vendors: (line.vendors || []).map(v => {
                if (v.is_group) {
                  return {
                    ...v,
                    markup_percent: value,
                    sub_items: (v.sub_items || []).map(si => ({ ...si, markup_percent: value })),
                  };
                }
                return { ...v, markup_percent: value };
              }),
            }
          : line
      )
    );
  };

  // ─── Template operations ─────────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    if (!saveTemplateName.trim()) return;
    setSavingTemplate(true);
    // Collect all vendors across all lines
    const allVendors = [];
    selectedProducts.forEach(line => {
      (line.vendors || []).forEach(v => allVendors.push(v));
    });
    try {
      await onSaveVendorTemplate?.({ name: saveTemplateName.trim(), vendors: allVendors });
      setSaveTemplateName('');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = (template) => {
    const targetId = loadTargetLineId;
    (template.vendors || []).forEach(v => {
      addVendorToLine(targetId, {
        ...v,
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sub_items: (v.sub_items || []).map(si => ({
          ...si,
          id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      });
    });
  };

  // ─── Styles ──────────────────────────────────────────────────────────────
  const inputClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';
  const card = isDarkMode ? 'border-neutral-800 bg-neutral-950/50' : 'border-slate-200 bg-white';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const sectionDivider = isDarkMode ? 'border-neutral-800' : 'border-slate-200';
  const subCard = isDarkMode ? 'bg-neutral-900/60 border-neutral-700/50' : 'bg-slate-50/80 border-slate-200/60';

  // ─── Grouped view: sections per service ──────────────────────────────────
  const serviceSections = useMemo(() => {
    const sections = [];
    // Linked services first (non-vendor-only, parents only — add-ons nest inside).
    selectedProducts
      .filter(line => !line.vendor_only && !line.is_addon)
      .forEach(line => {
        const vendors = line.vendors || [];
        sections.push({ line, lineId: line.id, label: lineLabel(line), vendors, isPassThrough: false });
      });
    // Pass-through section last
    const passLine = selectedProducts.find(l => l.vendor_only);
    if (passLine) {
      sections.push({
        line: passLine,
        lineId: passLine.id,
        label: 'Unassigned (pass-through)',
        vendors: passLine.vendors || [],
        isPassThrough: true,
      });
    }
    return sections;
  }, [selectedProducts]);

  const hasAnyVendors = serviceSections.some(s => s.vendors.length > 0);

  // ─── Render: single vendor row (simple) ──────────────────────────────────
  const renderSimpleVendor = (lineId, vendor) => {
    const totals = vendorTotals(vendor);
    return (
      <div key={vendor.id} className={`rounded-xl border p-3 space-y-2 ${card}`} data-testid="resource-vendor-row">
        <div className="flex flex-wrap items-end gap-2">
          {/* Provider */}
          <div className="flex-1 min-w-[140px]">
            <label className={`text-[10px] ${muted}`}>Provider</label>
            {allPresets.length > 0 ? (
              <Select value={vendor.service_name || ''} onValueChange={v => applyPreset(lineId, vendor.id, v)}>
                <SelectTrigger className={`h-9 ${inputClass}`}>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {allPresets.map(p => <SelectItem key={p.id || p.name} value={p.name}>{p.name}</SelectItem>)}
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
          {/* Qty */}
          <div className="w-[60px]">
            <label className={`text-[10px] ${muted}`}>Qty</label>
            <Input type="number" min="1" value={vendor.quantity ?? 1}
              onChange={e => updateVendorField(lineId, vendor.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className={`h-9 ${inputClass}`} />
          </div>
          {/* Cost (SAR) — the numeric per-unit cost */}
          <div className="w-[104px]">
            <label className={`text-[10px] ${muted}`}>Cost (SAR)</label>
            <Input type="number" min="0" value={vendor.cost ?? 0}
              onChange={e => updateVendorField(lineId, vendor.id, { cost: Math.max(0, parseFloat(e.target.value) || 0) })}
              className={`h-9 ${inputClass}`} />
          </div>
          {/* Unit (label) — free-text unit, e.g. day / item */}
          <div className="w-[84px]">
            <label className={`text-[10px] ${muted}`}>Unit (label)</label>
            <Input value={vendor.unit || ''} onChange={e => updateVendorField(lineId, vendor.id, { unit: e.target.value })}
              placeholder="e.g. day" className={`h-9 ${inputClass}`} />
          </div>
          {/* Markup % — label shows the live SAR markup amount */}
          <div className="w-[116px]">
            <label className={`text-[10px] whitespace-nowrap ${muted}`}>
              Markup %
              {(Number(vendor.markup_percent) || 0) > 0 && totals.cost > 0 && (
                <span className={`ml-1 font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  · +SAR {formatCurrencyCompact(totals.cost * (Number(vendor.markup_percent) || 0) / 100, true)}
                </span>
              )}
            </label>
            <Input type="number" min="0" value={vendor.markup_percent ?? 0}
              onChange={e => updateVendorField(lineId, vendor.id, { markup_percent: Math.max(0, parseFloat(e.target.value) || 0) })}
              className={`h-9 w-[72px] ${inputClass}`} />
          </div>
          {/* Risk % */}
          <div className="w-[68px]">
            <label className={`text-[10px] ${muted}`}>Risk %</label>
            <Input type="number" min="0" max="100" step="1"
              value={vendor.risk_percent ?? 0}
              onChange={e => updateVendorField(lineId, vendor.id, { risk_percent: Math.max(0, parseFloat(e.target.value) || 0) })}
              className={`h-9 ${inputClass} ${(vendor.risk_percent ?? 0) > 0 ? (isDarkMode ? 'border-amber-500/50' : 'border-amber-400') : ''}`} />
          </div>
          {/* Delete */}
          <Button variant="ghost" size="sm" onClick={() => removeVendor(lineId, vendor.id)}
            className={`h-9 w-8 p-0 self-end ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        {/* Pricing chain */}
        {(() => {
          const baseRev = (totals.cost) * (1 + (Number(vendor.markup_percent) || 0) / 100);
          const riskAmt = totals.revenue - baseRev;
          const hasRisk = (vendor.risk_percent ?? 0) > 0;
          return (
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t text-[11px] tabular-nums ${sectionDivider} ${muted}`}>
          <span className="flex items-center gap-1.5">
            <span className="uppercase tracking-wide text-[9px]">Total</span>
            <span className={`font-mono font-semibold text-[13px] ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
              {formatCurrencyCompact(totals.cost, true)}
            </span>
          </span>
          <span className={`text-[10px] ${isDarkMode ? 'text-neutral-700' : 'text-slate-300'}`}>→</span>
          <span className="flex items-center gap-1.5">
            <span className="uppercase tracking-wide text-[9px]">Markup</span>
            <span className={`font-mono font-semibold text-[13px] ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              +{formatCurrencyCompact(baseRev - totals.cost, true)}
            </span>
          </span>
          {hasRisk && (
            <>
              <span className={`text-[10px] ${isDarkMode ? 'text-neutral-700' : 'text-slate-300'}`}>→</span>
              <span className="flex items-center gap-1.5">
                <span className="uppercase tracking-wide text-[9px]">Risk</span>
                <span className={`font-mono font-semibold text-[13px] ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                  +{formatCurrencyCompact(riskAmt, true)}
                </span>
              </span>
            </>
          )}
          <span className={`text-[10px] ${isDarkMode ? 'text-neutral-700' : 'text-slate-300'}`}>→</span>
          <span className="flex items-center gap-1.5">
            <span className="uppercase tracking-wide text-[9px]">Client price</span>
            <span className={`font-mono font-bold text-[14px] ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {formatCurrencyCompact(totals.revenue, true)}
            </span>
          </span>
        </div>
          );
        })()}
      </div>
    );
  };

  // ─── Render: group vendor row ─────────────────────────────────────────────
  const renderGroupVendor = (lineId, vendor) => {
    const expanded = expandedGroups.has(vendor.id);
    const totals = vendorTotals(vendor);
    const subItems = vendor.sub_items || [];
    return (
      <div key={vendor.id} className={`rounded-xl border overflow-hidden ${card}`} data-testid="resource-vendor-group">
        {/* Group header */}
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => toggleGroupExpand(vendor.id)}
            className={`shrink-0 p-0.5 rounded transition-colors ${isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-400 hover:text-slate-700'}`}
            aria-label={expanded ? 'Collapse group' : 'Expand group'}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <Layers className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`} />
          {/* Group name (editable) */}
          <Input
            value={vendor.service_name || ''}
            onChange={e => updateVendorField(lineId, vendor.id, { service_name: e.target.value })}
            placeholder="Supplier / bundle name"
            className={`flex-1 h-8 text-sm font-medium ${inputClass}`}
          />
          {/* Item count + totals */}
          <span className={`text-xs tabular-nums shrink-0 ${muted}`}>
            {subItems.length} item{subItems.length !== 1 ? 's' : ''} · {formatCurrencyCompact(totals.cost, true)}
          </span>
          {/* Default markup for new sub-items */}
          <div className="flex items-center gap-1 shrink-0">
            <label className={`text-[10px] ${muted}`}>Default%</label>
            <Input type="number" min="0" value={vendor.markup_percent ?? 15}
              onChange={e => updateVendorField(lineId, vendor.id, { markup_percent: Math.max(0, parseFloat(e.target.value) || 0) })}
              className={`w-14 h-8 text-xs ${inputClass}`} />
          </div>
          {/* Add sub-item */}
          <Button variant="ghost" size="sm"
            onClick={() => { addSubItem(lineId, vendor.id); setExpandedGroups(prev => new Set(prev).add(vendor.id)); }}
            className={`h-8 px-2 text-xs ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}`}>
            <Plus className="w-3 h-3 mr-1" />Item
          </Button>
          {/* Remove group */}
          <Button variant="ghost" size="sm" onClick={() => removeVendor(lineId, vendor.id)}
            className={`h-8 w-7 p-0 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Sub-items (collapsible) */}
        {expanded && (
          <div className={`border-t ${sectionDivider}`}>
            {subItems.length === 0 ? (
              <p className={`px-4 py-3 text-xs ${muted}`}>
                No items yet. Click "+ Item" to add line items to this bundle.
              </p>
            ) : (
              <div className={`divide-y ${isDarkMode ? 'divide-neutral-800' : 'divide-slate-100'}`}>
                {subItems.map(si => {
                  const siCost = (Number(si.cost) || 0) * (Number(si.quantity) || 1);
                  const siMarkedUp = siCost * (1 + (Number(si.markup_percent) || 0) / 100);
                  const siRiskMult = 1 + (Number(si.risk_percent) || 0) / 100;
                  const siClient = siMarkedUp * siRiskMult;
                  return (
                    <div key={si.id} className="flex flex-wrap items-end gap-2 px-3 py-2.5">
                      {/* Item name */}
                      <div className="flex-1 min-w-[120px]">
                        <label className={`text-[10px] ${muted}`}>Item name</label>
                        <Input value={si.name || ''} onChange={e => updateSubItem(lineId, vendor.id, si.id, { name: e.target.value })}
                          placeholder="e.g. Photography" className={`h-8 text-sm ${inputClass}`} />
                      </div>
                      {/* Cost (SAR) */}
                      <div className="w-[96px]">
                        <label className={`text-[10px] ${muted}`}>Cost (SAR)</label>
                        <Input type="number" min="0" value={si.cost ?? 0}
                          onChange={e => updateSubItem(lineId, vendor.id, si.id, { cost: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className={`h-8 ${inputClass}`} />
                      </div>
                      {/* Qty */}
                      <div className="w-[56px]">
                        <label className={`text-[10px] ${muted}`}>Qty</label>
                        <Input type="number" min="1" value={si.quantity ?? 1}
                          onChange={e => updateSubItem(lineId, vendor.id, si.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className={`h-8 ${inputClass}`} />
                      </div>
                      {/* Unit (label) */}
                      <div className="w-[80px]">
                        <label className={`text-[10px] ${muted}`}>Unit (label)</label>
                        <Input value={si.unit || ''} onChange={e => updateSubItem(lineId, vendor.id, si.id, { unit: e.target.value })}
                          placeholder="e.g. day" className={`h-8 ${inputClass}`} />
                      </div>
                      {/* Markup % — label shows live SAR markup amount */}
                      <div className="w-[108px]">
                        <label className={`text-[10px] whitespace-nowrap ${muted}`}>
                          Markup %
                          {(Number(si.markup_percent) || 0) > 0 && siCost > 0 && (
                            <span className={`ml-1 font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                              · +SAR {formatCurrencyCompact(siCost * (Number(si.markup_percent) || 0) / 100, true)}
                            </span>
                          )}
                        </label>
                        <Input type="number" min="0" value={si.markup_percent ?? 15}
                          onChange={e => updateSubItem(lineId, vendor.id, si.id, { markup_percent: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className={`h-8 w-[60px] ${inputClass}`} />
                      </div>
                      {/* Risk % */}
                      <div className="w-[60px]">
                        <label className={`text-[10px] ${muted}`}>Risk %</label>
                        <Input type="number" min="0" max="100" step="1"
                          value={si.risk_percent ?? 0}
                          onChange={e => updateSubItem(lineId, vendor.id, si.id, { risk_percent: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className={`h-8 ${inputClass} ${(si.risk_percent ?? 0) > 0 ? (isDarkMode ? 'border-amber-500/50' : 'border-amber-400') : ''}`} />
                      </div>
                      {/* Client price read-only */}
                      <div className="shrink-0 self-end pb-1">
                        <span className={`text-[11px] tabular-nums font-mono font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          → {formatCurrencyCompact(siClient, true)}
                        </span>
                      </div>
                      {/* Remove sub-item */}
                      <Button variant="ghost" size="sm" onClick={() => removeSubItem(lineId, vendor.id, si.id)}
                        className={`h-8 w-7 p-0 self-end ${isDarkMode ? 'text-neutral-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Group totals strip */}
            <div className={`flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 border-t text-[11px] tabular-nums ${sectionDivider} ${muted}`}>
              <span className="flex items-center gap-1.5">
                <span className="uppercase tracking-wide text-[9px]">Bundle cost</span>
                <span className={`font-mono font-semibold ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                  {formatCurrencyCompact(totals.cost, true)}
                </span>
              </span>
              <span className={`text-[10px] ${isDarkMode ? 'text-neutral-700' : 'text-slate-300'}`}>→</span>
              <span className="flex items-center gap-1.5">
                <span className="uppercase tracking-wide text-[9px]">Markup</span>
                <span className={`font-mono font-semibold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  +{formatCurrencyCompact(totals.revenue - totals.cost, true)}
                </span>
              </span>
              <span className={`text-[10px] ${isDarkMode ? 'text-neutral-700' : 'text-slate-300'}`}>→</span>
              <span className="flex items-center gap-1.5">
                <span className="uppercase tracking-wide text-[9px]">Client total</span>
                <span className={`font-mono font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {formatCurrencyCompact(totals.revenue, true)}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render: compact empty section (no vendors) ──────────────────────────
  const renderEmptySection = ({ lineId, label, isPassThrough }) => (
    <div
      key={lineId}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${card}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isPassThrough ? (
          <Badge variant="outline" className={`text-[9px] ${isDarkMode ? 'border-amber-500/30 text-amber-300' : 'border-amber-200 text-amber-700'}`}>
            Pass-through
          </Badge>
        ) : (
          <span className={`text-sm font-medium truncate ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
            {label}
          </span>
        )}
        <span className={`text-[11px] ${muted}`}>· no vendors</span>
        {/* Show add-on badge even when no vendors */}
        {!isPassThrough && (addonsByParent[lineId]?.length || 0) > 0 && (
          <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
            isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Puzzle className="w-2.5 h-2.5" />
            {addonsByParent[lineId].length} add-on{addonsByParent[lineId].length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => openAddDialog(lineId)}
        className={`h-7 px-2 text-xs gap-1 shrink-0 ${isDarkMode ? 'text-amber-300 hover:bg-amber-500/15' : 'text-amber-700 hover:bg-amber-50'}`}
      >
        <Plus className="w-3 h-3" />Add vendor
      </Button>
    </div>
  );

  // ─── Render: service section ──────────────────────────────────────────────
  const renderServiceSection = (section) => {
    const { lineId, label, vendors, isPassThrough } = section;
    if (vendors.length === 0) return renderEmptySection(section);
    const bulkVal = bulkMarkup[lineId] ?? '';
    const addonCount = !isPassThrough ? (addonsByParent[lineId]?.length || 0) : 0;
    return (
      <div key={lineId} className={`rounded-xl border overflow-hidden ${card}`}>
        {/* Section header */}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${sectionDivider} ${
          isDarkMode ? 'bg-neutral-900/60' : 'bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {isPassThrough ? (
              <Badge variant="outline" className={`text-[9px] ${isDarkMode ? 'border-amber-500/30 text-amber-300' : 'border-amber-200 text-amber-700'}`}>
                Pass-through
              </Badge>
            ) : (
              <span className={`text-sm font-semibold truncate ${isDarkMode ? 'text-neutral-100' : 'text-slate-800'}`}>
                {label}
              </span>
            )}
            {isPassThrough && (
              <span className={`text-xs truncate ${muted}`}>{label}</span>
            )}
            {vendors.length > 0 && (
              <span className={`text-xs ${muted}`}>({vendors.length})</span>
            )}
            {/* Compact add-on badge — managed in Add-ons step */}
            {addonCount > 0 && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <Puzzle className="w-2.5 h-2.5" />
                {addonCount} add-on{addonCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Bulk markup + Add button */}
          <div className="flex items-center gap-2 shrink-0">
            {vendors.length > 0 && (
              <div className="flex items-center gap-1">
                <label className={`text-[10px] ${muted}`}>Set all markup:</label>
                <Input
                  type="number"
                  min="0"
                  value={bulkVal}
                  onChange={e => setBulkMarkup(prev => ({ ...prev, [lineId]: e.target.value }))}
                  placeholder="0"
                  className={`w-14 h-7 text-xs ${inputClass}`}
                />
                <span className={`text-[10px] ${muted}`}>%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { applyBulkMarkup(lineId, bulkVal); setBulkMarkup(prev => ({ ...prev, [lineId]: '' })); }}
                  className={`h-7 px-2 text-xs ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'}`}
                  disabled={!bulkVal}
                >
                  <Check className="w-3 h-3 mr-1" />Apply
                </Button>
              </div>
            )}
            <Button
              size="sm"
              onClick={() => openAddDialog(lineId)}
              className={`h-7 px-2 text-xs gap-1 ${isDarkMode ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
              variant="ghost"
            >
              <Plus className="w-3 h-3" />Add vendor
            </Button>
          </div>
        </div>

        {/* Vendor rows */}
        <div className="p-3 space-y-2">
          {vendors.map(v =>
            v.is_group ? renderGroupVendor(lineId, v) : renderSimpleVendor(lineId, v)
          )}
        </div>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  const kpiTiles = [
    { label: 'Vendor cost', value: formatCurrencyCompact(kpis.totalCost, true) },
    { label: 'Client / billed', value: formatCurrencyCompact(kpis.totalRevenue, true) },
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
      {/* ── Add Vendor Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className={`sm:max-w-sm ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>Add Vendor</DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-neutral-500' : ''}>
              Choose a service to link this vendor to, then configure it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Service picker */}
            <div>
              <Label className={`text-xs ${muted}`}>Link to service</Label>
              <Select value={addTargetLineId} onValueChange={setAddTargetLineId}>
                <SelectTrigger className={`mt-1.5 ${inputClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {linkableLines.map(l => (
                    <SelectItem key={l.id} value={l.id}>{lineLabel(l)}</SelectItem>
                  ))}
                  <SelectItem value={UNASSIGNED}>Unassigned (pass-through)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vendor type */}
            <div>
              <Label className={`text-xs ${muted}`}>Vendor type</Label>
              <div className="flex gap-2 mt-1.5">
                {[
                  { value: 'simple', label: 'Simple' },
                  { value: 'group', label: 'Group / bundle' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAddVendorType(opt.value)}
                    className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                      addVendorType === opt.value
                        ? isDarkMode
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-semibold'
                          : 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                        : isDarkMode
                          ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {opt.value === 'group' && <Layers className="w-3 h-3 inline mr-1.5 -mt-px" />}
                    {opt.label}
                  </button>
                ))}
              </div>
              {addVendorType === 'group' && (
                <p className={`text-[10px] mt-1.5 ${muted}`}>
                  A group lets you add multiple sub-items (e.g. Photography, Catering, AV) each with their own markup.
                </p>
              )}
            </div>

            {/* Vendor name */}
            <div>
              <div className="flex items-center justify-between">
                <Label className={`text-xs ${muted}`}>Vendor name</Label>
                {addVendorType === 'simple' && onQuickCreateVendorService && !quickCreateOpen && (
                  <button
                    type="button"
                    onClick={() => { setQuickCreateName(''); setQuickCreateOpen(true); }}
                    className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      isDarkMode
                        ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                        : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    <Plus className="w-2.5 h-2.5" />New service
                  </button>
                )}
              </div>

              {/* Quick-create inline form */}
              {quickCreateOpen ? (
                <div className={`mt-1.5 flex items-center gap-1.5 rounded-lg border p-2 ${
                  isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50'
                }`}>
                  <Input
                    autoFocus
                    value={quickCreateName}
                    onChange={e => setQuickCreateName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleQuickCreate();
                      if (e.key === 'Escape') { setQuickCreateOpen(false); setQuickCreateName(''); }
                    }}
                    placeholder="New service name…"
                    className={`flex-1 h-8 text-sm ${inputClass}`}
                  />
                  <Button
                    size="sm"
                    onClick={handleQuickCreate}
                    disabled={!quickCreateName.trim() || quickCreateSaving}
                    className={`h-8 px-2.5 shrink-0 ${isDarkMode ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                  >
                    {quickCreateSaving ? '…' : <Check className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setQuickCreateOpen(false); setQuickCreateName(''); }}
                    className={`h-8 w-8 p-0 shrink-0 ${isDarkMode ? 'text-neutral-500 hover:text-neutral-300' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  {allPresets.length > 0 ? (
                    <>
                      <Select value={addVendorName} onValueChange={val => {
                        setAddVendorName(val);
                        const p = findVendorPresetByName(allPresets, val);
                        if (p?.default_markup_percent != null) setAddVendorMarkup(p.default_markup_percent);
                      }}>
                        <SelectTrigger className={`mt-1.5 ${inputClass}`}>
                          <SelectValue placeholder="Select from catalog" />
                        </SelectTrigger>
                        <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                          {allPresets.map(p => (
                            <SelectItem key={p.id || p.name} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Only show free-text input when nothing is selected from the dropdown */}
                      {!findVendorPresetByName(allPresets, addVendorName) && (
                        <Input
                          value={addVendorName}
                          onChange={e => setAddVendorName(e.target.value)}
                          placeholder={addVendorType === 'group' ? 'Or type bundle name' : 'Or type vendor name'}
                          className={`mt-1.5 ${inputClass}`}
                        />
                      )}
                      {/* Remove the selected preset from the catalog */}
                      {onDeleteVendorService && (() => {
                        const sel = findVendorPresetByName(allPresets, addVendorName);
                        if (!sel?.id) return null;
                        return (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Remove "${sel.name}" from the vendor catalog? This cannot be undone.`)) return;
                              await onDeleteVendorService(sel.id, sel.name);
                              setAddVendorName('');
                            }}
                            className={`mt-2 inline-flex items-center gap-1 text-[10px] ${
                              isDarkMode ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'
                            }`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Remove "{sel.name}" from catalog
                          </button>
                        );
                      })()}
                    </>
                  ) : (
                    <Input
                      value={addVendorName}
                      onChange={e => setAddVendorName(e.target.value)}
                      placeholder={addVendorType === 'group' ? 'Type bundle name' : 'Type vendor name'}
                      className={`mt-1.5 ${inputClass}`}
                    />
                  )}
                </>
              )}
            </div>

            {/* Default markup */}
            <div>
              <Label className={`text-xs ${muted}`}>
                {addVendorType === 'group' ? 'Default markup % (for sub-items)' : 'Markup %'}
              </Label>
              <Input type="number" min="0" value={addVendorMarkup}
                onChange={e => setAddVendorMarkup(Math.max(0, parseFloat(e.target.value) || 0))}
                className={`mt-1.5 ${inputClass}`} />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)} className={`flex-1 ${isDarkMode ? 'border-neutral-700 text-neutral-300' : ''}`}>
                Cancel
              </Button>
              <Button
                onClick={commitAddVendor}
                disabled={!addVendorName.trim()}
                className={`flex-1 ${isDarkMode ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
              >
                Add vendor →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    Vendors grouped by the service they support. Groups let you add sub-items with individual markups.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatesOpen(p => !p)}
                  className={`gap-1.5 ${isDarkMode ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'border-slate-200 text-slate-600'}`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Templates
                </Button>
                <Button
                  onClick={() => openAddDialog(linkableLines[0]?.id ?? UNASSIGNED)}
                  className={`font-semibold shadow-sm ${isDarkMode ? 'bg-amber-400 text-neutral-950 hover:bg-amber-300' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                  data-testid="add-vendor-btn"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add vendor
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {kpiTiles.map(t => (
                <div key={t.label} className={`rounded-xl border p-3 ${card} ${
                  t.accent ? (isDarkMode ? 'border-amber-500/30' : 'border-amber-200') : ''
                }`}>
                  <p className={`text-[10px] uppercase tracking-wider ${muted}`}>{t.label}</p>
                  <p className={`text-base font-semibold tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.value}</p>
                  {t.hint && <p className={`text-[10px] ${muted}`}>{t.hint}</p>}
                </div>
              ))}
            </div>

            {/* Templates panel */}
            {templatesOpen && (
              <div className={`rounded-xl border p-4 space-y-4 ${isDarkMode ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-100 bg-indigo-50/50'}`}>
                <div className="flex items-center gap-2">
                  <LayoutTemplate className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Vendor Templates</span>
                </div>

                {/* Saved templates list */}
                {vendorGroupTemplates.length === 0 ? (
                  <p className={`text-xs ${muted}`}>No templates saved yet. Save your current vendor list below.</p>
                ) : (
                  <div className={`rounded-lg border divide-y ${isDarkMode ? 'border-neutral-800 divide-neutral-800' : 'border-slate-200 divide-slate-100'}`}>
                    {/* Load target picker */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className={`text-[10px] uppercase tracking-wider ${muted}`}>Load into:</span>
                      <Select value={loadTargetLineId} onValueChange={setLoadTargetLineId}>
                        <SelectTrigger className={`h-7 text-xs flex-1 ${inputClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                          {linkableLines.map(l => (
                            <SelectItem key={l.id} value={l.id}>{lineLabel(l)}</SelectItem>
                          ))}
                          <SelectItem value={UNASSIGNED}>Unassigned (pass-through)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {vendorGroupTemplates.map(tpl => (
                      <div key={tpl.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>{tpl.name}</p>
                          <p className={`text-[10px] ${muted}`}>{(tpl.vendors || []).length} vendor{(tpl.vendors || []).length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(tpl)}
                            className={`h-7 text-xs ${isDarkMode ? 'border-neutral-700 text-neutral-300' : ''}`}>
                            Load
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onDeleteVendorTemplate?.(tpl.id)}
                            className={`h-7 w-7 p-0 ${isDarkMode ? 'text-neutral-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save template */}
                {hasAnyVendors && (
                  <div className={`flex items-center gap-2 pt-2 border-t ${sectionDivider}`}>
                    <Input
                      value={saveTemplateName}
                      onChange={e => setSaveTemplateName(e.target.value)}
                      placeholder="Template name..."
                      className={`flex-1 h-8 text-xs ${inputClass}`}
                      onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveTemplate}
                      disabled={!saveTemplateName.trim() || savingTemplate}
                      className={`h-8 px-3 gap-1 shrink-0 ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'}`}
                      variant="ghost"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingTemplate ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Template preferred-vendor suggestions */}
            {preferredVendors.length > 0 && !hasAnyVendors && (
              <div className={`rounded-xl border p-3 ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Suggested from template
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preferredVendors.map((pv, i) => {
                    const name = pv.name || pv.service_name || '';
                    if (!name) return null;
                    return (
                      <button key={i} type="button" title={`Add ${name} as vendor`}
                        onClick={() => addVendorToLine(linkableLines[0]?.id ?? UNASSIGNED, presetToLineVendor(
                          { id: pv.id || null, name, default_markup_percent: pv.default_markup_percent ?? 15, default_cost: pv.default_cost ?? null }, {}
                        ))}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          isDarkMode ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/15' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <Plus className="w-3 h-3" />{name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Service sections (grouped layout) — each renders its vendor + add-on areas */}
            {serviceSections.length === 0 ? (
              <div className={`text-center py-12 rounded-xl border border-dashed ${isDarkMode ? 'border-neutral-800 text-neutral-500' : 'border-slate-200 text-slate-500'}`}>
                <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-1">No services yet.</p>
                <p className="text-xs">Add a service in the Portfolio step, then attach vendors and add-ons here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceSections.map(renderServiceSection)}
              </div>
            )}

            <p className={`text-[11px] ${muted}`}>
              Vendors are priced through the service they&rsquo;re linked to. Manage add-ons in the <strong>Add-ons</strong> step. &ldquo;Unassigned&rdquo; vendors are billed as pass-through costs.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
