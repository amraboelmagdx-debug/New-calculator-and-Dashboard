/**
 * ZAN brand font definitions.
 * Fonts are stored at /fonts/29LTZaridSansAL-*.otf (served from frontend/public/fonts/).
 * Used for embedding in HTML documents opened in a new window (print/PDF flow).
 */

export const ZAN_FONT_FACE_CSS = `
  @font-face {
    font-family: 'ZAN';
    font-weight: 200;
    font-style: normal;
    src: url('/fonts/29LTZaridSansAL-ExtraLight.otf') format('opentype');
  }
  @font-face {
    font-family: 'ZAN';
    font-weight: 400;
    font-style: normal;
    src: url('/fonts/29LTZaridSansAL-Regular.otf') format('opentype');
  }
  @font-face {
    font-family: 'ZAN';
    font-weight: 600;
    font-style: normal;
    src: url('/fonts/29LTZaridSansAL-SemiBold.otf') format('opentype');
  }
  @font-face {
    font-family: 'ZAN';
    font-weight: 900;
    font-style: normal;
    src: url('/fonts/29LTZaridSansAL-Black.otf') format('opentype');
  }
`;

/** Base document CSS — applied to all exported HTML documents */
export const ZAN_DOC_BASE_CSS = `
  ${ZAN_FONT_FACE_CSS}

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    font-family: 'ZAN', 'Cairo', 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a1a;
    background: #ffffff;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 20mm 18mm;
    background: #ffffff;
    page-break-after: always;
  }

  .page:last-child { page-break-after: avoid; }

  h1 { font-weight: 900; font-size: 28px; line-height: 1.2; }
  h2 { font-weight: 600; font-size: 18px; line-height: 1.3; }
  h3 { font-weight: 600; font-size: 14px; }
  h4 { font-weight: 600; font-size: 12px; }

  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 8px 12px; text-align: left; font-size: 12px; }

  /* RTL support */
  [dir="rtl"] th, [dir="rtl"] td { text-align: right; }

  @media print {
    html, body { background: white; }
    .page { page-break-after: always; box-shadow: none; }
    .no-print { display: none !important; }
  }
`;

/** ZAN brand colors */
export const ZAN_COLORS = {
  black:   '#0D0D0D',
  plum:    '#33092E',  // brand purple (from logo background)
  plumDeep:'#26071F',  // darker shade — depth / vignette
  plumSoft:'#4A1840',  // lighter shade — accents
  gold:    '#A68A40',  // real brand gold (from logo mark)
  darkGold:'#8B7236',
  lightBg: '#F8F6F2',
  border:  '#E8E4DC',
  muted:   '#6B6B6B',
  white:   '#FFFFFF',
};
