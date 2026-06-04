import { useMemo, useState } from 'react';
import { Plus, Search, Briefcase, LayoutTemplate, History, Layers, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PATHS = [
  { id: 'catalog', label: 'From Catalog', icon: LayoutTemplate },
  { id: 'template', label: 'From Template', icon: History },
  { id: 'standalone', label: 'Standalone', icon: Briefcase },
  { id: 'blueprint', label: 'Blueprint', icon: Layers, disabled: true },
];

function catalogServiceName(product) {
  return product.service_name || product.product_name || '';
}

function catalogServiceFamily(product) {
  return product.service_family || product.section_name || 'General';
}

export default function AddServiceDialog({
  open,
  onOpenChange,
  isDarkMode,
  filteredProductsCatalog = [],
  selectedSection,
  setSelectedSection,
  sectionOptions = [],
  recentServices = [],
  onSelectCatalog,
  onSelectStandalone,
  scopeTemplates = [],
  onSelectTemplate,
}) {
  const [path, setPath] = useState('catalog');
  const [search, setSearch] = useState('');

  const catalogResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (filteredProductsCatalog || []).filter(p => {
      if (!term) return true;
      const name = catalogServiceName(p).toLowerCase();
      const fam = catalogServiceFamily(p).toLowerCase();
      return name.includes(term) || fam.includes(term);
    });
  }, [filteredProductsCatalog, search]);

  const recentMatches = useMemo(() => {
    if (!recentServices.length) return [];
    return recentServices
      .map(name => (filteredProductsCatalog || []).find(p => catalogServiceName(p) === name))
      .filter(Boolean)
      .slice(0, 5);
  }, [recentServices, filteredProductsCatalog]);

  const handlePick = name => {
    onSelectCatalog?.(name);
    onOpenChange(false);
  };

  const handleStandalone = () => {
    onSelectStandalone?.();
    onOpenChange(false);
  };

  const handleTemplate = id => {
    onSelectTemplate?.(id);
    onOpenChange(false);
  };

  const panelBorder = isDarkMode ? 'border-neutral-800' : 'border-slate-200';
  const rowHover = isDarkMode ? 'hover:bg-neutral-800/70' : 'hover:bg-slate-50';
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-2xl ${isDarkMode ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-slate-200'}`}
        data-testid="add-service-dialog"
      >
        <DialogHeader>
          <DialogTitle>Add a service</DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-neutral-400' : 'text-slate-500'}>
            Pick from your catalog, reuse a template, or build a standalone line.
          </DialogDescription>
        </DialogHeader>

        <div className={`flex gap-1 p-0.5 rounded-lg ${isDarkMode ? 'bg-neutral-950' : 'bg-slate-100'}`} role="tablist">
          {PATHS.map(({ id, label, icon: Icon, disabled }) => {
            const active = path === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => !disabled && setPath(id)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                  disabled
                    ? `${muted} opacity-60 cursor-not-allowed`
                    : active
                      ? isDarkMode
                        ? 'bg-neutral-800 text-white'
                        : 'bg-white text-slate-900 shadow-sm'
                      : isDarkMode
                        ? 'text-neutral-400 hover:text-neutral-200'
                        : 'text-slate-500 hover:text-slate-800'
                }`}
                data-testid={`add-service-path-${id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {disabled && (
                  <Badge className={`ml-1 text-[9px] px-1 py-0 ${isDarkMode ? 'bg-neutral-800 text-neutral-500' : 'bg-slate-200 text-slate-500'}`}>
                    Soon
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {path === 'catalog' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className={`h-9 w-[170px] text-sm ${isDarkMode ? 'bg-neutral-950 border-neutral-700 text-neutral-200' : 'bg-white border-slate-300'}`}>
                  <SelectValue placeholder="Family" />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-slate-200'}>
                  {sectionOptions.map(section => (
                    <SelectItem key={section} value={section}>
                      {section === 'all' ? 'All families' : section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted}`} />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search services"
                  className={`h-9 pl-8 text-sm ${isDarkMode ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-slate-300'}`}
                  data-testid="add-service-search"
                />
              </div>
            </div>

            {recentMatches.length > 0 && !search.trim() && (
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${muted}`}>
                  <Clock className="w-3 h-3" /> Recently used
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recentMatches.map(p => {
                    const name = catalogServiceName(p);
                    return (
                      <button
                        key={`recent-${name}`}
                        type="button"
                        onClick={() => handlePick(name)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          isDarkMode
                            ? 'border-neutral-700 text-neutral-200 hover:bg-neutral-800'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`rounded-lg border max-h-[40vh] overflow-y-auto ${panelBorder}`}>
              {catalogResults.length === 0 ? (
                <p className={`text-sm text-center py-10 ${muted}`}>No matching services.</p>
              ) : (
                catalogResults.map(p => {
                  const name = catalogServiceName(p);
                  const fam = catalogServiceFamily(p);
                  return (
                    <button
                      key={`${fam}-${name}`}
                      type="button"
                      onClick={() => handlePick(name)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 text-left border-b last:border-b-0 transition-colors ${panelBorder} ${rowHover}`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{name}</p>
                        <p className={`text-[11px] ${muted}`}>{fam}</p>
                      </div>
                      <Plus className={`w-4 h-4 shrink-0 ${muted}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {path === 'template' && (
          <div className={`rounded-lg border max-h-[44vh] overflow-y-auto ${panelBorder}`}>
            {(scopeTemplates || []).length === 0 ? (
              <p className={`text-sm text-center py-10 ${muted}`}>No saved templates yet.</p>
            ) : (
              scopeTemplates.map(t => {
                const productCount = (t.default_pricing_products || []).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplate(t.id)}
                    disabled={productCount === 0}
                    className={`flex items-center justify-between w-full px-3 py-3 text-left border-b last:border-b-0 transition-colors ${panelBorder} ${
                      productCount === 0 ? 'opacity-60 cursor-not-allowed' : rowHover
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.name}</p>
                      <p className={`text-[11px] truncate ${muted}`}>{t.description || 'No description'}</p>
                    </div>
                    <Badge className={`shrink-0 text-[10px] ${isDarkMode ? 'badge-neutral' : 'bg-slate-100 text-slate-600'}`}>
                      {productCount} product{productCount === 1 ? '' : 's'}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        )}

        {path === 'standalone' && (
          <div className={`rounded-lg border p-6 text-center ${panelBorder}`}>
            <Briefcase className={`w-10 h-10 mx-auto mb-3 ${muted}`} />
            <p className={`text-sm mb-1 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>Standalone service</p>
            <p className={`text-xs mb-4 ${muted}`}>
              Create a custom line not tied to the catalog. You&rsquo;ll name it and add team or vendors manually.
            </p>
            <Button onClick={handleStandalone} data-testid="add-service-create-standalone">
              <Plus className="w-4 h-4 mr-1.5" />
              Create standalone service
            </Button>
          </div>
        )}

        {path === 'blueprint' && (
          <div className={`rounded-lg border p-6 text-center ${panelBorder}`}>
            <Layers className={`w-10 h-10 mx-auto mb-3 ${muted}`} />
            <p className={`text-sm mb-1 ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>Service Blueprints</p>
            <p className={`text-xs ${muted}`}>
              Reusable bundles of team, vendors, risk, and margin. Coming in a future release.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
