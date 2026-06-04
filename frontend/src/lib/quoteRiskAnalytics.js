import {
  computeRiskSellingImpact,
  computeProductHealthScore,
  deriveLineValidation,
} from '@/lib/productWorkspaceUtils';

function riskBand(mult) {
  const m = Number(mult) || 1;
  if (m <= 1.001) return '1.0x';
  if (m <= 1.2) return '1.1–1.2x';
  return '1.2x+';
}

function riskScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Watch';
  return 'High Risk';
}

export function buildQuoteRiskAnalytics(selectedProducts = [], results) {
  const lineBreakdown = results?.margin_breakdown?.products || [];
  const lineById = new Map(lineBreakdown.map(l => [l.id, l]));
  const products = (selectedProducts || []).filter(p => p.product_name);

  const enriched = [];
  let riskSellingImpactTotal = 0;
  const bandCounts = { '1.0x': 0, '1.1–1.2x': 0, '1.2x+': 0 };
  let scoreSum = 0;
  let scoreCount = 0;

  for (const item of products) {
    const line = lineById.get(item.id);
    const mult = Number(line?.risk_multiplier) || 1;
    const impact = line ? computeRiskSellingImpact(line, item.margin_percent) : 0;
    const healthScore = computeProductHealthScore(line, item);
    const validation = deriveLineValidation(line, item);

    riskSellingImpactTotal += impact;
    bandCounts[riskBand(mult)] = (bandCounts[riskBand(mult)] || 0) + 1;

    if (healthScore != null) {
      scoreSum += healthScore;
      scoreCount += 1;
    }

    enriched.push({
      id: item.id,
      name: item.product_name || 'Untitled service',
      tier: item.size,
      riskMultiplier: mult,
      riskSellingImpact: impact,
      healthScore,
      validation,
      selling: line?.selling ?? 0,
    });
  }

  const productsByRisk = [...enriched].sort((a, b) => b.riskMultiplier - a.riskMultiplier);
  const highestRiskProducts = productsByRisk.filter(p => p.riskMultiplier > 1.001).slice(0, 6);

  const impactTotal = riskSellingImpactTotal;
  const riskContribution = enriched
    .map(p => ({
      ...p,
      impactPercent: impactTotal > 0 ? Math.round((p.riskSellingImpact / impactTotal) * 1000) / 10 : 0,
    }))
    .filter(p => p.riskSellingImpact > 0)
    .sort((a, b) => b.riskSellingImpact - a.riskSellingImpact);

  const quoteRiskScore =
    scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;

  return {
    quoteRiskScore,
    quoteRiskLabel: quoteRiskScore != null ? riskScoreLabel(quoteRiskScore) : '—',
    productsByRisk,
    riskSellingImpactTotal,
    highestRiskProducts,
    riskContribution,
    riskDistribution: bandCounts,
    internalRiskMultiplier: results?.internal_risk_multiplier ?? null,
    totalRiskMultiplier: results?.total_risk_multiplier ?? null,
    productCount: products.length,
  };
}
