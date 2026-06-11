import { useState } from 'react';
import {
  Lightbulb, FileEdit, ExternalLink, BookOpen, AlertTriangle, Copy, Check, Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import {
  normalizeExecutionMode,
  costBasisDescription,
  executionModeLabel,
  resolveProductLineCost,
} from '@/lib/pricingCostRules';

// ─── Rich Text Utilities ─────────────────────────────────────────────────────

/** Detect whether the text is predominantly Arabic (→ RTL) */
function detectRTL(text) {
  const arabicChars = (text.match(/[؀-ۿݐ-ݿ]/g) || []).length;
  const latinChars  = (text.match(/[a-zA-Z]/g) || []).length;
  return arabicChars > 0 && arabicChars >= latinChars;
}

/**
 * Regex patterns that identify a phase header line.
 * Matches: C1, C2…  |  Phase 1, Phase 2…  |  المرحلة الأولى / الثانية / الثالثة / الرابعة / الخامسة
 */
const PHASE_HEADER_RE = /^(C\s*\d+\b|Phase\s*\d+\b|المرحلة\s+(الأولى|الثانية|الثالثة|الرابعة|الخامسة))/i;

/**
 * Regex for fixed section-divider labels that come from the sheet data.
 * These are standalone headers (e.g. "وصف التعديلات وفق المراحل") that
 * should be rendered as a visual amber divider, not a plain paragraph.
 */
const SECTION_DIVIDER_RE = /^(وصف التعديلات|Modifications\s+(per|breakdown)|التعديلات وفق)/i;

/** Parse a single non-header line into a typed block */
function parseBlock(line) {
  // Bullet: starts with -, •, *, ◦
  if (/^[-•*◦]\s+/.test(line))
    return { type: 'bullet', text: line.replace(/^[-•*◦]\s+/, '') };
  // Numbered: Arabic or Western digits followed by . or ) then space
  if (/^(\d+[.)]\s+|[٠١٢٣٤٥٦٧٨٩]+[.)]\s+)/.test(line)) {
    const num = line.match(/^(\d+|[٠١٢٣٤٥٦٧٨٩]+)/)?.[0] || '';
    return { type: 'numbered', text: line.replace(/^[^\s]+\s+/, ''), num };
  }
  return { type: 'paragraph', text: line };
}

/**
 * Split text into sections:
 *   [{ header: string | null, blocks: Block[] }]
 * Phase header lines become section titles; all other lines become blocks.
 */
function parseRichText(rawText) {
  const lines = String(rawText || '').split('\n');
  const sections = [];
  let current = { header: null, blocks: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Preserve blank lines as spacers only within an existing block list
      if (current.blocks.length) current.blocks.push({ type: 'spacer' });
      continue;
    }
    if (PHASE_HEADER_RE.test(trimmed)) {
      // Flush current section before starting a new one
      if (current.blocks.length || current.header !== null) sections.push(current);
      current = { header: trimmed, headerType: 'phase', blocks: [] };
    } else if (SECTION_DIVIDER_RE.test(trimmed)) {
      // Fixed section-label from sheet (e.g. "وصف التعديلات وفق المراحل")
      if (current.blocks.length || current.header !== null) sections.push(current);
      current = { header: trimmed, headerType: 'divider', blocks: [] };
    } else {
      current.blocks.push(parseBlock(trimmed));
    }
  }
  if (current.blocks.length || current.header !== null) sections.push(current);
  return sections;
}

/** Render a single parsed block */
function RichBlock({ block, isDarkMode, key }) {
  const textColor = isDarkMode ? 'text-neutral-200' : 'text-slate-700';
  const muted     = isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  if (block.type === 'spacer') return <div key={key} className="h-1.5" />;
  if (block.type === 'bullet')
    return (
      <div key={key} className={`flex items-start gap-2 ${textColor}`}>
        <span className={`mt-[5px] w-1.5 h-1.5 rounded-full shrink-0 ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
        <span className="text-sm leading-relaxed">{block.text}</span>
      </div>
    );
  if (block.type === 'numbered')
    return (
      <div key={key} className={`flex items-start gap-2 ${textColor}`}>
        <span className={`text-xs font-mono shrink-0 mt-0.5 min-w-[18px] text-right ${muted}`}>{block.num}.</span>
        <span className="text-sm leading-relaxed">{block.text}</span>
      </div>
    );
  return <p key={key} className={`text-sm leading-relaxed ${textColor}`}>{block.text}</p>;
}

/**
 * Smart rich-text renderer.
 * - Auto-detects Arabic → applies dir="rtl"
 * - Groups content under phase section cards (C1/C2/C3, المرحلة…)
 * - Renders bullet lists, numbered lists, and paragraphs intelligently
 */
function RichTextBlock({ text, isDarkMode }) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const sections    = parseRichText(raw);
  const isRTL       = detectRTL(raw);
  const dir         = isRTL ? 'rtl' : 'ltr';
  const hasPhases   = sections.some(s => s.header !== null);
  const cardBg      = isDarkMode ? 'bg-neutral-800/50 border-neutral-700/60' : 'bg-slate-50 border-slate-200';
  const headerColor = isDarkMode ? 'text-indigo-400' : 'text-indigo-600';

  if (!hasPhases) {
    // Flat content — no phase sections
    return (
      <div dir={dir} className="space-y-1.5">
        {sections[0]?.blocks.map((block, i) => (
          <RichBlock key={i} block={block} isDarkMode={isDarkMode} />
        ))}
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-3">
      {sections.map((section, si) => {
        // ── Amber divider label (e.g. "وصف التعديلات وفق المراحل") ──
        if (section.headerType === 'divider') {
          return (
            <div key={si} className="space-y-2">
              <div className="flex items-center gap-3 py-1">
                <div className={`flex-1 h-px ${isDarkMode ? 'bg-amber-500/25' : 'bg-amber-300/60'}`} />
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border whitespace-nowrap ${
                  isDarkMode
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <Pencil className="w-3 h-3 shrink-0" />
                  {section.header}
                </span>
                <div className={`flex-1 h-px ${isDarkMode ? 'bg-amber-500/25' : 'bg-amber-300/60'}`} />
              </div>
              {section.blocks.length > 0 && (
                <div className="space-y-1.5">
                  {section.blocks.map((block, bi) => (
                    <RichBlock key={bi} block={block} isDarkMode={isDarkMode} />
                  ))}
                </div>
              )}
            </div>
          );
        }

        // ── Phase card (C1 / C2 / المرحلة…) or null-header flat section ──
        return (
          <div key={si} className={`rounded-xl border p-3.5 ${cardBg}`}>
            {section.header && (
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${headerColor}`}>
                {section.header}
              </p>
            )}
            <div className="space-y-1.5">
              {section.blocks.map((block, bi) => (
                <RichBlock key={bi} block={block} isDarkMode={isDarkMode} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SheetTextDialog ─────────────────────────────────────────────────────────

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
        <RichTextBlock text={text} isDarkMode={isDarkMode} />
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

export default function ServicePricingDetail({ segmentData, quantity = 1, isDarkMode, compact = false }) {
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
      className={`rounded-lg border space-y-3 ${
        compact ? 'p-3' : 'col-span-12 mt-2 p-4 rounded-xl'
      } ${
        isDarkMode ? 'border-neutral-700 bg-neutral-900/60' : 'border-slate-200 bg-slate-50/80'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
            Sheet pricing (×{qty})
          </p>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Base min. selling (floor)</p>
              <p className={`text-lg font-bold font-mono ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {formatCurrency(lineMin)}
              </p>
            </div>
            <div>
              <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>Cost · Team + OH</p>
              <p className={`text-lg font-bold font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(totalCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {segmentData.execution_mode && (
            <Badge variant="outline" className={chipClass} title="How cost and team sync are interpreted">
              {executionModeLabel(normalizeExecutionMode(segmentData.execution_mode, segmentData))}
            </Badge>
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
        {segmentData.execution_mode && (
          <p className={`text-xs mt-2 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
            {costBasisDescription(
              normalizeExecutionMode(segmentData.execution_mode, segmentData),
              resolveProductLineCost(segmentData, qty).costBasis
            )}
          </p>
        )}
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
