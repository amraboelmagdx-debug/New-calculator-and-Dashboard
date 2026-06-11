import { ZAN_DOC_BASE_CSS, ZAN_COLORS } from '@/lib/zanFonts';
import { ZAN_LOGO_GOLD } from './zanLogoAsset';

/**
 * Build a complete professional HTML quotation document, modeled on a
 * letter-style agency quotation (Takamol reference): cover → cover letter →
 * sectioned scope & investment → payment schedule → terms → signatures.
 *
 * Security: NEVER include hourly_rate, monthly_salary, internal team cost,
 * or vendor markup. Only client-facing selling prices appear.
 */
export function buildQuotationHTML({
  projectInfo      = {},
  selectedProducts = [],
  results,
  themeSettings    = {},
  language         = 'en',
  paymentTerms     = [],
}) {
  const isAr = language === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';
  const g    = ZAN_COLORS; // brand palette (plum + real gold)

  // Brand wordmark — independent of the app name (themeSettings.company_name = "OPE")
  const brandName   = themeSettings.company_brand    || 'ZAN Agency';
  const brandNameAr = themeSettings.company_brand_ar || 'وكالة زان';
  const tagline     = isAr ? 'وكالة إبداعية · الرياض' : 'Creative Agency · Riyadh';

  // ── Company info ────────────────────────────────────────────────────────────
  const co = {
    name:    themeSettings.company_name    || 'ZAN',
    nameAr:  themeSettings.company_name_ar || 'زان',
    address: themeSettings.company_address || (isAr ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'),
    phone:   themeSettings.company_phone   || '',
    email:   themeSettings.company_email   || '',
    website: themeSettings.company_website || '',
    vat:     themeSettings.company_vat     || '',
    cr:      themeSettings.company_cr      || '',
    logoUrl: themeSettings.logo_url        || '',
    bank:    themeSettings.bank_name       || '',
    iban:    themeSettings.bank_iban       || '',
    validityDays: themeSettings.quotation_validity_days || 30,
    terms:   isAr ? (themeSettings.terms_ar || '') : (themeSettings.terms_en || ''),
  };

  // ── Project / deal info ──────────────────────────────────────────────────────
  const client  = projectInfo.client_name  || (isAr ? 'اسم العميل'    : 'Client Name');
  const attn     = projectInfo.contact_name || projectInfo.attention || (isAr ? 'السيد / السيدة' : 'Sir / Madam');
  const project = projectInfo.project_name || (isAr ? 'اسم المشروع'   : 'Project Name');
  const bdName  = projectInfo.business_dev || projectInfo.prepared_by || (isAr ? 'تطوير الأعمال' : 'Business Development');
  const bdTitle = projectInfo.business_dev_title || (isAr ? 'تطوير الأعمال' : 'Business Development');
  const dealRef = projectInfo.deal_ref || projectInfo.opportunity_number || generateRef();

  const today  = new Date();
  const expiry = new Date(today);
  expiry.setDate(today.getDate() + co.validityDays);
  const fmtDate = d => d.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Pricing data ─────────────────────────────────────────────────────────────
  const lineBreakdown = results?.margin_breakdown?.products || [];
  const lineById = new Map(lineBreakdown.map(l => [l.id, l]));
  const totalSelling = results?.selling_price || results?.total_revenue || 0;
  const vatAmt   = totalSelling * 0.15;
  const grandTotal = totalSelling + vatAmt;

  // Order parents first, each immediately followed by its linked add-ons.
  // Parents are numbered 1..N; linked add-ons get sub-numbers (e.g. "2.1").
  // Unlinked (standalone) add-ons appear in a dedicated section at the end (A.1, A.2 …).
  const parentLines = selectedProducts.filter(p => !p.is_addon);
  const ordered = [];
  let parentNum = 0;
  parentLines.forEach(parent => {
    parentNum += 1;
    ordered.push({ p: parent, num: String(parentNum), isAddon: false, isUnlinked: false });
    let k = 0;
    selectedProducts
      .filter(c => c.is_addon && c.parent_id === parent.id)
      .forEach(child => { k += 1; ordered.push({ p: child, num: `${parentNum}.${k}`, isAddon: true, isUnlinked: false }); });
  });
  // Orphan add-ons whose parent exists but isn't in selectedProducts (edge case).
  selectedProducts
    .filter(p => p.is_addon && p.parent_id && !parentLines.some(pl => pl.id === p.parent_id))
    .forEach(child => { parentNum += 1; ordered.push({ p: child, num: String(parentNum), isAddon: true, isUnlinked: false }); });
  // Standalone (unlinked) add-ons — given A.N numbering with a section header.
  const unlinkedAddons = selectedProducts.filter(p => p.is_addon && !p.parent_id);
  if (unlinkedAddons.length > 0) {
    ordered.push({ p: null, num: 'A', isAddon: false, isUnlinked: true, isSectionBreak: true });
    unlinkedAddons.forEach((child, k) => {
      ordered.push({ p: child, num: `A.${k + 1}`, isAddon: true, isUnlinked: true, isSectionBreak: false });
    });
  }

  // Each service becomes a numbered section with its deliverables grouped by phase.
  // Section-break sentinel entries (isSectionBreak=true) produce a visual header row.
  const sections = ordered.map(({ p, num, isAddon, isUnlinked, isSectionBreak }) => {
    if (isSectionBreak) return { num, name: '', isSectionBreak: true };
    const line  = lineById.get(p.id);
    const price = Number(line?.selling) || 0;
    const tier  = (p.size || '').toUpperCase();
    const phases = parsePhases(p.deliverables_description || p.description || '');
    const modPhases = parsePhases(p.modifications_per_phase || '', { keepNumbers: true });
    const itemCount = phases.reduce((n, g) => n + g.items.length, 0);
    return { num, name: p.product_name || '', tier, phases, modPhases, itemCount, price, isAddon, isUnlinked };
  });
  // Services that carry agreed-modification terms (for the dedicated section).
  const modServices = sections.filter(s => !s.isSectionBreak && s.modPhases?.some(g => g.items.length > 0));

  const pmtRows = buildPaymentRows(paymentTerms, totalSelling, isAr);

  // ── Logo ─────────────────────────────────────────────────────────────────────
  const logoSrc = co.logoUrl || ZAN_LOGO_GOLD;
  const logoImg = (h) => `<img src="${logoSrc}" alt="${esc(brandName)}" style="height:${h}px;width:auto;display:block;" />`;

  // ── Capabilities (static, bilingual) — used in cover letter accent ───────────
  const aboutText = isAr
    ? (themeSettings.company_about_ar || 'زان وكالة إبداعية متكاملة متخصصة في تجارب الهوية والفعاليات والاتصالات الاستراتيجية في المملكة العربية السعودية ومنطقة الخليج. يسعدنا أن نضع بين أيديكم هذا العرض، آملين أن يلبي تطلعاتكم.')
    : (themeSettings.company_about || 'ZAN is a full-service creative agency specializing in brand experiences, events, and strategic communications across Saudi Arabia and the GCC. We are pleased to present this proposal and trust it meets your expectations.');

  // ── Reusable bits ────────────────────────────────────────────────────────────
  const pageFooter = (pageNo, totalPages) => `
    <div class="page-footer">
      <div class="page-footer-co">
        ${esc(isAr ? brandNameAr : brandName)}${co.address ? ` · ${esc(co.address)}` : ''}${co.cr ? ` · ${isAr ? 'س.ت' : 'C.R'} ${esc(co.cr)}` : ''}
      </div>
      <div class="page-footer-pg">${esc(dealRef)} · ${isAr ? 'صفحة' : 'Page'} ${pageNo} / ${totalPages}</div>
    </div>`;

  const pageHdr = () => `
    <div class="page-header">
      <div>${logoImg(30)}</div>
      <div class="page-header-meta">
        <div>${isAr ? 'عرض سعر' : 'Quotation'}: <strong>${esc(dealRef)}</strong></div>
        ${co.vat ? `<div>${isAr ? 'الرقم الضريبي' : 'VAT'}: ${esc(co.vat)}</div>` : ''}
        <div>${fmtDate(today)}</div>
      </div>
    </div>`;

  const sectionHead = (num, label) => `
    <div class="section-head">
      <div class="section-num">${num}</div>
      <div class="section-title">${label}</div>
    </div>`;

  // Count pages for footer "X / N"
  const pages = [];
  pages.push('cover');          // 1
  pages.push('letter');         // 2
  pages.push('scope');          // 3
  if (pmtRows.length > 0) pages.push('payment');
  if (modServices.length > 0) pages.push('mods');
  pages.push('terms');          // T&C
  pages.push('sign');           // signatures
  const totalPages = pages.length;
  const pno = key => pages.indexOf(key) + 1;
  // Section numbering runs across content pages (after the cover).
  const secNo = key => String(pages.indexOf(key)).padStart(2, '0');

  // ── Default ZAN terms when none configured ──────────────────────────────────
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
  const termsList = co.terms
    ? co.terms.split('\n').map(s => s.trim()).filter(Boolean)
    : defaultTerms;

  // ── HTML OUTPUT ──────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${isAr ? 'عرض سعر' : 'Quotation'} — ${esc(isAr ? co.nameAr : co.name)}</title>
  <style>
    ${ZAN_DOC_BASE_CSS}

    .page { position: relative; padding-bottom: 26mm; }

    /* ── Cover ─────────────────────────────────────────────────────── */
    .cover {
      background:
        radial-gradient(130% 80% at 50% 0%, ${g.plumSoft} 0%, ${g.plum} 46%, ${g.plumDeep} 100%);
      color: ${g.white};
      display: flex; flex-direction: column; justify-content: space-between;
      align-items: center; text-align: center;
      padding: 24mm 20mm; min-height: 297mm; overflow: hidden; position: relative;
    }
    /* Gold binding spine */
    .cover::before {
      content: ''; position: absolute; ${isAr ? 'right' : 'left'}: 0; top: 0; bottom: 0;
      width: 5px; background: linear-gradient(to bottom, ${g.gold}, ${g.gold} 30%, transparent 82%);
      z-index: 2;
    }
    /* Large logo-derived diamond motif bleeding off the bottom (centered) */
    .cover-motif {
      position: absolute; left: 50%; bottom: -180px; transform: translateX(-50%);
      width: 420px; height: 680px; opacity: 0.05; z-index: 0; pointer-events: none;
    }
    .cover-corner {
      position: absolute; left: 50%; top: 26px; transform: translateX(-50%);
      width: 70px; height: 0; z-index: 1; border-top: 2px solid ${g.gold}; opacity: 0.5;
    }
    .cover-inner { position: relative; z-index: 1; width: 100%; display: flex; flex-direction: column; align-items: center; }
    .cover-brand-row { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 26px; }
    .cover-wordmark { text-align: center; }
    .cover-wordmark .nm { font-size: 24px; font-weight: 900; letter-spacing: 3px; color: #fff; line-height: 1; }
    .cover-wordmark .tg { font-size: 9.5px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: ${g.gold}; margin-top: 7px; }
    .cover-rule { height: 2px; width: 70px; background: ${g.gold}; margin: 0 auto 26px; opacity: 0.85; }
    .cover-badge {
      display: inline-block; background: ${g.gold}; color: ${g.plumDeep};
      font-size: 10px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase;
      padding: 6px 20px; border-radius: 2px; margin-bottom: 24px;
    }
    .cover-title {
      font-size: 46px; font-weight: 900; line-height: 1.12; color: #fff;
      max-width: 600px; margin: 0 auto 16px; letter-spacing: -0.02em;
    }
    .cover-title-underline { height: 3px; width: 130px; background: linear-gradient(to right, transparent, ${g.gold}, transparent); margin: 0 auto 16px; }
    .cover-sub  { font-size: 15px; color: rgba(255,255,255,0.62); }
    .cover-sub b { color: #fff; font-weight: 700; }
    /* Horizontal meta strip with gold dividers */
    .cover-meta {
      display: flex; gap: 0; margin: 48px auto 0; max-width: 620px; width: 100%;
      border-top: 1px solid rgba(255,255,255,0.14); border-bottom: 1px solid rgba(255,255,255,0.14);
    }
    .cover-meta-item { flex: 1; padding: 16px 14px; }
    .cover-meta-item + .cover-meta-item { border-${isAr ? 'right' : 'left'}: 1px solid rgba(255,255,255,0.12); }
    .cover-meta-item label { font-size: 8.5px; color: ${g.gold}; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 6px; opacity: 0.9; }
    .cover-meta-item span  { font-size: 12px; color: rgba(255,255,255,0.92); font-weight: 600; }
    .cover-foot { position: relative; z-index: 1; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; font-size: 10px; color: rgba(255,255,255,0.4); text-align: ${isAr ? 'right' : 'left'}; }
    .cover-foot .wm { color: ${g.gold}; font-weight: 700; letter-spacing: 1.5px; }

    /* ── Page header / footer ──────────────────────────────────────── */
    .page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; margin-bottom: 26px; border-bottom: 1px solid ${g.border}; }
    .page-header-meta { text-align: ${isAr ? 'left' : 'right'}; font-size: 10px; color: ${g.muted}; line-height: 1.7; }
    .page-header-meta strong { color: ${g.plum}; }
    .page-footer {
      position: absolute; bottom: 12mm; left: 18mm; right: 18mm;
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid ${g.border}; padding-top: 8px;
      font-size: 8.5px; color: ${g.muted};
    }

    /* ── Section heads ─────────────────────────────────────────────── */
    .section-head { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid ${g.gold}; padding-bottom: 8px; margin-bottom: 20px; }
    .section-num { width: 26px; height: 26px; background: ${g.plum}; color: ${g.gold}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; flex-shrink: 0; }
    .section-title { font-size: 14px; font-weight: 700; color: ${g.black}; }

    /* ── Cover letter info table ───────────────────────────────────── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid ${g.border}; border-radius: 4px; overflow: hidden; margin-bottom: 28px; }
    .info-cell { padding: 10px 16px; border-bottom: 1px solid ${g.border}; }
    .info-cell:nth-child(odd)  { border-${isAr ? 'left' : 'right'}: 1px solid ${g.border}; background: ${g.lightBg}; }
    .info-cell label { font-size: 9px; color: ${g.muted}; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px; }
    .info-cell span  { font-size: 12px; font-weight: 600; color: ${g.black}; }
    .letter-body { font-size: 13px; color: #2a2a2a; line-height: 1.85; margin-bottom: 18px; }
    .letter-sign { margin-top: 28px; }
    .letter-sign .nm { font-size: 13px; font-weight: 700; color: ${g.black}; }
    .letter-sign .ti { font-size: 11px; color: ${g.muted}; margin-top: 2px; }

    /* ── Scope sections ────────────────────────────────────────────── */
    .svc-section { border: 1px solid ${g.border}; border-radius: 5px; overflow: hidden; margin-bottom: 16px; }
    .svc-head { display: flex; align-items: center; gap: 10px; background: ${g.plum}; color: #fff; padding: 11px 16px; }
    .svc-head .idx { width: 22px; height: 22px; border: 1px solid ${g.gold}; color: ${g.gold}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; border-radius: 2px; }
    .svc-head .nm { flex: 1; font-size: 13px; font-weight: 700; }
    .svc-head .tier { font-size: 9px; font-weight: 700; letter-spacing: 1px; color: ${g.gold}; border: 1px solid ${g.gold}66; padding: 2px 8px; border-radius: 2px; }
    .svc-head .amt { font-size: 14px; font-weight: 700; font-family: monospace; white-space: nowrap; color: ${g.gold}; }
    .svc-addon { margin-left: 22px; border-left: 3px solid ${g.gold}; }
    .svc-addon-standalone { margin-left: 0; border-left: 3px solid #6366f1; }
    .standalone-addons-header { margin: 18px 0 6px; padding: 8px 12px; background: #f5f3ff; border-radius: 4px; border: 1px solid #e0e7ff; }
    .standalone-addons-label { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #6366f1; }
    .svc-head .addon-tag { font-size: 8px; font-weight: 700; letter-spacing: 1px; color: ${g.plum}; background: ${g.gold}; padding: 2px 6px; border-radius: 2px; flex-shrink: 0; }
    .svc-items { padding: 12px 18px; }
    .svc-item { display: flex; gap: 10px; align-items: flex-start; font-size: 12px; color: #333; padding: 3px 0; line-height: 1.55; }
    .svc-item .dot { width: 5px; height: 5px; border-radius: 50%; background: ${g.gold}; margin-top: 7px; flex-shrink: 0; }
    .svc-empty { font-size: 11px; color: ${g.muted}; font-style: italic; }
    .phase-label {
      font-size: 10px; font-weight: 800; letter-spacing: 0.5px; color: ${g.plum};
      text-transform: uppercase; margin: 12px 0 6px; padding-${isAr ? 'right' : 'left'}: 10px;
      border-${isAr ? 'right' : 'left'}: 3px solid ${g.gold};
    }
    .phase-label:first-child { margin-top: 0; }
    .phase-items { padding-${isAr ? 'right' : 'left'}: 4px; }

    /* ── Totals box ────────────────────────────────────────────────── */
    .totals { border: 1.5px solid ${g.border}; border-radius: 5px; overflow: hidden; max-width: 380px; margin-${isAr ? 'right' : 'left'}: auto; margin-top: 22px; }
    .totals-row { display: flex; justify-content: space-between; padding: 11px 18px; font-size: 12px; border-bottom: 1px solid ${g.border}; }
    .totals-row:last-child { border-bottom: none; }
    .totals-row.total { background: ${g.plum}; color: #fff; font-weight: 700; font-size: 14px; }
    .totals-row .lab { color: ${g.muted}; }
    .totals-row.total .lab { color: rgba(255,255,255,0.7); }
    .totals-row .val { font-family: monospace; font-weight: 600; }
    .in-words { margin-top: 14px; padding: 12px 16px; background: ${g.lightBg}; border-radius: 4px; border: 1px dashed ${g.border}; font-size: 11.5px; color: #444; }
    .in-words b { color: ${g.black}; }

    /* ── Payment / terms ───────────────────────────────────────────── */
    .pmt-table th { background: ${g.lightBg}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${g.muted}; padding: 9px 12px; }
    .pmt-table td { padding: 10px 12px; border-bottom: 1px solid ${g.border}; font-size: 12px; }
    .bank-box { margin-top: 24px; padding: 16px 20px; background: ${g.lightBg}; border: 1px solid ${g.border}; border-radius: 4px; }
    .terms-list { counter-reset: t; list-style: none; padding: 0; }
    .terms-list li { counter-increment: t; position: relative; padding-${isAr ? 'right' : 'left'}: 30px; margin-bottom: 12px; font-size: 11.5px; color: #444; line-height: 1.7; }
    .terms-list li::before { content: counter(t); position: absolute; ${isAr ? 'right' : 'left'}: 0; top: 0; width: 20px; height: 20px; background: ${g.plum}; color: ${g.gold}; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border-radius: 2px; }

    /* ── Signatures ────────────────────────────────────────────────── */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 24px; }
    .sig-box { border: 1px solid ${g.border}; border-top: 3px solid ${g.gold}; padding: 20px; border-radius: 3px; }
    .sig-box h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: ${g.muted}; margin-bottom: 26px; }
    .sig-line { border-top: 1px solid ${g.plum}; margin-top: 8px; padding-top: 6px; font-size: 11px; color: ${g.muted}; }

    /* ── Agreed modifications ──────────────────────────────────────── */
    .mod-section { border: 1px solid ${g.border}; border-radius: 5px; overflow: hidden; margin-bottom: 14px; }
    .mod-head { display: flex; align-items: center; gap: 10px; background: ${g.lightBg}; padding: 9px 16px; border-bottom: 1px solid ${g.border}; }
    .mod-head .idx { width: 20px; height: 20px; background: ${g.plum}; color: ${g.gold}; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; border-radius: 2px; }
    .mod-head .nm { flex: 1; font-size: 12px; font-weight: 700; color: ${g.plum}; }
    .mod-head .cnt { font-size: 10px; font-weight: 700; color: ${g.darkGold}; background: ${g.gold}1f; border: 1px solid ${g.gold}55; padding: 2px 9px; border-radius: 10px; }
    .mod-items { padding: 10px 18px; }
    .mod-item { display: flex; gap: 10px; align-items: flex-start; font-size: 11.5px; color: #333; padding: 3px 0; }
    .mod-item .dot { width: 5px; height: 5px; border-radius: 50%; background: ${g.plumSoft}; margin-top: 7px; flex-shrink: 0; }

    .no-print { display: block; padding: 10px 20px; background: #f0f0f0; font-size: 12px; text-align: center; font-family: sans-serif; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>

<div class="no-print">
  📄 ${isAr ? 'معاينة' : 'Preview'} —
  <button onclick="window.print()" style="cursor:pointer;text-decoration:underline;background:none;border:none;font-size:12px;">
    🖨 ${isAr ? 'طباعة / حفظ PDF' : 'Print / Save as PDF'}
  </button>
</div>


<!-- ═══════════════════════════════════════ PAGE 1 · COVER -->
<div class="page cover">

  <!-- Decorative logo-derived diamond motif -->
  <svg class="cover-motif" viewBox="0 0 100 162" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,2 98,51 50,100 2,51" fill="${g.gold}"/>
    <path d="M2,51 L50,100 Q2,100 2,131 Q2,160 50,160 Q98,160 98,131 Q98,100 50,100 L98,51 Z" fill="${g.gold}"/>
  </svg>
  <div class="cover-corner"></div>

  <div class="cover-inner">
    <div class="cover-brand-row">
      ${logoImg(72)}
      <div class="cover-wordmark">
        <div class="nm">${esc(isAr ? brandNameAr : brandName)}</div>
        <div class="tg">${esc(tagline)}</div>
      </div>
    </div>

    <div class="cover-rule"></div>

    <div class="cover-badge">${isAr ? 'عرض سعر' : 'Quotation'}</div>
    <h1 class="cover-title">${esc(project)}</h1>
    <div class="cover-title-underline"></div>
    <p class="cover-sub">${isAr ? 'مُقدَّم إلى' : 'Prepared for'}: <b>${esc(client)}</b></p>

    <div class="cover-meta">
      <div class="cover-meta-item"><label>${isAr ? 'رقم المرجع' : 'Reference'}</label><span>${esc(dealRef)}</span></div>
      <div class="cover-meta-item"><label>${isAr ? 'تاريخ الإصدار' : 'Issued'}</label><span>${fmtDate(today)}</span></div>
      <div class="cover-meta-item"><label>${isAr ? 'صالح حتى' : 'Valid Until'}</label><span>${fmtDate(expiry)}</span></div>
      <div class="cover-meta-item"><label>${isAr ? 'أُعِدَّ بواسطة' : 'Prepared By'}</label><span>${esc(bdName)}</span></div>
    </div>
  </div>

  <div class="cover-foot">
    <span><span class="wm">${esc(isAr ? brandNameAr : brandName)}</span>${co.address ? `  ·  ${esc(co.address)}` : ''}</span>
    <span>${esc(co.email || co.phone || '')}</span>
  </div>
</div>


<!-- ═══════════════════════════════════════ PAGE 2 · COVER LETTER -->
<div class="page">
  ${pageHdr()}
  ${sectionHead('01', isAr ? 'تفاصيل العرض' : 'Quotation Details')}

  <div class="info-grid">
    <div class="info-cell"><label>${isAr ? 'رقم العرض' : 'Quotation No.'}</label><span>${esc(dealRef)}</span></div>
    <div class="info-cell"><label>${isAr ? 'التاريخ' : 'Date'}</label><span>${fmtDate(today)}</span></div>
    <div class="info-cell"><label>${isAr ? 'العميل' : 'Company'}</label><span>${esc(client)}</span></div>
    <div class="info-cell"><label>${isAr ? 'عناية' : 'Attention'}</label><span>${esc(attn)}</span></div>
    <div class="info-cell"><label>${isAr ? 'المشروع' : 'Project'}</label><span>${esc(project)}</span></div>
    <div class="info-cell"><label>${isAr ? 'صالح حتى' : 'Valid Until'}</label><span>${fmtDate(expiry)}</span></div>
  </div>

  <p class="letter-body">${isAr ? `السادة / ${esc(client)} المحترمين،` : `Dear ${esc(attn)},`}</p>
  <p class="letter-body">${esc(aboutText)}</p>
  <p class="letter-body">
    ${isAr
      ? 'نتقدم إليكم بهذا العرض الذي يوضح نطاق الخدمات المقترحة والاستثمار المطلوب، آملين أن يلبي احتياجاتكم ويحقق تطلعاتكم. يسعدنا تقديم أي توضيحات إضافية تحتاجونها.'
      : 'Please find below our proposal outlining the scope of services and the associated investment, which we trust will fulfil your requirements. We remain at your disposal for any further clarification you may need.'}
  </p>
  <p class="letter-body">${isAr ? 'شاكرين لكم حسن ثقتكم،' : 'Thank you for the opportunity to be of service.'}</p>

  <div class="letter-sign">
    <p style="font-size:11px;color:${g.muted};margin-bottom:6px;">${isAr ? 'مع خالص التقدير،' : 'Warm regards,'}</p>
    <p class="nm">${esc(bdName)}</p>
    <p class="ti">${esc(bdTitle)} · ${esc(isAr ? brandNameAr : brandName)}</p>
    ${co.phone || co.email ? `<p class="ti">${[co.phone, co.email].filter(Boolean).map(esc).join('  ·  ')}</p>` : ''}
  </div>
  ${pageFooter(pno('letter'), totalPages)}
</div>


<!-- ═══════════════════════════════════════ PAGE 3 · SCOPE & INVESTMENT -->
<div class="page">
  ${pageHdr()}
  ${sectionHead(secNo('scope'), isAr ? 'نطاق العمل والاستثمار' : 'Scope of Work & Investment')}

  ${sections.length > 0 ? sections.map(s => {
    if (s.isSectionBreak) return `
  <div class="standalone-addons-header">
    <div class="standalone-addons-label">${isAr ? 'الإضافات المستقلة' : 'Standalone Add-ons'}</div>
  </div>`;
    return `
  <div class="svc-section${s.isAddon ? ' svc-addon' : ''}${s.isUnlinked ? ' svc-addon-standalone' : ''}">
    <div class="svc-head">
      <div class="idx">${s.num}</div>
      ${s.isAddon ? `<div class="addon-tag">${isAr ? 'إضافة' : 'ADD-ON'}${s.isUnlinked ? (isAr ? ' مستقلة' : ' · STANDALONE') : ''}</div>` : ''}
      <div class="nm">${esc(s.name)}</div>
      ${s.tier ? `<div class="tier">${esc(s.tier)}</div>` : ''}
      <div class="amt">${s.price > 0 ? fmtSAR(s.price) : '—'}</div>
    </div>
    <div class="svc-items">
      ${s.itemCount > 0
        ? s.phases.map(grp => `
          ${grp.header ? `<div class="phase-label">${esc(grp.header)}</div>` : ''}
          <div class="phase-items">
            ${grp.items.map(it => `<div class="svc-item"><span class="dot"></span><span>${esc(it)}</span></div>`).join('')}
          </div>`).join('')
        : `<div class="svc-empty">${isAr ? 'يشمل تنفيذ الخدمة بالكامل وفق المتفق عليه.' : 'Full service delivery as agreed.'}</div>`}
    </div>
  </div>`;
  }).join('') : `
  <div class="svc-empty" style="padding:28px;text-align:center;border:1px dashed ${g.border};border-radius:5px;">
    ${isAr ? 'لم تتم إضافة خدمات بعد.' : 'No services added yet.'}
  </div>`}

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row"><span class="lab">${isAr ? 'المجموع الفرعي' : 'Subtotal'}</span><span class="val">${fmtSAR(totalSelling)}</span></div>
    <div class="totals-row"><span class="lab">${isAr ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</span><span class="val">${fmtSAR(vatAmt)}</span></div>
    <div class="totals-row total"><span class="lab">${isAr ? 'الإجمالي الكلي' : 'Total Investment'}</span><span class="val">${fmtSAR(grandTotal)}</span></div>
  </div>

  ${grandTotal > 0 ? `
  <div class="in-words">
    <b>${isAr ? 'الإجمالي كتابةً:' : 'Amount in words:'}</b>
    ${esc(amountInWords(grandTotal, isAr))}
  </div>` : ''}
  ${pageFooter(pno('scope'), totalPages)}
</div>


<!-- ═══════════════════════════════════════ PAGE 4 · PAYMENT (conditional) -->
${pmtRows.length > 0 ? `
<div class="page">
  ${pageHdr()}
  ${sectionHead(secNo('payment'), isAr ? 'جدول السداد' : 'Payment Schedule')}

  <table class="pmt-table" style="width:100%;">
    <thead>
      <tr>
        <th>${isAr ? 'المرحلة' : 'Milestone'}</th>
        <th style="text-align:center;width:70px;">${isAr ? 'النسبة' : '%'}</th>
        <th style="text-align:${isAr ? 'left' : 'right'};width:160px;">${isAr ? 'المبلغ (SAR)' : 'Amount (SAR)'}</th>
        <th>${isAr ? 'التوقيت' : 'Timing'}</th>
      </tr>
    </thead>
    <tbody>
      ${pmtRows.map(r => `
      <tr>
        <td style="font-weight:600;">${esc(r.label)}</td>
        <td style="text-align:center;">${r.percent}%</td>
        <td style="text-align:${isAr ? 'left' : 'right'};font-weight:700;font-family:monospace;white-space:nowrap;">${fmtSAR(r.amount)}</td>
        <td style="color:${g.muted};font-size:11px;">${esc(r.timing)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${co.bank || co.iban ? `
  <div class="bank-box">
    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${g.muted};margin-bottom:12px;">
      ${isAr ? 'بيانات التحويل البنكي' : 'Bank Transfer Details'}
    </p>
    <table style="width:auto;font-size:12px;">
      ${co.bank ? `<tr><td style="padding:3px 20px 3px 0;color:${g.muted}">${isAr ? 'البنك' : 'Bank'}</td><td style="font-weight:600">${esc(co.bank)}</td></tr>` : ''}
      ${co.iban ? `<tr><td style="padding:3px 20px 3px 0;color:${g.muted}">IBAN</td><td style="font-weight:600;font-family:monospace;letter-spacing:1px">${esc(co.iban)}</td></tr>` : ''}
    </table>
  </div>` : ''}
  ${pageFooter(pno('payment'), totalPages)}
</div>` : ''}


<!-- ═══════════════════════════════════════ AGREED MODIFICATIONS (conditional) -->
${modServices.length > 0 ? `
<div class="page">
  ${pageHdr()}
  ${sectionHead(secNo('mods'), isAr ? 'التعديلات المتفق عليها' : 'Agreed Modifications')}
  <p style="font-size:11.5px;color:${g.muted};margin-bottom:18px;line-height:1.7;">
    ${isAr
      ? 'يوضّح الجدول التالي عدد جولات التعديل المتفق عليها لكل خدمة. أي تعديلات إضافية تتجاوز المتفق عليه تخضع لتسعير منفصل.'
      : 'The following outlines the agreed rounds of modifications per service. Additional revisions beyond the agreed scope are subject to separate pricing.'}
  </p>
  ${modServices.map(s => {
    const modCount = s.modPhases.reduce((n, g) => n + g.items.length, 0);
    return `
  <div class="mod-section">
    <div class="mod-head">
      <div class="idx">${s.num}</div>
      <div class="nm">${esc(s.name)}</div>
      <div class="cnt">${modCount} ${isAr ? 'بند' : (modCount === 1 ? 'item' : 'items')}</div>
    </div>
    <div class="mod-items">
      ${s.modPhases.map(grp => `
        ${grp.header ? `<div class="phase-label" style="margin-top:6px;">${esc(grp.header)}</div>` : ''}
        ${grp.items.map(m => `<div class="mod-item"><span class="dot"></span><span>${esc(m)}</span></div>`).join('')}
      `).join('')}
    </div>
  </div>`; }).join('')}
  ${pageFooter(pno('mods'), totalPages)}
</div>` : ''}


<!-- ═══════════════════════════════════════ TERMS -->
<div class="page">
  ${pageHdr()}
  ${sectionHead(secNo('terms'), isAr ? 'الشروط والأحكام' : 'Terms & Conditions')}
  <ol class="terms-list">
    ${termsList.map(t => `<li>${esc(t)}</li>`).join('')}
  </ol>
  ${pageFooter(pno('terms'), totalPages)}
</div>


<!-- ═══════════════════════════════════════ PAGE 6 · SIGNATURES -->
<div class="page">
  ${pageHdr()}
  ${sectionHead(secNo('sign'), isAr ? 'القبول والتوقيعات' : 'Acceptance & Signatures')}
  <p style="font-size:12px;color:${g.muted};margin-bottom:26px;line-height:1.7;">
    ${isAr
      ? 'بالتوقيع أدناه، يُقرّ الطرفان بمراجعة هذا العرض وقبوله والالتزام بشروطه وأحكامه كاملةً.'
      : 'By signing below, both parties confirm they have reviewed and accepted this quotation, agreeing to its full terms and conditions.'}
  </p>
  <div class="sig-grid">
    <div class="sig-box">
      <h4>${isAr ? 'عن الوكالة' : 'For the Agency'}</h4>
      <p style="font-weight:700;font-size:13px;color:${g.black};">${esc(isAr ? co.nameAr : co.name)}</p>
      <p style="font-size:11px;color:${g.muted};margin-top:3px;">${esc(bdName)}</p>
      <div style="height:50px;"></div>
      <div class="sig-line">${isAr ? 'التوقيع — التاريخ' : 'Signature — Date'}</div>
    </div>
    <div class="sig-box">
      <h4>${isAr ? 'عن العميل' : 'For the Client'}</h4>
      <p style="font-weight:700;font-size:13px;color:${g.black};">${esc(client)}</p>
      <p style="font-size:11px;color:${g.muted};margin-top:3px;">${isAr ? 'الاسم والمسمى الوظيفي' : 'Name & Title'}</p>
      <div style="height:50px;"></div>
      <div class="sig-line">${isAr ? 'التوقيع — التاريخ' : 'Signature — Date'}</div>
    </div>
  </div>

  <div style="margin-top:40px;display:flex;justify-content:center;opacity:0.5;">${logoImg(40)}</div>
  ${pageFooter(pno('sign'), totalPages)}
</div>

</body>
</html>`;
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtSAR(num) {
  if (!num && num !== 0) return 'SAR —';
  return `SAR ${Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateRef() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `ZAN-${y}-${n}`;
}

/**
 * Matches a phase-header line: C1/C2… | Phase 1/2… | المرحلة الأولى/الثانية…
 */
const PHASE_HEADER_RE = /^(C\s*\d+\b|Phase\s*\d+\b|المرحلة\s+(الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة))/i;

/** Strip leading bullet/number markers from a line. */
function cleanLine(line, keepNumbers = false) {
  let s = line.replace(/^[-–—•*◦●▪]+\s*/, '');
  if (!keepNumbers) s = s.replace(/^(\d+|[٠-٩]+)[.)\-:]\s*/, '');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Parse a rich multi-phase description into grouped phases:
 *   [{ header: string|null, items: string[] }]
 * Phase-header lines become group titles; everything else becomes a bullet.
 * Consecutive headers (e.g. "C1- نبحث" then "المرحلة الأولى") are merged.
 */
export function parsePhases(text, { keepNumbers = false } = {}) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const groups = [];
  let cur = { header: null, items: [] };
  for (const line of lines) {
    if (PHASE_HEADER_RE.test(line)) {
      if (cur.items.length) { groups.push(cur); cur = { header: cleanHeader(line), items: [] }; }
      else { cur.header = cur.header ? `${cur.header} · ${cleanHeader(line)}` : cleanHeader(line); }
    } else {
      // A line may pack several "; " or " - " separated items.
      line.split(/;|·|•|(?:\s[-–]\s)/).forEach(part => {
        const c = cleanLine(part, keepNumbers);
        if (c.length > 1) cur.items.push(c);
      });
    }
  }
  if (cur.header || cur.items.length) groups.push(cur);
  return groups;
}

function cleanHeader(line) {
  return line.replace(/[:：]\s*$/, '').replace(/^[-–—•*]+\s*/, '').replace(/\s+/g, ' ').trim();
}

/** Flat list of deliverable bullets (used as a fallback / for short fields). */
export function splitDeliverables(text) {
  return parsePhases(text).flatMap(g => g.items);
}

/** Flat list of modification bullets, preserving leading counts. */
export function splitModifications(text) {
  return parsePhases(text, { keepNumbers: true }).flatMap(g => g.items);
}

export function buildPaymentRows(paymentTerms = [], totalSelling, isAr) {
  if (!paymentTerms?.length || !totalSelling) return [];
  return paymentTerms
    .map(term => {
      const pct = Number(term.advance_percent) || Number(term.percentage) || Number(term.percent) || 0;
      if (!pct) return null;
      return {
        label:   isAr ? (term.name_ar || term.name || '') : (term.name || ''),
        percent: pct,
        amount:  (totalSelling * pct) / 100,
        timing:  isAr ? (term.timing_ar || term.timing || '') : (term.timing || ''),
      };
    })
    .filter(Boolean);
}

/** Amount in words. English fully spelled; Arabic shows formatted total + ريال. */
export function amountInWords(total, isAr) {
  const whole = Math.floor(total);
  const halalas = Math.round((total - whole) * 100);
  if (isAr) {
    const num = whole.toLocaleString('ar-SA');
    return `${num} ريال سعودي${halalas > 0 ? ` و${halalas} هللة` : ''} لا غير.`;
  }
  const words = numberToWordsEN(whole);
  const cap = words.charAt(0).toUpperCase() + words.slice(1);
  return `Saudi Riyals ${cap}${halalas > 0 ? ` and ${numberToWordsEN(halalas)} Halalas` : ''} Only.`;
}

function numberToWordsEN(n) {
  if (n === 0) return 'zero';
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const scales = ['', 'thousand', 'million', 'billion'];

  const chunk = num => {
    let str = '';
    if (num >= 100) { str += ones[Math.floor(num / 100)] + ' hundred'; num %= 100; if (num) str += ' '; }
    if (num >= 20) { str += tens[Math.floor(num / 10)]; num %= 10; if (num) str += '-' + ones[num]; }
    else if (num > 0) { str += ones[num]; }
    return str;
  };

  let parts = [];
  let scaleIdx = 0;
  while (n > 0) {
    const c = n % 1000;
    if (c) parts.unshift(chunk(c) + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : ''));
    n = Math.floor(n / 1000);
    scaleIdx++;
  }
  return parts.join(' ').trim();
}
