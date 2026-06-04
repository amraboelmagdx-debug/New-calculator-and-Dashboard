import ExecutiveQuoteRail from './ExecutiveQuoteRail';

/**
 * Permanent executive quote rail (desktop). Replaces step-based liveQuote/full variants.
 */
export default function InsightRail({
  results,
  calculating,
  isDarkMode,
  sheetPriceFloorWarning,
  calcData,
  exportPdfSlot,
  onSaveTemplate,
  onGoToScope,
  className = '',
  readiness,
  productCount = 0,
  selectedProducts = [],
  roles = [],
  standardMonthlyHours = 160,
  projectInfo,
  setProjectInfo,
  paymentTerms = [],
  setCalcData,
  onOpenQuoteSettings,
  variant: _variant = 'executive',
}) {
  return (
    <ExecutiveQuoteRail
      results={results}
      calculating={calculating}
      isDarkMode={isDarkMode}
      sheetPriceFloorWarning={sheetPriceFloorWarning}
      calcData={calcData}
      exportPdfSlot={exportPdfSlot}
      onSaveTemplate={onSaveTemplate}
      onGoToScope={onGoToScope}
      className={className}
      readiness={readiness}
      productCount={productCount}
      selectedProducts={selectedProducts}
      roles={roles}
      standardMonthlyHours={standardMonthlyHours}
      projectInfo={projectInfo}
      setProjectInfo={setProjectInfo}
      paymentTerms={paymentTerms}
      setCalcData={setCalcData}
      onOpenQuoteSettings={onOpenQuoteSettings}
    />
  );
}
