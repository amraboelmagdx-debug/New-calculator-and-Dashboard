export default function CalculatorShell({ header, healthStrip, stepperMobile, sidebar, main, insightRail, mobileInsight, bottomNav, dialogs }) {
  return (
    <div className="min-h-screen">
      {header}
      {healthStrip}
      {stepperMobile}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr_360px] gap-6 p-4 sm:p-6 pb-28 lg:pb-6">
        {sidebar}
        {main}
        {insightRail}
      </div>
      {mobileInsight}
      {bottomNav}
      {dialogs}
    </div>
  );
}
