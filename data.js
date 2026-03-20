// v1.0 — data layer: mock data, localStorage, CRUD, Fuse search, AI simulation
// v1.1 — added: faviconUrl() for real site icons via Google favicon service

window.DB = (() => {
  const STORAGE_KEY = 'bookmark_os_v1';

  const PRESET_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#10b981','#06b6d4','#3b82f6','#84cc16','#f97316','#64748b','#e2e8f0'];

  function uuid() {
    return 'bk_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
  }

  function domainOf(url) {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  }

  function faviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return null; }
  }

  function faviconEmoji(url) {
    const d = domainOf(url);
    const map = {
      'figma.com':'🎨','framer.com':'🖼️','dribbble.com':'🎯','behance.net':'🅱️','mobbin.com':'📱',
      'github.com':'🐙','mdn.mozilla.org':'📖','css-tricks.com':'✨','web.dev':'🌐','vercel.com':'▲',
      'netlify.com':'💠','tailwindcss.com':'🌊','vitejs.dev':'⚡','svelte.dev':'🔶','astro.build':'🚀',
      'claude.ai':'🤖','midjourney.com':'🎨','perplexity.ai':'🔍','openai.com':'🧠','huggingface.co':'🤗',
      'notion.so':'📝','linear.app':'📐','raycast.com':'⚡','arc.net':'🌈','obsidian.md':'💎',
      'youtube.com':'▶️','twitter.com':'🐦','x.com':'✖️','linkedin.com':'💼','reddit.com':'🟠',
    };
    for (const [k, v] of Object.entries(map)) { if (d.includes(k)) return v; }
    return '🔗';
  }

  const defaultData = {
    tabs: [
      { id: 'tab_design', name: 'Design', color: '#8b5cf6', isShared: false, sharePassword: '', shareTitle: '' },
      { id: 'tab_dev', name: 'Development', color: '#06b6d4', isShared: false, sharePassword: '', shareTitle: '' },
      { id: 'tab_ai', name: 'AI Tools', color: '#10b981', isShared: false, sharePassword: '', shareTitle: '' },
      { id: 'tab_prod', name: 'Productivity', color: '#f59e0b', isShared: false, sharePassword: '', shareTitle: '' },
    ],
    categories: [
      { id: 'cat_ux', name: 'UX Research', color: '#8b5cf6', tabId: 'tab_design' },
      { id: 'cat_ui', name: 'UI Tools', color: '#ec4899', tabId: 'tab_design' },
      { id: 'cat_inspo', name: 'Inspiration', color: '#f59e0b', tabId: 'tab_design' },
      { id: 'cat_frontend', name: 'Frontend', color: '#06b6d4', tabId: 'tab_dev' },
      { id: 'cat_backend', name: 'Backend & Infra', color: '#6366f1', tabId: 'tab_dev' },
      { id: 'cat_docs', name: 'Docs & Reference', color: '#10b981', tabId: 'tab_dev' },
      { id: 'cat_llm', name: 'LLMs', color: '#10b981', tabId: 'tab_ai' },
      { id: 'cat_imagegen', name: 'Image Gen', color: '#ec4899', tabId: 'tab_ai' },
      { id: 'cat_aitools', name: 'AI Utilities', color: '#06b6d4', tabId: 'tab_ai' },
      { id: 'cat_pm', name: 'Project Mgmt', color: '#f59e0b', tabId: 'tab_prod' },
      { id: 'cat_notes', name: 'Notes & Writing', color: '#6366f1', tabId: 'tab_prod' },
    ],
    bookmarks: [
      { id: uuid(), title: 'Figma', url: 'https://figma.com', description: 'Collaborative interface design tool used by thousands of product teams.', tags: ['design','ui','prototyping','collaboration'], notes: '', favicon: '🎨', color: '#8b5cf6', createdAt: '2024-01-10T10:00:00Z', updatedAt: '2024-01-10T10:00:00Z', visitCount: 42, favorite: true, aiSummary: 'Figma is the industry-standard collaborative design tool for UI and UX.', aiTopics: ['design', 'prototyping', 'collaboration'], categoryId: 'cat_ui', inCatalog: false },
      { id: uuid(), title: 'Framer', url: 'https://framer.com', description: 'Design and ship your dream site. Zero code, maximum speed.', tags: ['design','no-code','web'], notes: '', favicon: '🖼️', color: '#ec4899', createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', visitCount: 18, favorite: false, aiSummary: 'Framer is a powerful no-code tool for designing and publishing interactive websites.', aiTopics: ['no-code', 'web design', 'animations'], categoryId: 'cat_ui', inCatalog: false },
      { id: uuid(), title: 'Mobbin', url: 'https://mobbin.com', description: 'World\'s largest UI & UX reference library with real app screenshots.', tags: ['ux','reference','mobile','patterns'], notes: 'Great for mobile UI inspiration', favicon: '📱', color: '#f59e0b', createdAt: '2024-02-01T10:00:00Z', updatedAt: '2024-02-01T10:00:00Z', visitCount: 31, favorite: true, aiSummary: 'Mobbin is the most comprehensive library of real mobile app UI patterns and flows.', aiTopics: ['ux research', 'mobile', 'patterns'], categoryId: 'cat_ux', inCatalog: false },
      { id: uuid(), title: 'Dribbble', url: 'https://dribbble.com', description: 'Discover the world\'s top designers & creatives.', tags: ['inspiration','design','portfolio'], notes: '', favicon: '🎯', color: '#ec4899', createdAt: '2024-02-10T10:00:00Z', updatedAt: '2024-02-10T10:00:00Z', visitCount: 12, favorite: false, aiSummary: 'Dribbble is a community platform for discovering and showcasing creative work.', aiTopics: ['inspiration', 'portfolio', 'community'], categoryId: 'cat_inspo', inCatalog: false },
      { id: uuid(), title: 'Awwwards', url: 'https://awwwards.com', description: 'The awards of design, creativity and innovation on the internet.', tags: ['inspiration','web','awards'], notes: 'Check weekly for new entries', favicon: '🏆', color: '#f59e0b', createdAt: '2024-02-20T10:00:00Z', updatedAt: '2024-02-20T10:00:00Z', visitCount: 9, favorite: false, aiSummary: 'Awwwards recognizes the best web design talent and creativity globally.', aiTopics: ['web design', 'inspiration', 'awards'], categoryId: 'cat_inspo', inCatalog: false },
      { id: uuid(), title: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: 'Resources for developers, by developers. The web\'s definitive reference.', tags: ['docs','dev','reference','html','css','js'], notes: 'Best JS reference', favicon: '📖', color: '#10b981', createdAt: '2024-01-05T10:00:00Z', updatedAt: '2024-01-05T10:00:00Z', visitCount: 89, favorite: true, aiSummary: 'MDN is the most comprehensive and authoritative web development reference.', aiTopics: ['documentation', 'web standards', 'reference'], categoryId: 'cat_docs', inCatalog: false },
      { id: uuid(), title: 'CSS-Tricks', url: 'https://css-tricks.com', description: 'Daily articles about CSS, HTML, JavaScript, and all things related to web design.', tags: ['css','dev','frontend','tutorials'], notes: '', favicon: '✨', color: '#06b6d4', createdAt: '2024-01-12T10:00:00Z', updatedAt: '2024-01-12T10:00:00Z', visitCount: 34, favorite: false, aiSummary: 'CSS-Tricks is a premier web design publication focused on front-end techniques.', aiTopics: ['css', 'frontend', 'tutorials'], categoryId: 'cat_frontend', inCatalog: false },
      { id: uuid(), title: 'Vite', url: 'https://vitejs.dev', description: 'Next Generation Frontend Tooling. Fast and lean development.', tags: ['build-tool','dev','frontend','fast'], notes: '', favicon: '⚡', color: '#6366f1', createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-03-01T10:00:00Z', visitCount: 22, favorite: false, aiSummary: 'Vite is a blazing-fast frontend build tool that dramatically improves the development experience.', aiTopics: ['build tool', 'frontend', 'javascript'], categoryId: 'cat_frontend', inCatalog: false },
      { id: uuid(), title: 'Vercel', url: 'https://vercel.com', description: 'Develop. Preview. Ship. The platform for frontend developers.', tags: ['hosting','deployment','dev','cdn'], notes: 'Use for all new projects', favicon: '▲', color: '#06b6d4', createdAt: '2024-03-05T10:00:00Z', updatedAt: '2024-03-05T10:00:00Z', visitCount: 56, favorite: true, aiSummary: 'Vercel is the leading platform for deploying modern frontend applications.', aiTopics: ['hosting', 'deployment', 'serverless'], categoryId: 'cat_backend', inCatalog: false },
      { id: uuid(), title: 'GitHub', url: 'https://github.com', description: 'Where the world builds software. Version control and collaboration.', tags: ['dev','git','code','open-source'], notes: '', favicon: '🐙', color: '#64748b', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z', visitCount: 120, favorite: true, aiSummary: 'GitHub is the world\'s leading platform for software development and version control.', aiTopics: ['version control', 'open source', 'collaboration'], categoryId: 'cat_backend', inCatalog: false },
      { id: uuid(), title: 'Claude', url: 'https://claude.ai', description: 'Anthropic\'s AI assistant. Helpful, harmless, and honest.', tags: ['ai','llm','assistant','chat'], notes: 'Best for coding and writing', favicon: '🤖', color: '#10b981', createdAt: '2024-02-15T10:00:00Z', updatedAt: '2024-02-15T10:00:00Z', visitCount: 78, favorite: true, aiSummary: 'Claude is Anthropic\'s highly capable AI assistant with strong reasoning and coding abilities.', aiTopics: ['ai', 'llm', 'chat'], categoryId: 'cat_llm', inCatalog: false },
      { id: uuid(), title: 'Perplexity AI', url: 'https://perplexity.ai', description: 'Ask anything. AI-powered search with real-time web access.', tags: ['ai','search','llm'], notes: '', favicon: '🔍', color: '#06b6d4', createdAt: '2024-02-20T10:00:00Z', updatedAt: '2024-02-20T10:00:00Z', visitCount: 45, favorite: false, aiSummary: 'Perplexity is an AI search engine that provides cited, real-time answers.', aiTopics: ['search', 'ai', 'research'], categoryId: 'cat_llm', inCatalog: false },
      { id: uuid(), title: 'Midjourney', url: 'https://midjourney.com', description: 'AI image generation. Create breathtaking art from text prompts.', tags: ['ai','image-gen','art','design'], notes: 'v6 is insane for product mockups', favicon: '🎨', color: '#ec4899', createdAt: '2024-03-10T10:00:00Z', updatedAt: '2024-03-10T10:00:00Z', visitCount: 29, favorite: true, aiSummary: 'Midjourney is a leading AI image generation tool known for artistic quality.', aiTopics: ['image generation', 'ai art', 'design'], categoryId: 'cat_imagegen', inCatalog: false },
      { id: uuid(), title: 'Notion', url: 'https://notion.so', description: 'The all-in-one workspace for notes, docs, projects, and wikis.', tags: ['productivity','notes','docs','wiki'], notes: 'Main knowledge base', favicon: '📝', color: '#e2e8f0', createdAt: '2024-01-08T10:00:00Z', updatedAt: '2024-01-08T10:00:00Z', visitCount: 93, favorite: true, aiSummary: 'Notion is a flexible all-in-one workspace combining notes, databases, and project management.', aiTopics: ['notes', 'productivity', 'knowledge management'], categoryId: 'cat_notes', inCatalog: false },
      { id: uuid(), title: 'Linear', url: 'https://linear.app', description: 'The issue tracker built for high-performance teams. Fast, opinionated, beautiful.', tags: ['productivity','project-management','issues','dev'], notes: 'Switch from Jira', favicon: '📐', color: '#6366f1', createdAt: '2024-03-15T10:00:00Z', updatedAt: '2024-03-15T10:00:00Z', visitCount: 37, favorite: false, aiSummary: 'Linear is a streamlined project management tool designed for software teams.', aiTopics: ['project management', 'issues', 'workflow'], categoryId: 'cat_pm', inCatalog: false },
      { id: uuid(), title: 'Raycast', url: 'https://raycast.com', description: 'A collection of powerful productivity tools all within an extendable launcher.', tags: ['productivity','launcher','mac','tools'], notes: 'Replace Spotlight', favicon: '⚡', color: '#f59e0b', createdAt: '2024-03-20T10:00:00Z', updatedAt: '2024-03-20T10:00:00Z', visitCount: 61, favorite: true, aiSummary: 'Raycast is a blazing-fast launcher for macOS that supercharges developer productivity.', aiTopics: ['productivity', 'automation', 'launcher'], categoryId: 'cat_pm', inCatalog: false },
    ],
    dashboardColumns: 4,
  };

  let data = null;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.warn('Save failed:', e); }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        // Ensure arrays exist
        if (!data.categories) data.categories = [];
        if (!data.tabs) data.tabs = defaultData.tabs;
      } else {
        data = JSON.parse(JSON.stringify(defaultData));
        save();
      }
    } catch(e) {
      data = JSON.parse(JSON.stringify(defaultData));
      save();
    }
    return data;
  }

  // ── BOOKMARKS ──
  function getBookmarks(tabId) {
    const catIds = new Set(data.categories.filter(c => c.tabId === tabId).map(c => c.id));
    return data.bookmarks.filter(b => !b.inCatalog && catIds.has(b.categoryId));
  }
  function getAllBookmarks() { return data.bookmarks.filter(b => !b.inCatalog); }
  function getCatalog() { return data.bookmarks.filter(b => b.inCatalog); }
  function getStarredCount() { return data.bookmarks.filter(b => b.favorite).length; }
  function getBookmarkById(id) { return data.bookmarks.find(b => b.id === id) || null; }

  function addBookmark(bm) {
    const now = new Date().toISOString();
    const item = {
      id: uuid(),
      title: bm.title || domainOf(bm.url),
      url: bm.url,
      description: bm.description || '',
      tags: bm.tags || [],
      notes: bm.notes || '',
      favicon: bm.favicon || faviconEmoji(bm.url),
      color: bm.color || '',
      createdAt: now,
      updatedAt: now,
      visitCount: 0,
      favorite: false,
      aiSummary: '',
      aiTopics: [],
      categoryId: bm.categoryId || (data.categories[0] ? data.categories[0].id : ''),
      inCatalog: bm.inCatalog || false,
    };
    data.bookmarks.unshift(item);
    save();
    return item;
  }

  function updateBookmark(id, patch) {
    const idx = data.bookmarks.findIndex(b => b.id === id);
    if (idx < 0) return null;
    data.bookmarks[idx] = { ...data.bookmarks[idx], ...patch, updatedAt: new Date().toISOString() };
    save();
    return data.bookmarks[idx];
  }

  function deleteBookmark(id) {
    data.bookmarks = data.bookmarks.filter(b => b.id !== id);
    save();
  }

  function deleteBookmarks(ids) {
    const set = new Set(ids);
    data.bookmarks = data.bookmarks.filter(b => !set.has(b.id));
    save();
  }

  function moveToCatalog(id) {
    const bm = getBookmarkById(id);
    if (!bm) return;
    updateBookmark(id, { inCatalog: true });
  }

  function restoreFromCatalog(id) {
    updateBookmark(id, { inCatalog: false });
  }

  function incrementVisit(id) {
    const bm = getBookmarkById(id);
    if (bm) updateBookmark(id, { visitCount: (bm.visitCount || 0) + 1 });
  }

  function findDuplicate(url) {
    const norm = url.trim().replace(/\/$/, '');
    return data.bookmarks.find(b => b.url.trim().replace(/\/$/, '') === norm) || null;
  }

  // ── CATEGORIES ──
  function getCategories(tabId) {
    return data.categories
      .filter(c => c.tabId === tabId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  function getAllCategories() { return data.categories; }
  function getCategoryById(id) { return data.categories.find(c => c.id === id) || null; }

  function addCategory(cat) {
    const tabCats = data.categories.filter(c => c.tabId === cat.tabId);
    const maxOrder = tabCats.reduce((m, c) => Math.max(m, c.order ?? 0), -1);
    const item = { id: uuid(), name: cat.name, color: cat.color || '#6366f1', tabId: cat.tabId, order: maxOrder + 1 };
    data.categories.push(item);
    save();
    return item;
  }

  function reorderCategories(tabId, orderedIds) {
    orderedIds.forEach((id, idx) => {
      const cat = data.categories.find(c => c.id === id);
      if (cat) cat.order = idx;
    });
    save();
  }

  function updateCategory(id, patch) {
    const idx = data.categories.findIndex(c => c.id === id);
    if (idx < 0) return null;
    data.categories[idx] = { ...data.categories[idx], ...patch };
    save();
    return data.categories[idx];
  }

  function deleteCategory(id) {
    data.categories = data.categories.filter(c => c.id !== id);
    data.bookmarks = data.bookmarks.filter(b => b.categoryId !== id);
    save();
  }

  // ── TABS ──
  function getTabs() { return data.tabs; }
  function getTabById(id) { return data.tabs.find(t => t.id === id) || null; }

  function addTab(tab) {
    const item = { id: uuid(), name: tab.name || 'New Workspace', color: tab.color || '#6366f1', isShared: false, sharePassword: '', shareTitle: '' };
    data.tabs.push(item);
    save();
    return item;
  }

  function updateTab(id, patch) {
    const idx = data.tabs.findIndex(t => t.id === id);
    if (idx < 0) return null;
    data.tabs[idx] = { ...data.tabs[idx], ...patch };
    save();
    return data.tabs[idx];
  }

  function deleteTab(id) {
    data.tabs = data.tabs.filter(t => t.id !== id);
    // Delete all categories in this tab
    const catIds = data.categories.filter(c => c.tabId === id).map(c => c.id);
    const catSet = new Set(catIds);
    data.categories = data.categories.filter(c => c.tabId !== id);
    data.bookmarks = data.bookmarks.filter(b => !catSet.has(b.categoryId));
    save();
  }

  // ── TAGS ──
  function getAllTags(includeCatalog = false) {
    const counts = {};
    for (const bm of data.bookmarks) {
      if (!includeCatalog && bm.inCatalog) continue;
      for (const t of (bm.tags || [])) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  }

  function getUniqueTagsList() {
    const tags = new Set();
    for (const bm of data.bookmarks) { for (const t of (bm.tags || [])) tags.add(t); }
    return Array.from(tags).sort();
  }

  // ── SEARCH ──
  let fuseInstance = null;
  function buildFuse() {
    fuseInstance = new Fuse(data.bookmarks, {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'tags', weight: 2 },
        { name: 'description', weight: 1.5 },
        { name: 'notes', weight: 1 },
        { name: 'url', weight: 0.5 },
      ],
      threshold: 0.35,
      includeMatches: true,
      minMatchCharLength: 2,
    });
  }

  function search(query, includeCatalog = false) {
    if (!fuseInstance) buildFuse();
    if (!query || query.length < 2) return [];
    const results = fuseInstance.search(query, { limit: 20 });
    return results
      .filter(r => includeCatalog ? true : !r.item.inCatalog)
      .map(r => ({
        item: r.item,
        matchedFields: r.matches ? r.matches.map(m => m.key) : [],
      }));
  }

  function rebuildFuse() { fuseInstance = null; }

  // ── AI SIMULATION ──
  const autoTagRules = {
    'github.com': ['open-source','code','dev'],
    'figma.com': ['design','ui','prototyping'],
    'youtube.com': ['video','media','learning'],
    'notion.so': ['productivity','notes','workspace'],
    'linear.app': ['project-management','productivity'],
    'claude.ai': ['ai','llm','assistant'],
    'midjourney.com': ['ai','image-gen','design'],
    'vercel.com': ['hosting','dev','deployment'],
    'tailwindcss.com': ['css','design','dev'],
    'developer.mozilla': ['docs','dev','reference'],
    'css-tricks': ['css','frontend','dev'],
    'openai.com': ['ai','llm','gpt'],
    'framer.com': ['design','no-code','web'],
    'dribbble.com': ['inspiration','design'],
    'raycast.com': ['productivity','launcher','mac'],
    'perplexity.ai': ['ai','search','research'],
    'vitejs.dev': ['build-tool','frontend','dev'],
  };

  async function simulateAutoTag(url, title) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const hostname = new URL(url).hostname;
      const match = Object.entries(autoTagRules).find(([k]) => hostname.includes(k));
      if (match) return match[1];
      // fallback: derive from title words
      const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 3);
      return words.length ? words : ['web','resource','tool'];
    } catch {
      return ['web','resource','tool'];
    }
  }

  async function simulateSummary(title, description) {
    await new Promise(r => setTimeout(r, 800));
    if (description && description.length > 30) {
      return description.length > 120 ? description.slice(0, 120) + '...' : description;
    }
    return `${title} — a web resource saved to your workspace. Click to open and explore.`;
  }

  // ── BULK ──
  function bulkMoveToCatalog(ids) { ids.forEach(id => moveToCatalog(id)); }
  function bulkMoveToCategory(ids, categoryId) { ids.forEach(id => updateBookmark(id, { categoryId, inCatalog: false })); }
  function bulkAddTags(ids, newTags) {
    ids.forEach(id => {
      const bm = getBookmarkById(id);
      if (!bm) return;
      const combined = Array.from(new Set([...(bm.tags||[]), ...newTags]));
      updateBookmark(id, { tags: combined });
    });
  }
  function bulkRemoveTags(ids, removeTags) {
    const removeSet = new Set(removeTags);
    ids.forEach(id => {
      const bm = getBookmarkById(id);
      if (!bm) return;
      updateBookmark(id, { tags: (bm.tags||[]).filter(t => !removeSet.has(t)) });
    });
  }

  // ── TOOLS ──
  function findDuplicates() {
    const byDomain = {};
    for (const bm of data.bookmarks.filter(b => !b.inCatalog)) {
      const d = domainOf(bm.url);
      if (!byDomain[d]) byDomain[d] = [];
      byDomain[d].push(bm);
    }
    return Object.entries(byDomain)
      .filter(([, items]) => items.length > 1)
      .map(([domain, items]) => ({ domain, items }));
  }

  async function findDeadLinks(onProgress) {
    const bookmarks = data.bookmarks.filter(b => !b.inCatalog);
    const dead = [];
    const total = bookmarks.length;

    for (let i = 0; i < bookmarks.length; i++) {
      const bm = bookmarks[i];
      if (onProgress) onProgress(i + 1, total, bm.title);

      const url = bm.url.trim();
      let status = null;
      let ok = false;

      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const json = await res.json();
          status = json?.status?.http_code;
          // 0 = network error from proxy side, treat as unreachable
          ok = status && status >= 200 && status < 400;
        }
      } catch {
        // timeout or network error — mark as potentially dead
        status = 0;
        ok = false;
      }

      if (!ok) {
        dead.push({ ...bm, _httpStatus: status });
      }

      // Small delay to avoid hammering the proxy
      await new Promise(r => setTimeout(r, 300));
    }

    return dead;
  }

  function findRarelyVisited() {
    const threshold = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    return data.bookmarks.filter(b => !b.inCatalog && b.visitCount === 0 && b.createdAt < threshold);
  }

  // ── IMPORT / EXPORT ──
  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function parseNetscapeHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const folders = {};
    let current = 'Imported';

    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeName === 'H3') { current = child.textContent; }
        else if (child.nodeName === 'A') {
          const url = child.getAttribute('href');
          const rawTitle = child.textContent.trim();
          const hasTitle = rawTitle && !rawTitle.startsWith('http');
          const title = hasTitle ? rawTitle : domainOf(url);
          if (url && url.startsWith('http')) {
            if (!folders[current]) folders[current] = [];
            folders[current].push({ url, title, needsFetch: !hasTitle });
          }
        }
        if (child.childNodes.length) walk(child);
      }
    };
    walk(doc.body);
    return folders;
  }

  function importFromNetscape(folders, targetCategoryId) {
    const needsFetch = [];
    let count = 0;
    for (const [folder, items] of Object.entries(folders)) {
      for (const { url, title, needsFetch: nf } of items) {
        const bm = addBookmark({ url, title, categoryId: targetCategoryId, favicon: faviconEmoji(url) });
        if (nf) needsFetch.push({ id: bm.id, url });
        count++;
      }
    }
    rebuildFuse();
    return { count, needsFetch };
  }

  function exportJSON() {
    downloadJSON({ bookmarks: data.bookmarks, tabs: data.tabs, categories: data.categories }, `bookmarks-${new Date().toISOString().slice(0,10)}.json`);
  }

  function exportTabJSON(tabId) {
    const catIds = new Set(data.categories.filter(c => c.tabId === tabId).map(c => c.id));
    const tab = getTabById(tabId);
    const bms = data.bookmarks.filter(b => catIds.has(b.categoryId));
    downloadJSON({ tab, bookmarks: bms }, `${(tab?.name||'tab').toLowerCase().replace(/\s/g,'-')}-bookmarks.json`);
  }

  function exportSelected(ids) {
    const bms = data.bookmarks.filter(b => ids.includes(b.id));
    downloadJSON({ bookmarks: bms }, `selected-bookmarks-${new Date().toISOString().slice(0,10)}.json`);
  }

  function parseXLSX(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const categoryNames = new Set();
    const bookmarks = rows
      .filter(r => r.URL && String(r.URL).startsWith('http'))
      .map(r => {
        const catName = String(r.Category || '').trim() || 'Imported';
        categoryNames.add(catName);
        return {
          title:        String(r.Title || r.URL).trim(),
          url:          String(r.URL).trim(),
          categoryName: catName,
          tags:         r.Tags ? String(r.Tags).split(',').map(t => t.trim()).filter(Boolean) : [],
          notes:        String(r.Notes || '').trim(),
          starred:      String(r.Starred).toLowerCase() === 'yes',
        };
      });
    return { bookmarks, categoryNames: [...categoryNames] };
  }

  function importFromXLSX(parsed, fallbackCatId) {
    const catByName = Object.fromEntries(data.categories.map(c => [c.name.toLowerCase(), c.id]));
    let count = 0;
    for (const bm of parsed.bookmarks) {
      const catId = catByName[bm.categoryName.toLowerCase()] || fallbackCatId;
      if (!catId) continue;
      addBookmark({ title: bm.title, url: bm.url, categoryId: catId,
                    tags: bm.tags, notes: bm.notes, starred: bm.starred });
      count++;
    }
    return count;
  }

  function bmsToXLSXRows(bms) {
    const catMap = Object.fromEntries(data.categories.map(c => [c.id, c.name]));
    const tabMap = Object.fromEntries(data.tabs.map(t => [t.id, t.name]));
    const catTab = Object.fromEntries(data.categories.map(c => [c.id, tabMap[c.tabId] || '']));
    return bms.map(b => ({
      Title:    b.title || '',
      URL:      b.url || '',
      Category: catMap[b.categoryId] || '',
      Workspace: catTab[b.categoryId] || '',
      Tags:     (b.tags || []).join(', '),
      Notes:    b.notes || '',
      Starred:  b.starred ? 'Yes' : 'No',
      Visits:   b.visits || 0,
      Added:    b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '',
    }));
  }

  function downloadXLSX(rows, filename) {
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [
      { wch: 40 }, { wch: 55 }, { wch: 20 }, { wch: 20 },
      { wch: 25 }, { wch: 30 }, { wch: 8 }, { wch: 7 }, { wch: 12 },
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookmarks');
    XLSX.writeFile(wb, filename);
  }

  function exportXLSX() {
    downloadXLSX(bmsToXLSXRows(data.bookmarks), `bookmarks-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportTabXLSX(tabId) {
    const catIds = new Set(data.categories.filter(c => c.tabId === tabId).map(c => c.id));
    const tab = getTabById(tabId);
    const bms = data.bookmarks.filter(b => catIds.has(b.categoryId));
    const rows = bmsToXLSXRows(bms);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 55 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 8 }, { wch: 7 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab?.name || 'Workspace');
    XLSX.writeFile(wb, `${(tab?.name || 'tab').toLowerCase().replace(/\s/g, '-')}-bookmarks.xlsx`);
  }

  // Settings
  function getColumns() { return data.dashboardColumns || 4; }
  function setColumns(n) { data.dashboardColumns = n; save(); }

  load();

  return {
    get raw() { return data; },
    save, load,
    PRESET_COLORS,
    uuid, domainOf, faviconUrl, faviconEmoji,
    // Bookmarks
    getBookmarks, getAllBookmarks, getCatalog, getStarredCount, getBookmarkById,
    addBookmark, updateBookmark, deleteBookmark, deleteBookmarks,
    moveToCatalog, restoreFromCatalog, incrementVisit, findDuplicate,
    // Categories
    getCategories, getAllCategories, getCategoryById, addCategory, updateCategory, deleteCategory, reorderCategories,
    // Tabs
    getTabs, getTabById, addTab, updateTab, deleteTab,
    // Tags
    getAllTags, getUniqueTagsList,
    // Search
    search, rebuildFuse,
    // AI
    simulateAutoTag, simulateSummary,
    // Bulk
    bulkMoveToCatalog, bulkMoveToCategory, bulkAddTags, bulkRemoveTags,
    // Tools
    findDuplicates, findDeadLinks, findRarelyVisited,
    // Import / Export
    parseNetscapeHTML, importFromNetscape, parseXLSX, importFromXLSX,
    exportJSON, exportTabJSON, exportSelected, exportXLSX, exportTabXLSX,
    // Settings
    getColumns, setColumns,
  };
})();
