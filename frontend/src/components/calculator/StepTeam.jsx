import QuoteTeamDashboard from './QuoteTeamDashboard';

export default function StepTeam({
  embedded = false,
  isDarkMode,
  selectedProducts = [],
  results,
  roles = [],
  standardMonthlyHours = 160,
}) {
  const body = (
    <QuoteTeamDashboard
      isDarkMode={isDarkMode}
      selectedProducts={selectedProducts}
      results={results}
      roles={roles}
      standardMonthlyHours={standardMonthlyHours}
    />
  );

  if (embedded) {
    return (
      <div id="team" data-testid="team-rollup-embedded">
        {body}
      </div>
    );
  }

  return (
    <section id="team" className="animate-fade-in quote-panel-enter" data-testid="team-rollup">
      <div className={isDarkMode ? 'dark-card rounded-xl p-6' : 'bg-white border border-slate-200 rounded-xl p-6 shadow-sm'}>
        {body}
      </div>
    </section>
  );
}
