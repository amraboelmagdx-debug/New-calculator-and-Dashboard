import { ZAN_DOC_BASE_CSS, ZAN_COLORS } from '@/lib/zanFonts';

/**
 * Financial Proposal — shows detailed pricing breakdown for the client.
 * Security: NEVER expose hourly_rate, monthly_salary, or internal team cost labels.
 * Internal team cost → shown as "Professional Services"
 */
export function buildFinancialHTML({ projectInfo = {}, selectedProducts = [], results, themeSettings = {}, language = 'en', paymentTerms = [] }) {
  const isAr = language === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  const co = {
    name:    themeSettings.company_name    || 'ZAN',
    nameAr:  themeSettings.company_name_ar || 'زان',
    logo:    themeSettings.logo_url        || '',
    vat:     themeSettings.company_vat     || '',
    phone:   themeSettings.company_phone   || '',
    email:   themeSettings.company_email   || '',
    bank:    themeSettings.bank_name       || '',
    iban:    themeSettings.bank_iban       || '',
    validityDays: themeSettings.quotation_validity_days || 30,
    terms:   isAr ? (themeSettings.terms_ar || '') : (themeSettings.terms_en || ''),
  };

  const client  = projectInfo.client_name  || (isAr ? 'اسم العميل' : 'Client Name');
  const project = projectInfo.project_name || (isAr ? 'اسم المشروع' : 'Project Name');
  const bdName  = projectInfo.business_dev || projectInfo.prepared_by || '';
  const dealRef = projectInfo.deal_ref     || generateRef();

  const today   = new Date();
  const expiry  = new Date(today); expiry.setDate(today.getDate() + co.validityDays);
  const fmtDate = d => d.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const lineBreakdown = results?.margin_breakdown?.products || [];
  const lineById = new Map(lineBreakdown.map(l => [l.id, l]));

  const totalSelling = results?.selling_price || results?.total_revenue || 0;
  const vatAmt       = totalSelling * 0.15;
  const grandTotal   = totalSelling + vatAmt;

  const gold = ZAN_COLORS.gold;

  // Per-product cost breakdown rows
  // Order: parents → their linked add-ons → orphan add-ons → standalone (unlinked) add-ons section
  const parentLines = selectedProducts.filter(p => !p.is_addon);
  const ordered = [];
  parentLines.forEach(parent => {
    ordered.push({ p: parent, isAddon: false, isUnlinked: false, isSectionBreak: false });
    selectedProducts
      .filter(c => c.is_addon && c.parent_id === parent.id)
      .forEach(child => ordered.push({ p: child, isAddon: true, isUnlinked: false, isSectionBreak: false }));
  });
  // Orphan add-ons (parent_id set but parent missing)
  selectedProducts
    .filter(p => p.is_addon && p.parent_id && !parentLines.some(pl => pl.id === p.parent_id))
    .forEach(child => ordered.push({ p: child, isAddon: true, isUnlinked: false, isSectionBreak: false }));
  // Standalone (unlinked) add-ons — separate section
  const unlinkedAddons = selectedProducts.filter(p => p.is_addon && !p.parent_id);
  if (unlinkedAddons.length > 0) {
    ordered.push({ p: null, isAddon: false, isUnlinked: true, isSectionBreak: true });
    unlinkedAddons.forEach(child => ordered.push({ p: child, isAddon: true, isUnlinked: true, isSectionBreak: false }));
  }

  const productRows = ordered.map(entry => {
    if (entry.isSectionBreak) return { isSectionBreak: true };
    const p = entry.p;
    const line   = lineById.get(p.id);
    const selling = Number(line?.selling) || 0;
    const teamCost   = Number(line?.team_cost)   || 0;
    const vendorCost = Number(line?.vendor_cost) || 0;
    // Professional services = team cost — label only, no SAR value
    return { name: p.product_name || 'Service', selling, teamCost, vendorCost, isAddon: entry.isAddon, isUnlinked: entry.isUnlinked };
  });

  const pmtRows = buildPaymentRows(paymentTerms, totalSelling, isAr);

  return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${isAr ? 'العرض المالي' : 'Financial Proposal'} — ${co.name}</title>
  <style>
    ${ZAN_DOC_BASE_CSS}

    .cover {
      background: ${ZAN_COLORS.black};
      color: #fff;
      min-height: 297mm; padding: 24mm 20mm;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .cover-badge {
      display: inline-block; background: ${gold}; color: ${ZAN_COLORS.black};
      font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
      padding: 4px 14px; border-radius: 2px; margin-bottom: 32px;
    }
    .cover-title { font-size: 40px; font-weight: 900; line-height: 1.15; max-width: 520px; }
    .cover-gold-line { height: 3px; background: linear-gradient(${isAr ? 'to left' : 'to right'}, ${gold}, transparent); width: 80px; margin: 20px 0 32px; }
    .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 36px; }
    .cover-meta-item label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 4px; }
    .cover-meta-item span  { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 600; }
    .cover-footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 18px; display:flex; justify-content:space-between; }
    .cover-footer p { font-size: 11px; color: rgba(255,255,255,0.3); }
    .cover-logo-text { font-size: 30px; font-weight: 900; color: ${gold}; letter-spacing: 4px; }

    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid ${ZAN_COLORS.border}; }
    .page-header-logo-text { font-size: 18px; font-weight: 900; color: ${ZAN_COLORS.black}; letter-spacing: 3px; }
    .page-header-meta { text-align: ${isAr ? 'left' : 'right'}; font-size: 11px; color: ${ZAN_COLORS.muted}; line-height: 1.6; }

    .section-header { border-bottom: 2px solid ${gold}; padding-bottom: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .section-number { width: 28px; height: 28px; background: ${ZAN_COLORS.black}; color: ${gold}; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .section-title { font-size: 15px; font-weight: 700; }

    .fin-table th { background: ${ZAN_COLORS.black}; color: ${gold}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 10px 14px; }
    .fin-table td { padding: 11px 14px; border-bottom: 1px solid ${ZAN_COLORS.border}; font-size: 12px; }
    .fin-table tr:nth-child(even) td { background: ${ZAN_COLORS.lightBg}; }
    .fin-table tfoot td { font-weight: 700; border-top: 2px solid ${ZAN_COLORS.black}; background: transparent !important; }

    .summary-box { border: 1.5px solid ${ZAN_COLORS.border}; border-radius: 4px; overflow:hidden; max-width: 340px; margin-${isAr?'left':'right'}: 0; margin-${isAr?'right':'left'}: auto; }
    .summary-row { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 12px; border-bottom: 1px solid ${ZAN_COLORS.border}; }
    .summary-row:last-child { border-bottom: none; }
    .summary-total { background: ${ZAN_COLORS.black}; color: #fff; font-weight: 700; font-size: 13px; }
    .summary-label { color: ${ZAN_COLORS.muted}; }
    .summary-total .summary-label { color: rgba(255,255,255,0.65); }

    .payment-table th { background: ${ZAN_COLORS.lightBg}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${ZAN_COLORS.muted}; padding: 8px 12px; }
    .payment-table td { padding: 10px 12px; border-bottom: 1px solid ${ZAN_COLORS.border}; font-size: 12px; }

    .standalone-addons-header td { background: #f5f3ff; padding: 7px 14px; }
    .standalone-addons-label { font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #6366f1; }
    .svc-addon-standalone { border-left: 3px solid #6366f1; }
    .no-print { padding: 10px 20px; background: #f0f0f0; font-size: 12px; text-align: center; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>

<div class="no-print">
  📄 ${isAr ? 'معاينة العرض المالي' : 'Financial Proposal Preview'} —
  <button onclick="window.print()" style="cursor:pointer;text-decoration:underline;background:none;border:none;font-size:12px;">
    🖨 ${isAr ? 'طباعة / حفظ PDF' : 'Print / Save as PDF'}
  </button>
</div>

<!-- COVER -->
<div class="page cover">
  <div>
    <div>${co.logo ? `<img src="${co.logo}" alt="${co.name}" style="height:50px" />` : `<div class="cover-logo-text">${(co.name||'').toUpperCase()}</div>`}</div>
    <div class="cover-gold-line"></div>
    <div class="cover-badge">${isAr ? 'العرض المالي' : 'Financial Proposal'}</div>
    <h1 class="cover-title">${escHtml(project)}</h1>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>${isAr ? 'العميل' : 'Client'}</label><span>${escHtml(client)}</span></div>
      <div class="cover-meta-item"><label>${isAr ? 'المرجع' : 'Reference'}</label><span>${escHtml(dealRef)}</span></div>
      <div class="cover-meta-item"><label>${isAr ? 'التاريخ' : 'Date'}</label><span>${fmtDate(today)}</span></div>
      <div class="cover-meta-item"><label>${isAr ? 'صالح حتى' : 'Valid Until'}</label><span>${fmtDate(expiry)}</span></div>
    </div>
  </div>
  <div class="cover-footer">
    <p>${co.name}</p><p>${co.email || ''}</p>
  </div>
</div>

<!-- COST BREAKDOWN PAGE -->
<div class="page">
  ${pageHeader(co, isAr, dealRef)}

  <div class="section-header">
    <div class="section-number">01</div>
    <div class="section-title">${isAr ? 'تفاصيل التكاليف' : 'Cost Breakdown'}</div>
  </div>

  <table class="fin-table" style="width:100%">
    <thead>
      <tr>
        <th>${isAr ? 'الخدمة' : 'Service'}</th>
        <th style="text-align:center">${isAr ? 'الخدمات المهنية' : 'Professional Services'}</th>
        <th style="text-align:center">${isAr ? 'الإنتاج والطباعة' : 'Production & Printing'}</th>
        <th style="text-align:${isAr ? 'left' : 'right'}">${isAr ? 'السعر (SAR)' : 'Price (SAR)'}</th>
      </tr>
    </thead>
    <tbody>
      ${productRows.map(r => {
        if (r.isSectionBreak) return `
      <tr class="standalone-addons-header">
        <td colspan="4"><span class="standalone-addons-label">${isAr ? 'إضافات مستقلة' : 'Standalone Add-ons'}</span></td>
      </tr>`;
        const addonBadge = r.isAddon
          ? `<span style="font-size:8px;font-weight:700;letter-spacing:1px;color:${r.isUnlinked?'#6366f1':'#A68A40'};border:1px solid ${r.isUnlinked?'#6366f166':'#A68A4066'};padding:1px 5px;border-radius:2px;margin-${isAr?'left':'right'}:6px">${isAr?'إضافة':'ADD-ON'}</span>`
          : '';
        return `
      <tr class="${r.isUnlinked ? 'svc-addon-standalone' : ''}">
        <td style="${r.isAddon && !r.isUnlinked ? `padding-${isAr?'right':'left'}:22px` : ''}">${addonBadge}<strong>${escHtml(r.name)}</strong></td>
        <td style="text-align:center">${r.teamCost > 0 ? '✓' : '—'}</td>
        <td style="text-align:center">${r.vendorCost > 0 ? fmtSAR(r.vendorCost) : '—'}</td>
        <td style="text-align:${isAr?'left':'right'};font-weight:700">${fmtSAR(r.selling)}</td>
      </tr>`;
      }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:${isAr?'right':'left'}">${isAr ? 'الإجمالي قبل ضريبة القيمة المضافة' : 'Subtotal (excl. VAT)'}</td>
        <td style="text-align:${isAr?'left':'right'}">${fmtSAR(totalSelling)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="margin-top:28px;">
    <div class="summary-box">
      <div class="summary-row"><span class="summary-label">${isAr ? 'المجموع' : 'Subtotal'}</span><span style="font-weight:600">${fmtSAR(totalSelling)}</span></div>
      <div class="summary-row"><span class="summary-label">${isAr ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span><span>${fmtSAR(vatAmt)}</span></div>
      <div class="summary-row summary-total"><span class="summary-label">${isAr ? 'الإجمالي الكلي' : 'Grand Total'}</span><span>${fmtSAR(grandTotal)}</span></div>
    </div>
  </div>
</div>

<!-- PAYMENT SCHEDULE -->
${pmtRows.length > 0 ? `
<div class="page">
  ${pageHeader(co, isAr, dealRef)}
  <div class="section-header">
    <div class="section-number">02</div>
    <div class="section-title">${isAr ? 'جدول الدفعات' : 'Payment Schedule'}</div>
  </div>
  <table class="payment-table" style="width:100%">
    <thead><tr>
      <th>${isAr ? 'المرحلة' : 'Milestone'}</th>
      <th style="text-align:center">${isAr ? 'النسبة' : '%'}</th>
      <th style="text-align:${isAr?'left':'right'}">${isAr ? 'المبلغ (SAR)' : 'Amount (SAR)'}</th>
      <th>${isAr ? 'التوقيت' : 'Timing'}</th>
    </tr></thead>
    <tbody>
      ${pmtRows.map(r => `
      <tr>
        <td>${escHtml(r.label)}</td>
        <td style="text-align:center">${r.percent}%</td>
        <td style="text-align:${isAr?'left':'right'};font-weight:700">${fmtSAR(r.amount)}</td>
        <td style="color:${ZAN_COLORS.muted}">${escHtml(r.timing)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  ${co.bank ? `<div style="margin-top:24px;padding:14px 18px;background:${ZAN_COLORS.lightBg};border-radius:4px;font-size:12px;">
    <p style="font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:1px;color:${ZAN_COLORS.muted};margin-bottom:10px">${isAr?'التحويل البنكي':'Bank Transfer'}</p>
    ${co.bank ? `<p>${isAr?'البنك':'Bank'}: <strong>${escHtml(co.bank)}</strong></p>` : ''}
    ${co.iban ? `<p>IBAN: <strong style="font-family:monospace">${escHtml(co.iban)}</strong></p>` : ''}
  </div>` : ''}
</div>` : ''}

${co.terms ? `
<div class="page">
  ${pageHeader(co, isAr, dealRef)}
  <div class="section-header">
    <div class="section-number">${pmtRows.length>0?'03':'02'}</div>
    <div class="section-title">${isAr?'الشروط والأحكام':'Terms & Conditions'}</div>
  </div>
  <p style="font-size:11px;color:${ZAN_COLORS.muted};line-height:1.7;white-space:pre-line">${escHtml(co.terms)}</p>
</div>` : ''}

</body>
</html>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtSAR(num) {
  if (!num) return 'SAR —';
  return `SAR ${Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function generateRef() {
  return `OPE-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
}
function pageHeader(co, isAr, ref) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid ${ZAN_COLORS.border}">
    <div>${co.logo?`<img src="${co.logo}" alt="${co.name}" style="height:36px"/>`:`<div style="font-size:18px;font-weight:900;letter-spacing:3px">${(co.name||'').toUpperCase()}</div>`}</div>
    <div style="text-align:${isAr?'left':'right'};font-size:11px;color:${ZAN_COLORS.muted};line-height:1.6">
      <div>${isAr?'العرض المالي رقم':'Financial Proposal'}: <strong>${escHtml(ref)}</strong></div>
      ${co.phone?`<div>${co.phone}</div>`:''}
      ${co.email?`<div>${co.email}</div>`:''}
    </div>
  </div>`;
}
function buildPaymentRows(paymentTerms=[], totalSelling, isAr) {
  if (!paymentTerms?.length || !totalSelling) return [];
  return paymentTerms
    .filter(t => (Number(t.advance_percent)||Number(t.percentage)||Number(t.percent)) > 0)
    .map(t => ({
      label:   isAr ? (t.name_ar||t.name||'') : (t.name||''),
      percent: Number(t.advance_percent)||Number(t.percentage)||Number(t.percent)||0,
      amount:  (totalSelling * (Number(t.advance_percent)||Number(t.percentage)||Number(t.percent)||0)) / 100,
      timing:  isAr ? (t.timing_ar||t.timing||'') : (t.timing||''),
    }));
}
