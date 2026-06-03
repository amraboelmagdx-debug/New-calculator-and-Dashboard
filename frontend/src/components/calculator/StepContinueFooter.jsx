import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function StepContinueFooter({ label, onContinue, isDarkMode, sticky = false, contextLine }) {
  return (
    <div className={`flex flex-col items-stretch sm:items-end gap-2 ${sticky ? '' : 'pt-4'}`}>
      {contextLine && (
        <p className={`text-xs text-center sm:text-right ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
          {contextLine}
        </p>
      )}
      <Button
        type="button"
        onClick={onContinue}
        className={`gap-1 min-h-[44px] w-full sm:w-auto ${
          isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {label}
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
