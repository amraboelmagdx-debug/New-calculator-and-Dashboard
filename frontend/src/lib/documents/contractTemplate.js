import { ZAN_DOC_BASE_CSS, ZAN_COLORS } from '@/lib/zanFonts';

/**
 * Service Agreement / Contract template.
 * Security: NEVER include internal cost, hourly rate, or margin data.
 * Shows: parties, scope, agreed price, payment schedule, T&C body, signatures.
 */
export function buildContractHTML({ projectInfo = {}, selectedProducts = [], results, themeSettings = {}, language = 'en', paymentTerms = [] }) {
  const isAr = language === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  const co = {
    name:    themeSettings.company_name    || 'ZAN',
    nameAr:  themeSettings.company_name_ar || 'زان',
    address: themeSettings.company_address || '',
    phone:   themeSettings.company_phone   || '',
    email:   themeSettings.company_email   || '',
    vat:     themeSettings.company_vat     || '',
    cr:      themeSettings.company_cr      || '',
    logo:    themeSettings.logo_url        || '',
    bank:    themeSettings.bank_name       || '',
    iban:    themeSettings.bank_iban       || '',
    validityDays: themeSettings.quotation_validity_days || 30,
    terms:   isAr ? (themeSettings.terms_ar || '') : (themeSettings.terms_en || ''),
    contractBody: isAr ? (themeSettings.contract_body_ar || '') : (themeSettings.contract_body_en || ''),
  };

  const client   = projectInfo.client_name    || (isAr ? 'اسم العميل' : 'Client Name');
  const project  = projectInfo.project_name   || (isAr ? 'اسم المشروع' : 'Project Name');
  const bdName   = projectInfo.business_dev   || projectInfo.prepared_by || '';
  const dealRef  = projectInfo.deal_ref       || generateRef();

  const today    = new Date();
  const fmtDate  = d => d.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const totalSelling = results?.selling_price || results?.total_revenue || 0;
  const vatAmt       = totalSelling * 0.15;
  const grandTotal   = totalSelling + vatAmt;

  const pmtRows = buildPaymentRows(paymentTerms, totalSelling, isAr);

  // Fill contract body placeholders
  const contractBodyFilled = fillPlaceholders(co.contractBody, {
    CLIENT_NAME:    client,
    PROJECT_NAME:   project,
    TOTAL_AMOUNT:   fmtSAR(grandTotal),
    REF:            dealRef,
    DATE:           fmtDate(today),
    AGENCY_NAME:    isAr ? co.nameAr : co.name,
  });

  const gold = ZAN_COLORS.gold;

  return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${isAr ? 'اتفاقية الخدمات' : 'Service Agreement'} — ${co.name}</title>
  <style>
    ${ZAN_DOC_BASE_CSS}

    .cover {
      background: ${ZAN_COLORS.black}; color: #fff;
      min-height: 297mm; padding: 24mm 20mm;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .cover-badge { display:inline-block; background:${gold}; color:${ZAN_COLORS.black}; font-size:11px; font-weight:600; letter-spacing:2px; text-transform:uppercase; padding:4px 14px; border-radius:2px; margin-bottom:32px; }
    .cover-title { font-size:38px; font-weight:900; line-height:1.15; max-width:480px; }
    .cover-gold-line { height:3px; background:linear-gradient(${isAr?'to left':'to right'},${gold},transparent); width:80px; margin:20px 0 32px; }
    .cover-ref { margin-top:32px; padding:16px 20px; border:1px solid rgba(255,255,255,0.1); max-width:300px; }
    .cover-ref label { font-size:10px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:1.5px; display:block; margin-bottom:4px; }
    .cover-ref span  { font-size:13px; color:rgba(255,255,255,0.9); font-weight:600; }
    .cover-footer { border-top:1px solid rgba(255,255,255,0.1); padding-top:18px; display:flex; justify-content:space-between; }
    .cover-footer p { font-size:11px; color:rgba(255,255,255,0.3); }

    .section-header { border-bottom:2px solid ${gold}; padding-bottom:8px; margin-bottom:18px; display:flex; align-items:center; gap:10px; }
    .section-number { width:28px; height:28px; background:${ZAN_COLORS.black}; color:${gold}; font-size:13px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .section-title  { font-size:15px; font-weight:700; }

    .parties-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
    .party-box { border:1px solid ${ZAN_COLORS.border}; padding:16px; border-radius:2px; }
    .party-box h4 { font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:${ZAN_COLORS.muted}; margin-bottom:10px; }
    .party-box p  { font-size:12px; margin-bottom:4px; }
    .party-label  { color:${ZAN_COLORS.muted}; font-size:11px; }

    .scope-list { margin:0; padding-${isAr?'right':'left'}:18px; }
    .scope-list li { font-size:12px; margin-bottom:6px; }

    .contract-body { font-size:12px; line-height:1.8; color:#1a1a1a; white-space:pre-line; }

    .pmt-table th { background:${ZAN_COLORS.lightBg}; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:${ZAN_COLORS.muted}; padding:8px 12px; }
    .pmt-table td { padding:10px 12px; border-bottom:1px solid ${ZAN_COLORS.border}; font-size:12px; }

    .sig-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:28px; }
    .sig-box { border:1px solid ${ZAN_COLORS.border}; padding:20px; }
    .sig-box h4 { font-size:10px; text-transform:uppercase; letter-spacing:1.5px; color:${ZAN_COLORS.muted}; margin-bottom:28px; }
    .sig-line { border-top:1px solid ${ZAN_COLORS.black}; margin-top:8px; padding-top:6px; font-size:11px; color:${ZAN_COLORS.muted}; }

    .no-print { padding:10px 20px; background:#f0f0f0; font-size:12px; text-align:center; }
    @media print { .no-print { display:none !important; } }
  </style>
</head>
<body>

<div class="no-print">
  📋 ${isAr ? 'معاينة اتفاقية الخدمات' : 'Service Agreement Preview'} —
  <button onclick="window.print()" style="cursor:pointer;text-decoration:underline;background:none;border:none;font-size:12px;">
    🖨 ${isAr ? 'طباعة / PDF' : 'Print / PDF'}
  </button>
</div>

<!-- COVER -->
<div class="page cover">
  <div>
    <div>${co.logo?`<img src="${co.logo}" alt="${co.name}" style="height:50px"/>`:`<div style="font-size:28px;font-weight:900;color:${gold};letter-spacing:4px">${(co.name||'').toUpperCase()}</div>`}</div>
    <div class="cover-gold-line"></div>
    <div class="cover-badge">${isAr ? 'اتفاقية خدمات' : 'Service Agreement'}</div>
    <h1 class="cover-title">${escHtml(project)}</h1>
    <div class="cover-ref">
      <div><label>${isAr?'رقم الاتفاقية':'Agreement Reference'}</label><span>${escHtml(dealRef)}</span></div>
      <div style="margin-top:12px"><label>${isAr?'تاريخ الإصدار':'Issue Date'}</label><span>${fmtDate(today)}</span></div>
    </div>
  </div>
  <div class="cover-footer"><p>${co.name}</p><p>${co.email||''}</p></div>
</div>

<!-- AGREEMENT BODY -->
<div class="page">
  ${pageHeader(co, isAr, dealRef)}

  <!-- Parties -->
  <div class="section-header">
    <div class="section-number">01</div>
    <div class="section-title">${isAr ? 'أطراف الاتفاقية' : 'Parties to the Agreement'}</div>
  </div>
  <div class="parties-grid">
    <div class="party-box">
      <h4>${isAr ? 'الوكالة (الطرف الأول)' : 'Agency (First Party)'}</h4>
      <p style="font-weight:700;font-size:13px">${escHtml(isAr ? co.nameAr : co.name)}</p>
      ${co.address ? `<p><span class="party-label">${isAr?'العنوان':'Address'}: </span>${escHtml(co.address)}</p>` : ''}
      ${co.vat     ? `<p><span class="party-label">${isAr?'الرقم الضريبي':'VAT No.'}: </span>${escHtml(co.vat)}</p>` : ''}
      ${co.cr      ? `<p><span class="party-label">${isAr?'السجل التجاري':'CR No.'}: </span>${escHtml(co.cr)}</p>` : ''}
      ${co.email   ? `<p><span class="party-label">${isAr?'البريد الإلكتروني':'Email'}: </span>${escHtml(co.email)}</p>` : ''}
    </div>
    <div class="party-box">
      <h4>${isAr ? 'العميل (الطرف الثاني)' : 'Client (Second Party)'}</h4>
      <p style="font-weight:700;font-size:13px">${escHtml(client)}</p>
      <p style="font-size:11px;color:${ZAN_COLORS.muted};margin-top:6px">${isAr ? 'سيتم تعبئة بيانات العميل بالتفاصيل الكاملة عند التوقيع.' : "Client's full details will be completed at signing."}</p>
    </div>
  </div>

  <!-- Scope -->
  <div class="section-header">
    <div class="section-number">02</div>
    <div class="section-title">${isAr ? 'نطاق الخدمات' : 'Scope of Services'}</div>
  </div>
  <p style="font-size:12px;margin-bottom:12px">
    ${isAr
      ? `تتعهد الوكالة بتقديم الخدمات التالية لصالح العميل وفقاً للشروط المحددة في هذه الاتفاقية:`
      : `The Agency agrees to provide the following services to the Client in accordance with the terms of this Agreement:`}
  </p>
  <ul class="scope-list">
    ${selectedProducts.map(p => `<li><strong>${escHtml(p.product_name || '')}</strong></li>`).join('')}
  </ul>

  <!-- Fees -->
  <div class="section-header" style="margin-top:24px">
    <div class="section-number">03</div>
    <div class="section-title">${isAr ? 'الرسوم والمدفوعات' : 'Fees & Payments'}</div>
  </div>
  <p style="font-size:12px;margin-bottom:16px">
    ${isAr
      ? `يوافق العميل على دفع مبلغ إجمالي قدره <strong>${fmtSAR(grandTotal)}</strong> (شامل ضريبة القيمة المضافة بنسبة 15%) مقابل الخدمات المذكورة أعلاه.`
      : `The Client agrees to pay a total of <strong>${fmtSAR(grandTotal)}</strong> (including VAT at 15%) for the services described above.`}
  </p>

  ${pmtRows.length > 0 ? `
  <table class="pmt-table" style="width:100%">
    <thead><tr>
      <th>${isAr?'المرحلة':'Milestone'}</th>
      <th style="text-align:center">${isAr?'النسبة':'%'}</th>
      <th style="text-align:${isAr?'left':'right'}">${isAr?'المبلغ (SAR)':'Amount (SAR)'}</th>
      <th>${isAr?'التوقيت':'Timing'}</th>
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
  </table>` : ''}
</div>

<!-- CONTRACT BODY + SIGNATURES -->
<div class="page">
  ${pageHeader(co, isAr, dealRef)}

  ${contractBodyFilled ? `
  <div class="section-header">
    <div class="section-number">04</div>
    <div class="section-title">${isAr ? 'بنود الاتفاقية' : 'Agreement Terms'}</div>
  </div>
  <div class="contract-body">${escHtml(contractBodyFilled)}</div>
  <div style="margin:24px 0;"></div>` : `
  <div class="section-header">
    <div class="section-number">04</div>
    <div class="section-title">${isAr ? 'الشروط العامة' : 'General Terms'}</div>
  </div>
  <div style="padding:16px 20px;background:${ZAN_COLORS.lightBg};border-radius:4px;margin-bottom:24px;">
    <p style="font-size:12px;color:${ZAN_COLORS.muted}">
      ${isAr
        ? 'يمكن إضافة بنود العقد التفصيلية من لوحة الإدارة ← الوثائق والتصدير ← نص العقد.'
        : 'Detailed contract terms can be added via Admin Panel → Documents & Export → Contract Body.'}
    </p>
  </div>`}

  ${co.terms ? `
  <div class="section-header">
    <div class="section-number">${contractBodyFilled ? '05' : '04'}</div>
    <div class="section-title">${isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</div>
  </div>
  <p style="font-size:11px;color:${ZAN_COLORS.muted};line-height:1.8;white-space:pre-line;margin-bottom:24px">${escHtml(co.terms)}</p>` : ''}

  <!-- Signatures -->
  <div class="section-header">
    <div class="section-number">${contractBodyFilled && co.terms ? '06' : contractBodyFilled || co.terms ? '05' : '04'}</div>
    <div class="section-title">${isAr ? 'التوقيعات' : 'Signatures'}</div>
  </div>
  <p style="font-size:12px;color:${ZAN_COLORS.muted};margin-bottom:20px">
    ${isAr
      ? 'يُقر الطرفان بقبول جميع بنود هذه الاتفاقية بالتوقيع أدناه.'
      : 'By signing below, both parties confirm acceptance of all terms of this Agreement.'}
  </p>
  <div class="sig-grid">
    <div class="sig-box">
      <h4>${isAr ? 'عن الوكالة' : 'For the Agency'}</h4>
      <p style="font-weight:700;font-size:13px">${escHtml(isAr ? co.nameAr : co.name)}</p>
      ${bdName ? `<p style="font-size:11px;color:${ZAN_COLORS.muted};margin-top:3px">${escHtml(bdName)}</p>` : ''}
      <div style="height:44px"></div>
      <div class="sig-line">${isAr ? 'التوقيع / التاريخ' : 'Signature / Date'}</div>
    </div>
    <div class="sig-box">
      <h4>${isAr ? 'عن العميل' : 'For the Client'}</h4>
      <p style="font-weight:700;font-size:13px">${escHtml(client)}</p>
      <p style="font-size:11px;color:${ZAN_COLORS.muted};margin-top:3px">${isAr ? 'الاسم والمسمى الوظيفي' : 'Name & Title'}</p>
      <div style="height:44px"></div>
      <div class="sig-line">${isAr ? 'التوقيع / التاريخ' : 'Signature / Date'}</div>
    </div>
  </div>
</div>

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
  return `AGR-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
}
function pageHeader(co, isAr, ref) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid ${ZAN_COLORS.border}">
    <div>${co.logo?`<img src="${co.logo}" alt="${co.name}" style="height:36px"/>`:`<div style="font-size:18px;font-weight:900;letter-spacing:3px">${(co.name||'').toUpperCase()}</div>`}</div>
    <div style="text-align:${isAr?'left':'right'};font-size:11px;color:${ZAN_COLORS.muted};line-height:1.6">
      <div>${isAr?'رقم الاتفاقية':'Agreement Ref.'}: <strong>${escHtml(ref)}</strong></div>
      ${co.vat?`<div>${isAr?'الرقم الضريبي':'VAT No.'}: ${co.vat}</div>`:''}
    </div>
  </div>`;
}
function buildPaymentRows(paymentTerms=[], totalSelling, isAr) {
  if (!paymentTerms?.length || !totalSelling) return [];
  return paymentTerms
    .filter(t => Number(t.percentage||t.percent) > 0)
    .map(t => ({
      label:   isAr ? (t.name_ar||t.name||'') : (t.name||''),
      percent: Number(t.percentage||t.percent)||0,
      amount:  (totalSelling * (Number(t.percentage||t.percent)||0)) / 100,
      timing:  isAr ? (t.timing_ar||t.timing||'') : (t.timing||''),
    }));
}
function fillPlaceholders(text='', vars={}) {
  if (!text) return '';
  let result = text;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`[${key}]`, val || '');
  }
  return result;
}
