import { Briefcase, LayoutTemplate, Target, FileText } from 'lucide-react';

export const DEAL_STEPS = [
  { id: 'frame', label: 'Opportunity', sectionIds: ['project'], icon: Briefcase },
  { id: 'compose', label: 'Portfolio', sectionIds: ['products'], icon: LayoutTemplate },
  { id: 'economics', label: 'Resources', sectionIds: ['vendors'], icon: Target },
  { id: 'review', label: 'Review', sectionIds: ['review'], icon: FileText },
];

export function getStepCompletion(stepId, { projectInfo, selectedProducts, calcData, results }) {
  const hasValidProduct = selectedProducts?.some(
    p => p.product_name && p.size && (Number(p.quantity) || 0) > 0
  );
  switch (stepId) {
    case 'frame':
      return Boolean(
        projectInfo?.opportunity_id?.trim() ||
          projectInfo?.client_name?.trim() ||
          projectInfo?.project_name?.trim()
      );
    case 'compose':
      return hasValidProduct || (calcData?.team_members?.length > 0);
    case 'economics':
      return true;
    case 'review':
      return results != null;
    default:
      return false;
  }
}

export function computeQuoteReadiness(ctx) {
  const steps = DEAL_STEPS.map(s => ({
    id: s.id,
    complete: getStepCompletion(s.id, ctx),
  }));
  const done = steps.filter(s => s.complete).length;
  const percent = Math.round((done / steps.length) * 100);
  const remaining = steps.filter(s => !s.complete);
  return { percent, done, total: steps.length, remaining, steps };
}

export function sectionIdToDealStep(sectionId) {
  const found = DEAL_STEPS.find(s => s.sectionIds.includes(sectionId));
  return found?.id || 'frame';
}

export function dealStepToPrimarySection(stepId) {
  return DEAL_STEPS.find(s => s.id === stepId)?.sectionIds[0] || 'project';
}
