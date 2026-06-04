export const DEFAULT_PORTFOLIO_CARD_UI = {
  isOpen: false,
  panel: null,
  teamEditorsOpen: false,
};

/** @typedef {'team' | 'risk' | 'margin' | 'insights'} PortfolioPanelId */

export function getPortfolioCardUi(portfolioUi, id) {
  const raw = portfolioUi[id];
  if (!raw) return { ...DEFAULT_PORTFOLIO_CARD_UI };
  return migratePortfolioCardUi(raw);
}

/** Support legacy row/teamExpanded keys from prior implementation */
function migratePortfolioCardUi(raw) {
  if (typeof raw.isOpen === 'boolean') {
    return {
      isOpen: raw.isOpen,
      panel: raw.panel ?? null,
      teamEditorsOpen: raw.teamEditorsOpen ?? raw.teamExpanded ?? false,
    };
  }
  const isOpen = raw.row === 'summary';
  return {
    isOpen,
    panel: raw.panel ?? null,
    teamEditorsOpen: raw.teamExpanded ?? raw.teamEditorsOpen ?? false,
  };
}

export function collapseCardUi() {
  return { isOpen: false, panel: null, teamEditorsOpen: false };
}

export function expandCardUiSummary() {
  return { isOpen: true, panel: null, teamEditorsOpen: false };
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

export function isPortfolioFullyCollapsed(portfolioUi, products) {
  if (!products.length) return true;
  return products.every(p => {
    const ui = getPortfolioCardUi(portfolioUi, p.id);
    return !ui.isOpen && !ui.panel;
  });
}

export function isPortfolioFullyExpandedSummary(portfolioUi, products) {
  if (!products.length) return true;
  return products.every(p => {
    const ui = getPortfolioCardUi(portfolioUi, p.id);
    return ui.isOpen && !ui.panel && !ui.teamEditorsOpen;
  });
}
