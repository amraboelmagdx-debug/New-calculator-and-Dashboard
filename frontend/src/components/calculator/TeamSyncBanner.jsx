import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export default function TeamSyncBanner({
  isDarkMode,
  onReviewChanges,
  onSyncTeam,
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg px-4 py-3 border ${
        isDarkMode
          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100'
          : 'bg-indigo-50 border-indigo-200 text-indigo-950'
      }`}
      data-testid="team-sync-banner"
      role="status"
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Users className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="text-sm font-medium">Team is out of sync with products</p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReviewChanges}
          className={
            isDarkMode
              ? 'border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/20'
              : 'border-indigo-300 text-indigo-800 hover:bg-indigo-100'
          }
        >
          Review changes
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSyncTeam}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Sync team
        </Button>
      </div>
    </div>
  );
}
