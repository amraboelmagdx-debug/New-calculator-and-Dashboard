import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { percentOf } from '@/lib/productWorkspaceUtils';

function VendorEditorRows({ vendors, vendorServices, isDarkMode, onAddVendor, onUpdateVendor, onRemoveVendor }) {
  const inputClass = isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-300';
  return (
    <div className="space-y-2">
      {vendors.map((v, index) => (
        <div key={v.id || index} className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Vendor / service</label>
            {vendorServices?.length ? (
              <Select
                value={v.service_name || ''}
                onValueChange={value => {
                  const svc = vendorServices.find(s => s.name === value);
                  onUpdateVendor(index, 'service_name', value);
                  if (svc) {
                    onUpdateVendor(index, 'service_id', svc.id || '');
                    onUpdateVendor(index, 'markup_percent', svc.default_markup_percent ?? v.markup_percent ?? 15);
                  }
                }}
              >
                <SelectTrigger className={`h-9 ${inputClass}`}>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {vendorServices.map(svc => (
                    <SelectItem key={svc.id || svc.name} value={svc.name}>{svc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={v.service_name || ''}
                onChange={e => onUpdateVendor(index, 'service_name', e.target.value)}
                placeholder="Vendor name"
                className={`h-9 ${inputClass}`}
              />
            )}
          </div>
          <div className="w-[96px]">
            <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Cost</label>
            <Input
              type="number"
              min="0"
              value={v.cost ?? v.unit_cost ?? 0}
              onChange={e => onUpdateVendor(index, 'cost', Math.max(0, parseFloat(e.target.value) || 0))}
              className={`h-9 ${inputClass}`}
            />
          </div>
          <div className="w-[80px]">
            <label className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-400'}`}>Markup %</label>
            <Input
              type="number"
              min="0"
              value={v.markup_percent ?? 0}
              onChange={e => onUpdateVendor(index, 'markup_percent', Math.max(0, parseFloat(e.target.value) || 0))}
              className={`h-9 ${inputClass}`}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveVendor(index)}
            className={`h-9 w-8 p-0 ${isDarkMode ? 'text-neutral-500 hover:text-red-400' : 'text-slate-400 hover:text-red-600'}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddVendor}
        className={isDarkMode ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Add vendor
      </Button>
    </div>
  );
}

export default function VendorTabPanel({
  vendors,
  line,
  vendorServices,
  isDarkMode,
  onAddVendor,
  onUpdateVendor,
  onRemoveVendor,
}) {
  const vendorCost = Number(line?.vendor_cost) || 0;
  const contributionPct = percentOf(vendorCost, line?.cost);
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';
  const border = isDarkMode ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="pt-3 space-y-4" data-testid="vendor-tab-panel">
      <div className={`rounded-lg border p-3 flex flex-wrap gap-x-4 gap-y-1 text-sm ${border} ${isDarkMode ? 'bg-neutral-900/30' : 'bg-white'}`}>
        <span className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>
          <strong>{vendors.length}</strong> vendor{vendors.length !== 1 ? 's' : ''}
        </span>
        <span className={muted}>·</span>
        <span className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>
          {formatCurrency(vendorCost, false)} cost
        </span>
        <span className={muted}>·</span>
        <span className={muted}>
          {contributionPct != null ? `${contributionPct}% of product cost` : '— contribution (run calc)'}
        </span>
      </div>

      {vendors.length === 0 && (
        <p className={`text-xs ${muted}`}>No vendors on this product. Add an external cost line if needed.</p>
      )}

      <VendorEditorRows
        vendors={vendors}
        vendorServices={vendorServices}
        isDarkMode={isDarkMode}
        onAddVendor={onAddVendor}
        onUpdateVendor={onUpdateVendor}
        onRemoveVendor={onRemoveVendor}
      />
    </div>
  );
}
