import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { getPricingGuidelines } from '@/lib/api';
import { formatPercent } from '@/lib/utils';

export default function PricingGuidelinesPanel({ currentMargin, dealSize = 0, category = 'general' }) {
  const [isOpen, setIsOpen] = useState(true);
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuidelines();
  }, []);

  const loadGuidelines = async () => {
    try {
      const data = await getPricingGuidelines();
      setGuidelines(data);
    } catch (error) {
      console.error('Failed to load pricing guidelines', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine which guideline applies based on deal size
  const getApplicableGuideline = () => {
    // First try to find category-specific guideline
    let match = guidelines.find(g => 
      g.is_active && 
      g.category === category &&
      dealSize >= (g.deal_size_min || 0) && 
      dealSize <= (g.deal_size_max || Infinity)
    );
    
    // Fall back to general guideline by deal size
    if (!match) {
      match = guidelines.find(g => 
        g.is_active && 
        g.category === 'general' &&
        dealSize >= (g.deal_size_min || 0) && 
        dealSize <= (g.deal_size_max || Infinity)
      );
    }
    
    return match;
  };

  const applicableGuideline = getApplicableGuideline();

  // Get margin status
  const getMarginStatus = (margin, guideline) => {
    if (!guideline) return { status: 'unknown', color: 'slate', icon: Info };
    
    if (margin >= guideline.premium_margin) {
      return { status: 'Premium', color: 'emerald', icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    } else if (margin >= guideline.target_margin) {
      return { status: 'Healthy', color: 'green', icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    } else if (margin >= guideline.min_margin) {
      return { status: 'Acceptable', color: 'amber', icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    } else {
      return { status: 'Below Min', color: 'red', icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    }
  };

  const marginStatus = getMarginStatus(currentMargin, applicableGuideline);
  const StatusIcon = marginStatus.icon;

  // Group guidelines by deal size
  const byDealSize = guidelines.filter(g => g.category === 'general' && g.is_active).sort((a, b) => (a.deal_size_min || 0) - (b.deal_size_min || 0));
  const byCategory = guidelines.filter(g => g.category !== 'general' && g.is_active);

  if (loading) {
    return (
      <Card className="mb-4" data-testid="pricing-guidelines-loading">
        <CardContent className="py-4">
          <div className="text-sm text-slate-500">Loading guidelines...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4" data-testid="pricing-guidelines-panel">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <CardTitle className="text-sm font-semibold text-slate-700">Pricing Guidelines</CardTitle>
              </div>
              {currentMargin > 0 && (
                <Badge className={`${marginStatus.bg} ${marginStatus.text} ${marginStatus.border} border gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {marginStatus.status}
                </Badge>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Current Margin Status */}
            {currentMargin > 0 && applicableGuideline && (
              <div className={`p-3 rounded-lg border ${marginStatus.bg} ${marginStatus.border}`} data-testid="current-margin-status">
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon className={`w-4 h-4 ${marginStatus.text}`} />
                  <span className={`text-sm font-medium ${marginStatus.text}`}>
                    Your margin: {formatPercent(currentMargin)}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {marginStatus.status === 'Premium' && 'Excellent! This margin is above premium target.'}
                  {marginStatus.status === 'Healthy' && 'Good! This margin meets the target range.'}
                  {marginStatus.status === 'Acceptable' && 'Caution: This margin is between minimum and target.'}
                  {marginStatus.status === 'Below Min' && 'Warning: This margin is below the minimum threshold.'}
                </div>
              </div>
            )}

            {/* Guidelines by Deal Size */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">By Deal Size</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Size</th>
                      <th className="text-center py-2 px-3 font-medium text-red-600">Min</th>
                      <th className="text-center py-2 px-3 font-medium text-amber-600">Target</th>
                      <th className="text-center py-2 px-3 font-medium text-emerald-600">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDealSize.map((g, i) => {
                      const isApplicable = applicableGuideline?.id === g.id;
                      return (
                        <tr 
                          key={g.id} 
                          className={`border-b last:border-0 ${isApplicable ? 'bg-indigo-50' : ''}`}
                          data-testid={`guideline-row-${g.deal_size}`}
                        >
                          <td className={`py-2 px-3 ${isApplicable ? 'font-medium text-indigo-700' : 'text-slate-700'}`}>
                            <div>{g.name}</div>
                            <div className="text-slate-400 text-[10px]">
                              {g.deal_size_min?.toLocaleString()} - {g.deal_size_max?.toLocaleString()} SAR
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            <span className={`inline-flex items-center justify-center w-10 h-6 rounded ${isApplicable && currentMargin < g.min_margin ? 'bg-red-100 text-red-700' : 'text-slate-600'}`}>
                              {g.min_margin}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            <span className={`inline-flex items-center justify-center w-10 h-6 rounded ${isApplicable && currentMargin >= g.min_margin && currentMargin < g.target_margin ? 'bg-amber-100 text-amber-700' : 'text-slate-600'}`}>
                              {g.target_margin}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            <span className={`inline-flex items-center justify-center w-10 h-6 rounded ${isApplicable && currentMargin >= g.target_margin ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600'}`}>
                              {g.premium_margin}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Guidelines by Category */}
            {byCategory.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">By Service Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  {byCategory.map(g => {
                    const isApplicable = applicableGuideline?.id === g.id;
                    return (
                      <div 
                        key={g.id}
                        className={`p-2 rounded-lg border ${isApplicable ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}
                      >
                        <div className={`text-xs font-medium ${isApplicable ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {g.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className="text-red-600">Min: {g.min_margin}%</span>
                          <span className="text-amber-600">Target: {g.target_margin}%</span>
                          <span className="text-emerald-600">Prem: {g.premium_margin}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-[10px] text-slate-500">Below Min</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-[10px] text-slate-500">Acceptable</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-[10px] text-slate-500">Target</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] text-slate-500">Premium</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
