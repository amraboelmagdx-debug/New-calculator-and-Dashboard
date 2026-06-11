import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, ImageRun,
  TabStopType, TabStopPosition,
} from 'docx';
import { ZAN_LOGO_GOLD } from './zanLogoAsset';
import {
  fmtSAR, amountInWords, parsePhases, buildPaymentRows,
} from './quotationTemplate';

// ── Brand palette (docx wants hex WITHOUT '#') ────────────────────────────────
const PLUM      = '33092E';
const PLUM_SOFT = '4A1840';
const GOLD      = 'A68A40';
const DARK_GOLD = '8B7236';
const INK       = '1A1A1A';
const MUTED     = '6B6B6B';
const LIGHT     = 'F8F6F2';
const BORDER    = 'E8E4DC';
const WHITE     = 'FFFFFF';

const FONT = 'ZAN';

const cellBorder = (color = BORDER) => ({
  top:    { style: BorderStyle.SINGLE, size: 4, color },
  bottom: { style: BorderStyle.SINGLE, size: 4, color },
  left:   { style: BorderStyle.SINGLE, size: 4, color },
  right:  { style: BorderStyle.SINGLE, size: 4, color },
});

/**
 * Build a professional Word (.docx) quotation. Returns a Promise<Blob>.
 * Mirrors the HTML quotation content. Security: no internal costs.
 */
export async function buildQuotationDocx({
  projectInfo = {}, selectedProducts = [], results,
  themeSettings = {}, language = 'en', paymentTerms = [],
}) {
  const isAr = language === 'ar';
  const align = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const t = (en, ar) => (isAr ? ar : en);

  const brandName = themeSettings.company_brand || (isAr ? 'وكالة زان' : 'ZAN Agency');
  const co = {
    address: themeSettings.company_address || t('Riyadh, Saudi Arabia', 'الرياض، المملكة العربية السعودية'),
    phone:   themeSettings.company_phone || '',
    email:   themeSettings.company_email || '',
    vat:     themeSettings.company_vat || '',
    cr:      themeSettings.company_cr || '',
    bank:    themeSettings.bank_name || '',
    iban:    themeSettings.bank_iban || '',
    validityDays: themeSettings.quotation_validity_days || 30,
    terms:   isAr ? (themeSettings.terms_ar || '') : (themeSettings.terms_en || ''),
  };

  const client  = projectInfo.client_name || t('Client Name', 'اسم العميل');
  const attn    = projectInfo.contact_name || projectInfo.attention || t('Sir / Madam', 'السيد / السيدة');
  const project = projectInfo.project_name || t('Project Name', 'اسم المشروع');
  const bdName  = projectInfo.business_dev || projectInfo.prepared_by || t('Business Development', 'تطوير الأعمال');
  const dealRef = projectInfo.deal_ref || projectInfo.opportunity_number || `ZAN-${new Date().getFullYear()}-${Math.floor(Math.random()*900+100)}`;

  const today  = new Date();
  const expiry = new Date(today); expiry.setDate(today.getDate() + co.validityDays);
  const fmtDate = d => d.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const lineById = new Map((results?.margin_breakdown?.products || []).map(l => [l.id, l]));
  const totalSelling = results?.selling_price || results?.total_revenue || 0;
  const vatAmt = totalSelling * 0.15;
  const grandTotal = totalSelling + vatAmt;

  const sections = selectedProducts.map((p, i) => ({
    num: i + 1,
    name: p.product_name || '',
    tier: (p.size || '').toUpperCase(),
    phases: parsePhases(p.deliverables_description || p.description || ''),
    modPhases: parsePhases(p.modifications_per_phase || '', { keepNumbers: true }),
    price: Number(lineById.get(p.id)?.selling) || 0,
  }));
  const modServices = sections.filter(s => s.modPhases.some(g => g.items.length > 0));
  const pmtRows = buildPaymentRows(paymentTerms, totalSelling, isAr);

  // ── Helpers for building runs/paragraphs ────────────────────────────────────
  const run = (text, opts = {}) => new TextRun({
    text: String(text ?? ''), font: FONT, rightToLeft: isAr, ...opts,
  });
  const para = (children, opts = {}) => new Paragraph({
    alignment: align, bidirectional: isAr, children: Array.isArray(children) ? children : [children], ...opts,
  });

  const sectionHeading = (num, label) => new Paragraph({
    alignment: align, bidirectional: isAr, spacing: { before: 280, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
    children: [
      run(`${num}  `, { bold: true, color: GOLD, size: 26 }),
      run(label, { bold: true, color: PLUM, size: 26 }),
    ],
  });

  const bullet = (text, color = GOLD) => new Paragraph({
    alignment: align, bidirectional: isAr, spacing: { after: 40 },
    children: [ run(isAr ? '◄ ' : '• ', { color, bold: true }), run(text, { size: 21, color: INK }) ],
  });

  // ── Cover block ─────────────────────────────────────────────────────────────
  const logoBuf = dataUriToUint8(themeSettings.logo_url ? '' : ZAN_LOGO_GOLD);

  const coverChildren = [];
  if (logoBuf) {
    coverChildren.push(new Paragraph({
      alignment: align, spacing: { after: 80 },
      children: [new ImageRun({ data: logoBuf, transformation: { width: 64, height: 126 }, type: 'png' })],
    }));
  }
  coverChildren.push(
    para([run(brandName, { bold: true, size: 40, color: PLUM })], { spacing: { after: 30 } }),
    para([run(t('Creative Agency · Riyadh', 'وكالة إبداعية · الرياض'), { size: 18, color: GOLD, allCaps: !isAr })], { spacing: { after: 200 } }),
    para([run(t('QUOTATION', 'عرض سعر'), { bold: true, size: 22, color: WHITE, highlight: undefined })], {
      spacing: { after: 120 },
      shading: { type: ShadingType.SOLID, color: GOLD, fill: GOLD },
    }),
    new Paragraph({
      alignment: align, bidirectional: isAr, spacing: { after: 80 },
      children: [run(project, { bold: true, size: 52, color: PLUM })],
    }),
    para([run(`${t('Prepared for', 'مُقدَّم إلى')}: `, { size: 22, color: MUTED }), run(client, { size: 22, bold: true, color: INK })], { spacing: { after: 240 } }),
  );

  // Cover meta table
  const metaTable = simpleTable([
    [t('Reference', 'المرجع'), dealRef],
    [t('Issued', 'تاريخ الإصدار'), fmtDate(today)],
    [t('Valid Until', 'صالح حتى'), fmtDate(expiry)],
    [t('Prepared By', 'أُعِدَّ بواسطة'), bdName],
  ], isAr);

  // ── Info table (cover letter) ───────────────────────────────────────────────
  const infoTable = kvTable([
    [t('Quotation No.', 'رقم العرض'), dealRef, t('Date', 'التاريخ'), fmtDate(today)],
    [t('Company', 'العميل'), client, t('Attention', 'عناية'), attn],
    [t('Project', 'المشروع'), project, t('Valid Until', 'صالح حتى'), fmtDate(expiry)],
  ], isAr);

  // ── Scope sections ──────────────────────────────────────────────────────────
  const scopeBlocks = [];
  sections.forEach(s => {
    scopeBlocks.push(new Paragraph({
      alignment: align, bidirectional: isAr, spacing: { before: 160, after: 60 },
      shading: { type: ShadingType.SOLID, color: PLUM, fill: PLUM },
      children: [
        run(`${s.num}.  `, { bold: true, color: GOLD, size: 22 }),
        run(s.name, { bold: true, color: WHITE, size: 24 }),
        run(s.tier ? `   [${s.tier}]` : '', { color: GOLD, size: 18 }),
        new TextRun({ text: '\t', font: FONT }),
        run(s.price > 0 ? fmtSAR(s.price) : '—', { bold: true, color: GOLD, size: 24 }),
      ],
      tabStops: [{ type: isAr ? TabStopType.LEFT : TabStopType.RIGHT, position: TabStopPosition.MAX }],
    }));
    const hasDeliverables = s.phases.length > 0 && s.phases.some(g => g.items.length > 0);
    if (hasDeliverables) {
      s.phases.forEach(grp => {
        if (grp.header) {
          scopeBlocks.push(new Paragraph({
            alignment: align, bidirectional: isAr, spacing: { before: 80, after: 30 },
            children: [
              run(isAr ? '◄ ' : '▸ ', { color: GOLD, bold: true, size: 18 }),
              run(grp.header, { bold: true, size: 18, color: PLUM_SOFT }),
            ],
          }));
        }
        grp.items.forEach(it => scopeBlocks.push(bullet(it)));
      });
    } else {
      scopeBlocks.push(para([run(t('Full service delivery as agreed.', 'يشمل تنفيذ الخدمة بالكامل وفق المتفق عليه.'), { italics: true, color: MUTED, size: 20 })]));
    }
  });

  // ── Totals table ────────────────────────────────────────────────────────────
  const totalsTable = totalsBlock([
    [t('Subtotal', 'المجموع الفرعي'), fmtSAR(totalSelling), false],
    [t('VAT (15%)', 'ضريبة القيمة المضافة (15%)'), fmtSAR(vatAmt), false],
    [t('Total Investment', 'الإجمالي الكلي'), fmtSAR(grandTotal), true],
  ], isAr);

  // ── Default terms ───────────────────────────────────────────────────────────
  const defaultTerms = isAr ? [
    `هذا العرض ساري المفعول لمدة ${co.validityDays} يوماً من تاريخ الإصدار.`,
    'جميع الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة بنسبة 15% وفقاً للوائح هيئة الزكاة والضريبة والجمارك.',
    'يبدأ تنفيذ العمل بعد استلام الدفعة المقدمة وأمر التشغيل الموقّع.',
    'أي تعديلات على النطاق المتفق عليه قد تؤدي إلى تعديل في السعر والجدول الزمني.',
    'تظل جميع التصاميم والمواد المنتجة ملكاً لوكالة زان حتى سداد كامل المبلغ.',
    'لا تتحمل الوكالة مسؤولية أي تأخير ناتج عن أسباب خارجة عن إرادتها (قوة قاهرة).',
    'يلتزم الطرفان بالحفاظ على سرية المعلومات المتبادلة طوال فترة التعاقد وبعدها.',
  ] : [
    `This quotation is valid for ${co.validityDays} days from the issue date.`,
    'All prices are in Saudi Riyals and include 15% VAT as per ZATCA regulations.',
    'Work commences upon receipt of the advance payment and a signed purchase order.',
    'Any changes to the agreed scope may result in revised pricing and timeline.',
    'All designs and produced materials remain the property of ZAN until full payment is received.',
    'ZAN shall not be liable for delays arising from circumstances beyond its control (force majeure).',
    'Both parties shall maintain the confidentiality of exchanged information during and after the engagement.',
  ];
  const termsList = co.terms ? co.terms.split('\n').map(s => s.trim()).filter(Boolean) : defaultTerms;

  // ── Assemble document body ──────────────────────────────────────────────────
  const body = [];

  // Cover
  body.push(...coverChildren, metaTable, new Paragraph({ children: [], pageBreakBefore: false, spacing: { after: 200 } }));
  body.push(new Paragraph({ children: [run('')], pageBreakBefore: true }));

  // Cover letter
  body.push(sectionHeading('01', t('Quotation Details', 'تفاصيل العرض')));
  body.push(infoTable);
  body.push(para([run(isAr ? `السادة / ${client} المحترمين،` : `Dear ${attn},`, { size: 22, color: INK })], { spacing: { before: 200, after: 120 } }));
  body.push(para([run(
    isAr
      ? 'يسعدنا أن نضع بين أيديكم هذا العرض الذي يوضح نطاق الخدمات المقترحة والاستثمار المطلوب، آملين أن يلبي تطلعاتكم. نحن على أتم الاستعداد لتقديم أي توضيحات إضافية.'
      : 'We are pleased to present this proposal outlining the scope of services and the associated investment, which we trust will fulfil your requirements. We remain at your disposal for any further clarification.',
    { size: 22, color: INK })], { spacing: { after: 200 } }));
  body.push(para([run(isAr ? 'مع خالص التقدير،' : 'Warm regards,', { size: 20, color: MUTED })], { spacing: { after: 40 } }));
  body.push(para([run(bdName, { bold: true, size: 22, color: PLUM })]));
  body.push(para([run(`${t('Business Development', 'تطوير الأعمال')} · ${brandName}`, { size: 20, color: MUTED })]));

  // Scope
  body.push(new Paragraph({ children: [run('')], pageBreakBefore: true }));
  body.push(sectionHeading('02', t('Scope of Work & Investment', 'نطاق العمل والاستثمار')));
  body.push(...scopeBlocks);
  body.push(new Paragraph({ children: [run('')], spacing: { after: 120 } }));
  body.push(totalsTable);
  if (grandTotal > 0) {
    body.push(para([
      run(`${t('Amount in words', 'الإجمالي كتابةً')}: `, { bold: true, color: PLUM, size: 20 }),
      run(amountInWords(grandTotal, isAr), { size: 20, color: INK }),
    ], { spacing: { before: 160 }, shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT } }));
  }

  // Payment
  if (pmtRows.length) {
    body.push(new Paragraph({ children: [run('')], pageBreakBefore: true }));
    body.push(sectionHeading('03', t('Payment Schedule', 'جدول السداد')));
    body.push(paymentTable(pmtRows, isAr));
    if (co.bank || co.iban) {
      body.push(para([run(t('Bank Transfer Details', 'بيانات التحويل البنكي'), { bold: true, size: 20, color: MUTED })], { spacing: { before: 200, after: 60 } }));
      if (co.bank) body.push(para([run(`${t('Bank', 'البنك')}: `, { color: MUTED, size: 20 }), run(co.bank, { bold: true, size: 20 })]));
      if (co.iban) body.push(para([run('IBAN: ', { color: MUTED, size: 20 }), run(co.iban, { bold: true, size: 20 })]));
    }
  }

  // Modifications
  if (modServices.length) {
    body.push(new Paragraph({ children: [run('')], pageBreakBefore: true }));
    body.push(sectionHeading(pmtRows.length ? '04' : '03', t('Agreed Modifications', 'التعديلات المتفق عليها')));
    body.push(para([run(
      isAr ? 'عدد جولات التعديل المتفق عليها لكل خدمة. أي تعديلات إضافية تخضع لتسعير منفصل.'
           : 'Agreed rounds of modifications per service. Additional revisions are subject to separate pricing.',
      { size: 20, color: MUTED })], { spacing: { after: 140 } }));
    modServices.forEach(s => {
      const totalMods = s.modPhases.reduce((n, g) => n + g.items.length, 0);
      body.push(para([
        run(`${s.num}.  `, { bold: true, color: GOLD, size: 22 }),
        run(s.name, { bold: true, color: PLUM, size: 22 }),
        run(`   (${totalMods} ${t('items', 'بند')})`, { color: DARK_GOLD, size: 18 }),
      ], { spacing: { before: 120, after: 40 } }));
      s.modPhases.forEach(grp => {
        if (grp.header) {
          body.push(new Paragraph({
            alignment: align, bidirectional: isAr, spacing: { before: 60, after: 20 },
            children: [
              run(isAr ? '◄ ' : '▸ ', { color: GOLD, bold: true, size: 18 }),
              run(grp.header, { bold: true, size: 18, color: PLUM_SOFT }),
            ],
          }));
        }
        grp.items.forEach(m => body.push(bullet(m, PLUM_SOFT)));
      });
    });
  }

  // Terms
  body.push(new Paragraph({ children: [run('')], pageBreakBefore: true }));
  const termsNo = (() => { let n = 3; if (pmtRows.length) n++; if (modServices.length) n++; return String(n).padStart(2, '0'); })();
  body.push(sectionHeading(termsNo, t('Terms & Conditions', 'الشروط والأحكام')));
  termsList.forEach((tx, i) => body.push(para([
    run(`${i + 1}.  `, { bold: true, color: GOLD, size: 20 }),
    run(tx, { size: 20, color: INK }),
  ], { spacing: { after: 80 } })));

  // Signatures
  body.push(new Paragraph({ children: [run('')], pageBreakBefore: true }));
  const signNo = String(parseInt(termsNo, 10) + 1).padStart(2, '0');
  body.push(sectionHeading(signNo, t('Acceptance & Signatures', 'القبول والتوقيعات')));
  body.push(para([run(
    isAr ? 'بالتوقيع أدناه، يُقرّ الطرفان بمراجعة هذا العرض وقبوله والالتزام بشروطه وأحكامه كاملةً.'
         : 'By signing below, both parties confirm they have reviewed and accepted this quotation and its full terms.',
    { size: 20, color: MUTED })], { spacing: { after: 240 } }));
  body.push(signatureTable(brandName, bdName, client, isAr));

  // ── Build the Document ──────────────────────────────────────────────────────
  const doc = new Document({
    creator: brandName,
    title: `${t('Quotation', 'عرض سعر')} — ${project}`,
    styles: {
      default: { document: { run: { font: FONT, size: 22, color: INK } } },
    },
    sections: [{
      properties: {
        page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } },
      },
      children: body,
    }],
  });

  return Packer.toBlob(doc);
}

// ── Image helper ──────────────────────────────────────────────────────────────
function dataUriToUint8(dataUri) {
  if (!dataUri || !dataUri.startsWith('data:')) return null;
  try {
    const b64 = dataUri.split(',')[1];
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  } catch { return null; }
}

// ── Table builders ────────────────────────────────────────────────────────────
function cell(children, { fill, width, bold, color, sizeArr } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { type: ShadingType.SOLID, color: fill, fill } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    borders: cellBorder(),
    children: Array.isArray(children) ? children : [children],
  });
}

function simpleTable(rows, isAr) {
  const align = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        cell(new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: label, font: FONT, color: GOLD, size: 16, bold: true, allCaps: !isAr, rightToLeft: isAr })] }), { width: 30, fill: LIGHT }),
        cell(new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: value, font: FONT, color: INK, size: 22, bold: true, rightToLeft: isAr })] }), { width: 70 }),
      ],
    })),
  });
}

function kvTable(rows, isAr) {
  const align = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const kv = (k, v) => [
    cell(new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: k, font: FONT, color: MUTED, size: 16, allCaps: !isAr, rightToLeft: isAr })] }), { width: 18, fill: LIGHT }),
    cell(new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: v, font: FONT, color: INK, size: 20, bold: true, rightToLeft: isAr })] }), { width: 32 }),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k1, v1, k2, v2]) => new TableRow({ children: [...kv(k1, v1), ...kv(k2, v2)] })),
  });
}

function totalsBlock(rows, isAr) {
  const alignL = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const alignR = isAr ? AlignmentType.LEFT : AlignmentType.RIGHT;
  return new Table({
    width: { size: 55, type: WidthType.PERCENTAGE },
    alignment: isAr ? AlignmentType.LEFT : AlignmentType.RIGHT,
    rows: rows.map(([label, value, isTotal]) => new TableRow({
      children: [
        cell(new Paragraph({ alignment: alignL, bidirectional: isAr, children: [new TextRun({ text: label, font: FONT, color: isTotal ? WHITE : MUTED, size: isTotal ? 22 : 20, bold: isTotal, rightToLeft: isAr })] }), { fill: isTotal ? PLUM : undefined }),
        cell(new Paragraph({ alignment: alignR, bidirectional: isAr, children: [new TextRun({ text: value, font: FONT, color: isTotal ? WHITE : INK, size: isTotal ? 22 : 20, bold: true, rightToLeft: isAr })] }), { fill: isTotal ? PLUM : undefined }),
      ],
    })),
  });
}

function paymentTable(rows, isAr) {
  const align = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const alignR = isAr ? AlignmentType.LEFT : AlignmentType.RIGHT;
  const head = (txt) => cell(new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: txt, font: FONT, color: MUTED, size: 16, bold: true, allCaps: !isAr, rightToLeft: isAr })] }), { fill: LIGHT });
  const td = (txt, opts = {}) => cell(new Paragraph({ alignment: opts.right ? alignR : align, bidirectional: isAr, children: [new TextRun({ text: txt, font: FONT, color: INK, size: 20, bold: opts.bold, rightToLeft: isAr })] }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: [
        head(isAr ? 'المرحلة' : 'Milestone'), head(isAr ? 'النسبة' : '%'),
        head(isAr ? 'المبلغ' : 'Amount'), head(isAr ? 'التوقيت' : 'Timing'),
      ] }),
      ...rows.map(r => new TableRow({ children: [
        td(r.label, { bold: true }), td(`${r.percent}%`), td(fmtSAR(r.amount), { right: true, bold: true }), td(r.timing),
      ] })),
    ],
  });
}

function signatureTable(brandName, bdName, client, isAr) {
  const align = isAr ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const box = (title, name, sub) => cell([
    new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: title, font: FONT, color: MUTED, size: 16, bold: true, allCaps: !isAr, rightToLeft: isAr })], spacing: { after: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 18, color: GOLD } } }),
    new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: name, font: FONT, color: PLUM, size: 22, bold: true, rightToLeft: isAr })] }),
    new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: sub, font: FONT, color: MUTED, size: 18, rightToLeft: isAr })], spacing: { after: 500 } }),
    new Paragraph({ alignment: align, bidirectional: isAr, children: [new TextRun({ text: isAr ? 'التوقيع — التاريخ' : 'Signature — Date', font: FONT, color: MUTED, size: 18, rightToLeft: isAr })], border: { top: { style: BorderStyle.SINGLE, size: 6, color: PLUM } } }),
  ], { width: 50 });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [ new TableRow({ children: [
      box(isAr ? 'عن الوكالة' : 'For the Agency', brandName, bdName),
      box(isAr ? 'عن العميل' : 'For the Client', client, isAr ? 'الاسم والمسمى الوظيفي' : 'Name & Title'),
    ] }) ],
  });
}
