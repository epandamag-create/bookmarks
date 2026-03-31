// v1.0 — UI factory functions: cards, modals, palette, graph, forms
// v1.1 — added: real favicons via Google favicon service with emoji fallback
// v1.2 — added: collapse chevron on category header, header click to collapse
// v1.3 — added: Motion One animations, Tagify tags, Marked.js notes
// v1.4 — added: BookmarkCard DOM element cache to prevent favicon flickering on re-render

window.Components = (() => {

  // Cache of rendered card elements: bmId → { fingerprint, element }
  // Fingerprint covers all fields that affect card appearance.
  // Reusing the same <img> element avoids favicon flicker on every App.render().
  const _cardCache = new Map();

  // ── SHARED FETCH HELPER ──
  async function fetchPageHTML(targetUrl) {
    const proxies = [
      u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      u => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}`,
    ];
    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy(targetUrl), { signal: AbortSignal.timeout(6000) });
        if (!res.ok) continue;
        const html = await res.text();
        if (html.length > 200) return html;
      } catch { continue; }
    }
    return '';
  }

  // ── MOTION HELPERS ──
  function openOverlay(overlay, modal) {
    overlay.classList.remove('hidden');
    if (window.Motion?.animate) {
      overlay.style.opacity = '0';
      overlay.classList.add('visible');
      Motion.animate(overlay, { opacity: [0, 1] }, { duration: 0.15, easing: 'ease-out' });
      Motion.animate(modal,   { opacity: [0, 1], scale: [0.96, 1], y: [8, 0] }, { duration: 0.18, easing: [0.34, 1.56, 0.64, 1] });
    } else {
      requestAnimationFrame(() => overlay.classList.add('visible'));
    }
  }

  function closeOverlay(overlay, onDone) {
    if (window.Motion?.animate) {
      const modal = overlay.querySelector('.modal, .cmd-palette');
      const seq = [
        Motion.animate(modal,   { opacity: [1, 0], scale: [1, 0.96], y: [0, 6] }, { duration: 0.15, easing: 'ease-in' }),
        Motion.animate(overlay, { opacity: [1, 0] }, { duration: 0.12, easing: 'ease-in' }),
      ];
      Promise.all(seq.map(a => a.finished)).then(() => {
        overlay.classList.remove('visible');
        overlay.innerHTML = '';
        overlay.classList.add('hidden');
        if (onDone) onDone();
      });
    } else {
      overlay.classList.remove('visible');
      setTimeout(() => { overlay.innerHTML = ''; overlay.classList.add('hidden'); if (onDone) onDone(); }, 200);
    }
  }

  // Robust meta tag extractor — handles any attribute order, quotes, newlines
  function extractMetaContent(html, key) {
    // Find all <meta ...> tags (including multiline)
    const metaRe = /<meta\s+([\s\S]*?)\/?>( |$)/gi;
    let m;
    while ((m = metaRe.exec(html)) !== null) {
      const attrs = m[1];
      const nameMatch = attrs.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i);
      if (!nameMatch) continue;
      if (nameMatch[1].toLowerCase() !== key.toLowerCase()) continue;
      const contentMatch = attrs.match(/content\s*=\s*["']([^"']+)["']/i);
      if (contentMatch?.[1]?.trim().length > 5) return contentMatch[1].trim();
    }
    return '';
  }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function icon(name, size = 14) {
    const i = document.createElement('i');
    i.setAttribute('data-lucide', name);
    i.style.cssText = `width:${size}px;height:${size}px;display:inline-block;vertical-align:middle`;
    return i;
  }

  function iconBtn(iconName, title, cls = '') {
    const btn = el('button', `icon-btn icon-btn-sm ${cls}`);
    btn.title = title;
    btn.appendChild(icon(iconName, 13));
    return btn;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  }

  // Returns an <img> with real favicon, falls back to emoji <span>
  function faviconEl(bm, size = 16) {
    const url = DB.faviconUrl(bm.url);
    const fallback = bm.favicon || '🔗';
    if (!url) {
      const s = document.createElement('span');
      s.style.fontSize = size + 'px';
      s.textContent = fallback;
      return s;
    }
    const img = document.createElement('img');
    img.src = url;
    img.width = size;
    img.height = size;
    img.style.cssText = `width:${size}px;height:${size}px;object-fit:contain;border-radius:3px;flex-shrink:0`;
    img.alt = '';
    // On error, swap to emoji span
    img.onerror = () => {
      const s = document.createElement('span');
      s.style.cssText = `font-size:${size}px;line-height:1;flex-shrink:0`;
      s.textContent = fallback;
      img.replaceWith(s);
    };
    return img;
  }

  // ── BOOKMARK CARD ──
  function BookmarkCard(bm) {
    const cat = DB.getCategoryById(bm.categoryId);
    const fingerprint = `${bm.updatedAt}|${cat?.color || ''}`;
    const cached = _cardCache.get(bm.id);
    if (cached && cached.fingerprint === fingerprint) return cached.element;

    const card = el('div', 'bookmark-card');
    card.dataset.id = bm.id;
    card.style.setProperty('--card-color', bm.color || (cat ? cat.color : 'transparent'));
    card.draggable = true;

    const header = el('div', 'card-header');

    const fav = faviconEl(bm, 16);
    fav.className = 'card-favicon';

    const title = el('div', 'card-title');
    title.textContent = bm.title;

    const actions = el('div', 'card-actions');
    const openBtn = iconBtn('external-link', 'Open');
    openBtn.dataset.action = 'open';
    const editBtn = iconBtn('edit-2', 'Edit');
    editBtn.dataset.action = 'edit';
    const menuBtn = iconBtn('more-horizontal', 'More');
    menuBtn.dataset.action = 'menu';
    if (bm.favorite) {
      const favIcon = el('span', 'card-fav-icon');
      favIcon.textContent = '★';
      actions.appendChild(favIcon);
    }
    actions.appendChild(openBtn);
    actions.appendChild(editBtn);
    actions.appendChild(menuBtn);

    header.appendChild(fav);
    header.appendChild(title);
    header.appendChild(actions);
    card.appendChild(header);

    if (bm.description) {
      const desc = el('div', 'card-desc');
      desc.textContent = bm.description;
      card.appendChild(desc);
    }

    if (bm.tags && bm.tags.length) {
      const tags = el('div', 'card-tags');
      bm.tags.slice(0, 4).forEach(t => {
        const chip = el('span', 'tag-chip');
        chip.textContent = t;
        chip.dataset.tag = t;
        chip.dataset.action = 'filter-tag';
        tags.appendChild(chip);
      });
      card.appendChild(tags);
    }

    const meta = el('div', 'card-meta');
    const domain = el('span', 'card-domain');
    domain.textContent = DB.domainOf(bm.url);
    const visits = el('span', 'card-visits');
    visits.innerHTML = `<i data-lucide="eye" style="width:10px;height:10px"></i> ${bm.visitCount}`;
    meta.appendChild(domain);
    meta.appendChild(visits);
    card.appendChild(meta);

    _cardCache.set(bm.id, { fingerprint, element: card });
    return card;
  }

  // ── CATEGORY COLUMN ──
  function CategoryColumn(cat, bookmarks, { collapsed = false, onToggleCollapse = null } = {}) {
    const col = el('div', 'category-column');
    col.dataset.catId = cat.id;
    col.style.setProperty('--cat-color', cat.color);
    if (collapsed) col.classList.add('collapsed');

    const header = el('div', 'category-column-header');
    const dot = el('span');
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${cat.color};flex-shrink:0;display:inline-block`;
    const name = el('span', 'cat-name');
    name.textContent = cat.name;
    const count = el('span', 'cat-count');
    count.textContent = bookmarks.length;
    const addBtn = el('button', 'icon-btn icon-btn-sm cat-add-btn');
    addBtn.title = 'Add bookmark';
    addBtn.dataset.action = 'add-to-cat';
    addBtn.dataset.catId = cat.id;
    addBtn.appendChild(icon('plus', 13));

    const menuBtn = el('button', 'icon-btn icon-btn-sm cat-menu-btn');
    menuBtn.title = 'Category options';
    menuBtn.dataset.action = 'cat-menu';
    menuBtn.dataset.catId = cat.id;
    menuBtn.appendChild(icon('more-horizontal', 13));

    const chevron = el('button', 'icon-btn icon-btn-sm cat-collapse-btn');
    chevron.title = 'Collapse';
    chevron.appendChild(icon('chevron-down', 12));
    chevron.dataset.action = 'none';
    if (collapsed) chevron.style.transform = 'rotate(-90deg)';

    header.appendChild(dot);
    header.appendChild(name);
    header.appendChild(count);
    header.appendChild(addBtn);
    header.appendChild(menuBtn);
    header.appendChild(chevron);
    col.appendChild(header);

    // Collapse on header click (ignore clicks on buttons)
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const isNowCollapsed = !col.classList.contains('collapsed');
      col.classList.toggle('collapsed', isNowCollapsed);
      chevron.style.transform = isNowCollapsed ? 'rotate(-90deg)' : '';
      if (onToggleCollapse) onToggleCollapse(cat.id, isNowCollapsed);
    });

    const body = el('div', 'category-column-body');
    body.dataset.catId = cat.id;

    if (bookmarks.length === 0) {
      const empty = el('div', 'col-empty');
      empty.innerHTML = `<div style="margin-bottom:8px;opacity:0.5">No bookmarks yet</div><button class="btn btn-ghost btn-sm" data-action="add-to-cat" data-cat-id="${cat.id}" style="font-size:12px"><i data-lucide="plus"></i> Add one</button>`;
      body.appendChild(empty);
      lucide.createIcons({ nodes: [empty] });
    } else {
      bookmarks.forEach(bm => body.appendChild(BookmarkCard(bm)));
    }

    col.appendChild(body);
    return col;
  }

  // ── TAG INPUT (Tagify) ──
  function TagInput(containerEl, initialTags = [], onChange = null) {
    containerEl.className = 'tag-input-wrapper';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Add tags...';
    containerEl.appendChild(input);

    const whitelist = DB.getUniqueTagsList();
    const tagify = new window.Tagify(input, {
      whitelist,
      originalInputValueFormat: valArr => valArr.map(v => v.value).join(','),
      dropdown: {
        enabled: 1,
        maxItems: 8,
        closeOnSelect: false,
        highlightFirst: true,
      },
      hooks: {
        beforeAddTag: tags => tags.map(t => ({ ...t, value: t.value.trim().toLowerCase().replace(/\s+/g, '-') })),
      },
    });

    // Set initial tags
    if (initialTags.length) tagify.addTags(initialTags);

    // onChange callback
    tagify.on('change', () => { if (onChange) onChange(tagify.value.map(t => t.value)); });

    return {
      getTags: () => tagify.value.map(t => t.value),
      setTags: (t) => { tagify.removeAllTags(); tagify.addTags(t); },
    };
  }

  // ── COLOR PICKER ──
  function ColorPicker(containerEl, selectedColor, onChange) {
    containerEl.innerHTML = '';
    const row = el('div', 'color-picker-row');
    DB.PRESET_COLORS.forEach(c => {
      const sw = el('div', 'color-swatch');
      sw.style.background = c;
      if (c === selectedColor) sw.classList.add('selected');
      sw.onclick = () => {
        row.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        if (onChange) onChange(c);
      };
      row.appendChild(sw);
    });
    // "none" option
    const noneEl = el('div', 'color-swatch');
    noneEl.style.cssText = 'background: var(--bg-elevated); border: 1px dashed var(--border)';
    noneEl.title = 'No color';
    if (!selectedColor) noneEl.classList.add('selected');
    noneEl.onclick = () => {
      row.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      noneEl.classList.add('selected');
      if (onChange) onChange('');
    };
    row.appendChild(noneEl);
    containerEl.appendChild(row);
  }

  // ── ADD / EDIT BOOKMARK MODAL ──
  function BookmarkFormModal(existing = null, defaultCatId = null) {
    const isEdit = !!existing;
    const overlay = document.getElementById('modal-overlay');
    const modal = el('div', 'modal');
    modal.id = 'bm-modal';

    let selectedColor = existing ? (existing.color || '') : '';
    let selectedCategoryId = existing ? existing.categoryId : (defaultCatId || (DB.getAllCategories()[0]?.id || ''));
    let tagInputCtrl = null;
    let dupWarning = null;
    let aiChipsContainer = null;
    let checkingDup = false;

    const allCats = DB.getAllCategories();

    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">${isEdit ? 'Edit Bookmark' : 'Add Bookmark'}</span>
        <button class="modal-close" id="bm-modal-close"><i data-lucide="x"></i></button>
      </div>
      <div id="dup-warning-area"></div>
      <div class="form-group">
        <label class="form-label">URL *</label>
        <input type="text" class="form-input" id="bm-url" placeholder="https://..." value="${existing ? existing.url : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Title</label>
        <input type="text" class="form-input" id="bm-title" placeholder="Auto from URL domain" value="${existing ? existing.title : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input type="text" class="form-input" id="bm-desc" placeholder="Optional description" value="${existing ? existing.description : ''}">
        <span id="bm-desc-status" style="font-size:11px;color:var(--text-muted);margin-top:2px;display:block;min-height:14px"></span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" id="bm-cat">
            ${allCats.map(c => `<option value="${c.id}" ${c.id === selectedCategoryId ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tags</label>
        <div id="bm-tag-input"></div>
        <div id="ai-chips-area" style="min-height:28px;margin-top:6px"></div>
        <div class="form-hint">Press Enter or comma to add. AI suggestions appear below.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="bm-notes" rows="2" placeholder="Personal notes...">${existing ? (existing.notes || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Card Color</label>
        <div id="bm-color-picker"></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="bm-cancel">Cancel</button>
        <button class="btn btn-primary" id="bm-save">${isEdit ? 'Save Changes' : 'Add Bookmark'}</button>
      </div>
    `;

    overlay.innerHTML = '';
    overlay.appendChild(modal);
    openOverlay(overlay, modal);

    // Clicks inside modal must not bubble to overlay
    modal.addEventListener('click', e => e.stopPropagation());

    lucide.createIcons({ nodes: [modal] });

    // Tag input
    const tagContainer = modal.querySelector('#bm-tag-input');
    tagInputCtrl = TagInput(tagContainer, existing ? (existing.tags || []) : []);

    // Color picker
    ColorPicker(modal.querySelector('#bm-color-picker'), selectedColor, c => { selectedColor = c; });

    aiChipsContainer = modal.querySelector('#ai-chips-area');

    // Duplicate check on URL blur
    const urlInput = modal.querySelector('#bm-url');
    const titleInput = modal.querySelector('#bm-title');
    const dupArea = modal.querySelector('#dup-warning-area');

    urlInput.addEventListener('blur', async () => {
      const url = urlInput.value.trim();
      if (!url || isEdit) return;
      const dup = DB.findDuplicate(url);
      if (dup) {
        const cat = DB.getCategoryById(dup.categoryId);
        dupArea.innerHTML = `<div class="dup-warning">⚠️ Already saved as <strong>${dup.title}</strong> in <em>${cat?.name || 'a category'}</em>. <a id="dup-view-link">View it</a> or continue to add anyway.</div>`;
        dupArea.querySelector('#dup-view-link').onclick = () => { closeModal(); openFocusModal(dup.id); };
      } else { dupArea.innerHTML = ''; }

      // Auto-fill title + description via CORS proxy (fallback chain)
      const descInput = modal.querySelector('#bm-desc');
      const descStatus = modal.querySelector('#bm-desc-status');
      titleInput.value = titleInput.value || DB.domainOf(url);
      if (descStatus) descStatus.textContent = '⏳ Fetching...';


      try {
        const html = await fetchPageHTML(url);
        if (html) {
          if (!titleInput.value || titleInput.value === DB.domainOf(url)) {
            const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (t?.[1]) titleInput.value = t[1].trim().slice(0, 120);
          }
          if (descInput && !descInput.value) {
            const desc = extractMetaContent(html, 'description') || extractMetaContent(html, 'og:description');
            if (desc) descInput.value = desc.slice(0, 300);
          }
          if (descStatus) descStatus.textContent = '';
        } else {
          if (descStatus) descStatus.textContent = '⚠️ Could not fetch page (all proxies failed)';
        }
      } catch(e) {
        if (descStatus) descStatus.textContent = '⚠️ Fetch error';
      }

      // AI tag suggestions
      if (!isEdit) {
        aiChipsContainer.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)"><div class="spinner"></div> Suggesting tags...</div>';
        lucide.createIcons({ nodes: [aiChipsContainer] });
        const suggested = await DB.simulateAutoTag(url, titleInput.value);
        const existingTags = tagInputCtrl.getTags();
        const newSuggestions = suggested.filter(t => !existingTags.includes(t));
        if (newSuggestions.length) {
          aiChipsContainer.innerHTML = '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">✨ AI suggestions (click to add):</div>';
          const chips = el('div', 'ai-suggestion-chips');
          newSuggestions.forEach(t => {
            const chip = el('button', 'ai-chip');
            chip.innerHTML = `<span class="add">+</span> ${t}`;
            chip.onclick = () => {
              const cur = tagInputCtrl.getTags();
              if (!cur.includes(t)) { tagInputCtrl.setTags([...cur, t]); }
              chip.remove();
            };
            chips.appendChild(chip);
          });
          aiChipsContainer.appendChild(chips);
        } else {
          aiChipsContainer.innerHTML = '';
        }
      }
    });

    modal.querySelector('#bm-cat').onchange = (e) => { selectedCategoryId = e.target.value; };

    function closeModal() { closeOverlay(overlay); }
    modal.querySelector('#bm-cancel').onclick = closeModal;

    modal.querySelector('#bm-save').onclick = () => {
      const url = modal.querySelector('#bm-url').value.trim();
      if (!url) { App.toast('URL is required', 'error'); return; }
      const title = modal.querySelector('#bm-title').value.trim() || DB.domainOf(url);
      const desc = modal.querySelector('#bm-desc').value.trim();
      const notes = modal.querySelector('#bm-notes').value.trim();
      const favicon = DB.faviconEmoji(url);
      const tags = tagInputCtrl.getTags();
      const cat = modal.querySelector('#bm-cat').value;

      if (isEdit) {
        DB.updateBookmark(existing.id, { url, title, description: desc, notes, favicon, tags, color: selectedColor, categoryId: cat });
        DB.rebuildFuse();
        App.toast('Bookmark updated', 'success');
        closeModal();
        App.render();
      } else {
        const bm = DB.addBookmark({ url, title, description: desc, notes, favicon, tags, color: selectedColor, categoryId: cat });
        DB.rebuildFuse();
        App.toast('Bookmark added', 'success');
        closeModal();
        App.render();
      }
    };

    // Escape key
    const handler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handler); } };
    document.addEventListener('keydown', handler);

    setTimeout(() => urlInput.focus(), 50);
  }

  // ── FOCUS MODAL ──
  function FocusModal(bmId) {
    const bm = DB.getBookmarkById(bmId);
    if (!bm) return;
    DB.incrementVisit(bmId);

    const overlay = document.getElementById('modal-overlay');
    const modal = el('div', 'modal focus-modal');

    const cat = DB.getCategoryById(bm.categoryId);
    const tagsHtml = (bm.tags || []).map(t => `<span class="tag-chip">${t}</span>`).join('');
    const topicsHtml = (bm.aiTopics || []).map(t => `<span class="tag-chip">${t}</span>`).join('');

    modal.innerHTML = `
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span id="focus-favicon-slot" style="display:flex;align-items:center;flex-shrink:0"></span>
          <span class="modal-title">${bm.title}</span>
          ${bm.favorite ? '<span style="color:var(--warning)">★</span>' : ''}
        </div>
        <button class="modal-close" id="focus-close"><i data-lucide="x"></i></button>
      </div>
      <div class="focus-url">
        <i data-lucide="link" style="width:13px;height:13px;flex-shrink:0"></i>
        <a href="${bm.url}" target="_blank" style="color:inherit;text-decoration:none">${bm.url}</a>
        <button class="icon-btn icon-btn-sm" id="focus-copy-url" title="Copy URL"><i data-lucide="copy" style="width:12px;height:12px"></i></button>
      </div>
      ${bm.description ? `<div class="focus-desc">${bm.description}</div>` : ''}
      ${bm.aiSummary ? `
        <div class="focus-ai-section">
          <div class="focus-ai-title"><i data-lucide="sparkles" style="width:12px;height:12px"></i> AI Summary</div>
          <div class="focus-ai-text">${bm.aiSummary}</div>
          ${bm.aiTopics?.length ? `<div class="focus-ai-topics">${topicsHtml}</div>` : ''}
        </div>` : ''}
      <div class="focus-stats">
        <div class="focus-stat"><div class="focus-stat-val">${bm.visitCount}</div><div class="focus-stat-label">Visits</div></div>
        <div class="focus-stat"><div class="focus-stat-val">${formatDate(bm.createdAt)}</div><div class="focus-stat-label">Added</div></div>
        <div class="focus-stat"><div class="focus-stat-val">${cat?.name || '—'}</div><div class="focus-stat-label">Category</div></div>
      </div>
      ${tagsHtml ? `<div style="margin-bottom:16px"><div class="form-label" style="margin-bottom:6px">Tags</div><div class="card-tags">${tagsHtml}</div></div>` : ''}
      <div class="focus-notes">
        <div class="form-label" style="margin-bottom:6px;display:flex;align-items:center;justify-content:space-between">
          Notes
          <div class="notes-mode-toggle">
            <button class="btn btn-ghost btn-sm notes-tab active" data-mode="preview">Preview</button>
            <button class="btn btn-ghost btn-sm notes-tab" data-mode="edit">Edit</button>
          </div>
        </div>
        <div id="focus-notes-preview" class="markdown-body" style="min-height:60px"></div>
        <textarea id="focus-notes-ta" placeholder="Add notes... (Markdown supported)" style="display:none">${bm.notes || ''}</textarea>
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-ghost btn-sm" id="focus-catalog">📥 Move to Catalog</button>
        <button class="btn btn-ghost btn-sm" id="focus-edit"><i data-lucide="edit-2"></i> Edit</button>
        <button class="btn btn-primary btn-sm" id="focus-open"><i data-lucide="external-link"></i> Open URL</button>
      </div>
    `;

    overlay.innerHTML = '';
    overlay.appendChild(modal);
    openOverlay(overlay, modal);
    modal.addEventListener('click', e => e.stopPropagation());
    lucide.createIcons({ nodes: [modal] });
    const favSlot = modal.querySelector('#focus-favicon-slot');
    if (favSlot) favSlot.appendChild(faviconEl(bm, 24));

    // Notes: Markdown preview / edit toggle
    const notesPreview = modal.querySelector('#focus-notes-preview');
    const notesTa = modal.querySelector('#focus-notes-ta');
    const notesTabs = modal.querySelectorAll('.notes-tab');

    function renderNotesPreview() {
      const md = notesTa.value;
      if (window.marked && md.trim()) {
        notesPreview.innerHTML = window.DOMPurify
          ? window.DOMPurify.sanitize(window.marked.parse(md))
          : window.marked.parse(md);
      } else {
        notesPreview.innerHTML = md
          ? `<span style="color:var(--text-2);font-size:13px;white-space:pre-wrap">${md}</span>`
          : `<span style="color:var(--text-3);font-size:13px;font-style:italic">No notes yet. Click Edit to add.</span>`;
      }
    }

    notesTabs.forEach(tab => {
      tab.onclick = () => {
        notesTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.mode === 'edit') {
          notesPreview.style.display = 'none';
          notesTa.style.display = '';
          notesTa.focus();
        } else {
          renderNotesPreview();
          notesPreview.style.display = '';
          notesTa.style.display = 'none';
        }
      };
    });
    renderNotesPreview();

    function closeModal() {
      const notes = modal.querySelector('#focus-notes-ta')?.value;
      if (notes !== undefined) DB.updateBookmark(bmId, { notes });
      closeOverlay(overlay, () => App.render());
    }

    modal.querySelector('#focus-close').onclick = closeModal;
    modal.querySelector('#focus-open').onclick = () => { window.open(bm.url, '_blank'); };
    modal.querySelector('#focus-copy-url').onclick = async () => {
      await navigator.clipboard.writeText(bm.url).catch(() => {});
      App.toast('URL copied', 'info');
    };
    modal.querySelector('#focus-catalog').onclick = () => { DB.moveToCatalog(bmId); closeModal(); App.toast('Moved to Catalog', 'info'); };
    modal.querySelector('#focus-edit').onclick = () => { closeModal(); setTimeout(() => BookmarkFormModal(DB.getBookmarkById(bmId)), 300); };

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  // ── COMMAND PALETTE ──
  function CommandPalette() {
    const overlay = document.getElementById('cmd-palette-overlay');
    let focusedIdx = -1;

    const commands = [
      { label: 'Add Bookmark', icon: 'plus', kbd: '⌘N', action: () => { closeCmd(); BookmarkFormModal(); } },
      { label: 'Dashboard', icon: 'layout-dashboard', kbd: '1', action: () => { closeCmd(); App.switchView('dashboard'); } },
      { label: 'All Bookmarks', icon: 'list', kbd: '2', action: () => { closeCmd(); App.switchView('list'); } },
      { label: 'Graph View', icon: 'git-fork', kbd: '3', action: () => { closeCmd(); App.switchView('graph'); } },
      { label: 'Tags', icon: 'tag', action: () => { closeCmd(); App.switchView('tags'); } },
      { label: 'Tools', icon: 'wrench', action: () => { closeCmd(); App.switchView('tools'); } },
      { label: 'Settings', icon: 'settings', action: () => { closeCmd(); App.switchView('settings'); } },
      { label: 'Export JSON', icon: 'download', action: () => { closeCmd(); DB.exportJSON(); App.toast('Exported!', 'success'); } },
      { label: 'Import Bookmarks', icon: 'upload', action: () => { closeCmd(); ImportModal(); } },
      ...DB.getTabs().map(t => ({ label: `Switch: ${t.name}`, icon: 'layout', action: () => { closeCmd(); App.switchTab(t.id); } })),
    ];

    let filtered = commands;

    overlay.innerHTML = `
      <div class="cmd-palette">
        <div class="cmd-input-row">
          <i data-lucide="terminal"></i>
          <input type="text" class="cmd-input" id="cmd-input" placeholder="Type a command or search...">
        </div>
        <div class="cmd-items" id="cmd-items"></div>
      </div>
    `;
    const palette = overlay.querySelector('.cmd-palette');
    openOverlay(overlay, palette);
    lucide.createIcons({ nodes: [overlay] });

    const input = overlay.querySelector('#cmd-input');
    const itemsEl = overlay.querySelector('#cmd-items');

    function renderItems() {
      itemsEl.innerHTML = '';
      if (!filtered.length) {
        itemsEl.innerHTML = '<div class="cmd-empty">No commands found</div>';
        return;
      }
      filtered.forEach((cmd, i) => {
        const item = el('div', 'cmd-item');
        item.dataset.idx = i;
        const ic = icon(cmd.icon || 'chevron-right', 15);
        const lbl = el('span', 'cmd-item-label');
        lbl.textContent = cmd.label;
        item.appendChild(ic);
        item.appendChild(lbl);
        if (cmd.kbd) {
          const kbd = el('span', 'cmd-item-kbd');
          kbd.textContent = cmd.kbd;
          item.appendChild(kbd);
        }
        item.onclick = () => cmd.action();
        itemsEl.appendChild(item);
      });
      lucide.createIcons({ nodes: [itemsEl] });
    }

    function updateFocus() {
      itemsEl.querySelectorAll('.cmd-item').forEach((item, i) => {
        item.classList.toggle('focused', i === focusedIdx);
        if (i === focusedIdx) item.scrollIntoView({ block: 'nearest' });
      });
    }

    input.oninput = () => {
      const q = input.value.toLowerCase().trim();
      filtered = q ? commands.filter(c => c.label.toLowerCase().includes(q)) : commands;
      focusedIdx = filtered.length ? 0 : -1;
      renderItems(); updateFocus();
    };

    input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); focusedIdx = Math.min(focusedIdx + 1, filtered.length - 1); updateFocus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusedIdx = Math.max(focusedIdx - 1, 0); updateFocus(); }
      else if (e.key === 'Enter' && focusedIdx >= 0) { filtered[focusedIdx].action(); }
      else if (e.key === 'Escape') { closeCmd(); }
    };

    overlay.onclick = (e) => { if (e.target === overlay) closeCmd(); };

    renderItems();
    focusedIdx = 0; updateFocus();
    setTimeout(() => input.focus(), 50);

    function closeCmd() {
      if (window.Motion?.animate) {
        const palette = overlay.querySelector('.cmd-palette');
        Promise.all([
          Motion.animate(palette,  { opacity: [1,0], scale: [1, 0.96] }, { duration: 0.12 }).finished,
          Motion.animate(overlay,  { opacity: [1,0] }, { duration: 0.1 }).finished,
        ]).then(() => { overlay.classList.add('hidden'); overlay.innerHTML = ''; });
      } else {
        overlay.classList.remove('visible');
        setTimeout(() => { overlay.classList.add('hidden'); overlay.innerHTML = ''; }, 150);
      }
    }
  }

  // ── BULK ACTIONS BAR ──
  function BulkActionsBar(selectedIds) {
    const bar = document.getElementById('bulk-actions-bar');
    const count = selectedIds.size;

    if (count === 0) {
      bar.classList.remove('visible');
      setTimeout(() => bar.classList.add('hidden'), 200);
      document.getElementById('quick-add-bar').style.display = '';
      return;
    }

    bar.innerHTML = '';
    bar.classList.remove('hidden');
    requestAnimationFrame(() => bar.classList.add('visible'));
    // Hide quick add on mobile to avoid overlap
    if (window.innerWidth <= 640) {
      document.getElementById('quick-add-bar').style.display = 'none';
    }

    const countEl = el('span', 'bulk-count');
    countEl.textContent = `${count} selected`;

    const allCats = DB.getAllCategories();
    const moveSel = el('select', 'form-select btn-sm');
    moveSel.style.cssText = 'min-width:130px;padding:5px 8px;font-size:12px';
    moveSel.innerHTML = `<option value="">Move to category…</option>` + allCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    moveSel.onchange = () => {
      if (!moveSel.value) return;
      const targetId = moveSel.value;
      moveSel.value = '';
      DB.bulkMoveToCategory(Array.from(selectedIds), targetId);
      DB.rebuildFuse();
      App.state.selectedIds.clear();
      App.render();
      App.toast(`Moved ${count} bookmark(s)`, 'success');
    };

    const exportBtn = el('button', 'btn btn-ghost btn-sm');
    exportBtn.innerHTML = '⬇ Export';
    exportBtn.onclick = () => {
      DB.exportSelected(Array.from(selectedIds));
      App.toast(`Exported ${count} bookmark(s)`, 'success');
    };

    const catalogBtn = el('button', 'btn btn-ghost btn-sm');
    catalogBtn.innerHTML = '📥 Catalog';
    catalogBtn.onclick = () => {
      DB.bulkMoveToCatalog(Array.from(selectedIds));
      App.state.selectedIds.clear();
      App.render();
      App.toast(`Moved ${count} to Catalog`, 'info');
    };

    const deleteBtn = el('button', 'btn btn-danger btn-sm');
    deleteBtn.innerHTML = '🗑 Delete';
    deleteBtn.onclick = () => {
      if (!confirm(`Delete ${count} bookmark(s)? This cannot be undone.`)) return;
      DB.deleteBookmarks(Array.from(selectedIds));
      DB.rebuildFuse();
      App.state.selectedIds.clear();
      App.render();
      App.toast(`Deleted ${count} bookmark(s)`, 'error');
    };

    const deselectBtn = el('button', 'btn btn-ghost btn-sm');
    deselectBtn.textContent = '✕ Deselect';
    deselectBtn.onclick = () => { App.state.selectedIds.clear(); App.render(); };

    bar.appendChild(countEl);
    bar.appendChild(moveSel);
    bar.appendChild(exportBtn);
    bar.appendChild(catalogBtn);
    bar.appendChild(deleteBtn);
    bar.appendChild(deselectBtn);
  }

  // ── GRAPH VIEW ──
  function GraphView(container, bookmarks) {
    container.innerHTML = '';
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    if (!bookmarks.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🕸️</div><div class="empty-state-title">No bookmarks to graph</div><div class="empty-state-sub">Add bookmarks with shared tags to see connections</div><button class="btn btn-primary" style="margin-top:16px" id="es-add-bm-graph"><i data-lucide="plus"></i> Add Bookmark</button></div>`;
      container.querySelector('#es-add-bm-graph')?.addEventListener('click', () => Components.BookmarkFormModal());
      lucide.createIcons({ nodes: [container] });
      return;
    }

    const svg = window.d3.select(container).append('svg')
      .attr('width', '100%').attr('height', '100%')
      .style('background', 'transparent');

    const g = svg.append('g');

    svg.call(window.d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

    // Build nodes and links
    const nodes = bookmarks.map(bm => ({ id: bm.id, title: bm.title, favicon: bm.favicon, tags: bm.tags || [], color: bm.color, url: bm.url }));
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const shared = nodes[i].tags.filter(t => nodes[j].tags.includes(t));
        if (shared.length) links.push({ source: nodes[i].id, target: nodes[j].id, strength: shared.length, labels: shared });
      }
    }

    const sim = window.d3.forceSimulation(nodes)
      .force('link', window.d3.forceLink(links).id(d => d.id).distance(100).strength(d => Math.min(1, d.strength * 0.3)))
      .force('charge', window.d3.forceManyBody().strength(-200))
      .force('center', window.d3.forceCenter(width / 2, height / 2))
      .force('collision', window.d3.forceCollide(28));

    const link = g.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', 'rgba(99,102,241,0.25)').attr('stroke-width', d => Math.min(3, d.strength));

    const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
      .call(window.d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
      .style('cursor', 'pointer');

    node.append('circle').attr('r', 20)
      .attr('fill', d => d.color || '#6366f1')
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => d.color || '#6366f1')
      .attr('stroke-width', 1.5);

    // Real favicon via SVG <image> element (more reliable than foreignObject)
    node.each(function(d) {
      const g = window.d3.select(this);
      const favUrl = DB.faviconUrl(d.url);
      if (favUrl) {
        g.append('image')
          .attr('href', favUrl)
          .attr('x', -10).attr('y', -10)
          .attr('width', 20).attr('height', 20)
          .attr('clip-path', 'circle()')
          .on('error', function() {
            window.d3.select(this).remove();
            g.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
              .attr('font-size', '14').text(d.favicon || '🔗');
          });
      } else {
        g.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', '14').text(d.favicon || '🔗');
      }
    });

    node.append('text').attr('text-anchor', 'middle').attr('y', 30)
      .attr('font-size', '10').attr('fill', '#8b8fa8')
      .text(d => d.title.length > 14 ? d.title.slice(0, 14) + '…' : d.title);

    // Tooltip
    const tooltip = el('div', 'graph-tooltip');
    tooltip.style.display = 'none';
    container.appendChild(tooltip);

    node.on('mouseover', (e, d) => {
      tooltip.style.display = 'block';
      tooltip.style.left = (e.offsetX + 12) + 'px';
      tooltip.style.top = (e.offsetY - 8) + 'px';
      tooltip.innerHTML = `<strong>${d.title}</strong><br><span style="color:var(--text-muted)">${d.tags.slice(0,5).join(', ')}</span>`;
    }).on('mouseout', () => { tooltip.style.display = 'none'; })
      .on('click', (e, d) => { FocusModal(d.id); });

    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Controls
    const ctrls = el('div', 'graph-controls');
    const zoomIn = el('button', 'graph-ctrl-btn');
    zoomIn.appendChild(icon('zoom-in', 14));
    zoomIn.onclick = () => svg.transition().call(window.d3.zoom().scaleExtent([0.2,4]).on('zoom', e => g.attr('transform', e.transform)).scaleBy, 1.3);
    const zoomOut = el('button', 'graph-ctrl-btn');
    zoomOut.appendChild(icon('zoom-out', 14));
    zoomOut.onclick = () => svg.transition().call(window.d3.zoom().scaleExtent([0.2,4]).on('zoom', e => g.attr('transform', e.transform)).scaleBy, 0.7);
    ctrls.appendChild(zoomIn); ctrls.appendChild(zoomOut);
    container.appendChild(ctrls);
    lucide.createIcons({ nodes: [ctrls] });
  }

  // ── SHARE MODAL ──
  function ShareModal(tabId) {
    const tab = DB.getTabById(tabId);
    if (!tab) return;
    const overlay = document.getElementById('modal-overlay');
    const modal = el('div', 'modal');

    modal.innerHTML = `
      <div class="modal-header"><span class="modal-title">Share "${tab.name}"</span><button class="modal-close" id="share-close"><i data-lucide="x"></i></button></div>
      <div class="form-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div><div class="settings-label">Enable Sharing</div><div class="settings-desc">Make this workspace publicly accessible</div></div>
          <label class="toggle"><input type="checkbox" id="share-enabled" ${tab.isShared ? 'checked' : ''}><span class="toggle-slider"></span></label>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Custom Title</label><input type="text" class="form-input" id="share-title" value="${tab.shareTitle || tab.name}" placeholder="Workspace title"></div>
      <div class="form-group"><label class="form-label">Password (optional)</label><input type="text" class="form-input" id="share-pw" value="${tab.sharePassword || ''}" placeholder="Leave empty for public access"></div>
      <div class="form-group">
        <label class="form-label">Share Link</label>
        <div class="share-link">
          <div class="share-link-url">${window.location.origin}${window.location.pathname}#shared/${tabId}</div>
          <button class="btn btn-ghost btn-sm" id="share-copy"><i data-lucide="copy"></i> Copy</button>
        </div>
      </div>
      <div class="form-actions"><button class="btn btn-ghost" id="share-cancel">Cancel</button><button class="btn btn-primary" id="share-save">Save Settings</button></div>
    `;

    overlay.innerHTML = '';
    overlay.appendChild(modal);
    openOverlay(overlay, modal);
    modal.addEventListener('click', e => e.stopPropagation());
    lucide.createIcons({ nodes: [modal] });

    function close() { closeOverlay(overlay); }
    modal.querySelector('#share-close').onclick = close;
    modal.querySelector('#share-cancel').onclick = close;
    modal.querySelector('#share-copy').onclick = async () => {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#shared/${tabId}`).catch(() => {});
      App.toast('Link copied!', 'success');
    };
    modal.querySelector('#share-save').onclick = () => {
      DB.updateTab(tabId, {
        isShared: modal.querySelector('#share-enabled').checked,
        shareTitle: modal.querySelector('#share-title').value,
        sharePassword: modal.querySelector('#share-pw').value,
      });
      close();
      App.toast('Share settings saved', 'success');
      App.renderSidebar();
    };
    const escH = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escH); } };
    document.addEventListener('keydown', escH);
  }

  // ── IMPORT MODAL ──
  function ImportModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = el('div', 'modal');
    let parsedFolders = null;   // HTML import
    let parsedXLSX    = null;   // XLSX import
    let importMode    = null;   // 'html' | 'xlsx'

    const allCats = DB.getAllCategories();

    modal.innerHTML = `
      <div class="modal-header"><span class="modal-title">Import Bookmarks</span><button class="modal-close" id="import-close"><i data-lucide="x"></i></button></div>
      <div class="import-drop-zone" id="import-drop">
        <div class="drop-icon">📂</div>
        <div>Drop a Chrome/Firefox HTML export or XLSX file here</div>
        <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">or <label for="import-file" style="color:var(--accent);cursor:pointer">browse files</label></div>
        <input type="file" id="import-file" accept=".html,.htm,.xlsx" style="display:none">
      </div>
      <div id="import-preview" style="display:none"></div>
      <div class="form-group" id="import-cat-row" style="display:none">
        <label class="form-label" id="import-cat-label">Fallback Category <span style="font-weight:400;color:var(--text-muted)">(used when category not found)</span></label>
        <select class="form-select" id="import-cat">
          ${allCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions"><button class="btn btn-ghost" id="import-cancel">Cancel</button><button class="btn btn-primary" id="import-confirm" style="display:none">Import</button></div>
    `;

    overlay.innerHTML = '';
    overlay.appendChild(modal);
    openOverlay(overlay, modal);
    modal.addEventListener('click', e => e.stopPropagation());
    lucide.createIcons({ nodes: [modal] });

    function close() { closeOverlay(overlay); }
    modal.querySelector('#import-close').onclick = close;
    modal.querySelector('#import-cancel').onclick = close;

    function showPreview(html) {
      const preview = modal.querySelector('#import-preview');
      preview.style.display = 'block';
      preview.innerHTML = `<div class="import-preview">${html}</div>`;
      modal.querySelector('#import-cat-row').style.display = 'block';
      modal.querySelector('#import-confirm').style.display = 'inline-flex';
    }

    function handleFile(file) {
      const isXLSX = file.name.toLowerCase().endsWith('.xlsx');
      if (isXLSX) {
        importMode = 'xlsx';
        modal.querySelector('#import-cat-label').innerHTML =
          'Fallback Category <span style="font-weight:400;color:var(--text-muted)">(used when category not matched)</span>';
        const reader = new FileReader();
        reader.onload = (e) => {
          parsedXLSX = DB.parseXLSX(e.target.result);
          const { bookmarks, categoryNames } = parsedXLSX;
          const matched = categoryNames.filter(n =>
            DB.getAllCategories().some(c => c.name.toLowerCase() === n.toLowerCase())
          );
          const unmatched = categoryNames.filter(n => !matched.includes(n));
          let info = `✅ Found <strong>${bookmarks.length} rows</strong> across <strong>${categoryNames.length} category column(s)</strong>`;
          if (matched.length)   info += `<br><span style="color:var(--text-muted)">Matched: ${matched.join(', ')}</span>`;
          if (unmatched.length) info += `<br><span style="color:var(--text-muted)">Will use fallback: ${unmatched.join(', ')}</span>`;
          showPreview(info);
        };
        reader.readAsArrayBuffer(file);
      } else {
        importMode = 'html';
        modal.querySelector('#import-cat-label').innerHTML = 'Import to Category';
        const reader = new FileReader();
        reader.onload = (e) => {
          parsedFolders = DB.parseNetscapeHTML(e.target.result);
          const total = Object.values(parsedFolders).reduce((s, items) => s + items.length, 0);
          const folderCount = Object.keys(parsedFolders).length;
          showPreview(`✅ Found <strong>${total} bookmarks</strong> in <strong>${folderCount} folder(s)</strong>: ${Object.keys(parsedFolders).join(', ')}`);
        };
        reader.readAsText(file);
      }
    }

    modal.querySelector('#import-file').onchange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); };
    modal.querySelector('#import-drop').onclick = () => modal.querySelector('#import-file').click();

    const dropZone = modal.querySelector('#import-drop');
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

    modal.querySelector('#import-confirm').onclick = () => {
      const catId = modal.querySelector('#import-cat').value;
      let count = 0;
      if (importMode === 'xlsx' && parsedXLSX) {
        count = DB.importFromXLSX(parsedXLSX, catId);
      } else if (importMode === 'html' && parsedFolders) {
        count = DB.importFromNetscape(parsedFolders, catId);
      }
      DB.rebuildFuse();
      App.toast(`Imported ${count} bookmarks`, 'success');
      close();
      App.render();
    };

    const escH = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escH); } };
    document.addEventListener('keydown', escH);
  }

  // ── CONTEXT MENU ──
  let _ctxJustOpened = false;

  function showContextMenu(x, y, items) {
    const menu = document.getElementById('context-menu');
    menu.innerHTML = '';
    items.forEach(item => {
      if (item === 'sep') { menu.appendChild(el('div', 'ctx-sep')); return; }
      const row = el('div', `ctx-item${item.danger ? ' danger' : ''}`);
      if (item.icon) row.appendChild(icon(item.icon, 14));
      const lbl = el('span'); lbl.textContent = item.label;
      row.appendChild(lbl);
      row.onclick = () => { hideContextMenu(); item.action(); };
      menu.appendChild(row);
    });
    lucide.createIcons({ nodes: [menu] });
    menu.style.display = 'block';
    requestAnimationFrame(() => {
      menu.style.left = Math.min(x, window.innerWidth - menu.offsetWidth - 8) + 'px';
      menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 8) + 'px';
    });
    _ctxJustOpened = true;
    requestAnimationFrame(() => { _ctxJustOpened = false; });
  }

  function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
  }

  document.addEventListener('click', () => {
    if (_ctxJustOpened) return;
    hideContextMenu();
  });

  // Public API
  return {
    BookmarkCard, CategoryColumn, BookmarkFormModal, FocusModal,
    CommandPalette, BulkActionsBar, GraphView, ShareModal, ImportModal,
    openModal: openOverlay, closeModal: closeOverlay,
    TagInput, ColorPicker, showContextMenu, hideContextMenu,
    icon, el, iconBtn, faviconEl, extractMetaContent, fetchPageHTML,
  };
})();
