import { DollarSign, Briefcase, LayoutTemplate, Target, MoreHorizontal } from 'lucide-react';

const TABS = [
  { id: 'insight', label: 'Price', icon: DollarSign },
  { id: 'frame', label: 'Frame', icon: Briefcase },
  { id: 'compose', label: 'Portfolio', icon: LayoutTemplate },
  { id: 'economics', label: 'Econ', icon: Target },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export default function BottomNav({ activeTab, onTabChange, isDarkMode }) {
  return (
    <nav
      className={`lg:hidden fixed bottom-0 inset-x-0 z-30 border-t safe-area-pb ${
        isDarkMode ? 'bg-neutral-950/95 border-neutral-800 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'
      }`}
      data-testid="bottom-nav"
    >
      <div className="flex items-stretch justify-around px-1 py-1">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 px-1 min-h-[44px] rounded-lg transition-colors ${
                active
                  ? isDarkMode
                    ? 'text-indigo-400'
                    : 'text-indigo-600'
                  : isDarkMode
                    ? 'text-neutral-500'
                    : 'text-slate-500'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
