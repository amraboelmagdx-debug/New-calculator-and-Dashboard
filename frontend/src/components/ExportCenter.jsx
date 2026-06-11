import { useState, useCallback, useMemo } from 'react';
import { FileText, DollarSign, Wrench, FileSignature, Eye, Download, Presentation, FileType2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { buildQuotationHTML } from '@/lib/documents/quotationTemplate';
import { buildFinancialHTML  } from '@/lib/documents/financialProposalTemplate';
import { buildTechnicalHTML  } from '@/lib/documents/technicalProposalTemplate';
import { buildContractHTML   } from '@/lib/documents/contractTemplate';
import { buildQuotationPPTX, buildFinancialPPTX, buildTechnicalPPTX } from '@/lib/documents/pptxGenerator';
import { buildQuotationDocx } from '@/lib/documents/docxGenerator';
import { getSegmentPayload as resolveSegment } from '@/lib/opportunityScope';

const DOC_TYPES = [
  {
    id:           'quotation',
    labelEn:      'Quotation',
    labelAr:      'عرض سعر',
    icon:         FileText,
    descEn:       'Client-facing price sheet with scope, investment summary, and payment schedule.',
    descAr:       'عرض السعر للعميل مع النطاق والتكاليف وجدول السداد.',
    supportsPptx: true,
    supportsDocx: true,
    iconColor:    'text-indigo-400',
    iconBg:       'bg-indigo-500/10',
    accentClass:  'border-l-indigo-500/60',
  },
  {
    id:           'financial',
    labelEn:      'Financial Proposal',
    labelAr:      'العرض المالي',
    icon:         DollarSign,
    descEn:       'Detailed cost breakdown by service with payment milestones.',
    descAr:       'تفاصيل التكاليف والدفعات لكل خدمة.',
    supportsPptx: true,
    iconColor:    'text-emerald-400',
    iconBg:       'bg-emerald-500/10',
    accentClass:  'border-l-emerald-500/60',
  },
  {
    id:           'technical',
    labelEn:      'Technical Proposal',
    labelAr:      'العرض الفني',
    icon:         Wrench,
    descEn:       'Methodology, approach, team structure, and proposed timeline.',
    descAr:       'المنهجية وهيكل الفريق والجدول الزمني المقترح.',
    supportsPptx: true,
    iconColor:    'text-amber-400',
    iconBg:       'bg-amber-500/10',
    accentClass:  'border-l-amber-500/60',
  },
  {
    id:           'contract',
    labelEn:      'Service Agreement',
    labelAr:      'اتفاقية الخدمات',
    icon:         FileSignature,
    descEn:       'Legal service contract with parties, scope, fees, and signatures.',
    descAr:       'عقد الخدمات مع الأطراف والنطاق والرسوم والتوقيعات.',
    supportsPptx: false,
    iconColor:    'text-violet-400',
    iconBg:       'bg-violet-500/10',
    accentClass:  'border-l-violet-500/60',
  },
];

function buildHTML(docId, params) {
  switch (docId) {
    case 'quotation': return buildQuotationHTML(params);
    case 'financial': return buildFinancialHTML(params);
    case 'technical': return buildTechnicalHTML(params);
    case 'contract':  return buildContractHTML(params);
    default: return '<html><body>Unknown document type</body></html>';
  }
}

async function buildPPTX(docId, params) {
  switch (docId) {
    case 'quotation': return buildQuotationPPTX(params);
    case 'financial': return buildFinancialPPTX(params);
    case 'technical': return buildTechnicalPPTX(params);
    default: return null;
  }
}

/** Trigger a browser download for a Blob without extra deps. */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function ExportCenter({
  projectInfo      = {},
  selectedProducts = [],
  results,
  themeSettings    = {},
  paymentTerms     = [],
  isDarkMode       = false,
  findCatalogProduct,
  getSegmentPayload,
}) {
  const defaultLang = themeSettings?.default_doc_language || 'en';

  const [cardState, setCardState] = useState(() =>
    Object.fromEntries(DOC_TYPES.map(d => [d.id, { lang: defaultLang, fmt: 'pdf' }]))
  );
  const [preview, setPreview]   = useState({ open: false, html: '', title: '' });
  const [exporting, setExporting] = useState({});

  // Enrich each product with its catalog deliverables + modifications (resolved
  // per tier from the segment payload — these are NOT stored on selectedProducts).
  const enrichedProducts = useMemo(() => (selectedProducts || []).map(p => {
    if (p.deliverables_description && p.modifications_per_phase) return p;
    let seg = null;
    try {
      const prod = findCatalogProduct?.(p.product_name);
      seg = getSegmentPayload ? getSegmentPayload(prod, p.size) : resolveSegment(prod, p.size);
    } catch { /* noop */ }
    return {
      ...p,
      deliverables_description: p.deliverables_description || seg?.deliverables_description || '',
      modifications_per_phase:  p.modifications_per_phase  || seg?.modifications_per_phase  || '',
    };
  }), [selectedProducts, findCatalogProduct, getSegmentPayload]);

  const setCardField = (docId, field, value) =>
    setCardState(prev => ({ ...prev, [docId]: { ...prev[docId], [field]: value } }));

  const makeParams = (lang) => ({
    projectInfo, selectedProducts: enrichedProducts, results, themeSettings, paymentTerms, language: lang,
  });

  const handlePreview = useCallback((doc) => {
    const { lang } = cardState[doc.id];
    try {
      const html  = buildHTML(doc.id, makeParams(lang));
      const title = lang === 'ar' ? doc.labelAr : doc.labelEn;
      setPreview({ open: true, html, title });
    } catch (err) {
      console.error('Preview error', err);
      toast.error('Failed to generate preview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardState, enrichedProducts, projectInfo, results, themeSettings, paymentTerms]);

  const handleExport = useCallback(async (doc) => {
    const { lang, fmt } = cardState[doc.id];
    const params = makeParams(lang);
    setExporting(prev => ({ ...prev, [doc.id]: true }));
    try {
      if (fmt === 'docx') {
        const blob = await buildQuotationDocx(params);
        downloadBlob(blob, `${doc.id}-${lang}-${Date.now()}.docx`);
        toast.success(`${lang === 'ar' ? 'تم تنزيل' : 'Downloaded'} .docx`);
      } else if (fmt === 'pptx') {
        const pptx = await buildPPTX(doc.id, params);
        if (!pptx) { toast.error('Presentation not supported for this document'); return; }
        const filename = `${doc.id}-${lang}-${Date.now()}.pptx`;
        await pptx.writeFile({ fileName: filename });
        toast.success(`${filename} — ${lang === 'ar' ? 'يفتح في Keynote' : 'opens in Keynote'}`);
      } else {
        const html = buildHTML(doc.id, params);
        const win  = window.open('', '_blank');
        if (!win) { toast.error('Popup blocked — please allow popups'); return; }
        win.document.write(html);
        win.document.close();
        win.onload = () => setTimeout(() => { try { win.print(); } catch {} }, 700);
        setTimeout(() => { try { win.print(); } catch {} }, 1200);
      }
    } catch (err) {
      console.error('Export error', err);
      toast.error('Export failed — see console');
    } finally {
      setExporting(prev => ({ ...prev, [doc.id]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardState, enrichedProducts, projectInfo, results, themeSettings, paymentTerms]);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const muted = isDarkMode ? 'text-neutral-500' : 'text-slate-400';
  const head  = isDarkMode ? 'text-neutral-100' : 'text-slate-900';
  const divider = isDarkMode ? 'border-neutral-800' : 'border-slate-100';

  const pillActive   = isDarkMode
    ? 'bg-neutral-700 text-neutral-100 border-neutral-600'
    : 'bg-slate-800 text-white border-slate-700';
  const pillInactive = isDarkMode
    ? 'bg-transparent text-neutral-500 border-neutral-800 hover:text-neutral-300 hover:border-neutral-600'
    : 'bg-transparent text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className={`text-sm font-semibold ${head}`}>Export Center</h3>
          <p className={`text-[11px] mt-0.5 ${muted}`}>
            Generate professional documents in AR or EN
          </p>
        </div>
      </div>

      {/* Document rows */}
      <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-slate-200 bg-white'}`}>
        {DOC_TYPES.map((doc, idx) => {
          const Icon       = doc.icon;
          const { lang, fmt } = cardState[doc.id];
          const isExporting   = !!exporting[doc.id];
          const label         = lang === 'ar' ? doc.labelAr : doc.labelEn;
          const desc          = lang === 'ar' ? doc.descAr  : doc.descEn;

          return (
            <div
              key={doc.id}
              className={`flex items-center gap-3 px-4 py-3 border-l-2 transition-colors ${doc.accentClass} ${
                idx > 0 ? `border-t ${divider}` : ''
              } ${isDarkMode ? 'hover:bg-neutral-800/40' : 'hover:bg-slate-50/80'}`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${doc.iconBg}`}>
                <Icon className={`w-4 h-4 ${doc.iconColor}`} strokeWidth={1.8} />
              </div>

              {/* Title + description */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${head}`}>{label}</p>
                <p className={`text-[10px] leading-snug truncate ${muted}`}>{desc}</p>
                {doc.supportsPptx && (
                  <p className="text-[9px] leading-snug mt-0.5 text-amber-500/80">
                    {lang === 'ar' ? 'صيغة PPTX تفتح مباشرة في Keynote' : 'PPTX opens directly in Keynote'}
                  </p>
                )}
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Lang pills */}
                <div className="flex items-center gap-0.5">
                  {['en', 'ar'].map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setCardField(doc.id, 'lang', l)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                        lang === l ? pillActive : pillInactive
                      }`}
                    >
                      {l === 'en' ? 'EN' : 'AR'}
                    </button>
                  ))}
                </div>

                {/* Format pills */}
                <div className={`flex items-center gap-0.5 ml-1 pl-1.5 border-l ${divider}`}>
                  {['pdf', ...(doc.supportsPptx ? ['pptx'] : []), ...(doc.supportsDocx ? ['docx'] : [])].map(f => (
                    <button
                      key={f}
                      type="button"
                      title={f === 'pptx' ? 'Opens natively in Keynote' : f === 'docx' ? 'Microsoft Word' : 'Print / Save as PDF'}
                      onClick={() => setCardField(doc.id, 'fmt', f)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all flex items-center gap-0.5 ${
                        fmt === f ? pillActive : pillInactive
                      }`}
                    >
                      {f === 'pptx' && <Presentation className="w-2.5 h-2.5" />}
                      {f === 'docx' && <FileType2 className="w-2.5 h-2.5" />}
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-1 ml-1 pl-1.5 border-l ${divider}`}>
                  {/* Preview */}
                  <button
                    type="button"
                    onClick={() => handlePreview(doc)}
                    title="Preview"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isDarkMode
                        ? 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Export */}
                  <button
                    type="button"
                    onClick={() => handleExport(doc)}
                    disabled={isExporting}
                    className={`flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50 ${
                      isDarkMode
                        ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-100 border border-neutral-600'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {isExporting ? (
                      <span className="animate-spin text-xs">↻</span>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        {fmt.toUpperCase()}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      <Dialog open={preview.open} onOpenChange={open => setPreview(p => ({ ...p, open }))}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex-shrink-0 px-4 py-3 border-b flex-row items-center justify-between">
            <DialogTitle className="text-sm font-semibold">{preview.title} — Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-slate-100">
            <iframe
              srcDoc={preview.html}
              title="Document Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
