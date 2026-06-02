import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function IncludedTeamScope({ includedTeam, isDarkMode }) {
  const [open, setOpen] = useState(false);

  if (!includedTeam || includedTeam.isAllIn) {
    return (
      <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        {includedTeam?.summary || 'All-in package'}
      </p>
    );
  }

  if (!includedTeam.roleCount) {
    return (
      <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>—</p>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={`flex w-full items-center justify-between gap-2 py-1 text-left text-xs ${
          isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>{includedTeam.summary}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <ul className={`space-y-1.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
          {includedTeam.roles.map((role, i) => (
            <li key={`${role.name}-${i}`} className="flex justify-between gap-3 text-xs">
              <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-700'}>{role.name}</span>
              <span className="font-mono tabular-nums shrink-0">{role.hours}h</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
