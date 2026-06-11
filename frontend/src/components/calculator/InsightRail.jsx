import ExecutiveQuoteRail from './ExecutiveQuoteRail';

/**
 * Permanent executive quote rail (desktop). Replaces step-based liveQuote/full variants.
 */
export default function InsightRail({
  results,
  previewSelling,
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
  setPaymentTerms,
  setCalcData,
  onOpenQuoteSettings,
  setSelectedProducts,
  findCatalogProduct,
  getSegmentPayload,
  variant: _variant = 'executive',
}) {
  return (
    <ExecutiveQuoteRail
      results={results}
      previewSelling={previewSelling}
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
      setPaymentTerms={setPaymentTerms}
      setCalcData={setCalcData}
      onOpenQuoteSettings={onOpenQuoteSettings}
      setSelectedProducts={setSelectedProducts}
      findCatalogProduct={findCatalogProduct}
      getSegmentPayload={getSegmentPayload}
    />
  );
}
