export const DEFAULT_PORTFOLIO_CARD_UI = {
  panel: null,
  teamEditorsOpen: false,
};

/** @typedef {'team' | 'risk' | 'margin' | 'insights'} PortfolioPanelId */

export function getPortfolioCardUi(portfolioUi, id) {
  const raw = portfolioUi[id];
  if (!raw) return { ...DEFAULT_PORTFOLIO_CARD_UI };
  return migratePortfolioCardUi(raw);
}

/** Support legacy row/teamExpanded/isOpen keys from prior implementations */
function migratePortfolioCardUi(raw) {
  return {
    panel: raw.panel ?? null,
    teamEditorsOpen: raw.teamEditorsOpen ?? raw.teamExpanded ?? false,
  };
}

export function closePanel(ui) {
  return { ...ui, panel: null, teamEditorsOpen: false };
}

export function syncPortfolioUiForIds(prev, ids) {
  const next = {};
  ids.forEach(id => {
    next[id] = prev[id] ? migratePortfolioCardUi(prev[id]) : { ...DEFAULT_PORTFOLIO_CARD_UI };
  });
  return next;
}
