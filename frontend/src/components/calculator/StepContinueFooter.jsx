import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function StepContinueFooter({ label, onContinue, isDarkMode }) {
  return (
    <div className="flex justify-end pt-4">
      <Button
        type="button"
        onClick={onContinue}
        className={`gap-1 min-h-[44px] ${
          isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {label}
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
