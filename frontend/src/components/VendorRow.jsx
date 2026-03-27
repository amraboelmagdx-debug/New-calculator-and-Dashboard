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
  onServicesRefresh 
}) {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', category: '', default_markup_percent: 15 });
  const [saving, setSaving] = useState(false);

  const clientPrice = (vendor.cost || 0) * (1 + (vendor.markup_percent || 0) / 100);

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
      <div className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg bg-slate-50 border border-slate-100" data-testid={`vendor-${index}`}>
        <div className="col-span-4">
          <Select value={vendor.service_id || ''} onValueChange={handleServiceChange}>
            <SelectTrigger data-testid={`vendor-select-${index}`}>
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {vendorServices.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
              <SelectItem value="__add_new__" className="text-indigo-600 font-medium">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add new vendor service...
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3">
          <Input
            type="number"
            value={vendor.cost || ''}
            onChange={(e) => onUpdate('cost', parseFloat(e.target.value) || 0)}
            placeholder="Cost (SAR)"
            data-testid={`vendor-cost-${index}`}
          />
        </div>
        <div className="col-span-2">
          <Input
            type="number"
            value={vendor.markup_percent || ''}
            onChange={(e) => onUpdate('markup_percent', parseFloat(e.target.value) || 0)}
            placeholder="Markup %"
            data-testid={`vendor-markup-${index}`}
          />
        </div>
        <div className="col-span-2">
          <div className="text-sm font-mono font-medium text-slate-900">
            {formatCurrency(clientPrice, false)}
          </div>
          <div className="text-xs text-slate-400">
            +{formatCurrency(clientPrice - (vendor.cost || 0), false)} markup
          </div>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500"
            data-testid={`remove-vendor-${index}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add New Vendor Dialog */}
      <Dialog open={showAddVendor} onOpenChange={setShowAddVendor}>
        <DialogContent data-testid="add-vendor-dialog">
          <DialogHeader>
            <DialogTitle>Add New Vendor Service</DialogTitle>
            <DialogDescription>Create a new vendor service to add to the list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                value={newVendor.name}
                onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Photography"
                data-testid="new-vendor-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={newVendor.category}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Production"
                  data-testid="new-vendor-category"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Markup %</Label>
                <Input
                  type="number"
                  value={newVendor.default_markup_percent || ''}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, default_markup_percent: parseFloat(e.target.value) || 0 }))}
                  data-testid="new-vendor-markup"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVendor(false)}>Cancel</Button>
            <Button onClick={handleAddVendor} disabled={saving} data-testid="save-new-vendor">
              {saving ? 'Saving...' : 'Add Vendor Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
