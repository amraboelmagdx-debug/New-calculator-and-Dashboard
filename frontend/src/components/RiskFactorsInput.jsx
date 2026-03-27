import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Zap, Cog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getRiskConfig } from '@/lib/api';

export default function RiskFactorsInput({ 
  title = "Risk Factors",
  riskFactors = { complexity: 'none', rush: 'none', execution: 'none', custom_multiplier: 0 },
  onChange,
  riskMultiplier = 1.0,
  showResult = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [riskConfig, setRiskConfig] = useState(null);

  useEffect(() => {
    getRiskConfig().then(setRiskConfig).catch(console.error);
  }, []);

  const levels = riskConfig?.levels || {
    none: 1.0,
    low: 1.05,
    medium: 1.15,
    high: 1.30
  };

  const handleChange = (field, value) => {
    onChange({
      ...riskFactors,
      [field]: value
    });
  };

  // Get risk level label
  const getRiskLevel = (mult) => {
    if (mult <= 1.0) return { label: 'None', color: 'bg-slate-100 text-slate-700' };
    if (mult <= 1.08) return { label: 'Low', color: 'bg-green-100 text-green-700' };
    if (mult <= 1.20) return { label: 'Medium', color: 'bg-amber-100 text-amber-700' };
    return { label: 'High', color: 'bg-red-100 text-red-700' };
  };

  const riskLevel = getRiskLevel(riskMultiplier);
  const riskImpact = ((riskMultiplier - 1) * 100).toFixed(1);

  return (
    <Card className="border-dashed" data-testid="risk-factors-input">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold text-slate-700">{title}</CardTitle>
              </div>
              {showResult && (
                <div className="flex items-center gap-2">
                  <Badge className={riskLevel.color}>
                    {riskLevel.label}
                  </Badge>
                  {riskMultiplier > 1 && (
                    <span className="text-xs text-slate-500">
                      +{riskImpact}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4">
              {/* Complexity */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Cog className="w-3 h-3" />
                  Client Complexity
                </Label>
                <Select 
                  value={riskFactors.complexity} 
                  onValueChange={(v) => handleChange('complexity', v)}
                >
                  <SelectTrigger className="h-9 text-xs" data-testid="risk-complexity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (×{levels.none})</SelectItem>
                    <SelectItem value="low">Low (×{levels.low})</SelectItem>
                    <SelectItem value="medium">Medium (×{levels.medium})</SelectItem>
                    <SelectItem value="high">High (×{levels.high})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rush/SLA */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Rush / SLA Pressure
                </Label>
                <Select 
                  value={riskFactors.rush} 
                  onValueChange={(v) => handleChange('rush', v)}
                >
                  <SelectTrigger className="h-9 text-xs" data-testid="risk-rush">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (×{levels.none})</SelectItem>
                    <SelectItem value="low">Low (×{levels.low})</SelectItem>
                    <SelectItem value="medium">Medium (×{levels.medium})</SelectItem>
                    <SelectItem value="high">High (×{levels.high})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Execution Risk */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Execution Risk
                </Label>
                <Select 
                  value={riskFactors.execution} 
                  onValueChange={(v) => handleChange('execution', v)}
                >
                  <SelectTrigger className="h-9 text-xs" data-testid="risk-execution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (×{levels.none})</SelectItem>
                    <SelectItem value="low">Low (×{levels.low})</SelectItem>
                    <SelectItem value="medium">Medium (×{levels.medium})</SelectItem>
                    <SelectItem value="high">High (×{levels.high})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Multiplier Override */}
            <div className="mt-4 pt-4 border-t border-dashed">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500">Custom Multiplier Override</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={riskFactors.custom_multiplier || ''}
                      onChange={(e) => handleChange('custom_multiplier', parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 1.25"
                      className="h-8 text-xs w-24"
                      data-testid="risk-custom"
                    />
                    <span className="text-xs text-slate-400">Leave empty to use calculated risk</span>
                  </div>
                </div>
                {showResult && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Effective Multiplier</div>
                    <div className="text-lg font-bold font-mono text-slate-900">
                      ×{riskMultiplier.toFixed(3)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
