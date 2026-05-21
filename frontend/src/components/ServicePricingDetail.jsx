import { useState } from 'react';
import {
  Lightbulb, FileEdit, ExternalLink, BookOpen, AlertTriangle, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

function SheetTextDialog({ open, onOpenChange, title, text, isDarkMode, trigger }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const dialogClass = isDarkMode
    ? 'bg-neutral-900 border-neutral-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto'
    : 'max-w-2xl max-h-[80vh] overflow-y-auto';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={dialogClass}>
        <DialogHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pr-8">
          <DialogTitle className="text-left">{title}</DialogTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={`shrink-0 gap-1.5 ${
              isDarkMode ? 'border-neutral-600 hover:bg-neutral-800' : ''
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </DialogHeader>
        <p
          className={`text-sm whitespace-pre-wrap leading-relaxed ${
            isDarkMode ? 'text-neutral-300' : 'text-slate-700'
          }`}
        >
          {text}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function splitUrls(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => /^https?:\/\//i.test(s));
}

export default function ServicePricingDetail({ segmentData, quantity = 1, isDarkMode }) {
  const [deliverablesOpen, setDeliverablesOpen] = useState(false);
  const [modificationsOpen, setModificationsOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);

  if (!segmentData) return null;

  const qty = Number(quantity) || 1;
  const baseMin = Number(segmentData.base_minimum_selling_price) || 0;
  const totalCost = (Number(segmentData.total_cost) || 0) * qty;
  const lineMin = baseMin * qty;
  const sheetUrls = splitUrls(segmentData.detailed_sheet_url);
  const refUrls = splitUrls(segmentData.references);

  const chipClass = isDarkMode
    ? 'bg-neutral-800 text-neutral-200 border-neutral-600'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div
      className={`col-span-12 mt-2 rounded-xl border p-4 space-y-3 ${
        isDarkMode ? 'border-violet-500/30 bg-violet-500/5' : 'border-violet-200 bg-violet-50/50'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
            Sheet pricing (×{qty})
          </p>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Base min. selling (O)</p>
              <p className={`text-lg font-bold font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {formatCurrency(lineMin)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Total cost (J)</p>
              <p className={`text-lg font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(totalCost)}
              </p>
            </div>
            {segmentData.minimum_selling_price > 0 && segmentData.minimum_selling_price !== baseMin && (
              <div>
                <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Min. selling (L)</p>
                <p className={`text-sm font-mono ${isDarkMode ? 'text-neutral-300' : 'text-slate-600'}`}>
                  {formatCurrency(segmentData.minimum_selling_price * qty)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {segmentData.execution_mode && (
            <Badge variant="outline" className={chipClass}>{segmentData.execution_mode}</Badge>
          )}
          {segmentData.execution_risk && (
            <Badge variant="outline" className={chipClass}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              {segmentData.execution_risk}
            </Badge>
          )}
          {segmentData.minimum_margin_percent > 0 && (
            <Badge variant="outline" className={chipClass}>
              Min margin {segmentData.minimum_margin_percent}%
            </Badge>
          )}
          {segmentData.total_team_hours > 0 && (
            <Badge variant="outline" className={chipClass}>
              {segmentData.total_team_hours}h team
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {segmentData.deliverables_description && (
          <SheetTextDialog
            open={deliverablesOpen}
            onOpenChange={setDeliverablesOpen}
            title="Deliverables Description"
            text={segmentData.deliverables_description}
            isDarkMode={isDarkMode}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={isDarkMode ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10' : 'border-amber-300 text-amber-800 hover:bg-amber-50'}
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                Deliverables
              </Button>
            }
          />
        )}

        {segmentData.modifications_per_phase && (
          <SheetTextDialog
            open={modificationsOpen}
            onOpenChange={setModificationsOpen}
            title="Modifications per Phase"
            text={segmentData.modifications_per_phase}
            isDarkMode={isDarkMode}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={isDarkMode ? 'border-blue-500/40 text-blue-300 hover:bg-blue-500/10' : 'border-blue-300 text-blue-800 hover:bg-blue-50'}
              >
                <FileEdit className="w-4 h-4 mr-1" />
                Modifications
              </Button>
            }
          />
        )}

        {sheetUrls.map((url, i) => (
          <Button
            key={`sheet-${i}`}
            type="button"
            variant="outline"
            size="sm"
            asChild
            className={isDarkMode ? 'border-emerald-500/40 text-emerald-300' : 'border-emerald-300 text-emerald-800'}
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" />
              Detailed sheet{i > 0 ? ` ${i + 1}` : ''}
            </a>
          </Button>
        ))}

        {refUrls.length > 0 ? (
          refUrls.map((url, i) => (
            <Button
              key={`ref-${i}`}
              type="button"
              variant="outline"
              size="sm"
              asChild
              className={isDarkMode ? 'border-slate-500 text-slate-300' : 'border-slate-300 text-slate-700'}
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <BookOpen className="w-4 h-4 mr-1" />
                Reference{i > 0 ? ` ${i + 1}` : ''}
              </a>
            </Button>
          ))
        ) : segmentData.references && !refUrls.length ? (
          <SheetTextDialog
            open={referencesOpen}
            onOpenChange={setReferencesOpen}
            title="References"
            text={segmentData.references}
            isDarkMode={isDarkMode}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={isDarkMode ? 'border-slate-500 text-slate-300' : 'border-slate-300 text-slate-700'}
              >
                <BookOpen className="w-4 h-4 mr-1" />
                References
              </Button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
