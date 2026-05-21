import { useMemo, useCallback } from 'react';
import { computeQuoteReadiness, getStepCompletion, DEAL_STEPS } from '@/components/calculator/quoteSteps';

/**
 * Quote workflow helpers — state remains in Calculator; this hook bundles readiness + step rules.
 */
export function useQuoteWorkflow(ctx) {
  const readiness = useMemo(() => computeQuoteReadiness(ctx), [
    ctx.projectInfo,
    ctx.selectedProducts,
    ctx.calcData,
    ctx.results,
  ]);

  const stepCompletion = useMemo(() => {
    const map = {};
    DEAL_STEPS.forEach(step => {
      map[step.id] = getStepCompletion(step.id, ctx);
    });
    return map;
  }, [ctx.projectInfo, ctx.selectedProducts, ctx.calcData, ctx.results]);

  const isStepComplete = useCallback(
    (stepId) => getStepCompletion(stepId, ctx),
    [ctx]
  );

  return { readiness, stepCompletion, isStepComplete, DEAL_STEPS };
}
