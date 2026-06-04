import { Info } from 'lucide-react';

export default function WorkspaceAnalysisBanner({ isDarkMode, message }) {
  return (
    <div
      className={`flex items-start gap-2 mb-4 p-2.5 rounded-lg border ${
        isDarkMode ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-200/90' : 'border-indigo-100 bg-indigo-50/80 text-indigo-900'
      }`}
      data-testid="workspace-analysis-banner"
    >
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />
      <p className="text-[11px] leading-snug">{message}</p>
    </div>
  );
}
