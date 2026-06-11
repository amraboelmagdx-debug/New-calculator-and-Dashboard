import { Briefcase, LayoutTemplate, Target, FileText, Puzzle } from 'lucide-react';

/** Steps where being "not complete" should show as "Optional" rather than "Incomplete" */
export const OPTIONAL_STEPS = new Set(['economics', 'addons']);

export const DEAL_STEPS = [
  { id: 'frame', label: 'Opportunity', sectionIds: ['project'], icon: Briefcase },
  { id: 'compose', label: 'Portfolio', sectionIds: ['products'], icon: LayoutTemplate },
  { id: 'economics', label: 'Resources', sectionIds: ['vendors'], icon: Target },
  { id: 'addons', label: 'Add-ons', sectionIds: ['addons'], icon: Puzzle },
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
    case 'economics': {
      const hasGlobalTeam = (calcData?.team_members?.length || 0) > 0;
      const hasGlobalVendors = (calcData?.vendors?.length || 0) > 0;
      const hasProductResources = (selectedProducts || []).some(
        p => (p.team_members?.length || 0) + (p.vendors?.length || 0) > 0
      );
      return hasGlobalTeam || hasGlobalVendors || hasProductResources;
    }
    case 'addons':
      return (selectedProducts || []).some(p => p.is_addon);
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
