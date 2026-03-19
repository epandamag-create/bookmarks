// v1.1 — 10 color schemes from Theme Factory showcase
// v1.2 — persist CSS vars to localStorage to remove duplicate data from index.html

window.COLOR_SCHEMES = [
  {
    id:           'ocean-depths',
    name:         'Ocean Depths',
    swatch:       '#2d8b8b',
    accent:       '#2d8b8b',
    accentHover:  '#236e6e',
    accentBg:     'rgba(45,139,139,0.1)',
    accentBorder: 'rgba(45,139,139,0.25)',
    accentGlow:   'rgba(45,139,139,0.35)',
  },
  {
    id:           'sunset-boulevard',
    name:         'Sunset Boulevard',
    swatch:       '#e76f51',
    accent:       '#e76f51',
    accentHover:  '#d4583a',
    accentBg:     'rgba(231,111,81,0.1)',
    accentBorder: 'rgba(231,111,81,0.25)',
    accentGlow:   'rgba(231,111,81,0.35)',
  },
  {
    id:           'forest-canopy',
    name:         'Forest Canopy',
    swatch:       '#4a7c59',
    accent:       '#4a7c59',
    accentHover:  '#3a6146',
    accentBg:     'rgba(74,124,89,0.1)',
    accentBorder: 'rgba(74,124,89,0.25)',
    accentGlow:   'rgba(74,124,89,0.35)',
  },
  {
    id:           'modern-minimalist',
    name:         'Modern Minimalist',
    swatch:       '#708090',
    accent:       '#708090',
    accentHover:  '#5a6a78',
    accentBg:     'rgba(112,128,144,0.1)',
    accentBorder: 'rgba(112,128,144,0.25)',
    accentGlow:   'rgba(112,128,144,0.35)',
  },
  {
    id:           'golden-hour',
    name:         'Golden Hour',
    swatch:       '#f4a900',
    accent:       '#f4a900',
    accentHover:  '#d99200',
    accentBg:     'rgba(244,169,0,0.1)',
    accentBorder: 'rgba(244,169,0,0.25)',
    accentGlow:   'rgba(244,169,0,0.35)',
  },
  {
    id:           'arctic-frost',
    name:         'Arctic Frost',
    swatch:       '#4a6fa5',
    accent:       '#4a6fa5',
    accentHover:  '#3a5a8a',
    accentBg:     'rgba(74,111,165,0.1)',
    accentBorder: 'rgba(74,111,165,0.25)',
    accentGlow:   'rgba(74,111,165,0.35)',
  },
  {
    id:           'desert-rose',
    name:         'Desert Rose',
    swatch:       '#b87d6d',
    accent:       '#b87d6d',
    accentHover:  '#a06558',
    accentBg:     'rgba(184,125,109,0.1)',
    accentBorder: 'rgba(184,125,109,0.25)',
    accentGlow:   'rgba(184,125,109,0.35)',
  },
  {
    id:           'tech-innovation',
    name:         'Tech Innovation',
    swatch:       '#0066ff',
    accent:       '#0066ff',
    accentHover:  '#0052cc',
    accentBg:     'rgba(0,102,255,0.1)',
    accentBorder: 'rgba(0,102,255,0.25)',
    accentGlow:   'rgba(0,102,255,0.35)',
  },
  {
    id:           'botanical-garden',
    name:         'Botanical Garden',
    swatch:       '#f9a620',
    accent:       '#f9a620',
    accentHover:  '#e0901a',
    accentBg:     'rgba(249,166,32,0.1)',
    accentBorder: 'rgba(249,166,32,0.25)',
    accentGlow:   'rgba(249,166,32,0.35)',
  },
  {
    id:           'midnight-galaxy',
    name:         'Midnight Galaxy',
    swatch:       '#a490c2',
    accent:       '#a490c2',
    accentHover:  '#8e78ad',
    accentBg:     'rgba(164,144,194,0.1)',
    accentBorder: 'rgba(164,144,194,0.25)',
    accentGlow:   'rgba(164,144,194,0.35)',
  },
];

window.applyScheme = function(schemeId) {
  const scheme = window.COLOR_SCHEMES.find(s => s.id === schemeId);
  if (!scheme) return;
  const r = document.documentElement;
  r.style.setProperty('--scheme-accent',        scheme.accent);
  r.style.setProperty('--scheme-accent-hover',  scheme.accentHover);
  r.style.setProperty('--scheme-accent-bg',     scheme.accentBg);
  r.style.setProperty('--scheme-accent-border', scheme.accentBorder);
  r.style.setProperty('--scheme-accent-glow',   scheme.accentGlow);
  localStorage.setItem('bm_scheme', scheme.id);
  localStorage.setItem('bm_scheme_vars', JSON.stringify({
    accent:       scheme.accent,
    accentHover:  scheme.accentHover,
    accentBg:     scheme.accentBg,
    accentBorder: scheme.accentBorder,
    accentGlow:   scheme.accentGlow,
  }));
};

window.restoreScheme = function() {
  const saved = localStorage.getItem('bm_scheme');
  if (saved) window.applyScheme(saved);
};
