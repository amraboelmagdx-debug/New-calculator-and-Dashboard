import { AlertTriangle, Link2, Link2Off } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function IntelligenceAlerts({
  results,
  sheetPriceFloorWarning,
  productsTeamLink,
  calcData,
  isDarkMode,
}) {
  const alerts = [];

  if (sheetPriceFloorWarning) {
    alerts.push({
      key: 'floor',
      tone: 'amber',
      icon: AlertTriangle,
      message: `Selling price is below sheet minimum (${formatCurrency(sheetPriceFloorWarning.floor)}).`,
    });
  }

  if (results && (results.contribution_margin_percent ?? 0) < 20 && results.selling_price > 0) {
    alerts.push({
      key: 'margin',
      tone: 'amber',
      icon: AlertTriangle,
      message: 'Contribution margin is below 20%. Consider adjusting margins in Economics.',
    });
  }

  if (productsTeamLink === 'replace') {
    alerts.push({
      key: 'linked',
      tone: 'blue',
      icon: Link2,
      message: 'Team hours stay synced with product quantity changes.',
    });
  } else if (
    calcData?.team_members?.length > 0 &&
    productsTeamLink === null
  ) {
    alerts.push({
      key: 'unlinked',
      tone: 'neutral',
      icon: Link2Off,
      message: 'Team was edited manually and is no longer synced to products.',
    });
  }

  if (alerts.length === 0) return null;

  const toneClass = (tone) => {
    if (tone === 'amber') {
      return isDarkMode
        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        : 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (tone === 'blue') {
      return isDarkMode
        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
        : 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return isDarkMode
      ? 'bg-neutral-800/80 text-neutral-400 border-neutral-700'
      : 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-2 mb-4" data-testid="intelligence-alerts">
      {alerts.map(({ key, tone, icon: Icon, message }) => (
        <div
          key={key}
          className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${toneClass(tone)}`}
        >
          <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      ))}
    </div>
  );
}
