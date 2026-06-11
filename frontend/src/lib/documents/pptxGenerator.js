import PptxGenJS from 'pptxgenjs';
import { ZAN_COLORS } from '@/lib/zanFonts';

// ── Brand palette (ZAN purple + real gold) ──────────────────────────────────
const BLACK  = '33092E';  // brand plum (was black) — matches logo + quotation
const PLUM   = '33092E';
const GOLD   = 'A68A40';  // real brand gold
const WHITE  = 'FFFFFF';
const LIGHT  = 'F8F6F2';
const MUTED  = '6B6B6B';

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtSAR(num) {
  if (!num) return 'SAR —';
  return `SAR ${Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function makePptx() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" × 7.5"
  pptx.theme  = { headFontFace: 'ZAN', bodyFontFace: 'ZAN' };
  return pptx;
}

/** Add slide with dark background */
function darkSlide(pptx) {
  const sld = pptx.addSlide();
  sld.background = { color: BLACK };
  return sld;
}

/** Add slide with light background */
function lightSlide(pptx) {
  const sld = pptx.addSlide();
  sld.background = { color: 'FFFFFF' };
  return sld;
}

/** Safe text helper — ensure string */
const s = v => String(v || '');

/** Add section header bar (gold line + title) */
function addSectionHeader(sld, title, y = 0.5) {
  sld.addShape(pptx.ShapeType?.rect || 'rect', { x: 0.5, y, w: 0.06, h: 0.3, fill: { color: GOLD } });
  sld.addText(title, { x: 0.7, y, w: 10, h: 0.35, fontSize: 14, bold: true, color: BLACK, fontFace: 'ZAN' });
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  QUOTATION PPTX                                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export function buildQuotationPPTX({ projectInfo = {}, selectedProducts = [], results, themeSettings = {}, language = 'en', paymentTerms = [] }) {
  const pptx    = makePptx();
  const isAr    = language === 'ar';
  const rtl     = isAr ? 'R' : 'L';

  const co      = {
    name:  themeSettings.company_name    || 'ZAN',
    logo:  themeSettings.logo_url        || null,
    bank:  themeSettings.bank_name       || '',
    iban:  themeSettings.bank_iban       || '',
    validityDays: themeSettings.quotation_validity_days || 30,
    terms: isAr ? (themeSettings.terms_ar || '') : (themeSettings.terms_en || ''),
  };

  const client  = projectInfo.client_name  || (isAr ? 'اسم العميل' : 'Client Name');
  const project = projectInfo.project_name || (isAr ? 'المشروع' : 'Project');
  const bdName  = projectInfo.business_dev || projectInfo.prepared_by || co.name;
  const dealRef = projectInfo.deal_ref     || `OPE-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
  const today   = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const expiry  = (() => { const d = new Date(); d.setDate(d.getDate() + co.validityDays); return d.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); })();

  const lineBreakdown = results?.margin_breakdown?.products || [];
  const lineById      = new Map(lineBreakdown.map(l => [l.id, l]));
  const totalSelling  = results?.selling_price || results?.total_revenue || 0;
  const vatAmt        = totalSelling * 0.15;
  const grandTotal    = totalSelling + vatAmt;

  // ── Slide 1: Cover ──────────────────────────────────────────────────────
  const cover = darkSlide(pptx);

  // Gold accent bar
  cover.addShape('rect', { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: GOLD } });

  // Logo or company name
  if (co.logo) {
    try { cover.addImage({ path: co.logo, x: 0.6, y: 0.5, h: 0.9, w: 2.5 }); } catch {}
  } else {
    cover.addText(s(co.name).toUpperCase(), { x: 0.6, y: 0.4, w: 5, h: 0.8, fontSize: 28, bold: true, color: GOLD, fontFace: 'ZAN', charSpacing: 6 });
  }

  // Doc type badge
  cover.addShape('rect', { x: 0.6, y: 1.6, w: isAr ? 1.6 : 1.5, h: 0.32, fill: { color: GOLD } });
  cover.addText(isAr ? 'عرض سعر' : 'QUOTATION', { x: 0.6, y: 1.6, w: isAr ? 1.6 : 1.5, h: 0.32, fontSize: 9, bold: true, color: BLACK, fontFace: 'ZAN', align: 'c', charSpacing: 2 });

  // Project name
  cover.addText(s(project), { x: 0.6, y: 2.1, w: 8.5, h: 1.4, fontSize: 36, bold: true, color: WHITE, fontFace: 'ZAN', wrap: true });

  // Meta grid
  const metaItems = [
    { lbl: isAr ? 'مُقدَّم إلى' : 'Prepared For', val: client },
    { lbl: isAr ? 'المرجع'      : 'Reference',    val: dealRef },
    { lbl: isAr ? 'التاريخ'     : 'Date',         val: today },
    { lbl: isAr ? 'صالح حتى'   : 'Valid Until',   val: expiry },
  ];
  metaItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = col === 0 ? 0.6 : 5.0;
    const y   = 4.0 + row * 0.9;
    cover.addText(s(item.lbl).toUpperCase(), { x, y, w: 4, h: 0.25, fontSize: 8, color: '666666', fontFace: 'ZAN', charSpacing: 2 });
    cover.addText(s(item.val), { x, y: y + 0.28, w: 4, h: 0.38, fontSize: 13, bold: true, color: WHITE, fontFace: 'ZAN' });
  });

  // Footer
  cover.addText(`${co.name}  ·  ${bdName}`, { x: 0.6, y: 6.9, w: 12, h: 0.3, fontSize: 10, color: '444444', fontFace: 'ZAN' });

  // ── Slide 2: Scope of Work ───────────────────────────────────────────────
  const scope = lightSlide(pptx);
  scope.addShape('rect', { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: BLACK } });

  scope.addText(isAr ? 'نطاق العمل' : 'Scope of Work', { x: 0.4, y: 0.35, w: 10, h: 0.55, fontSize: 20, bold: true, color: BLACK, fontFace: 'ZAN' });
  scope.addShape('rect', { x: 0.4, y: 0.92, w: 12.5, h: 0.03, fill: { color: GOLD } });

  const rows = selectedProducts.map(p => {
    const line  = lineById.get(p.id);
    const price = Number(line?.selling) || 0;
    return [
      { text: s(p.product_name), options: { bold: true, fontSize: 11 } },
      { text: '1', options: { align: 'c', fontSize: 11 } },
      { text: isAr ? 'خدمة' : 'Service', options: { align: 'c', fontSize: 11 } },
      { text: fmtSAR(price), options: { align: 'r', bold: true, fontSize: 11 } },
    ];
  });

  if (rows.length > 0) {
    scope.addTable(
      [
        [
          { text: isAr ? 'الخدمة' : 'Service',    options: { bold: true, color: GOLD, fill: { color: BLACK }, fontSize: 10, align: 'l' } },
          { text: isAr ? 'الكمية' : 'Qty',         options: { bold: true, color: GOLD, fill: { color: BLACK }, fontSize: 10, align: 'c' } },
          { text: isAr ? 'الوحدة' : 'Unit',        options: { bold: true, color: GOLD, fill: { color: BLACK }, fontSize: 10, align: 'c' } },
          { text: isAr ? 'المبلغ' : 'Amount (SAR)', options: { bold: true, color: GOLD, fill: { color: BLACK }, fontSize: 10, align: 'r' } },
        ],
        ...rows,
      ],
      { x: 0.4, y: 1.0, w: 12.5, colW: [6.5, 1.5, 1.5, 3.0], fontFace: 'ZAN', border: { pt: 0.5, color: 'E8E4DC' } }
    );
  }

  // ── Slide 3: Investment Summary ──────────────────────────────────────────
  const invest = lightSlide(pptx);
  invest.addShape('rect', { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: BLACK } });

  invest.addText(isAr ? 'ملخص الاستثمار' : 'Investment Summary', { x: 0.4, y: 0.35, w: 10, h: 0.55, fontSize: 20, bold: true, color: BLACK, fontFace: 'ZAN' });
  invest.addShape('rect', { x: 0.4, y: 0.92, w: 12.5, h: 0.03, fill: { color: GOLD } });

  const summaryRows = [
    [isAr ? 'المجموع الفرعي (قبل ضريبة القيمة المضافة)' : 'Subtotal (excl. VAT)', fmtSAR(totalSelling)],
    [isAr ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)', fmtSAR(vatAmt)],
  ];
  summaryRows.forEach(([label, value], i) => {
    const y = 1.5 + i * 0.8;
    invest.addText(s(label), { x: 1.5, y, w: 7, h: 0.5, fontSize: 13, color: MUTED, fontFace: 'ZAN' });
    invest.addText(s(value), { x: 8.5, y, w: 4, h: 0.5, fontSize: 13, bold: true, color: BLACK, fontFace: 'ZAN', align: 'r' });
    invest.addShape('rect', { x: 1.5, y: y + 0.52, w: 11, h: 0.01, fill: { color: 'E8E4DC' } });
  });

  // Grand total box
  invest.addShape('rect', { x: 1.5, y: 3.5, w: 11, h: 1.0, fill: { color: BLACK } });
  invest.addText(isAr ? 'الإجمالي الكلي' : 'Total Investment (incl. VAT)', { x: 1.7, y: 3.5, w: 7, h: 1.0, fontSize: 14, color: 'AAAAAA', fontFace: 'ZAN', valign: 'm' });
  invest.addText(s(fmtSAR(grandTotal)), { x: 8.5, y: 3.5, w: 3.8, h: 1.0, fontSize: 20, bold: true, color: GOLD, fontFace: 'ZAN', align: 'r', valign: 'm' });

  // ── Slide 4: Payment Schedule (if defined) ───────────────────────────────
  const pmtRows = (paymentTerms || []).filter(t => Number(t.percentage||t.percent) > 0).map(t => ({
    label:   s(isAr ? (t.name_ar||t.name) : t.name),
    percent: Number(t.percentage||t.percent)||0,
    amount:  (totalSelling * (Number(t.percentage||t.percent)||0)) / 100,
    timing:  s(isAr ? (t.timing_ar||t.timing) : t.timing),
  }));

  if (pmtRows.length > 0) {
    const pmt = lightSlide(pptx);
    pmt.addShape('rect', { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: BLACK } });
    pmt.addText(isAr ? 'جدول السداد' : 'Payment Schedule', { x: 0.4, y: 0.35, w: 10, h: 0.55, fontSize: 20, bold: true, color: BLACK, fontFace: 'ZAN' });
    pmt.addShape('rect', { x: 0.4, y: 0.92, w: 12.5, h: 0.03, fill: { color: GOLD } });

    pmt.addTable(
      [
        [
          { text: isAr?'المرحلة':'Milestone',   options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10 } },
          { text: isAr?'النسبة':'%',             options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10, align:'c' } },
          { text: isAr?'المبلغ':'Amount (SAR)',  options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10, align:'r' } },
          { text: isAr?'التوقيت':'Timing',       options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10 } },
        ],
        ...pmtRows.map(r => [
          { text: r.label,            options: { fontSize: 11 } },
          { text: `${r.percent}%`,    options: { fontSize: 11, align: 'c' } },
          { text: fmtSAR(r.amount),   options: { fontSize: 11, bold: true, align: 'r' } },
          { text: r.timing,           options: { fontSize: 11, color: MUTED } },
        ]),
      ],
      { x: 0.4, y: 1.0, w: 12.5, colW: [4.5, 1.8, 3.5, 2.7], fontFace: 'ZAN', border: { pt: 0.5, color: 'E8E4DC' } }
    );
  }

  // ── Slide 5: T&C + Next Steps ────────────────────────────────────────────
  const final = darkSlide(pptx);
  final.addShape('rect', { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: GOLD } });
  final.addText(isAr ? 'الشروط والأحكام' : 'Terms & Conditions', { x: 0.4, y: 0.4, w: 10, h: 0.55, fontSize: 20, bold: true, color: WHITE, fontFace: 'ZAN' });

  if (co.terms) {
    const termsPreview = co.terms.substring(0, 400) + (co.terms.length > 400 ? '…' : '');
    final.addText(s(termsPreview), { x: 0.4, y: 1.2, w: 12.5, h: 4.5, fontSize: 11, color: 'BBBBBB', fontFace: 'ZAN', wrap: true, lineSpacingMultiple: 1.4 });
  } else {
    final.addText(isAr ? 'يمكن إضافة الشروط والأحكام من لوحة الإدارة.' : 'Terms & Conditions can be added via the Admin Panel → Documents & Export.',
      { x: 0.4, y: 1.5, w: 12.5, h: 1.5, fontSize: 12, color: '888888', fontFace: 'ZAN', wrap: true });
  }

  // Footer strip
  final.addText(`${co.name}  ·  ${dealRef}`, { x: 0.4, y: 6.9, w: 12.5, h: 0.35, fontSize: 10, color: '444444', fontFace: 'ZAN' });

  return pptx;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  FINANCIAL PROPOSAL PPTX                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export function buildFinancialPPTX({ projectInfo = {}, selectedProducts = [], results, themeSettings = {}, language = 'en', paymentTerms = [] }) {
  const pptx   = makePptx();
  const isAr   = language === 'ar';
  const co     = {
    name:  themeSettings.company_name || 'ZAN',
    logo:  themeSettings.logo_url     || null,
    terms: isAr ? (themeSettings.terms_ar||'') : (themeSettings.terms_en||''),
    validityDays: themeSettings.quotation_validity_days || 30,
  };
  const client  = projectInfo.client_name  || (isAr ? 'العميل' : 'Client');
  const project = projectInfo.project_name || (isAr ? 'المشروع' : 'Project');
  const dealRef = projectInfo.deal_ref     || `OPE-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
  const today   = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day:'2-digit', month:'long', year:'numeric' });

  const lineBreakdown = results?.margin_breakdown?.products || [];
  const lineById      = new Map(lineBreakdown.map(l => [l.id, l]));
  const totalSelling  = results?.selling_price || results?.total_revenue || 0;
  const vatAmt        = totalSelling * 0.15;
  const grandTotal    = totalSelling + vatAmt;

  // Slide 1: Cover
  const cover = darkSlide(pptx);
  cover.addShape('rect', { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: GOLD } });
  if (co.logo) {
    try { cover.addImage({ path: co.logo, x: 0.6, y: 0.5, h: 0.9, w: 2.5 }); } catch {}
  } else {
    cover.addText(s(co.name).toUpperCase(), { x: 0.6, y: 0.4, w: 5, h: 0.8, fontSize: 28, bold: true, color: GOLD, fontFace: 'ZAN', charSpacing: 6 });
  }
  cover.addShape('rect', { x: 0.6, y: 1.6, w: isAr ? 2.0 : 2.3, h: 0.32, fill: { color: GOLD } });
  cover.addText(isAr ? 'العرض المالي' : 'FINANCIAL PROPOSAL', { x: 0.6, y: 1.6, w: isAr ? 2.0 : 2.3, h: 0.32, fontSize: 9, bold: true, color: BLACK, fontFace: 'ZAN', align: 'c', charSpacing: 1 });
  cover.addText(s(project), { x: 0.6, y: 2.1, w: 8.5, h: 1.4, fontSize: 36, bold: true, color: WHITE, fontFace: 'ZAN', wrap: true });
  cover.addText(`${isAr?'العميل:':'Client:'} ${s(client)}`, { x: 0.6, y: 3.8, w: 8, h: 0.5, fontSize: 14, color: 'BBBBBB', fontFace: 'ZAN' });
  cover.addText(`${today}  ·  ${s(dealRef)}`, { x: 0.6, y: 6.9, w: 12, h: 0.35, fontSize: 10, color: '444444', fontFace: 'ZAN' });

  // Slide 2: Cost Breakdown
  const costSld = lightSlide(pptx);
  costSld.addShape('rect', { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: BLACK } });
  costSld.addText(isAr ? 'تفاصيل التكاليف' : 'Cost Breakdown', { x: 0.4, y: 0.35, w: 10, h: 0.55, fontSize: 20, bold: true, color: BLACK, fontFace: 'ZAN' });
  costSld.addShape('rect', { x: 0.4, y: 0.92, w: 12.5, h: 0.03, fill: { color: GOLD } });

  const tableRows = selectedProducts.map(p => {
    const line = lineById.get(p.id);
    return [
      { text: s(p.product_name), options: { bold: true, fontSize: 11 } },
      { text: Number(line?.team_cost)   > 0 ? '✓' : '—', options: { align: 'c', fontSize: 11 } },
      { text: Number(line?.vendor_cost) > 0 ? fmtSAR(Number(line.vendor_cost)) : '—', options: { align: 'c', fontSize: 11 } },
      { text: fmtSAR(Number(line?.selling) || 0), options: { align: 'r', bold: true, fontSize: 11 } },
    ];
  });

  if (tableRows.length > 0) {
    costSld.addTable(
      [
        [
          { text: isAr?'الخدمة':'Service',                     options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10 } },
          { text: isAr?'خدمات مهنية':'Professional Services',  options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10, align:'c' } },
          { text: isAr?'إنتاج':'Production',                   options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10, align:'c' } },
          { text: isAr?'السعر (SAR)':'Price (SAR)',             options: { bold:true, color:GOLD, fill:{color:BLACK}, fontSize:10, align:'r' } },
        ],
        ...tableRows,
      ],
      { x: 0.4, y: 1.0, w: 12.5, colW: [5.5, 2.5, 2.0, 2.5], fontFace: 'ZAN', border: { pt: 0.5, color: 'E8E4DC' } }
    );
  }

  // Total strip
  costSld.addShape('rect', { x: 0.4, y: 5.9, w: 12.5, h: 0.8, fill: { color: BLACK } });
  costSld.addText(isAr ? 'الإجمالي شامل ضريبة القيمة المضافة' : 'Grand Total (incl. VAT 15%)',
    { x: 0.6, y: 5.9, w: 8, h: 0.8, fontSize: 13, color: 'AAAAAA', fontFace: 'ZAN', valign: 'm' });
  costSld.addText(s(fmtSAR(grandTotal)),
    { x: 8.5, y: 5.9, w: 4.2, h: 0.8, fontSize: 18, bold: true, color: GOLD, fontFace: 'ZAN', align: 'r', valign: 'm' });

  return pptx;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  TECHNICAL PROPOSAL PPTX                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export function buildTechnicalPPTX({ projectInfo = {}, selectedProducts = [], themeSettings = {}, language = 'en' }) {
  const pptx   = makePptx();
  const isAr   = language === 'ar';
  const co     = {
    name:  themeSettings.company_name || 'ZAN',
    logo:  themeSettings.logo_url     || null,
  };
  const client  = projectInfo.client_name  || (isAr ? 'العميل' : 'Client');
  const project = projectInfo.project_name || (isAr ? 'المشروع' : 'Project');
  const dealRef = projectInfo.deal_ref     || `OPE-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
  const today   = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day:'2-digit', month:'long', year:'numeric' });

  // Slide 1: Cover
  const cover = darkSlide(pptx);
  cover.addShape('rect', { x: 0, y: 0, w: 0.08, h: 7.5, fill: { color: GOLD } });
  if (co.logo) {
    try { cover.addImage({ path: co.logo, x: 0.6, y: 0.5, h: 0.9, w: 2.5 }); } catch {}
  } else {
    cover.addText(s(co.name).toUpperCase(), { x: 0.6, y: 0.4, w: 5, h: 0.8, fontSize: 28, bold: true, color: GOLD, fontFace: 'ZAN', charSpacing: 6 });
  }
  cover.addShape('rect', { x: 0.6, y: 1.6, w: isAr ? 1.9 : 2.3, h: 0.32, fill: { color: GOLD } });
  cover.addText(isAr ? 'العرض الفني' : 'TECHNICAL PROPOSAL', { x: 0.6, y: 1.6, w: isAr ? 1.9 : 2.3, h: 0.32, fontSize: 9, bold: true, color: BLACK, fontFace: 'ZAN', align: 'c', charSpacing: 1 });
  cover.addText(s(project), { x: 0.6, y: 2.1, w: 8.5, h: 1.4, fontSize: 36, bold: true, color: WHITE, fontFace: 'ZAN', wrap: true });
  cover.addText(`${isAr?'العميل:':'Client:'} ${s(client)}`, { x: 0.6, y: 3.8, w: 8, h: 0.5, fontSize: 14, color: 'BBBBBB', fontFace: 'ZAN' });
  cover.addText(`${today}  ·  ${s(dealRef)}`, { x: 0.6, y: 6.9, w: 12, h: 0.35, fontSize: 10, color: '444444', fontFace: 'ZAN' });

  // Slide 2: Our Approach
  const approach = lightSlide(pptx);
  approach.addShape('rect', { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: BLACK } });
  approach.addText(isAr ? 'نهجنا' : 'Our Approach', { x: 0.4, y: 0.35, w: 10, h: 0.55, fontSize: 20, bold: true, color: BLACK, fontFace: 'ZAN' });
  approach.addShape('rect', { x: 0.4, y: 0.92, w: 12.5, h: 0.03, fill: { color: GOLD } });

  const steps = isAr
    ? [['01','الاستماع','فهم رؤيتكم وأهدافكم'], ['02','الاستراتيجية','تطوير منهجية إبداعية مبنية على البيانات'], ['03','التنفيذ','إنتاج احترافي بمعايير عالية'], ['04','التسليم','مراجعة ودعم مستمر']]
    : [['01','Listen','Understand your vision & goals'], ['02','Strategize','Data-informed creative methodology'], ['03','Execute','Professional production at high craft standards'], ['04','Deliver','Review, feedback & ongoing support']];

  steps.forEach(([num, title, desc], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = col === 0 ? 0.4 : 6.8;
    const y   = 1.1 + row * 2.5;
    approach.addShape('rect', { x, y, w: 0.6, h: 0.6, fill: { color: BLACK } });
    approach.addText(s(num), { x, y, w: 0.6, h: 0.6, fontSize: 14, bold: true, color: GOLD, fontFace: 'ZAN', align: 'c', valign: 'm' });
    approach.addText(s(title), { x: x + 0.7, y, w: 5.6, h: 0.6, fontSize: 14, bold: true, color: BLACK, fontFace: 'ZAN', valign: 'm' });
    approach.addText(s(desc), { x: x + 0.7, y: y + 0.65, w: 5.6, h: 0.9, fontSize: 11, color: MUTED, fontFace: 'ZAN', wrap: true });
  });

  // Slide 3: Scope of Work
  const scopeSld = lightSlide(pptx);
  scopeSld.addShape('rect', { x: 0, y: 0, w: 0.06, h: 7.5, fill: { color: BLACK } });
  scopeSld.addText(isAr ? 'نطاق الخدمات' : 'Scope of Services', { x: 0.4, y: 0.35, w: 10, h: 0.55, fontSize: 20, bold: true, color: BLACK, fontFace: 'ZAN' });
  scopeSld.addShape('rect', { x: 0.4, y: 0.92, w: 12.5, h: 0.03, fill: { color: GOLD } });

  selectedProducts.forEach((p, i) => {
    const y = 1.1 + i * 0.7;
    scopeSld.addShape('rect', { x: 0.4, y: y + 0.15, w: 0.06, h: 0.3, fill: { color: GOLD } });
    scopeSld.addText(s(p.product_name || ''), { x: 0.65, y, w: 12, h: 0.6, fontSize: 13, bold: true, color: BLACK, fontFace: 'ZAN', valign: 'm' });
  });

  return pptx;
}
