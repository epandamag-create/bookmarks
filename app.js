// v1.0 — main app: state, views (dashboard/list/graph/tags/tools/settings), routing, keyboard shortcuts
// v1.2 — fixed: border-top on category header, collapse on header click, tab pill active state, list view scroll
// v2.0 — perf: debounced search, document fragments, cached renders, requestIdleCallback, optimized event delegation

window.App = (() => {
  const state = {
    view: 'dashboard',
    activeTabId: null,
    selectedIds: new Set(),
    listSort: { field: 'createdAt', dir: 'desc' },
    listLayout: 'table',
    listTagFilter: null,
    showCatalog: false,
    showVisits: false,
    toolsMode: null,
    toolsResults: null,
    focusedCardId: null,
    collapsedCats: new Set(),
    searchQuery: '',
  };

  // ── PERFORMANCE UTILS ──
  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function throttle(fn, limit) {
    let inThrottle = false;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Render queue for batched DOM updates
  let renderQueued = false;
  let pendingRenders = new Set();

  function scheduleRender(viewName) {
    pendingRenders.add(viewName);
    if (!renderQueued) {
      renderQueued = true;
      requestIdleCallback(() => {
        renderQueued = false;
        pendingRenders.forEach(name => {
          if (name === 'tabs') renderTabsBar();
          if (name === 'sidebar') renderSidebar();
          if (name === 'content') renderContent();
          if (name === 'topbar') renderTopbar();
        });
        pendingRenders.clear();
      }, { timeout: 100 });
    }
  }

  const debouncedRenderContent = debounce(renderContent, 150);
  const throttledUpdateArrows = throttle(updateScrollArrows, 100);

  let tabsScrollController = null;

  // ── TOAST ──
  function toast(msg, type = 'success') {
    const tc = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    tc.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('visible')));
    const duration = (type === 'error') ? 5000 : 2500;
    setTimeout(() => {
      t.classList.remove('visible');
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  // ── ROUTING ──
  function switchView(view) {
    state.view = view;
    state.selectedIds.clear();
    state.searchQuery = '';
    const si = document.getElementById('search-input');
    const mi = document.getElementById('mobile-search-input');
    if (si) { si.value = ''; si.nextElementSibling?.classList.remove('visible'); }
    if (mi) { mi.value = ''; mi.nextElementSibling?.classList.remove('visible'); }
    if (view === 'starred') state.activeTabId = null;
    renderTabsBar();
    renderSidebar();
    renderContent();
    renderTopbar();
  }

  function switchTab(tabId) {
    state.activeTabId = tabId;
    state.view = 'dashboard';
    state.selectedIds.clear();
    state.searchQuery = '';
    const si = document.getElementById('search-input');
    const mi = document.getElementById('mobile-search-input');
    if (si) { si.value = ''; si.nextElementSibling?.classList.remove('visible'); }
    if (mi) { mi.value = ''; mi.nextElementSibling?.classList.remove('visible'); }
    renderTabsBar();
    renderSidebar();
    renderContent();
    renderTopbar();
  }

  // ── RENDER SIDEBAR ──
  function renderSidebar() {
    const list = document.getElementById('sidebar-tabs-list');
    const fragment = document.createDocumentFragment();
    list.innerHTML = '';
    const allBookmarks = DB.getAllBookmarks();
    DB.getTabs().forEach(tab => {
      const item = document.createElement('div');
      item.className = 'sidebar-tab-item' + (tab.id === state.activeTabId && state.view === 'dashboard' ? ' active' : '');
      item.dataset.tabId = tab.id;
      const dot = document.createElement('span');
      dot.className = 'tab-dot';
      dot.style.background = tab.color;
      const name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = tab.name;
      const catIds = new Set(DB.getCategories(tab.id).map(c => c.id));
      const bmCount = allBookmarks.filter(b => catIds.has(b.categoryId)).length;
      const count = document.createElement('span');
      count.className = 'tab-bm-count';
      count.textContent = bmCount;
      const menu = document.createElement('button');
      menu.className = 'icon-btn icon-btn-sm tab-menu-btn';
      menu.dataset.action = 'tab-menu';
      menu.dataset.tabId = tab.id;
      menu.appendChild(Components.icon('more-horizontal', 13));
      item.appendChild(dot);
      item.appendChild(name);
      item.appendChild(count);
      if (tab.isShared) {
        const sh = document.createElement('span');
        sh.className = 'tab-share-icon';
        sh.textContent = '🔗';
        item.appendChild(sh);
      }
      item.appendChild(menu);
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="tab-menu"]')) return;
        switchTab(tab.id);
      });
      fragment.appendChild(item);
    });
    list.appendChild(fragment);
    lucide.createIcons({ nodes: [list] });
  }

  // ── RENDER TABS BAR ──
  function renderTabsBar() {
    const tabsList = document.getElementById('tabs-list');
    const fragment = document.createDocumentFragment();
    tabsList.innerHTML = '';

    DB.getTabs().forEach(tab => {
      const pill = document.createElement('div');
      pill.className = 'tab-pill' + (tab.id === state.activeTabId && state.view === 'dashboard' ? ' active' : '');
      pill.dataset.tabId = tab.id;
      const dot = document.createElement('span');
      dot.className = 'tp-dot';
      dot.style.background = tab.color;
      const name = document.createElement('span');
      name.textContent = tab.name;
      pill.appendChild(dot);
      pill.appendChild(name);
      if (tab.isShared) {
        const sh = document.createElement('span');
        sh.className = 'tp-share';
        sh.textContent = '🔗';
        pill.appendChild(sh);
      }
      pill.addEventListener('click', (e) => {
        if (e.target.closest('.tp-menu-btn')) return;
        switchTab(tab.id);
      });
      pill.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showTabContextMenu(tab.id, e.clientX, e.clientY);
      });

      // ⋯ menu button
      const menuBtn = document.createElement('button');
      menuBtn.className = 'icon-btn icon-btn-sm tp-menu-btn';
      menuBtn.style.cssText = 'opacity:0;transition:opacity 0.15s;width:20px;height:20px;margin-left:2px';
      menuBtn.appendChild(Components.icon('more-horizontal', 12));
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        showTabContextMenu(tab.id, e.clientX, e.clientY);
      };
      pill.appendChild(menuBtn);
      pill.addEventListener('mouseenter', () => menuBtn.style.opacity = '1');
      pill.addEventListener('mouseleave', () => menuBtn.style.opacity = '0');

      fragment.appendChild(pill);
    });

    tabsList.appendChild(fragment);

    // Scroll arrows — abort previous listeners to avoid accumulation
    if (tabsScrollController) tabsScrollController.abort();
    tabsScrollController = new AbortController();
    const { signal } = tabsScrollController;

    const leftBtn = document.getElementById('tabs-scroll-left');
    const rightBtn = document.getElementById('tabs-scroll-right');
    const container = tabsList;
    function updateArrows() {
      leftBtn.style.display = container.scrollLeft > 0 ? 'flex' : 'none';
      rightBtn.style.display = container.scrollLeft < container.scrollWidth - container.clientWidth - 2 ? 'flex' : 'none';
    }
    setTimeout(updateArrows, 50);
    container.addEventListener('scroll', throttledUpdateArrows, { signal });
    container.addEventListener('wheel', (e) => { e.preventDefault(); container.scrollLeft += e.deltaY; throttledUpdateArrows(); }, { signal, passive: false });
    leftBtn.onclick = () => { container.scrollLeft -= 120; throttledUpdateArrows(); };
    rightBtn.onclick = () => { container.scrollLeft += 120; throttledUpdateArrows(); };
  }

  function updateScrollArrows() {
    const leftBtn = document.getElementById('tabs-scroll-left');
    const rightBtn = document.getElementById('tabs-scroll-right');
    const container = document.getElementById('tabs-list');
    if (!leftBtn || !rightBtn || !container) return;
    leftBtn.style.display = container.scrollLeft > 0 ? 'flex' : 'none';
    rightBtn.style.display = container.scrollLeft < container.scrollWidth - container.clientWidth - 2 ? 'flex' : 'none';
  }

  // ── RENDER TOPBAR ──
  function renderTopbar() {
    const breadcrumb = document.getElementById('breadcrumb');
    const layoutSwitcher = document.getElementById('layout-switcher');
    const tab = DB.getTabById(state.activeTabId);

    const viewLabels = { dashboard: 'Dashboard', list: 'All Bookmarks', starred: '⭐ Starred', tags: 'Tags', graph: 'Graph', tools: 'Tools', settings: 'Settings' };
    if (tab && (state.view === 'dashboard')) {
      breadcrumb.textContent = tab.name;
    } else {
      breadcrumb.textContent = viewLabels[state.view] || state.view;
    }

    // Layout switcher
    if (state.view === 'dashboard') {
      layoutSwitcher.classList.remove('hidden');
      const cols = DB.getColumns();
      layoutSwitcher.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.cols) === cols);
      });
    } else {
      layoutSwitcher.classList.add('hidden');
    }

    // Nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === state.view);
    });
  }

  // ── RENDER CONTENT ──
  function renderContent() {
    const content = document.getElementById('content');
    content.innerHTML = '';
    content.classList.toggle('view-list', !state.searchQuery && state.view === 'list' && state.listLayout === 'table');
    Components.BulkActionsBar(state.selectedIds);

    if (state.searchQuery.length >= 2) { renderSearchResults(content); }
    else switch (state.view) {
      case 'dashboard': renderDashboard(content); break;
      case 'list': renderList(content); break;
      case 'starred': renderStarred(content); break;
      case 'tags': renderTags(content); break;
      case 'graph': renderGraph(content); break;
      case 'tools': renderTools(content); break;
      case 'settings': renderSettings(content); break;
    }

    lucide.createIcons({ nodes: [content] });

    // Fade-in content area
    if (window.Motion?.animate) {
      Motion.animate(content, { opacity: [0, 1], y: [6, 0] }, { duration: 0.18, easing: 'ease-out' });
    }
  }

  // ── SEARCH RESULTS ──
  const debouncedSearchRender = debounce((container) => {
    const found = DB.search(state.searchQuery, true);
    const wrap = document.createElement('div');
    wrap.className = 'search-results-view';

    const header = document.createElement('div');
    header.className = 'search-results-header';
    header.textContent = found.length
      ? `Результаты поиска: «${state.searchQuery}» — ${found.length} найдено`
      : `Ничего не найдено по запросу «${state.searchQuery}»`;
    wrap.appendChild(header);

    if (found.length) {
      const cols = DB.getColumns();
      const grid = document.createElement('div');
      grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:16px;align-items:start;width:100%;`;
      const fragment = document.createDocumentFragment();
      found.forEach(({ item }) => fragment.appendChild(Components.BookmarkCard(item)));
      grid.appendChild(fragment);
      wrap.appendChild(grid);
    }

    container.innerHTML = '';
    container.appendChild(wrap);
    lucide.createIcons({ nodes: [container] });
  }, 200);

  function renderSearchResults(container) {
    debouncedSearchRender(container);
  }

  // ── DASHBOARD ──
  function renderDashboard(container) {
    const tab = DB.getTabById(state.activeTabId);
    if (!tab) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📑</div><div class="empty-state-title">No Workspace Selected</div><div class="empty-state-sub">Select or create a workspace from the sidebar</div><button class="btn btn-primary" style="margin-top:16px" id="es-add-tab"><i data-lucide="plus"></i> New Workspace</button></div>`;
      container.querySelector('#es-add-tab')?.addEventListener('click', () => document.getElementById('add-tab-btn').click());
      return;
    }
    const cats = DB.getCategories(tab.id);
    const allBms = DB.getBookmarks(tab.id);

    const wrapper = document.createElement('div');
    wrapper.className = 'dashboard';

    if (!cats.length) {
      wrapper.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📂</div><div class="empty-state-title">No categories yet</div><div class="empty-state-sub">Create a category to start organizing bookmarks</div><button class="btn btn-primary" style="margin-top:16px" id="add-cat-btn"><i data-lucide="plus"></i> Add Category</button></div>`;
      container.appendChild(wrapper);
      wrapper.querySelector('#add-cat-btn')?.addEventListener('click', () => promptAddCategory());
      return;
    }

    const cols = DB.getColumns();
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    grid.dataset.cols = cols;

    const fragment = document.createDocumentFragment();
    cats.forEach(cat => {
      const bms = allBms.filter(b => b.categoryId === cat.id);
      const col = Components.CategoryColumn(cat, bms, {
        collapsed: state.collapsedCats.has(cat.id),
        onToggleCollapse: (catId, isCollapsed) => {
          if (isCollapsed) state.collapsedCats.add(catId);
          else state.collapsedCats.delete(catId);
        },
      });
      setupDragDrop(col, cat.id);
      fragment.appendChild(col);
    });
    grid.appendChild(fragment);

    // Column reorder via Sortable
    Sortable.create(grid, {
      animation:   180,
      handle:      '.category-column-header',
      filter:      '.cat-add-btn, .cat-menu-btn, .cat-collapse-btn',
      ghostClass:  'col-sortable-ghost',
      chosenClass: 'col-sortable-chosen',
      onEnd() {
        const newOrder = [...grid.querySelectorAll('.category-column')].map(c => c.dataset.catId);
        DB.reorderCategories(state.activeTabId, newOrder);
      },
    });

    wrapper.appendChild(grid);

    // Stagger entrance for columns
    if (window.Motion?.animate) {
      const colEls = grid.querySelectorAll('.category-column');
      Motion.animate(colEls, { opacity: [0, 1], y: [12, 0] }, { duration: 0.2, delay: Motion.stagger(0.04), easing: 'ease-out' });
    }

    // "Add Category" button
    const addCatBtn = document.createElement('button');
    addCatBtn.className = 'btn btn-ghost';
    addCatBtn.style.cssText = 'margin-top:12px;width:100%;border:1px dashed var(--border)';
    addCatBtn.innerHTML = '<i data-lucide="plus"></i> Add Category';
    addCatBtn.onclick = () => promptAddCategory();
    wrapper.appendChild(addCatBtn);

    container.appendChild(wrapper);
  }

  // ── DRAG & DROP (Sortable.js) ──
  let sortableInstances = new Map();
  function setupDragDrop(colEl, catId) {
    const body = colEl.querySelector('.category-column-body');
    if (sortableInstances.has(body)) return; // Prevent duplicate initialization
    
    const sortable = Sortable.create(body, {
      group:     'cards',
      animation: 150,
      delay:     50,
      delayOnTouchOnly: true,
      ghostClass:  'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass:   'sortable-drag',
      handle: '.bookmark-card',
      filter: '.card-actions',
      onEnd(evt) {
        const bmId    = evt.item.dataset.id;
        const newCatId = evt.to.dataset.catId;
        if (!bmId) return;
        if (newCatId && newCatId !== catId) {
          DB.updateBookmark(bmId, { categoryId: newCatId });
          DB.rebuildFuse();
          debouncedRenderContent();
        }
      },
    });
    sortableInstances.set(body, sortable);
  }

  // ── LIST VIEW ──
  function renderList(container) {
    const allBms = state.showCatalog ? DB.getCatalog() : DB.getAllBookmarks();
    let filtered = state.listTagFilter
      ? allBms.filter(b => (b.tags || []).includes(state.listTagFilter))
      : allBms;

    filtered = [...filtered].sort((a, b) => {
      const { field, dir } = state.listSort;
      let va = a[field] ?? ''; let vb = b[field] ?? '';
      if (field === 'title') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'list-view';

    // ── Toolbar ──
    const tagFilters = document.createElement('div');
    tagFilters.className = 'tag-filters';

    const catalogBtn = document.createElement('span');
    catalogBtn.className = 'tag-filter-pill catalog-pill' + (state.showCatalog ? ' active' : '');
    catalogBtn.textContent = '📥 Catalog';
    catalogBtn.onclick = () => { state.showCatalog = !state.showCatalog; state.listTagFilter = null; renderContent(); };
    tagFilters.appendChild(catalogBtn);

    const allBtn = document.createElement('span');
    allBtn.className = 'tag-filter-pill';
    allBtn.textContent = 'All';
    allBtn.onclick = () => { state.listTagFilter = null; renderContent(); };
    tagFilters.appendChild(allBtn);

    const tagCounts = {};
    allBms.forEach(b => (b.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([tag]) => {
      const pill = document.createElement('span');
      pill.className = 'tag-filter-pill' + (state.listTagFilter === tag ? ' active' : '');
      pill.textContent = tag;
      pill.onclick = () => { state.listTagFilter = tag; renderContent(); };
      tagFilters.appendChild(pill);
    });

    const configBtn = document.createElement('button');
    configBtn.className = 'btn btn-ghost btn-sm list-config-btn';
    configBtn.innerHTML = `<i data-lucide="sliders-horizontal"></i>`;
    configBtn.title = 'Configure columns';
    configBtn.onclick = (e) => {
      e.stopPropagation();
      const menu = document.createElement('div');
      menu.className = 'col-config-menu';
      const visitsItem = document.createElement('label');
      visitsItem.className = 'col-config-item';
      visitsItem.innerHTML = `<input type="checkbox" ${state.showVisits ? 'checked' : ''}> Visits`;
      visitsItem.querySelector('input').onchange = (ev) => { state.showVisits = ev.target.checked; renderContent(); };
      menu.appendChild(visitsItem);
      const rect = configBtn.getBoundingClientRect();
      menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;z-index:200`;
      document.body.appendChild(menu);
      const close = (ev) => { if (!menu.contains(ev.target) && ev.target !== configBtn) { menu.remove(); document.removeEventListener('click', close); } };
      setTimeout(() => document.addEventListener('click', close), 0);
    };

    const layoutToggle = document.createElement('div');
    layoutToggle.className = 'list-layout-toggle';
    const tableBtn = document.createElement('button');
    tableBtn.className = 'icon-btn' + (state.listLayout === 'table' ? ' active' : '');
    tableBtn.title = 'Table view';
    tableBtn.innerHTML = '<i data-lucide="list"></i>';
    tableBtn.onclick = () => { state.listLayout = 'table'; renderContent(); };
    const cardsBtn = document.createElement('button');
    cardsBtn.className = 'icon-btn' + (state.listLayout === 'cards' ? ' active' : '');
    cardsBtn.title = 'Cards view';
    cardsBtn.innerHTML = '<i data-lucide="layout-grid"></i>';
    cardsBtn.onclick = () => { state.listLayout = 'cards'; renderContent(); };
    layoutToggle.appendChild(tableBtn);
    layoutToggle.appendChild(cardsBtn);

    const toolbar = document.createElement('div');
    toolbar.className = 'list-toolbar';
    toolbar.appendChild(tagFilters);
    toolbar.appendChild(layoutToggle);
    toolbar.appendChild(configBtn);
    wrapper.appendChild(toolbar);

    // ── Empty state ──
    if (!filtered.length) {
      const esBtn = state.showCatalog ? '' : `<button class="btn btn-primary" style="margin-top:16px" id="es-add-bm"><i data-lucide="plus"></i> Add Bookmark</button>`;
      const emptyDiv = document.createElement('div');
      emptyDiv.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${state.showCatalog ? '📥' : '🔖'}</div><div class="empty-state-title">${state.showCatalog ? 'Catalog is empty' : 'No bookmarks yet'}</div><div class="empty-state-sub">${state.showCatalog ? 'Move bookmarks here to archive them' : 'Save your first link to get started'}</div>${esBtn}</div>`;
      emptyDiv.querySelector('#es-add-bm')?.addEventListener('click', () => Components.BookmarkFormModal());
      wrapper.appendChild(emptyDiv);
      container.appendChild(wrapper);
      lucide.createIcons({ nodes: [wrapper] });
      return;
    }

    // ── Cards view ──
    if (state.listLayout === 'cards') {
      const grid = document.createElement('div');
      grid.className = 'list-cards-grid';
      filtered.forEach(bm => grid.appendChild(Components.BookmarkCard(bm)));
      wrapper.appendChild(grid);
      container.appendChild(wrapper);
      return;
    }

    // ── Table ──
    // Single scroll container: thead+tbody in one table → columns never misalign
    const scrollEl = document.createElement('div');
    scrollEl.className = 'list-scroll';

    const table = document.createElement('table');
    table.className = 'bookmark-table';

    // colgroup locks column widths — no jumping when rows change
    const visitsCog = state.showVisits ? '<col class="col-visits">' : '';
    table.insertAdjacentHTML('afterbegin', `<colgroup>
      <col class="col-check"><col class="col-fav"><col class="col-title">
      <col class="col-tags"><col class="col-date">${visitsCog}<col class="col-actions">
    </colgroup>`);

    // ── thead ──
    const sortArrow = f => state.listSort.field === f
      ? `<span class="sort-arrow">${state.listSort.dir === 'asc' ? '↑' : '↓'}</span>` : '';
    const sortTh = (f, label) => {
      const th = document.createElement('th');
      th.className = state.listSort.field === f ? 'sorted' : '';
      th.innerHTML = `${label} ${sortArrow(f)}`;
      th.onclick = () => {
        state.listSort.dir = (state.listSort.field === f && state.listSort.dir === 'asc') ? 'desc' : 'asc';
        state.listSort.field = f;
        renderContent();
      };
      return th;
    };

    const chkAll = document.createElement('input');
    chkAll.type = 'checkbox';
    chkAll.title = 'Select all';
    chkAll.checked = filtered.length > 0 && filtered.every(b => state.selectedIds.has(b.id));
    chkAll.onchange = (ev) => {
      filtered.forEach(b => ev.target.checked ? state.selectedIds.add(b.id) : state.selectedIds.delete(b.id));
      renderContent();
    };
    const thCheck = document.createElement('th'); thCheck.appendChild(chkAll);
    const thFav = document.createElement('th'); thFav.textContent = 'Fav';
    const thTags = document.createElement('th'); thTags.textContent = 'Tags';
    const thActions = document.createElement('th');

    const headRow = document.createElement('tr');
    [thCheck, thFav, sortTh('title', 'Title'), thTags, sortTh('createdAt', 'Date')].forEach(th => headRow.appendChild(th));
    if (state.showVisits) headRow.appendChild(sortTh('visitCount', 'Visits'));
    headRow.appendChild(thActions);

    const thead = document.createElement('thead');
    thead.appendChild(headRow);
    table.appendChild(thead);

    // ── tbody ──
    const tbody = document.createElement('tbody');
    filtered.forEach(bm => {
      const favSrc = DB.faviconUrl(bm.url);
      const favicon = favSrc
        ? `<img src="${favSrc}" width="16" height="16" style="border-radius:2px;display:block" onerror="this.style.display='none'">`
        : `<span>${bm.favicon || '🔗'}</span>`;
      const tags = (bm.tags || []).slice(0, 4)
        .map(t => `<span class="tag-chip" data-action="filter-tag" data-tag="${t}">${t}</span>`).join('');
      const date = new Date(bm.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      const visitsCell = state.showVisits ? `<td class="table-visits">${bm.visitCount || 0}</td>` : '';
      const actions = bm.inCatalog
        ? `<button class="icon-btn icon-btn-sm" data-action="open" title="Open">↗</button><button class="icon-btn icon-btn-sm" data-action="restore" title="Restore">↩</button>`
        : `<button class="icon-btn icon-btn-sm" data-action="open" title="Open">↗</button><button class="icon-btn icon-btn-sm" data-action="edit" title="Edit">✎</button>`;
      const tr = document.createElement('tr');
      tr.dataset.id = bm.id;
      if (state.selectedIds.has(bm.id)) tr.classList.add('selected');
      tr.innerHTML = `
        <td><input type="checkbox" ${state.selectedIds.has(bm.id) ? 'checked' : ''} data-action="check"></td>
        <td class="table-favicon">${favicon}</td>
        <td><span class="table-title" data-action="focus" title="${bm.url}">${bm.title || bm.url}</span></td>
        <td class="table-tags">${tags}</td>
        <td class="table-date">${date}</td>
        ${visitsCell}
        <td><div class="table-actions">${actions}<button class="icon-btn icon-btn-sm" data-action="menu" title="More">⋯</button></div></td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    scrollEl.appendChild(table);
    wrapper.appendChild(scrollEl);
    container.appendChild(wrapper);
    lucide.createIcons({ nodes: [wrapper] });

    // ── Event delegation ──
    scrollEl.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      const bmId = tr.dataset.id;
      const action = e.target.closest('[data-action]')?.dataset.action;
      const bm = DB.getBookmarkById(bmId);
      if (!bm) return;
      if (action === 'focus')   { Components.FocusModal(bmId); return; }
      if (action === 'open')    { e.stopPropagation(); window.open(bm.url, '_blank'); DB.incrementVisit(bmId); return; }
      if (action === 'edit')    { e.stopPropagation(); Components.BookmarkFormModal(bm); return; }
      if (action === 'restore') { e.stopPropagation(); promptRestoreFromCatalog(bmId); return; }
      if (action === 'menu')    { e.stopPropagation(); showBookmarkContextMenu(bmId, e.clientX, e.clientY); return; }
      if (action === 'filter-tag') { state.listTagFilter = e.target.dataset.tag; renderContent(); return; }
      if (action === 'check') {
        e.stopPropagation();
        if (e.target.checked) state.selectedIds.add(bmId); else state.selectedIds.delete(bmId);
        tr.classList.toggle('selected', e.target.checked);
        Components.BulkActionsBar(state.selectedIds);
        return;
      }
    });
  }

  // ── TAGS VIEW ──
  // ── STARRED VIEW ──
  function renderStarred(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'list-view';

    const starred = DB.getAllBookmarks().filter(b => b.favorite);

    if (!starred.length) {
      const emptyDiv = document.createElement('div');
      emptyDiv.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⭐</div><div class="empty-state-title">No starred bookmarks</div><div class="empty-state-sub">Star bookmarks from the context menu to find them here quickly</div></div>`;
      wrapper.appendChild(emptyDiv);
      container.appendChild(wrapper);
      return;
    }

    const table = document.createElement('table');
    table.className = 'bookmark-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['', 'Fav', 'Title', 'Tags', 'Date', 'Visits', ''].forEach((label, i) => {
      const th = document.createElement('th');
      th.textContent = label;
      if (i === 0) th.style.width = '36px';
      if (i === 1) th.style.width = '36px';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    starred.forEach(bm => {
      const tr = document.createElement('tr');
      tr.dataset.id = bm.id;

      const favTd = document.createElement('td');
      favTd.appendChild(Components.faviconEl(bm, 14));

      const titleTd = document.createElement('td');
      const titleSpan = document.createElement('span');
      titleSpan.className = 'table-title';
      titleSpan.textContent = bm.title;
      titleSpan.onclick = () => Components.FocusModal(bm.id);
      titleTd.appendChild(titleSpan);

      const tagsTd = document.createElement('td');
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'table-tags';
      (bm.tags || []).slice(0, 3).forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = t;
        tagsDiv.appendChild(chip);
      });
      tagsTd.appendChild(tagsDiv);

      const dateTd = document.createElement('td');
      dateTd.className = 'table-date';
      dateTd.textContent = new Date(bm.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

      const visitsTd = document.createElement('td');
      visitsTd.className = 'table-visits';
      visitsTd.textContent = bm.visitCount;

      const actionsTd = document.createElement('td');
      const acts = document.createElement('div');
      acts.className = 'table-actions';
      const openBtn = Components.iconBtn('external-link', 'Open');
      openBtn.onclick = (e) => { e.stopPropagation(); window.open(bm.url, '_blank'); DB.incrementVisit(bm.id); };
      const unstarBtn = Components.iconBtn('star-off', 'Remove from starred');
      unstarBtn.onclick = (e) => { e.stopPropagation(); DB.updateBookmark(bm.id, { favorite: false }); renderTabsBar(); renderContent(); toast('Removed from starred', 'info'); };
      const menuBtn = Components.iconBtn('more-horizontal', 'More');
      menuBtn.onclick = (e) => { e.stopPropagation(); showBookmarkContextMenu(bm.id, e.clientX, e.clientY); };
      acts.appendChild(openBtn);
      acts.appendChild(unstarBtn);
      acts.appendChild(menuBtn);
      actionsTd.appendChild(acts);

      const chkTd = document.createElement('td');
      tr.appendChild(chkTd);
      tr.appendChild(favTd);
      tr.appendChild(titleTd);
      tr.appendChild(tagsTd);
      tr.appendChild(dateTd);
      tr.appendChild(visitsTd);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    const tableWrapper = document.createElement('div');
    tableWrapper.style.overflowX = 'auto';
    tableWrapper.appendChild(table);
    wrapper.appendChild(tableWrapper);
    container.appendChild(wrapper);
    lucide.createIcons({ nodes: [container] });
  }

  function renderTags(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tags-view';
    wrapper.innerHTML = '<h2>Tag Cloud</h2>';

    const tags = DB.getAllTags();
    if (!tags.length) {
      wrapper.innerHTML += `<div class="empty-state"><div class="empty-state-icon">🏷️</div><div class="empty-state-title">No tags yet</div><div class="empty-state-sub">Tags appear here once you add them to bookmarks</div><button class="btn btn-primary" style="margin-top:16px" id="es-add-bm-tags"><i data-lucide="plus"></i> Add Bookmark</button></div>`;
      wrapper.querySelector('#es-add-bm-tags')?.addEventListener('click', () => Components.BookmarkFormModal());
      container.appendChild(wrapper);
      return;
    }

    const cloud = document.createElement('div');
    cloud.className = 'tags-cloud';
    const maxCount = tags[0].count;

    tags.forEach(({ tag, count }) => {
      const item = document.createElement('div');
      item.className = 'tag-cloud-item';
      const ratio = count / maxCount;
      item.style.fontSize = (12 + ratio * 8) + 'px';
      item.innerHTML = `<span>#${tag}</span><span class="tag-count">${count}</span>`;
      item.onclick = () => { state.listTagFilter = tag; switchView('list'); };
      cloud.appendChild(item);
    });

    wrapper.appendChild(cloud);
    container.appendChild(wrapper);
  }

  // ── GRAPH VIEW ──
  function renderGraph(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'graph-view';
    wrapper.style.height = '100%';
    container.style.overflow = 'hidden';

    const allBms = DB.getAllBookmarks();
    container.appendChild(wrapper);
    setTimeout(() => Components.GraphView(wrapper, allBms), 50);
  }

  // ── TOOLS VIEW ──
  function renderTools(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tools-view';

    wrapper.innerHTML = `
      <div class="tools-header">
        <h2>🔧 Bookmark Health</h2>
        <p>Audit and clean up your bookmarks collection</p>
      </div>
      <div class="tools-grid">
        <div class="tool-card ${state.toolsMode === 'duplicates' ? 'active' : ''}" data-tool="duplicates">
          <div class="tool-icon">🔍</div>
          <div class="tool-title">Find Duplicates</div>
          <div class="tool-desc">Group bookmarks by domain to find duplicate entries</div>
        </div>
        <div class="tool-card ${state.toolsMode === 'dead' ? 'active' : ''}" data-tool="dead">
          <div class="tool-icon">💀</div>
          <div class="tool-title">Check Dead Links</div>
          <div class="tool-desc">Real HTTP check via proxy — finds 404, 5xx and unreachable pages</div>
        </div>
        <div class="tool-card ${state.toolsMode === 'rare' ? 'active' : ''}" data-tool="rare">
          <div class="tool-icon">🧊</div>
          <div class="tool-title">Rarely Visited</div>
          <div class="tool-desc">Bookmarks added 30+ days ago with zero visits</div>
        </div>
      </div>
      <div id="tools-results-area" class="tools-results"></div>
    `;

    wrapper.querySelectorAll('.tool-card').forEach(card => {
      card.onclick = () => runTool(card.dataset.tool, wrapper);
    });

    if (state.toolsMode && state.toolsResults !== null) {
      renderToolResults(wrapper.querySelector('#tools-results-area'), state.toolsMode, state.toolsResults);
    }

    container.appendChild(wrapper);
  }

  async function runTool(mode, wrapper) {
    state.toolsMode = mode;
    state.toolsResults = null;

    const area = wrapper.querySelector('#tools-results-area');
    wrapper.querySelectorAll('.tool-card').forEach(c => c.classList.toggle('active', c.dataset.tool === mode));

    if (mode === 'dead') {
      const total = DB.getAllBookmarks().length;
      area.innerHTML = `
        <div class="tool-running">
          <div class="tool-progress-label" id="tool-progress-label">Checking 0 / ${total}...</div>
          <div class="tool-progress-bar"><div class="tool-progress-fill" id="tool-progress-fill" style="width:0%"></div></div>
          <div class="tool-progress-current" id="tool-progress-current"></div>
          <div style="font-size:11px;color:var(--text-3);margin-top:8px">Checking via proxy · 404 and 5xx = dead · timeout = unreachable</div>
        </div>`;

      try {
        const results = await DB.findDeadLinks((checked, total, title) => {
          const pct = Math.round((checked / total) * 100);
          const fill = area.querySelector('#tool-progress-fill');
          const label = area.querySelector('#tool-progress-label');
          const current = area.querySelector('#tool-progress-current');
          if (fill) fill.style.width = `${pct}%`;
          if (label) label.textContent = `Checking ${checked} / ${total}...`;
          if (current) current.textContent = title;
        });
        state.toolsResults = results;
        renderToolResults(area, mode, results);
      } catch(e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error checking links</div><div class="empty-state-sub">${e.message}</div></div>`;
      }
    } else {
      area.innerHTML = `<div class="tool-running"><div class="spinner"></div> Analyzing your bookmarks...</div>`;
      lucide.createIcons({ nodes: [area] });

      try {
        let results;
        if (mode === 'duplicates') results = DB.findDuplicates();
        else if (mode === 'rare') results = DB.findRarelyVisited();

        state.toolsResults = results;
        renderToolResults(area, mode, results);
      } catch(e) {
        area.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error running tool</div></div>`;
      }
    }
  }

  function renderToolResults(area, mode, results) {
    area.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'tools-results-header';

    const titles = { duplicates: 'Duplicate Domains', dead: 'Potentially Dead Links', rare: 'Rarely Visited' };
    const title = document.createElement('div');
    title.className = 'tools-results-title';

    if (mode === 'duplicates') {
      title.textContent = `${results.length} domain(s) with duplicates`;
      header.appendChild(title);
      area.appendChild(header);

      if (!results.length) {
        area.innerHTML += `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">No duplicates found!</div><div class="empty-state-sub">Your bookmarks are clean</div></div>`;
        return;
      }

      results.forEach(({ domain, items }) => {
        const group = document.createElement('div');
        group.className = 'tool-result-group';
        const gtitle = document.createElement('div');
        gtitle.className = 'tool-result-group-title';
        gtitle.textContent = `${domain} (${items.length} bookmarks)`;
        group.appendChild(gtitle);
        items.forEach(bm => group.appendChild(buildToolResultItem(bm, 'dup', '×2')));
        area.appendChild(group);
      });
    } else {
      const badgeType = mode === 'dead' ? 'dead' : 'rare';
      const badgeText = mode === 'dead'
        ? (bm => {
            const s = bm._httpStatus;
            if (!s || s === 0) return 'Timeout';
            if (s === 404) return '404';
            if (s >= 500) return `${s}`;
            return `${s}`;
          })
        : () => 'Unvisited';
      title.textContent = `${results.length} bookmark(s) found`;
      header.appendChild(title);
      if (results.length > 0) {
        const catalogAllBtn = document.createElement('button');
        catalogAllBtn.className = 'btn btn-ghost btn-sm';
        catalogAllBtn.textContent = `Archive All (${results.length})`;
        catalogAllBtn.onclick = () => {
          results.forEach(bm => DB.moveToCatalog(bm.id));
          toast(`Archived ${results.length} bookmarks`, 'info');
          state.toolsResults = [];
          renderContent();
        };
        header.appendChild(catalogAllBtn);
      }
      area.appendChild(header);

      if (!results.length) {
        area.innerHTML += `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Looking good!</div><div class="empty-state-sub">No problematic bookmarks found</div></div>`;
        return;
      }
      results.forEach(bm => area.appendChild(buildToolResultItem(bm, badgeType, typeof badgeText === 'function' ? badgeText(bm) : badgeText)));
    }
    lucide.createIcons({ nodes: [area] });
  }

  function buildToolResultItem(bm, badgeType, badgeText) {
    const item = document.createElement('div');
    item.className = 'tool-result-item';

    const fav = document.createElement('span');
    fav.style.fontSize = '16px';
    fav.textContent = bm.favicon || '🔗';

    const info = document.createElement('div');
    info.style.flex = '1';
    const t = document.createElement('div');
    t.style.cssText = 'font-size:13px;font-weight:500;color:var(--text-primary)';
    t.textContent = bm.title;
    const d = document.createElement('div');
    d.style.cssText = 'font-size:11px;color:var(--text-muted);font-family:DM Mono,monospace';
    d.textContent = DB.domainOf(bm.url);
    info.appendChild(t);
    info.appendChild(d);

    const badge = document.createElement('span');
    badge.className = `tool-badge ${badgeType}`;
    badge.textContent = badgeText;

    const focusBtn = document.createElement('button');
    focusBtn.className = 'btn btn-ghost btn-sm';
    focusBtn.textContent = 'View';
    focusBtn.onclick = () => Components.FocusModal(bm.id);

    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn btn-ghost btn-sm';
    archiveBtn.textContent = 'Archive';
    archiveBtn.onclick = () => {
      DB.moveToCatalog(bm.id);
      item.remove();
      toast('Archived', 'info');
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => {
      if (!confirm(`Delete "${bm.title}"?`)) return;
      DB.deleteBookmark(bm.id);
      DB.rebuildFuse();
      item.remove();
      toast('Deleted', 'error');
    };

    item.appendChild(fav);
    item.appendChild(info);
    item.appendChild(badge);
    item.appendChild(focusBtn);
    item.appendChild(archiveBtn);
    item.appendChild(delBtn);
    return item;
  }

  // ── SETTINGS VIEW ──
  function renderSettings(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-view';

    const tabs = DB.getTabs();
    const tabOpts = tabs.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    const savedSchemeId = localStorage.getItem('bm_scheme') || '';
    const schemeSwatches = (window.COLOR_SCHEMES || []).map(s => `
      <div class="scheme-swatch ${s.id === savedSchemeId ? 'active' : ''}" data-scheme="${s.id}" title="${s.name}" style="--sw:${s.swatch}">
        <span class="scheme-dot" style="background:${s.swatch}"></span>
        <span class="scheme-name">${s.name}</span>
      </div>`).join('');

    wrapper.innerHTML = `
      <h2>Settings</h2>
      <div class="settings-section">
        <h3>Appearance</h3>
        <div class="settings-row">
          <div><div class="settings-label">Dashboard Columns</div><div class="settings-desc">Number of category columns on dashboard</div></div>
          <div style="display:flex;gap:4px">
            ${[3,4,5].map(n => `<button class="btn btn-ghost btn-sm layout-btn-s ${DB.getColumns()===n?'btn-primary':''}" data-cols="${n}">${n}</button>`).join('')}
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Theme</div><div class="settings-desc">Switch between light and dark visual style</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            <span id="theme-current-label" style="font-size:12px;color:var(--text-2)"></span>
            <button class="btn btn-ghost btn-sm" id="theme-toggle-btn"><i data-lucide="sun"></i> Switch Theme</button>
          </div>
        </div>
        <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:10px">
          <div><div class="settings-label">Color Scheme</div><div class="settings-desc">Accent color applied to both themes</div></div>
          <div class="scheme-swatches-grid" id="scheme-grid">${schemeSwatches}</div>
        </div>
      </div>
      <div class="settings-section">
        <h3>Export</h3>
        <div class="settings-row">
          <div><div class="settings-label">Export All Bookmarks</div><div class="settings-desc">Download as JSON file</div></div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="export-all"><i data-lucide="download"></i> JSON</button>
            <button class="btn btn-ghost btn-sm" id="export-all-xlsx"><i data-lucide="table-2"></i> XLSX</button>
          </div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Export Workspace</div><div class="settings-desc">Export a specific workspace</div></div>
          <div style="display:flex;gap:8px">
            <select class="form-select" id="export-tab-sel" style="padding:5px 8px;font-size:12px">${tabOpts}</select>
            <button class="btn btn-ghost btn-sm" id="export-tab"><i data-lucide="download"></i> JSON</button>
            <button class="btn btn-ghost btn-sm" id="export-tab-xlsx"><i data-lucide="table-2"></i> XLSX</button>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <h3>Import</h3>
        <div class="settings-row">
          <div><div class="settings-label">Import Bookmarks</div><div class="settings-desc">Chrome/Firefox HTML export format</div></div>
          <button class="btn btn-ghost btn-sm" id="settings-import"><i data-lucide="upload"></i> Import</button>
        </div>
      </div>
      <div class="settings-section">
        <h3>Data</h3>
        <div class="settings-row">
          <div><div class="settings-label">Reset All Data</div><div class="settings-desc">Delete all bookmarks and restore demo data</div></div>
          <button class="btn btn-danger btn-sm" id="reset-data">Reset Data</button>
        </div>
      </div>
    `;

    wrapper.querySelectorAll('.layout-btn-s').forEach(btn => {
      btn.onclick = () => {
        DB.setColumns(parseInt(btn.dataset.cols));
        container.innerHTML = '';
        renderSettings(container);
        lucide.createIcons({ nodes: [container] });
      };
    });

    wrapper.querySelector('#export-all').onclick = () => { DB.exportJSON(); toast('Exported!', 'success'); };
    wrapper.querySelector('#export-all-xlsx').onclick = () => { DB.exportXLSX(); toast('Exported as XLSX!', 'success'); };
    wrapper.querySelector('#export-tab').onclick = () => {
      const tabId = wrapper.querySelector('#export-tab-sel').value;
      DB.exportTabJSON(tabId);
      toast('Exported!', 'success');
    };
    wrapper.querySelector('#export-tab-xlsx').onclick = () => {
      const tabId = wrapper.querySelector('#export-tab-sel').value;
      DB.exportTabXLSX(tabId);
      toast('Exported as XLSX!', 'success');
    };
    wrapper.querySelector('#settings-import').onclick = () => Components.ImportModal();
    wrapper.querySelector('#reset-data').onclick = () => {
      if (!confirm('Reset all data? This cannot be undone.')) return;
      localStorage.removeItem('bookmark_os_v1');
      location.reload();
    };

    // Theme toggle — cycles through 3 themes
    const styleLink = document.getElementById('main-stylesheet');
    const themeLabel = wrapper.querySelector('#theme-current-label');
    const themeBtn = wrapper.querySelector('#theme-toggle-btn');
    const themes = [
      { file: 'styles.css',              name: 'Default',   icon: 'sun' },
      { file: 'styles black.css',        name: 'Black',     icon: 'moon' },
      { file: 'styles cyberpunk.css',    name: 'Cyberpunk', icon: 'zap' },
    ];
    function updateThemeUI() {
      const current = styleLink.getAttribute('href');
      const t = themes.find(t => t.file === current) || themes[0];
      themeLabel.textContent = t.name;
      themeBtn.innerHTML = `<i data-lucide="${t.icon}"></i> Switch Theme`;
      lucide.createIcons({ nodes: [themeBtn] });
    }
    updateThemeUI();
    themeBtn.onclick = () => {
      const current = styleLink.getAttribute('href');
      const idx = themes.findIndex(t => t.file === current);
      const next = themes[(idx + 1) % themes.length];
      styleLink.setAttribute('href', next.file);
      localStorage.setItem('bm_theme', next.file);
      updateThemeUI();
      toast(`Switched to ${next.name} theme`, 'success');
    };

    // Color scheme swatches
    wrapper.querySelectorAll('.scheme-swatch').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.scheme;
        if (window.applyScheme) window.applyScheme(id);
        wrapper.querySelectorAll('.scheme-swatch').forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        toast(`Color: ${el.title}`, 'success');
      };
    });

    container.appendChild(wrapper);
  }

  // ── SEARCH ──
  function attachSearch(input, _results, clearBtn) {
    let debounceTimer = null;

    const updateClear = () => {
      if (clearBtn) clearBtn.classList.toggle('visible', input.value.length > 0);
    };

    const clearSearch = () => {
      input.value = '';
      state.searchQuery = '';
      updateClear();
      renderContent();
    };

    // Debounced search handler
    const handleInput = debounce(() => {
      state.searchQuery = input.value.trim();
      renderContent();
    }, 200);

    input.addEventListener('input', () => {
      updateClear();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleInput, 200);
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => { clearSearch(); input.focus(); });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { clearSearch(); input.blur(); }
    });
  }

  function initSearch() {
    attachSearch(
      document.getElementById('search-input'),
      document.getElementById('search-results'),
      document.getElementById('search-clear')
    );
    attachSearch(
      document.getElementById('mobile-search-input'),
      document.getElementById('mobile-search-results'),
      document.getElementById('mobile-search-clear')
    );
  }

  // ── KEYBOARD SHORTCUTS ──
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      const inInput = document.activeElement.matches('input,textarea,select');
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); Components.CommandPalette(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); Components.BookmarkFormModal(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && state.view === 'list') { e.preventDefault(); DB.getAllBookmarks().forEach(b => state.selectedIds.add(b.id)); renderContent(); return; }

      if (inInput) return;

      if (e.key === '/') { e.preventDefault(); document.getElementById('search-input').focus(); return; }
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); document.getElementById('quick-add-input').focus(); return; }
      if (e.key === '1') { switchView('dashboard'); return; }
      if (e.key === '2') { switchView('list'); return; }
      if (e.key === '3') { switchView('graph'); return; }
      if (e.key === 'Escape') {
        state.selectedIds.clear();
        Components.BulkActionsBar(state.selectedIds);
        return;
      }

      // Card navigation on dashboard
      if (state.view === 'dashboard') {
        const cards = [...document.querySelectorAll('.bookmark-card')];
        const idx = cards.findIndex(c => c.classList.contains('focused-card'));
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          const next = cards[idx + 1];
          if (next) { cards.forEach(c => c.classList.remove('focused-card')); next.classList.add('focused-card'); next.scrollIntoView({ block: 'nearest' }); state.focusedCardId = next.dataset.id; }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          const prev = cards[idx - 1];
          if (prev) { cards.forEach(c => c.classList.remove('focused-card')); prev.classList.add('focused-card'); prev.scrollIntoView({ block: 'nearest' }); state.focusedCardId = prev.dataset.id; }
        } else if (e.key === 'Enter' && state.focusedCardId) {
          Components.FocusModal(state.focusedCardId);
        } else if (e.key === 'e' && state.focusedCardId) {
          Components.BookmarkFormModal(DB.getBookmarkById(state.focusedCardId));
        } else if (e.key === 'c' && state.focusedCardId) {
          DB.moveToCatalog(state.focusedCardId); DB.rebuildFuse(); state.focusedCardId = null; renderContent(); toast('Moved to Catalog', 'info');
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.focusedCardId) {
          if (confirm('Delete this bookmark?')) { DB.deleteBookmark(state.focusedCardId); DB.rebuildFuse(); state.focusedCardId = null; renderContent(); toast('Deleted', 'error'); }
        }
      }
    });
  }

  // ── CONTEXT MENUS ──
  function showBookmarkContextMenu(bmId, x, y) {
    const bm = DB.getBookmarkById(bmId);
    if (!bm) return;
    if (bm.inCatalog) {
      Components.showContextMenu(x, y, [
        { label: 'Open URL', icon: 'external-link', action: () => { window.open(bm.url, '_blank'); DB.incrementVisit(bmId); } },
        { label: 'Focus View', icon: 'maximize-2', action: () => Components.FocusModal(bmId) },
        'sep',
        { label: 'Restore to Category…', icon: 'corner-up-left', action: () => promptRestoreFromCatalog(bmId) },
        'sep',
        { label: 'Delete', icon: 'trash-2', danger: true, action: () => promptDeleteBookmark(bmId) },
      ]);
    } else {
      Components.showContextMenu(x, y, [
        { label: 'Open URL', icon: 'external-link', action: () => { window.open(bm.url, '_blank'); DB.incrementVisit(bmId); } },
        { label: 'Focus View', icon: 'maximize-2', action: () => Components.FocusModal(bmId) },
        { label: 'Edit', icon: 'edit-2', action: () => Components.BookmarkFormModal(bm) },
        'sep',
        { label: bm.favorite ? 'Remove Favorite' : 'Add Favorite', icon: 'star', action: () => { DB.updateBookmark(bmId, { favorite: !bm.favorite }); renderTabsBar(); renderContent(); } },
        { label: 'Move to Catalog', icon: 'archive', action: () => { DB.moveToCatalog(bmId); renderContent(); toast('Moved to Catalog', 'info'); } },
        'sep',
        { label: 'Delete', icon: 'trash-2', danger: true, action: () => promptDeleteBookmark(bmId) },
      ]);
    }
  }

  function promptRestoreFromCatalog(bmId) {
    const bm = DB.getBookmarkById(bmId);
    const cats = DB.getAllCategories();
    if (!cats.length) { toast('No categories available', 'error'); return; }
    const overlay = document.getElementById('modal-overlay');
    const modal = Components.el('div', 'modal');
    modal.style.width = '360px';
    const catOpts = cats.map(c => {
      const tab = DB.getTabById(DB.getTabs().find(t => DB.getCategories(t.id).some(cc => cc.id === c.id))?.id);
      return `<option value="${c.id}">${tab ? tab.name + ' → ' : ''}${c.name}</option>`;
    }).join('');
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Restore Bookmark</span>
        <button class="modal-close" id="rfx-close"><i data-lucide="x"></i></button>
      </div>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">
        Move <strong>${bm.title}</strong> back to:
      </p>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="rfx-cat">${catOpts}</select>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="rfx-cancel">Cancel</button>
        <button class="btn btn-primary" id="rfx-confirm"><i data-lucide="corner-up-left"></i> Restore</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#rfx-close').onclick = close;
    modal.querySelector('#rfx-cancel').onclick = close;
    modal.querySelector('#rfx-confirm').onclick = () => {
      const catId = modal.querySelector('#rfx-cat').value;
      DB.updateBookmark(bmId, { inCatalog: false, categoryId: catId });
      DB.rebuildFuse();
      close(); renderContent();
      toast('Bookmark restored', 'success');
    };
  }

  function promptDeleteBookmark(bmId) {
    const bm = DB.getBookmarkById(bmId);
    const overlay = document.getElementById('modal-overlay');
    const modal = Components.el('div', 'modal');
    modal.style.width = '340px';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Delete Bookmark</span>
        <button class="modal-close" id="db-close"><i data-lucide="x"></i></button>
      </div>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:20px">
        Delete <strong>${bm.title}</strong>? This cannot be undone.
      </p>
      <div class="form-actions">
        <button class="btn btn-ghost" id="db-cancel">Cancel</button>
        <button class="btn btn-danger" id="db-confirm">Delete</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#db-close').onclick = close;
    modal.querySelector('#db-cancel').onclick = close;
    modal.querySelector('#db-confirm').onclick = () => {
      DB.deleteBookmark(bmId); DB.rebuildFuse();
      close(); renderContent(); toast('Deleted', 'error');
    };
  }

  function showTabContextMenu(tabId, x, y) {
    const tab = DB.getTabById(tabId);
    if (!tab) return;
    Components.showContextMenu(x, y, [
      { label: 'Rename', icon: 'edit-2', action: () => promptRenameTab(tabId) },
      { label: 'Change Color', icon: 'palette', action: () => promptChangeTabColor(tabId) },
      { label: 'Share', icon: 'share-2', action: () => Components.ShareModal(tabId) },
      'sep',
      { label: 'Delete Workspace', icon: 'trash-2', danger: true, action: () => promptDeleteTab(tabId) },
    ]);
  }

  function showCategoryContextMenu(catId, x, y) {
    const cat = DB.getCategoryById(catId);
    if (!cat) return;
    Components.showContextMenu(x, y, [
      { label: 'Rename', icon: 'edit-2', action: () => promptRenameCategory(catId) },
      { label: 'Change Color', icon: 'palette', action: () => promptChangeCategoryColor(catId) },
      'sep',
      { label: 'Delete Category', icon: 'trash-2', danger: true, action: () => {
        promptDeleteCategory(catId);
      }},
    ]);
  }

  function promptDeleteCategory(catId) {
    const cat = DB.getCategoryById(catId);
    const bms = DB.getAllBookmarks().filter(b => b.categoryId === catId);
    const otherCats = DB.getAllCategories().filter(c => c.id !== catId);
    const overlay = document.getElementById('modal-overlay');
    const modal = Components.el('div', 'modal');
    modal.style.width = '400px';

    const moveOpts = otherCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Delete "${cat.name}"</span>
        <button class="modal-close" id="dc-close"><i data-lucide="x"></i></button>
      </div>
      ${bms.length ? `
        <p style="font-size:13px;color:var(--text-2);margin-bottom:14px">
          This category contains <strong>${bms.length} bookmark${bms.length > 1 ? 's' : ''}</strong>. What should happen to them?
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          <label style="display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer" id="dc-opt-move-row">
            <input type="radio" name="dc-action" value="move" style="margin-top:2px" ${otherCats.length ? '' : 'disabled'}>
            <div>
              <div style="font-size:13px;font-weight:600;${otherCats.length ? '' : 'opacity:0.4'}">Move to another category</div>
              ${otherCats.length
                ? `<select class="form-select" id="dc-move-target" style="margin-top:6px;font-size:12px">${moveOpts}</select>`
                : `<div style="font-size:12px;color:var(--text-3);margin-top:2px">No other categories available</div>`
              }
            </div>
          </label>
          <label style="display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer">
            <input type="radio" name="dc-action" value="delete" style="margin-top:2px" ${otherCats.length ? '' : 'checked'}>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--danger)">Delete all bookmarks</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px">Cannot be undone</div>
            </div>
          </label>
        </div>
      ` : `
        <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">Category is empty. Delete it?</p>
      `}
      <div class="form-actions">
        <button class="btn btn-ghost" id="dc-cancel">Cancel</button>
        <button class="btn btn-danger" id="dc-confirm">Delete Category</button>
      </div>
    `;

    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });

    // Auto-select move if other cats exist
    if (otherCats.length && bms.length) {
      modal.querySelector('input[value="move"]').checked = true;
    }

    const close = () => Components.closeModal(overlay);
    modal.querySelector('#dc-close').onclick = close;
    modal.querySelector('#dc-cancel').onclick = close;

    modal.querySelector('#dc-confirm').onclick = () => {
      const selected = bms.length ? modal.querySelector('input[name="dc-action"]:checked')?.value : 'delete';
      if (selected === 'move') {
        const targetId = modal.querySelector('#dc-move-target')?.value;
        if (!targetId) return;
        bms.forEach(b => DB.updateBookmark(b.id, { categoryId: targetId }));
        DB.deleteCategory(catId);
        close(); renderContent();
        toast(`Moved ${bms.length} bookmark${bms.length > 1 ? 's' : ''} & deleted category`, 'success');
      } else {
        bms.forEach(b => DB.deleteBookmark(b.id));
        DB.deleteCategory(catId);
        close(); renderContent();
        toast('Category deleted', 'error');
      }
    };
  }

  // ── PROMPTS → MODALS ──
  function promptAddCategory() {
    const overlay = document.getElementById('modal-overlay');
    let selectedColor = DB.PRESET_COLORS[Math.floor(Math.random() * DB.PRESET_COLORS.length)];
    const modal = Components.el('div', 'modal');
    modal.style.width = '360px';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">New Category</span>
        <button class="modal-close" id="cat-close"><i data-lucide="x"></i></button>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" class="form-input" id="cat-name" placeholder="e.g. Design, Reading...">
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div id="cat-color-picker"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="cat-cancel">Cancel</button>
        <button class="btn btn-primary" id="cat-save">Create</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    Components.ColorPicker(modal.querySelector('#cat-color-picker'), selectedColor, c => { selectedColor = c; });
    const nameInput = modal.querySelector('#cat-name');
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#cat-close').onclick = close;
    modal.querySelector('#cat-cancel').onclick = close;
    modal.querySelector('#cat-save').onclick = () => {
      const name = nameInput.value.trim();
      if (!name) { App.toast('Name required', 'error'); return; }
      DB.addCategory({ name, color: selectedColor, tabId: state.activeTabId });
      close();
      renderContent();
      toast('Category created', 'success');
    };
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') modal.querySelector('#cat-save').click(); });
    setTimeout(() => nameInput.focus(), 50);
  }

  function promptDeleteTab(tabId) {
    const tab = DB.getTabById(tabId);
    const catIds = new Set(DB.getCategories(tabId).map(c => c.id));
    const bmsCount = DB.getAllBookmarks().filter(b => catIds.has(b.categoryId)).length;
    const overlay = document.getElementById('modal-overlay');
    const modal = Components.el('div', 'modal');
    modal.style.width = '380px';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Delete "${tab.name}"</span>
        <button class="modal-close" id="dt-close"><i data-lucide="x"></i></button>
      </div>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:6px">
        This will permanently delete the workspace
        ${bmsCount ? `and its <strong>${bmsCount} bookmark${bmsCount > 1 ? 's' : ''}</strong>` : '(empty)'}.
      </p>
      <p style="font-size:12px;color:var(--danger);margin-bottom:20px;padding:8px 10px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius)">
        ⚠️ This action cannot be undone.
      </p>
      <div class="form-actions">
        <button class="btn btn-ghost" id="dt-cancel">Cancel</button>
        <button class="btn btn-danger" id="dt-confirm">Delete Workspace</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#dt-close').onclick = close;
    modal.querySelector('#dt-cancel').onclick = close;
    modal.querySelector('#dt-confirm').onclick = () => {
      DB.deleteTab(tabId);
      if (state.activeTabId === tabId) state.activeTabId = DB.getTabs()[0]?.id || null;
      close(); render(); toast('Workspace deleted', 'error');
    };
  }

  function promptRenameTab(tabId) {
    const tab = DB.getTabById(tabId);
    const overlay = document.getElementById('modal-overlay');
    const modal = Components.el('div', 'modal');
    modal.style.width = '340px';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Rename Workspace</span>
        <button class="modal-close" id="rt-close"><i data-lucide="x"></i></button>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" class="form-input" id="rt-name" value="${tab.name}">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="rt-cancel">Cancel</button>
        <button class="btn btn-primary" id="rt-save">Rename</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    const input = modal.querySelector('#rt-name');
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#rt-close').onclick = close;
    modal.querySelector('#rt-cancel').onclick = close;
    modal.querySelector('#rt-save').onclick = () => {
      const name = input.value.trim();
      if (!name) return;
      DB.updateTab(tabId, { name }); close(); render(); toast('Renamed', 'success');
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') modal.querySelector('#rt-save').click(); });
    setTimeout(() => { input.focus(); input.select(); }, 50);
  }

  function promptChangeTabColor(tabId) {
    const tab = DB.getTabById(tabId);
    const overlay = document.getElementById('modal-overlay');
    let selectedColor = tab.color;
    const modal = Components.el('div', 'modal');
    modal.style.width = '340px';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Change Color</span>
        <button class="modal-close" id="tc-close"><i data-lucide="x"></i></button>
      </div>
      <div class="form-group">
        <div id="tc-color-picker"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="tc-cancel">Cancel</button>
        <button class="btn btn-primary" id="tc-save">Save</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    Components.ColorPicker(modal.querySelector('#tc-color-picker'), selectedColor, c => { selectedColor = c; });
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#tc-close').onclick = close;
    modal.querySelector('#tc-cancel').onclick = close;
    modal.querySelector('#tc-save').onclick = () => {
      DB.updateTab(tabId, { color: selectedColor }); close(); render(); toast('Color updated', 'success');
    };
  }

  function promptRenameCategory(catId) {
    const cat = DB.getCategoryById(catId);
    const overlay = document.getElementById('modal-overlay');
    const modal = Components.el('div', 'modal');
    modal.style.width = '340px';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Rename Category</span>
        <button class="modal-close" id="rc-close"><i data-lucide="x"></i></button>
      </div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input type="text" class="form-input" id="rc-name" value="${cat.name}">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="rc-cancel">Cancel</button>
        <button class="btn btn-primary" id="rc-save">Rename</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    const input = modal.querySelector('#rc-name');
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#rc-close').onclick = close;
    modal.querySelector('#rc-cancel').onclick = close;
    modal.querySelector('#rc-save').onclick = () => {
      const name = input.value.trim();
      if (!name) return;
      DB.updateCategory(catId, { name }); close(); renderContent(); toast('Renamed', 'success');
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') modal.querySelector('#rc-save').click(); });
    setTimeout(() => { input.focus(); input.select(); }, 50);
  }

  function promptChangeCategoryColor(catId) {
    const cat = DB.getCategoryById(catId);
    const overlay = document.getElementById('modal-overlay');
    let selectedColor = cat.color;
    const modal = Components.el('div', 'modal');
    modal.style.width = '340px';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">Change Category Color</span>
        <button class="modal-close" id="cc-close"><i data-lucide="x"></i></button>
      </div>
      <div class="form-group">
        <div id="cc-color-picker"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="cc-cancel">Cancel</button>
        <button class="btn btn-primary" id="cc-save">Save</button>
      </div>
    `;
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    Components.openModal(overlay, modal);
    lucide.createIcons({ nodes: [modal] });
    Components.ColorPicker(modal.querySelector('#cc-color-picker'), selectedColor, c => { selectedColor = c; });
    const close = () => Components.closeModal(overlay);
    modal.querySelector('#cc-close').onclick = close;
    modal.querySelector('#cc-cancel').onclick = close;
    modal.querySelector('#cc-save').onclick = () => {
      DB.updateCategory(catId, { color: selectedColor }); close(); renderContent(); toast('Color updated', 'success');
    };
  }

  // ── EVENTS ──
  function initEvents() {
    // Close modal on overlay click (click outside the modal box)
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) {
        const overlay = document.getElementById('modal-overlay');
        Components.closeModal(overlay, () => App.render());
      }
    });

    // Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
      });
    });

    // Add bookmark button
    document.getElementById('add-bookmark-btn').addEventListener('click', () => Components.BookmarkFormModal());

    // Import button
    document.getElementById('import-btn').addEventListener('click', () => Components.ImportModal());

    // Command palette button
    document.getElementById('cmd-palette-btn').addEventListener('click', () => Components.CommandPalette());

    // Add tab button
    document.getElementById('add-tab-btn').addEventListener('click', () => {
      const overlay = document.getElementById('modal-overlay');
      const modal = Components.el('div', 'modal');
      modal.style.width = '360px';
      modal.innerHTML = `
        <div class="modal-header">
          <span class="modal-title">New Workspace</span>
          <button class="modal-close" id="ws-close"><i data-lucide="x"></i></button>
        </div>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" id="ws-name" placeholder="e.g. Work, Personal, Reading...">
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" id="ws-cancel">Cancel</button>
          <button class="btn btn-primary" id="ws-save">Create</button>
        </div>
      `;
      overlay.innerHTML = '';
      overlay.appendChild(modal);
      Components.openModal(overlay, modal);
      lucide.createIcons({ nodes: [modal] });
      const nameInput = modal.querySelector('#ws-name');
      const close = () => Components.closeModal(overlay);
      modal.querySelector('#ws-close').onclick = close;
      modal.querySelector('#ws-cancel').onclick = close;
      modal.querySelector('#ws-save').onclick = () => {
        const name = nameInput.value.trim();
        if (!name) { toast('Name required', 'error'); return; }
        const tab = DB.addTab({ name });
        state.activeTabId = tab.id;
        close();
        render();
        toast('Workspace created', 'success');
      };
      nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') modal.querySelector('#ws-save').click(); });
      setTimeout(() => nameInput.focus(), 50);
    });

    // Workspaces section collapse
    document.getElementById('workspaces-collapse-btn').addEventListener('click', () => {
      document.getElementById('sidebar-tabs-section').classList.toggle('collapsed');
    });

    // Sidebar toggle — drawer on mobile, collapse on desktop
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      const isMobile = window.innerWidth <= 900;
      if (isMobile) {
        const isOpen = sidebar.classList.toggle('drawer-open');
        backdrop.classList.toggle('visible', isOpen);
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });

    document.getElementById('sidebar-backdrop').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('drawer-open');
      document.getElementById('sidebar-backdrop').classList.remove('visible');
    });

    // Close drawer on nav item click (mobile)
    document.getElementById('sidebar').addEventListener('click', (e) => {
      if (window.innerWidth <= 900 && e.target.closest('.nav-item, .sidebar-tab-item')) {
        document.getElementById('sidebar').classList.remove('drawer-open');
        document.getElementById('sidebar-backdrop').classList.remove('visible');
      }
    });

    // Layout switcher
    document.getElementById('layout-switcher').addEventListener('click', (e) => {
      const btn = e.target.closest('.layout-btn');
      if (!btn) return;
      const cols = parseInt(btn.dataset.cols);
      DB.setColumns(cols);
      const grid = document.querySelector('.dashboard-grid');
      if (grid) grid.dataset.cols = cols;
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.cols) === cols));
    });

    // Event delegation for content area
    document.getElementById('content').addEventListener('click', (e) => {
      // Card actions
      const card = e.target.closest('.bookmark-card');
      const actionBtn = e.target.closest('[data-action]');

      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'open' && card) {
          e.stopPropagation();
          const bm = DB.getBookmarkById(card.dataset.id);
          if (bm) { window.open(bm.url, '_blank'); DB.incrementVisit(card.dataset.id); }
          return;
        }
        if (action === 'edit' && card) {
          e.stopPropagation();
          Components.BookmarkFormModal(DB.getBookmarkById(card.dataset.id));
          return;
        }
        if (action === 'menu' && card) {
          e.stopPropagation();
          const rect = actionBtn.getBoundingClientRect();
          showBookmarkContextMenu(card.dataset.id, rect.left, rect.bottom + 4);
          return;
        }
        if (action === 'add-to-cat') {
          Components.BookmarkFormModal(null, actionBtn.dataset.catId);
          return;
        }
        if (action === 'cat-menu') {
          e.stopPropagation();
          const catId = actionBtn.dataset.catId;
          const rect = actionBtn.getBoundingClientRect();
          showCategoryContextMenu(catId, rect.left, rect.bottom + 4);
          return;
        }
        if (action === 'filter-tag') {
          state.listTagFilter = actionBtn.dataset.tag;
          switchView('list');
          return;
        }
      }

      // Card click → FocusModal
      if (card && !e.target.closest('.card-actions') && !e.target.closest('.tag-chip')) {
        Components.FocusModal(card.dataset.id);
      }
    });

    // Context menu on cards
    document.getElementById('content').addEventListener('contextmenu', (e) => {
      const card = e.target.closest('.bookmark-card');
      if (card) {
        e.preventDefault();
        showBookmarkContextMenu(card.dataset.id, e.clientX, e.clientY);
      }
    });
  }

  // ── FULL RENDER ──
  function render() {
    renderSidebar();
    renderTabsBar();
    renderTopbar();
    renderContent();
    lucide.createIcons();
  }

  // ── QUICK ADD ──
  function initQuickAdd() {
    const input = document.getElementById('quick-add-input');
    const preview = document.getElementById('quick-add-preview');
    let fetchTimer = null;
    let currentUrl = '';
    let previewState = { title: '', tags: [], categoryId: '', favicon: '' };

    function isValidUrl(s) {
      try { new URL(s.startsWith('http') ? s : 'https://' + s); return true; } catch { return false; }
    }

    function normalizeUrl(s) {
      return s.startsWith('http') ? s : 'https://' + s;
    }

    // Smart category pick: find category where bookmarks share most tags with suggestedTags
    function smartCategory(suggestedTags) {
      if (!suggestedTags.length) return DB.getAllCategories()[0]?.id || '';
      const cats = DB.getAllCategories();
      const scores = cats.map(cat => {
        const bms = DB.getAllBookmarks().filter(b => b.categoryId === cat.id);
        let score = 0;
        bms.forEach(b => { score += (b.tags || []).filter(t => suggestedTags.includes(t)).length; });
        return { id: cat.id, score };
      });
      scores.sort((a, b) => b.score - a.score);
      return scores[0]?.score > 0 ? scores[0].id : (cats[0]?.id || '');
    }

    function buildCatOptions(selectedId) {
      return DB.getAllCategories().map(c =>
        `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`
      ).join('');
    }

    function showPreview() {
      const url = normalizeUrl(currentUrl);
      const dup = DB.findDuplicate(url);
      const favUrl = DB.faviconUrl(url);
      const domain = DB.domainOf(url);

      previewState = { title: domain, tags: [], categoryId: DB.getAllCategories()[0]?.id || '', favicon: DB.faviconEmoji(url) };

      preview.style.display = 'block';
      preview.innerHTML = `
        <div class="qap-header">
          ${favUrl ? `<img src="${favUrl}" class="qap-favicon" onerror="this.replaceWith(document.createTextNode('🔗'))">` : `<span class="qap-favicon">🔗</span>`}
          <span class="qap-title" id="qap-title">${domain}</span>
          <span class="qap-domain">${domain}</span>
        </div>
        ${dup ? `<div class="qap-dup">⚠️ Already saved as "${dup.title}"</div>` : ''}
        <div class="qap-tags" id="qap-tags">
          <div class="qap-loading"><div class="spinner"></div> Loading...</div>
        </div>
        <div class="qap-footer">
          <select class="qap-cat-select" id="qap-cat">${buildCatOptions(previewState.categoryId)}</select>
          <button class="btn btn-ghost btn-sm" id="qap-edit"><i data-lucide="edit-2"></i> Full form</button>
          <button class="btn btn-primary btn-sm" id="qap-save"><i data-lucide="check"></i> Save</button>
        </div>
      `;
      lucide.createIcons({ nodes: [preview] });

      preview.querySelector('#qap-cat').onchange = (e) => { previewState.categoryId = e.target.value; };

      preview.querySelector('#qap-save').onclick = () => saveQuick();
      preview.querySelector('#qap-edit').onclick = () => {
        hidePreview();
        input.value = '';
        Components.BookmarkFormModal({ url, title: previewState.title, tags: previewState.tags, favicon: previewState.favicon, categoryId: previewState.categoryId });
      };

      // Fetch title + description + tags in parallel
      const canFetch = location.protocol !== 'file:';

      const fetchPageHTML = Components.fetchPageHTML;

      Promise.all([
        canFetch
          ? fetchPageHTML(url)
              .then(html => {
                const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                const desc = Components.extractMetaContent(html, 'description') || Components.extractMetaContent(html, 'og:description');
                return {
                  title: titleMatch?.[1]?.trim().slice(0, 120) || domain,
                  description: desc.slice(0, 300),
                };
              })
              .catch(() => ({ title: domain, description: '' }))
          : Promise.resolve({ title: domain, description: '' }),
        DB.simulateAutoTag(url, domain),
      ]).then(([{ title, description }, tags]) => {
        previewState.title = title;
        previewState.description = description;
        previewState.tags = tags;
        previewState.categoryId = smartCategory(tags);

        const titleEl = preview.querySelector('#qap-title');
        if (titleEl) titleEl.textContent = title;

        const tagsEl = preview.querySelector('#qap-tags');
        if (tagsEl) {
          tagsEl.innerHTML = tags.map(t => `<span class="tag-chip">${t}</span>`).join('') || '<span style="font-size:12px;color:var(--text-muted)">No tags suggested</span>';
        }

        const catSel = preview.querySelector('#qap-cat');
        if (catSel) { catSel.innerHTML = buildCatOptions(previewState.categoryId); }
      });
    }

    function hidePreview() {
      preview.style.display = 'none';
      preview.innerHTML = '';
    }

    function saveQuick() {
      const url = normalizeUrl(currentUrl);
      DB.addBookmark({
        url,
        title: previewState.title || DB.domainOf(url),
        description: previewState.description || '',
        tags: previewState.tags,
        favicon: previewState.favicon || DB.faviconEmoji(url),
        categoryId: previewState.categoryId,
      });
      DB.rebuildFuse();
      toast('Bookmark saved', 'success');
      input.value = '';
      currentUrl = '';
      hidePreview();
      renderContent();
    }

    input.addEventListener('input', () => {
      const val = input.value.trim();
      clearTimeout(fetchTimer);
      if (!val) { input.className = 'quick-add-input'; hidePreview(); currentUrl = ''; return; }
      if (isValidUrl(val)) {
        input.classList.add('valid'); input.classList.remove('invalid');
        currentUrl = val;
        fetchTimer = setTimeout(() => showPreview(), 300);
      } else {
        input.classList.add('invalid'); input.classList.remove('valid');
        hidePreview();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentUrl && isValidUrl(currentUrl)) {
          if (preview.style.display === 'none') { showPreview(); }
          else { saveQuick(); }
        }
      }
      if (e.key === 'Escape') { input.value = ''; input.className = 'quick-add-input'; hidePreview(); currentUrl = ''; input.blur(); }
    });

    // Paste event — auto-trigger immediately
    input.addEventListener('paste', () => {
      setTimeout(() => {
        const val = input.value.trim();
        if (isValidUrl(val)) { currentUrl = val; input.classList.add('valid'); showPreview(); }
      }, 10);
    });
  }

  // ── INIT ──
  function init() {
    const tabs = DB.getTabs();
    state.activeTabId = tabs[0]?.id || null;

    initEvents();
    initSearch();
    initKeyboard();
    initQuickAdd();
    render();
  }

  return {
    state,
    toast,
    switchView,
    switchTab,
    render,
    renderContent,
    renderSidebar,
    renderTabsBar,
    renderTopbar,
    init,
  };

})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());
