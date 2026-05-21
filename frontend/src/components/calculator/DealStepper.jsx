import { Check } from 'lucide-react';
import { DEAL_STEPS } from './quoteSteps';

export default function DealStepper({
  activeStep,
  onStepClick,
  stepCompletion,
  isDarkMode,
  horizontal = false,
}) {
  if (horizontal) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" data-testid="deal-stepper-mobile">
        {DEAL_STEPS.map(step => {
          const complete = stepCompletion[step.id];
          const active = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? isDarkMode
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                  : isDarkMode
                    ? 'border-neutral-700 text-neutral-400'
                    : 'border-slate-200 text-slate-600'
              }`}
            >
              {complete ? <Check className="w-3 h-3 text-emerald-500" /> : <step.icon className="w-3 h-3" />}
              {step.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav
      className={`hidden lg:block sticky top-24 h-fit space-y-1 p-3 rounded-xl border ${
        isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white shadow-sm border-slate-200'
      }`}
      data-testid="deal-stepper"
    >
      <p className={`px-2 pb-2 text-xs font-medium ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
        Deal steps
      </p>
      {DEAL_STEPS.map(step => {
        const complete = stepCompletion[step.id];
        const active = activeStep === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 border-l-2 ${
              active
                ? isDarkMode
                  ? 'text-neutral-50 bg-neutral-800 border-l-indigo-500'
                  : 'text-slate-900 bg-slate-100 border-l-indigo-600'
                : isDarkMode
                  ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 border-l-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-l-transparent'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                complete
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : isDarkMode
                    ? 'bg-neutral-800 text-neutral-500'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {complete ? <Check className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
            </span>
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}
