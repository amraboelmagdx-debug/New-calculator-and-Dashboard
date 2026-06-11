import { ZAN_DOC_BASE_CSS, ZAN_COLORS } from '@/lib/zanFonts';

/**
 * Technical Proposal — methodology, approach, team structure, timeline.
 * Security: team roles visible but NO salary, hourly rate, or cost data.
 */
export function buildTechnicalHTML({ projectInfo = {}, selectedProducts = [], results, themeSettings = {}, language = 'en' }) {
  const isAr = language === 'ar';
  const dir  = isAr ? 'rtl' : 'ltr';

  const co = {
    name:  themeSettings.company_name    || 'ZAN',
    nameAr:themeSettings.company_name_ar || 'زان',
    logo:  themeSettings.logo_url        || '',
    phone: themeSettings.company_phone   || '',
    email: themeSettings.company_email   || '',
    vat:   themeSettings.company_vat     || '',
  };

  const client  = projectInfo.client_name  || (isAr ? 'اسم العميل' : 'Client Name');
  const project = projectInfo.project_name || (isAr ? 'اسم المشروع' : 'Project Name');
  const dealRef = projectInfo.deal_ref     || generateRef();

  const today   = new Date();
  const fmtDate = d => d.toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const gold = ZAN_COLORS.gold;

  // Collect unique roles (no cost data)
  const teamRoles = [];
  const seen = new Set();
  for (const p of selectedProducts) {
    for (const m of p.team_members || []) {
      const key = m.role_name || m.role_id;
      if (key && !seen.has(key)) {
        seen.add(key);
        teamRoles.push({ role: m.role_name || 'Team Member', qty: m.quantity || 1 });
      }
    }
  }

  // Timeline phases — auto-generate from product count
  const totalDays = estimateDays(selectedProducts);
  const phases = buildTimeline(selectedProducts, totalDays, isAr);

  return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>${isAr ? 'العرض الفني' : 'Technical Proposal'} — ${co.name}</title>
  <style>
    ${ZAN_DOC_BASE_CSS}

    .cover {
      background: ${ZAN_COLORS.black}; color: #fff;
      min-height: 297mm; padding: 24mm 20mm;
      display: flex; flex-direction: column; justify-content: space-between;
    }
    .cover-badge { display: inline-block; background: ${gold}; color: ${ZAN_COLORS.black}; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; padding: 4px 14px; border-radius: 2px; margin-bottom: 32px; }
    .cover-title { font-size: 40px; font-weight: 900; line-height: 1.15; max-width: 520px; }
    .cover-gold-line { height: 3px; background: linear-gradient(${isAr?'to left':'to right'}, ${gold}, transparent); width: 80px; margin: 20px 0 32px; }
    .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 36px; }
    .cover-meta-item label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 4px; }
    .cover-meta-item span  { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 600; }
    .cover-footer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 18px; display:flex; justify-content:space-between; }
    .cover-footer p { font-size: 11px; color: rgba(255,255,255,0.3); }

    .section-header { border-bottom: 2px solid ${gold}; padding-bottom: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .section-number { width: 28px; height: 28px; background: ${ZAN_COLORS.black}; color: ${gold}; font-size: 13px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .section-title { font-size: 15px; font-weight: 700; }

    .highlight-box { background: ${ZAN_COLORS.lightBg}; border-left: 3px solid ${gold}; padding: 16px 20px; border-radius: 0 4px 4px 0; margin: 16px 0; }
    [dir="rtl"] .highlight-box { border-left: none; border-right: 3px solid ${gold}; border-radius: 4px 0 0 4px; }

    .deliverable-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .deliverable-card { border: 1px solid ${ZAN_COLORS.border}; border-radius: 4px; padding: 16px; }
    .deliverable-card h3 { font-size: 13px; margin-bottom: 8px; color: ${ZAN_COLORS.black}; }
    .deliverable-card ul { margin: 0; padding-${isAr?'right':'left'}: 16px; }
    .deliverable-card li { font-size: 11px; color: ${ZAN_COLORS.muted}; margin-bottom: 4px; }

    .team-table th { background: ${ZAN_COLORS.black}; color: ${gold}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px; }
    .team-table td { padding: 9px 12px; border-bottom: 1px solid ${ZAN_COLORS.border}; font-size: 12px; }

    .timeline-table th { background: ${ZAN_COLORS.lightBg}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${ZAN_COLORS.muted}; padding: 8px 12px; }
    .timeline-table td { padding: 10px 12px; border-bottom: 1px solid ${ZAN_COLORS.border}; font-size: 12px; }
    .timeline-bar { height: 6px; background: ${gold}; border-radius: 3px; }

    .no-print { padding: 10px 20px; background: #f0f0f0; font-size: 12px; text-align: center; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>

<div class="no-print">
  📋 ${isAr ? 'معاينة العرض الفني' : 'Technical Proposal Preview'} —
  <button onclick="window.print()" style="cursor:pointer;text-decoration:underline;background:none;border:none;font-size:12px;">
    🖨 ${isAr ? 'طباعة / PDF' : 'Print / PDF'}
  </button>
</div>

<!-- COVER -->
<div class="page cover">
  <div>
    <div>${co.logo?`<img src="${co.logo}" alt="${co.name}" style="height:50px"/>`:`<div style="font-size:30px;font-weight:900;color:${gold};letter-spacing:4px">${(co.name||'').toUpperCase()}</div>`}</div>
    <div class="cover-gold-line"></div>
    <div class="cover-badge">${isAr ? 'العرض الفني' : 'Technical Proposal'}</div>
    <h1 class="cover-title">${escHtml(project)}</h1>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>${isAr?'العميل':'Client'}</label><span>${escHtml(client)}</span></div>
      <div class="cover-meta-item"><label>${isAr?'المرجع':'Reference'}</label><span>${escHtml(dealRef)}</span></div>
      <div class="cover-meta-item"><label>${isAr?'التاريخ':'Date'}</label><span>${fmtDate(today)}</span></div>
      <div class="cover-meta-item"><label>${isAr?'الجدول الزمني':'Timeline'}</label><span>~${totalDays} ${isAr?'يوم عمل':'working days'}</span></div>
    </div>
  </div>
  <div class="cover-footer"><p>${co.name}</p><p>${co.email||''}</p></div>
</div>

<!-- UNDERSTANDING THE BRIEF -->
<div class="page">
  ${pageHeader(co, isAr, dealRef)}

  <div class="section-header">
    <div class="section-number">01</div>
    <div class="section-title">${isAr ? 'فهم المطلوب' : 'Understanding the Brief'}</div>
  </div>

  <div class="highlight-box">
    <p style="font-size:12px;line-height:1.7">
      ${isAr
        ? `لقد قمنا بدراسة متطلبات مشروع <strong>${escHtml(project)}</strong> لصالح <strong>${escHtml(client)}</strong> بعناية. نفهم أن هذا المشروع يتطلب تقديم ${selectedProducts.length > 0 ? escHtml(selectedProducts.map(p=>p.product_name||'خدمة').join(' و ')) : 'خدمات متكاملة'} بمستوى يعكس هوية علامتكم التجارية ويحقق أهدافكم الاستراتيجية.`
        : `We have carefully reviewed the requirements for <strong>${escHtml(project)}</strong> for <strong>${escHtml(client)}</strong>. We understand this engagement requires delivery of ${selectedProducts.length > 0 ? selectedProducts.map(p => `<strong>${escHtml(p.product_name||'')}</strong>`).join(', ') : 'integrated services'} at a standard that reflects your brand identity and achieves your strategic objectives.`
      }
    </p>
  </div>

  <div style="margin-top:24px;">
    <h3 style="font-size:13px;margin-bottom:12px">${isAr ? 'نطاق الخدمات المقترحة' : 'Proposed Scope of Services'}</h3>
    <div class="deliverable-grid">
      ${selectedProducts.map(p => `
      <div class="deliverable-card">
        <h3>${escHtml(p.product_name || '')}</h3>
        <ul>
          ${generateDeliverables(p, isAr).map(d => `<li>${escHtml(d)}</li>`).join('')}
        </ul>
      </div>`).join('')}
    </div>
  </div>
</div>

<!-- OUR APPROACH -->
<div class="page">
  ${pageHeader(co, isAr, dealRef)}

  <div class="section-header">
    <div class="section-number">02</div>
    <div class="section-title">${isAr ? 'نهجنا في العمل' : 'Our Approach'}</div>
  </div>

  ${approachSection(isAr, gold)}

  <div style="margin-top:28px;">
    <div class="section-header">
      <div class="section-number">03</div>
      <div class="section-title">${isAr ? 'فريق العمل المقترح' : 'Proposed Team Structure'}</div>
    </div>

    ${teamRoles.length > 0 ? `
    <table class="team-table" style="width:100%">
      <thead><tr>
        <th>${isAr?'الدور':'Role'}</th>
        <th style="text-align:center">${isAr?'العدد':'Count'}</th>
        <th>${isAr?'المسؤوليات الرئيسية':'Key Responsibilities'}</th>
      </tr></thead>
      <tbody>
        ${teamRoles.map(r => `
        <tr>
          <td style="font-weight:600">${escHtml(r.role)}</td>
          <td style="text-align:center">${r.qty}</td>
          <td style="color:${ZAN_COLORS.muted}">${getRoleResponsibility(r.role, isAr)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : `
    <div class="highlight-box">
      <p style="font-size:12px;color:${ZAN_COLORS.muted}">
        ${isAr ? 'سيتم تحديد فريق العمل بشكل تفصيلي بعد الموافقة على العرض.' : 'Detailed team composition will be confirmed upon proposal acceptance.'}
      </p>
    </div>`}
  </div>
</div>

<!-- TIMELINE -->
<div class="page">
  ${pageHeader(co, isAr, dealRef)}

  <div class="section-header">
    <div class="section-number">04</div>
    <div class="section-title">${isAr ? 'الجدول الزمني المقترح' : 'Proposed Timeline'}</div>
  </div>

  <table class="timeline-table" style="width:100%">
    <thead><tr>
      <th>${isAr?'المرحلة':'Phase'}</th>
      <th>${isAr?'الأنشطة':'Activities'}</th>
      <th style="text-align:center">${isAr?'المدة (أيام)':'Duration (days)'}</th>
      <th style="width:120px">${isAr?'التقدم المقترح':'Proposed Progress'}</th>
    </tr></thead>
    <tbody>
      ${phases.map((ph, i) => {
        const barWidth = Math.round((ph.days / totalDays) * 100);
        return `
        <tr>
          <td><strong style="color:${ZAN_COLORS.black}">${i+1}. ${escHtml(ph.name)}</strong></td>
          <td style="color:${ZAN_COLORS.muted};font-size:11px">${escHtml(ph.activities)}</td>
          <td style="text-align:center;font-weight:700">${ph.days}</td>
          <td><div class="timeline-bar" style="width:${barWidth}%"></div></td>
        </tr>`;
      }).join('')}
      <tr style="font-weight:700;border-top:2px solid ${ZAN_COLORS.black}">
        <td colspan="2">${isAr?'الإجمالي':'Total'}</td>
        <td style="text-align:center">${totalDays}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top:20px;padding:14px 18px;background:${ZAN_COLORS.lightBg};border-radius:4px;">
    <p style="font-size:11px;color:${ZAN_COLORS.muted}">
      ${isAr
        ? '* الجدول الزمني تقديري ويخضع للتعديل بناءً على سرعة الموافقة من جانب العميل وتوافر المواد المطلوبة.'
        : '* Timeline is indicative and subject to adjustment based on client approval turnaround and availability of required assets.'}
    </p>
  </div>
</div>

</body>
</html>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function generateRef() {
  return `OPE-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
}
function pageHeader(co, isAr, ref) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid ${ZAN_COLORS.border}">
    <div>${co.logo?`<img src="${co.logo}" alt="${co.name}" style="height:36px"/>`:`<div style="font-size:18px;font-weight:900;letter-spacing:3px">${(co.name||'').toUpperCase()}</div>`}</div>
    <div style="text-align:${isAr?'left':'right'};font-size:11px;color:${ZAN_COLORS.muted};line-height:1.6">
      <div>${isAr?'العرض الفني رقم':'Technical Proposal Ref.'}: <strong>${escHtml(ref)}</strong></div>
      ${co.phone?`<div>${co.phone}</div>`:''}
      ${co.email?`<div>${co.email}</div>`:''}
    </div>
  </div>`;
}

function estimateDays(products) {
  // Simple estimate: 10 days per service minimum
  return Math.max(10, (products.length || 1) * 12);
}

function buildTimeline(products, totalDays, isAr) {
  const phases = isAr ? [
    { name: 'التحضير والتخطيط',    activities: 'إحاطة الفريق، مراجعة المواد، خطة المشروع',                  portion: 0.15 },
    { name: 'التصميم والتطوير',     activities: 'إنتاج المحتوى، التصميم الأولي، المراجعة الداخلية',           portion: 0.50 },
    { name: 'المراجعة والتعديلات',  activities: 'عرض على العميل، استقبال الملاحظات، التعديلات',               portion: 0.20 },
    { name: 'التسليم النهائي',      activities: 'الإنتاج النهائي، ملفات التسليم، الجلسة الختامية',            portion: 0.15 },
  ] : [
    { name: 'Kick-off & Planning',    activities: 'Team briefing, asset review, project plan',                   portion: 0.15 },
    { name: 'Design & Development',   activities: 'Content production, initial design, internal review',         portion: 0.50 },
    { name: 'Review & Revisions',     activities: 'Client presentation, feedback rounds, amendments',            portion: 0.20 },
    { name: 'Final Delivery',         activities: 'Final production, delivery files, wrap-up session',           portion: 0.15 },
  ];
  return phases.map(p => ({ ...p, days: Math.max(2, Math.round(totalDays * p.portion)) }));
}

function generateDeliverables(product, isAr) {
  // Generic deliverables based on product name keywords
  const name = (product.product_name || '').toLowerCase();
  if (isAr) {
    if (name.includes('brand') || name.includes('هوية')) return ['دليل الهوية البصرية', 'ملفات الشعار', 'تطبيقات الهوية'];
    if (name.includes('social') || name.includes('سوشيال')) return ['تصاميم للمنصات الرئيسية', 'خطة محتوى', 'نصوص إعلانية'];
    if (name.includes('video') || name.includes('فيديو')) return ['سيناريو وستوري بورد', 'مونتاج وألوان', 'نسخ متعددة'];
    return ['توصيف تفصيلي', 'ملفات نهائية', 'دعم ما بعد التسليم'];
  } else {
    if (name.includes('brand') || name.includes('identity')) return ['Brand identity guide', 'Logo files', 'Brand applications'];
    if (name.includes('social') || name.includes('digital')) return ['Platform-specific designs', 'Content calendar', 'Ad copy'];
    if (name.includes('video') || name.includes('film')) return ['Script & storyboard', 'Color grade & edit', 'Multi-format exports'];
    return ['Detailed specifications', 'Final deliverable files', 'Post-delivery support'];
  }
}

function getRoleResponsibility(role, isAr) {
  const r = (role||'').toLowerCase();
  if (isAr) {
    if (r.includes('director') || r.includes('مدير')) return 'قيادة المشروع والإشراف الإبداعي';
    if (r.includes('design') || r.includes('مصمم')) return 'تنفيذ التصاميم والمواد البصرية';
    if (r.includes('manag') || r.includes('manager')) return 'إدارة الجداول الزمنية والتواصل';
    if (r.includes('strateg') || r.includes('استراتيجي')) return 'الاستراتيجية والرؤية الإبداعية';
    return 'تنفيذ المهام المتخصصة';
  } else {
    if (r.includes('director')) return 'Project leadership & creative oversight';
    if (r.includes('design')) return 'Visual execution & asset production';
    if (r.includes('manag')) return 'Timeline management & client communication';
    if (r.includes('strateg')) return 'Strategy & creative direction';
    return 'Specialized task execution';
  }
}

function approachSection(isAr, gold) {
  const steps = isAr ? [
    { num: '01', title: 'الاستماع والفهم',   desc: 'نبدأ بجلسة إحاطة شاملة لفهم رؤيتكم وأهدافكم وجمهوركم المستهدف قبل وضع أي توجه إبداعي.' },
    { num: '02', title: 'الاستراتيجية الإبداعية', desc: 'نطور استراتيجية إبداعية مبنية على البيانات والفهم العميق لعلامتكم التجارية وتوقعات جمهوركم.' },
    { num: '03', title: 'التنفيذ المتقن',    desc: 'فريق متخصص يتعامل مع كل مرحلة من مراحل التنفيذ بحرفية عالية مع التزام صارم بالجداول الزمنية.' },
    { num: '04', title: 'المراجعة والتحسين', desc: 'نؤمن بالتعاون المستمر — جلسات مراجعة منتظمة وقنوات تواصل مفتوحة طوال مدة المشروع.' },
  ] : [
    { num: '01', title: 'Listen & Understand',  desc: 'We start with a thorough brief session to understand your vision, objectives, and audience before committing to any creative direction.' },
    { num: '02', title: 'Creative Strategy',    desc: 'We develop a data-informed creative strategy rooted in deep understanding of your brand and audience expectations.' },
    { num: '03', title: 'Expert Execution',     desc: 'A dedicated specialist team handles each phase with high craft standards and strict commitment to agreed timelines.' },
    { num: '04', title: 'Review & Refine',      desc: 'We believe in continuous collaboration — regular review sessions and open communication channels throughout the project.' },
  ];
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    ${steps.map(s => `
    <div style="border:1px solid ${ZAN_COLORS.border};padding:16px;border-radius:4px">
      <div style="width:32px;height:32px;background:${ZAN_COLORS.black};color:${gold};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;margin-bottom:10px">${s.num}</div>
      <h3 style="font-size:13px;font-weight:700;margin-bottom:6px">${escHtml(s.title)}</h3>
      <p style="font-size:11px;color:${ZAN_COLORS.muted};line-height:1.6">${escHtml(s.desc)}</p>
    </div>`).join('')}
  </div>`;
}
