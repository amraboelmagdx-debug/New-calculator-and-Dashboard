import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { quickCreateVendorService } from '@/lib/api';

export default function VendorRow({ 
  vendor, 
  index, 
  vendorServices, 
  onUpdate, 
  onRemove,
  onServicesRefresh,
  darkMode = false
}) {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', category: '', default_markup_percent: 15 });
  const [saving, setSaving] = useState(false);

  // Dark mode classes
  const cardClass = darkMode 
    ? "p-4 rounded-lg bg-neutral-800/50 border border-neutral-700" 
    : "p-4 rounded-lg bg-white border border-slate-200 shadow-sm";
  const inputClass = darkMode
    ? "bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 font-mono"
    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 font-mono";
  const selectTriggerClass = darkMode
    ? "bg-neutral-900 border-neutral-700 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const selectContentClass = darkMode
    ? "bg-neutral-900 border-neutral-700"
    : "bg-white border-slate-200";
  const labelClass = darkMode
    ? "text-xs text-neutral-400"
    : "text-xs text-slate-500";
  const textClass = darkMode ? "text-white" : "text-slate-900";

  // Calculate totals with quantity
  const quantity = vendor.quantity || 1;
  const unitCost = vendor.unit_cost || vendor.cost || 0;
  const totalCost = unitCost * quantity;
  const clientPrice = totalCost * (1 + (vendor.markup_percent || 0) / 100);
  const markupAmount = clientPrice - totalCost;

  const handleAddVendor = async () => {
    if (!newVendor.name) {
      toast.error('Please enter a service name');
      return;
    }
    
    setSaving(true);
    try {
      const created = await quickCreateVendorService(newVendor);
      toast.success(`Vendor service "${created.name}" created`);
      setShowAddVendor(false);
      setNewVendor({ name: '', category: '', default_markup_percent: 15 });
      
      // Refresh services and select the new one
      if (onServicesRefresh) {
        await onServicesRefresh();
      }
      onUpdate('service_id', created.id);
      onUpdate('service_name', created.name);
      onUpdate('markup_percent', created.default_markup_percent);
    } catch (error) {
      toast.error('Failed to create vendor service');
    } finally {
      setSaving(false);
    }
  };

  const handleServiceChange = (serviceId) => {
    if (serviceId === '__add_new__') {
      setShowAddVendor(true);
      return;
    }
    
    const service = vendorServices.find(s => s.id === serviceId);
    if (service) {
      onUpdate('service_id', serviceId);
      onUpdate('service_name', service.name);
      onUpdate('markup_percent', service.default_markup_percent);
    }
  };

  return (
    <>
      <div className={`${cardClass}`} data-testid={`vendor-${index}`}>
        {/* Row 1: Service selection */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <Select value={vendor.service_id || ''} onValueChange={handleServiceChange}>
              <SelectTrigger className={selectTriggerClass} data-testid={`vendor-select-${index}`}>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent className={selectContentClass}>
                {vendorServices.map(service => (
                  <SelectItem key={service.id} value={service.id} className={darkMode ? "text-neutral-300" : "text-slate-700"}>
                    {service.name}
                  </SelectItem>
                ))}
                <SelectItem value="__add_new__" className={darkMode ? "text-blue-400 font-medium" : "text-slate-900 font-medium"}>
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add new vendor service...
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRemove}
            className={darkMode ? "text-neutral-500 hover:text-red-400" : "text-slate-400 hover:text-red-500"}
            data-testid={`remove-vendor-${index}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Row 2: Quantity, Unit Cost, Total, Markup, Client Price */}
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-2">
            <Label className={labelClass}>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={vendor.quantity || 1}
              onChange={(e) => onUpdate('quantity', parseInt(e.target.value) || 1)}
              placeholder="1"
              className={`mt-1 ${inputClass}`}
              data-testid={`vendor-qty-${index}`}
            />
          </div>
          <div className="col-span-2">
            <Label className={labelClass}>Unit Cost</Label>
            <Input
              type="number"
              value={vendor.unit_cost || vendor.cost || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                onUpdate('unit_cost', val);
                onUpdate('cost', val); // Keep legacy field updated
              }}
              placeholder="SAR"
              className={`mt-1 ${inputClass}`}
              data-testid={`vendor-unit-cost-${index}`}
            />
          </div>
          <div className="col-span-2">
            <Label className={labelClass}>Total Cost</Label>
            <div className={`text-sm font-mono px-3 py-2 rounded-md border mt-1 ${darkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-200 text-slate-600'}`}>
              {formatCurrency(totalCost, false)}
            </div>
          </div>
          <div className="col-span-2">
            <Label className={labelClass}>Markup %</Label>
            <Input
              type="number"
              value={vendor.markup_percent || ''}
              onChange={(e) => onUpdate('markup_percent', parseFloat(e.target.value) || 0)}
              placeholder="%"
              className={`mt-1 ${inputClass}`}
              data-testid={`vendor-markup-${index}`}
            />
          </div>
          <div className="col-span-2">
            <Label className={labelClass}>Markup (SAR)</Label>
            <div
              className={`text-sm font-mono px-3 py-2 rounded-md border mt-1 ${darkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-slate-200 text-slate-600'}`}
              data-testid={`vendor-markup-amount-${index}`}
            >
              {formatCurrency(markupAmount, false)}
            </div>
          </div>
          <div className="col-span-2">
            <Label className={labelClass}>Client Price</Label>
            <div className={`text-lg font-mono font-bold mt-1 ${textClass}`}>
              {formatCurrency(clientPrice, false)}
            </div>
          </div>
        </div>
      </div>

      {/* Add New Vendor Dialog */}
      <Dialog open={showAddVendor} onOpenChange={setShowAddVendor}>
        <DialogContent className={darkMode ? '' : 'bg-white border-slate-200'} data-testid="add-vendor-dialog">
          <DialogHeader>
            <DialogTitle className={darkMode ? '' : 'text-slate-900'}>Add New Vendor Service</DialogTitle>
            <DialogDescription className={darkMode ? '' : 'text-slate-500'}>Create a new vendor service to add to the list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className={darkMode ? '' : 'text-slate-700'}>Service Name</Label>
              <Input
                value={newVendor.name}
                onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Photography"
                className={darkMode ? '' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}
                data-testid="new-vendor-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={darkMode ? '' : 'text-slate-700'}>Category</Label>
                <Input
                  value={newVendor.category}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Production"
                  className={darkMode ? '' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}
                  data-testid="new-vendor-category"
                />
              </div>
              <div className="space-y-2">
                <Label className={darkMode ? '' : 'text-slate-700'}>Default Markup %</Label>
                <Input
                  type="number"
                  value={newVendor.default_markup_percent || ''}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, default_markup_percent: parseFloat(e.target.value) || 0 }))}
                  className={darkMode ? '' : 'bg-white border-slate-200 text-slate-900'}
                  data-testid="new-vendor-markup"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVendor(false)} className={darkMode ? '' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}>Cancel</Button>
            <Button onClick={handleAddVendor} disabled={saving} className={darkMode ? '' : 'bg-amber-600 hover:bg-amber-700 text-white'} data-testid="save-new-vendor">
              {saving ? 'Saving...' : 'Add Vendor Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
