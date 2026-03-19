# Bookmark OS

Менеджер закладок с локальным хранилищем. Работает полностью в браузере — без бэкенда, без регистрации, данные хранятся в `localStorage`.

---

## Быстрый старт

Открой `index.html` в браузере. Никакой установки не требуется. Интернет нужен только для загрузки CDN-зависимостей при первом открытии.

---

## Структура файлов

```
index.html          ← точка входа, HTML-структура, CDN-скрипты, inline restore-скрипты
styles.css          ← тема Default (glassmorphism, фон #07090f)
styles black.css    ← тема Black (flat dark, Linear-inspired, фон #0a0a0a)
schemes.js          ← 10 цветовых схем, applyScheme(), restoreScheme()
data.js             ← слой данных (window.DB), localStorage, CRUD, Fuse-поиск, AI-симуляция
components.js       ← UI-фабрики (window.Components): карточки, модалки, граф, формы
app.js              ← роутер, вьюшки, события, клавиатура (window.App)
README.md           ← этот файл
```

**Порядок загрузки скриптов:** `schemes.js → data.js → components.js → app.js`

---

## Интерфейс

### Sidebar (левая панель)

Навигация разбита на три группы:
- **Views** — Dashboard, All Bookmarks, Starred
- **Discover** — Tags, Graph
- **Manage** — Tools, Settings

**Workspaces** — список воркспейсов с цветной точкой и счётчиком закладок справа. Секция сворачивается кнопкой `›` в хедере. Кнопка `+` в том же хедере открывает модалку создания воркспейса.

На десктопе сайдбар сворачивается до 48px/56px через кнопку `⊟` в topbar. На мобильном (≤900px) — выдвижной drawer поверх контента.

### Topbar
- **`⊟`** — toggle сайдбара
- **Breadcrumb** — название текущего воркспейса или вьюшки
- **Поиск** — fuzzy-поиск; кнопка `×` появляется при вводе текста; Escape очищает
- На мобильном (≤640px) поиск переезжает на отдельную строку под topbar
- **Import / Add / ⌘** — импорт, новая закладка, Command Palette

### Tabs Bar
- Пилюли воркспейсов — кликабельны, скроллируются колёсиком или свайпом
- Стрелки `‹ ›` появляются при переполнении
- Правый клик или `⋯` → контекстное меню (переименовать, цвет, поделиться, удалить)
- Активная пилюля подсвечивается только в Dashboard view

### Quick Add (клавиша `Q`)
- Строка внизу: вставь URL → Enter для превью → Enter для сохранения
- Автоматически подтягивает title и description через CORS-прокси
- Escape — закрыть и очистить

---

## Вьюшки

| Вьюшка | Горячая клавиша | Описание |
|--------|----------------|----------|
| **Dashboard** | `1` | Kanban-сетка категорий (3 / 4 / 5 колонок) |
| **All Bookmarks** | `2` | Таблица со всеми закладками, сортировка, фильтры, виртуализация |
| **Starred** | — | Только избранные закладки |
| **Tags** | — | Облако тегов; размер = количество закладок; клик → фильтр в списке |
| **Graph** | `3` | D3 force-граф: узлы = закладки, рёбра = общие теги; клик по узлу → Focus View |
| **Tools** | — | Health check коллекции |
| **Settings** | — | Внешний вид, экспорт, импорт, сброс данных |

### All Bookmarks (List View)
- Кнопка **📥 Catalog** — переключить между обычным списком и архивом (пилюля перед All)
- Кнопка **⊟** (sliders) — Configure columns: показать/скрыть колонку Visits
- Колонка Visits скрыта по умолчанию
- При >50 закладках автоматически включается виртуализация через Clusterize.js
- Event delegation для всех действий в строках (Focus, Open, Edit, Menu, Checkbox, Tags)

### Dashboard
- Колонки по высоте контента (`align-items: start`)
- Карточка кликабельна — `cursor: pointer`, hover подсвечивает заголовок
- Клик по карточке → Focus View
- Колонки появляются с stagger-анимацией при загрузке

### Tools (Bookmark Health)
| Инструмент | Что делает |
|-----------|-----------|
| **Find Duplicates** | Группирует закладки по домену, выявляет дубли |
| **Find Dead Links** | Закладки, которые никогда не открывались — вероятно устаревшие |
| **Rarely Visited** | Закладки старше 30 дней с нулевым счётчиком посещений |

---

## Закладки

### Модель данных

```js
{
  id,           // UUID
  url,          // полный URL
  title,        // название
  description,  // описание (до 300 символов)
  tags,         // массив строк (lowercase-kebab)
  notes,        // личные заметки (поддерживают Markdown)
  categoryId,   // ID категории
  favicon,      // emoji или URL фавикона
  color,        // цвет карточки (HEX)
  favorite,     // boolean — избранное
  inCatalog,    // boolean — в архиве
  visitCount,   // счётчик открытий
  createdAt,    // ISO timestamp
  updatedAt,    // ISO timestamp
  aiSummary,    // AI-саммари (симулированное)
  aiTopics,     // AI-теги (симулированные)
}
```

### Добавление
- **Кнопка Add** → полная форма с автозаполнением title/description по URL
- **Quick Add (`Q`)** → быстрое добавление через URL-строку внизу
- **Import** → HTML-файл из Chrome (`chrome://bookmarks → Экспортировать`) или Firefox

### Карточка в Dashboard
- **Клик** → открывает Focus View (одинарный клик)
- **Кнопка `↗`** → открыть URL в новой вкладке (увеличивает visitCount)
- **Кнопка `✎`** → редактировать
- **`⋯`** → контекстное меню
- **Drag & Drop** → перетащить в другую категорию (Sortable.js, работает на touch)

### Focus View
Модальное окно с полной информацией: URL, описание, теги, AI-саммари, статистика. Поле Notes поддерживает Markdown — переключение между режимами **Preview** и **Edit**.

### Markdown в заметках
Поле Notes поддерживает Markdown через marked.js с санитизацией DOMPurify:
- Заголовки `#`, `##`, `###`
- **Жирный**, *курсив*
- `inline code` и блоки кода
- Списки `- item`, нумерованные `1. item`
- Ссылки `[text](url)`
- Цитаты `> blockquote`
- Горизонтальная линия `---`

### Автозаполнение по URL
При вводе URL в форме или Quick Add — цепочка CORS-прокси:
1. `api.allorigins.win`
2. `corsproxy.io`
3. `api.codetabs.com`

Таймаут на каждый прокси — 6 секунд.

### Каталог (Archive)
Закладки убираются в каталог через пилюлю **📥 Catalog** в toolbar. Не удаляются — только скрыты. Восстановить можно в любую категорию.

---

## Теги

Ввод тегов реализован через **Tagify**:
- Dropdown с автокомплитом по существующим тегам
- Теги нормализуются: `lowercase-kebab-case`
- Enter или запятая для добавления; × для удаления
- Backspace удаляет последний тег

---

## Категории

### Модель данных
```js
{
  id,      // UUID
  name,    // название
  color,   // цвет (HEX из PRESET_COLORS)
  tabId,   // принадлежность воркспейсу
  order,   // порядок отображения (integer)
}
```

### Управление
- **Клик на header** (не по кнопке) → свернуть/развернуть колонку; состояние в `state.collapsedCats` (только сессия)
- **Drag & Drop за header** → изменить порядок колонок через Sortable.js; сохраняется в `cat.order`
- **`⋯` меню** → переименовать, изменить цвет, удалить
- При удалении категории с закладками — выбор куда перенести
- **Цвет** — полоска сверху колонки; 12 пресетных цветов

### Пресетные цвета
`#6366f1` `#8b5cf6` `#ec4899` `#ef4444` `#f59e0b` `#10b981` `#06b6d4` `#3b82f6` `#84cc16` `#f97316` `#64748b` `#e2e8f0`

---

## Воркспейсы (Tabs)

### Модель данных
```js
{
  id,             // UUID
  name,           // название
  color,          // цвет точки (HEX)
  isShared,       // boolean
  sharePassword,  // пароль (опционально)
  shareTitle,     // кастомный заголовок для шаринга
}
```

### Управление
- Создание → кнопка `+` в хедере секции Workspaces (модальное окно)
- Переключение → сайдбар или tabs bar
- Правый клик или `⋯` → переименовать, цвет, поделиться, удалить
- **Share** → генерирует ссылку `#shared/tabId`; опционально пароль и кастомный заголовок

---

## Bulk Actions

Выбери закладки через чекбоксы в List view — появляется панель внизу. На мобильном Quick Add автоматически скрывается чтобы не перекрывать панель.

| Кнопка | Действие |
|--------|----------|
| `Move to category…` | Переместить в выбранную категорию |
| `⬇ Export` | Скачать только выбранные как JSON |
| `📥 Catalog` | Отправить в архив |
| `🗑 Delete` | Удалить безвозвратно (с подтверждением) |
| `✕ Deselect` | Снять выделение |

`Ctrl+A` / `Cmd+A` в List view — выбрать все.

---

## Экспорт / Импорт

### Экспорт
| Способ | Файл | Содержимое |
|--------|------|-----------|
| Settings → Export All | `bookmarks-YYYY-MM-DD.json` | Все закладки + воркспейсы + категории |
| Settings → Export Workspace | `workspace-name-bookmarks.json` | Один воркспейс |
| Bulk Actions → Export | `selected-bookmarks-YYYY-MM-DD.json` | Только выбранные |

### Импорт
- HTML-файл экспорта Chrome или Firefox
- Через кнопку **Import** в topbar или Settings
- Поддерживает drag & drop на зону импорта
- Парсит формат Netscape Bookmarks `<DT><A href="...">title</A>`

---

## Анимации (Motion One)

Все переходы реализованы через Motion One v10:

| Элемент | Анимация |
|---------|---------|
| Открытие модалки | fade + scale(0.96→1) + y(8→0), spring easing |
| Закрытие модалки | обратная анимация |
| Смена вьюшки | fade + y(6→0), 180ms |
| Dashboard колонки | stagger fade + y(12→0), 40ms между колонками |
| Command Palette | scale + fade |

Единые хелперы `Components.openModal(overlay, modal)` и `Components.closeModal(overlay, onDone?)` используются во всех модалках.

---

## Клавиатурные сокращения

| Сочетание | Действие |
|-----------|----------|
| `/` | Фокус на строку поиска |
| `Q` | Открыть Quick Add |
| `⌘K` / `Ctrl+K` | Command Palette |
| `⌘N` / `Ctrl+N` | Новая закладка |
| `⌘A` / `Ctrl+A` | Выбрать все (в List view) |
| `1` | Dashboard |
| `2` | All Bookmarks |
| `3` | Graph |
| `↑` `↓` | Навигация по карточкам на Dashboard |
| `Enter` | Открыть Focus View выбранной карточки |
| `E` | Редактировать выбранную карточку |
| `C` | Переместить выбранную карточку в каталог |
| `Delete` / `Backspace` | Удалить выбранную карточку |
| `Escape` | Закрыть модалку / очистить поиск |

---

## Command Palette (`⌘K`)

Фильтрация по тексту, стрелки для навигации, Enter для выполнения.

Команды: Add Bookmark, Dashboard, All Bookmarks, Graph View, Tags, Tools, Settings, Export JSON, Import Bookmarks, Switch: [Workspace Name]

---

## Темы и цветовые схемы

### Темы (Settings → Appearance → Switch Theme)

| Тема | Фон | Стиль |
|------|-----|-------|
| **Default** | `#07090f` | Glassmorphism, полупрозрачные поверхности |
| **Black** | `#0a0a0a` | Flat dark, Linear-inspired, чёткие границы |

### Цветовые схемы (из Theme Factory)

10 схем применяются к обеим темам независимо через CSS-переменные:

| Схема | Акцент |
|-------|--------|
| Ocean Depths | `#2d8b8b` — Teal |
| Sunset Boulevard | `#e76f51` — Burnt Orange |
| Forest Canopy | `#4a7c59` — Forest Green |
| Modern Minimalist | `#708090` — Slate Gray |
| Golden Hour | `#f4a900` — Mustard |
| Arctic Frost | `#4a6fa5` — Steel Blue |
| Desert Rose | `#b87d6d` — Clay |
| Tech Innovation | `#0066ff` — Electric Blue |
| Botanical Garden | `#f9a620` — Marigold |
| Midnight Galaxy | `#a490c2` — Lavender |

### No-flash restore

При загрузке до рендера выполняются два inline-скрипта:
1. Восстанавливает тему (`bm_theme`) — меняет `href` у `<link id="main-stylesheet">`
2. Восстанавливает схему (`bm_scheme_vars`) — ставит CSS-переменные напрямую

Значения схемы хранятся как готовые CSS-значения — `schemes.js` можно менять без правки `index.html`.

---

## Архитектура

### localStorage ключи

| Ключ | Содержимое |
|------|-----------|
| `bookmark_os_v1` | Все данные: `{ bookmarks[], tabs[], categories[], dashboardColumns }` |
| `bm_theme` | Активная тема: `"styles.css"` или `"styles black.css"` |
| `bm_scheme` | ID активной схемы: `"ocean-depths"` и т.д. |
| `bm_scheme_vars` | JSON с CSS-значениями схемы для no-flash restore |

### Состояние приложения (`App.state`)

```js
{
  view,           // 'dashboard' | 'list' | 'starred' | 'tags' | 'graph' | 'tools' | 'settings'
  activeTabId,    // ID активного воркспейса
  selectedIds,    // Set<string> — выбранные закладки
  listSort,       // { field, dir }
  listTagFilter,  // string | null
  showCatalog,    // boolean
  showVisits,     // boolean — показывать колонку Visits
  toolsMode,      // 'duplicates' | 'dead' | 'rare' | null
  toolsResults,   // результаты последнего запуска
  toolsRunning,   // boolean
  focusedCardId,  // string | null
  searchActive,   // boolean
  collapsedCats,  // Set<string> — только сессия, не персистируется
}
```

### DB API (`window.DB`)

```js
// Закладки
getBookmarks(tabId), getAllBookmarks(), getCatalog(), getBookmarkById(id)
addBookmark(bm), updateBookmark(id, patch), deleteBookmark(id), deleteBookmarks(ids[])
moveToCatalog(id), restoreFromCatalog(id), incrementVisit(id)
findDuplicate(url), findDuplicates(), findDeadLinks(), findRarelyVisited()
getStarredCount()

// Категории
getCategories(tabId), getAllCategories(), getCategoryById(id)
addCategory({ name, color, tabId }), updateCategory(id, patch)
deleteCategory(id), reorderCategories(tabId, orderedIds[])

// Воркспейсы
getTabs(), getTabById(id), addTab({ name, color? })
updateTab(id, patch), deleteTab(id)

// Теги
getAllTags(includeCatalog?), getUniqueTagsList()

// Поиск (Fuse.js)
search(query, includeCatalog?), rebuildFuse()

// Bulk
bulkMoveToCategory(ids[], categoryId), bulkMoveToCatalog(ids[])
bulkAddTags(ids[], tags[]), bulkRemoveTags(ids[], tags[])

// Экспорт / Импорт
exportJSON(), exportTabJSON(tabId), exportSelected(ids[])
parseNetscapeHTML(html), importFromNetscape(html)

// AI (симуляция)
simulateAutoTag(url, title), simulateSummary(title, desc)

// Настройки / Утилиты
getColumns(), setColumns(n), domainOf(url), faviconUrl(url), PRESET_COLORS
```

### Components API (`window.Components`)

```js
// Модалки
openModal(overlay, modal)          // Motion One open animation
closeModal(overlay, onDone?)       // Motion One close animation
BookmarkFormModal(bm?, catId?)
FocusModal(bmId)
CommandPalette()
ShareModal(tabId)
ImportModal()

// UI
BookmarkCard(bm)
CategoryColumn(cat, bookmarks, { collapsed, onToggleCollapse })
BulkActionsBar(selectedIds)
GraphView(container, bookmarks)
TagInput(containerEl, initialTags, onChange)   // Tagify-based
ColorPicker(containerEl, initialColor, onChange)
showContextMenu(items[], x, y), hideContextMenu()
faviconEl(bm, size), iconBtn(lucideIcon, title)
icon(lucideIcon, size), el(tag, className?)
extractMetaContent(html, key)
```

### App API (`window.App`)

```js
App.state
App.toast(msg, type)        // type: 'success'(2.5s) | 'error'(5s) | 'info'
App.switchView(view)
App.switchTab(tabId)
App.render()
App.renderContent()
App.renderSidebar()
App.renderTabsBar()
App.renderTopbar()
App.init()
```

### Color Schemes API

```js
window.COLOR_SCHEMES           // массив из 10 объектов схем
window.applyScheme(schemeId)   // применить + сохранить CSS-значения в localStorage
window.restoreScheme()         // восстановить из localStorage
```

---

## Зависимости (CDN)

| Библиотека | Версия | Использование |
|------------|--------|--------------|
| [Lucide](https://lucide.dev) | latest | Иконки |
| [Fuse.js](https://fusejs.io) | 7 | Fuzzy-поиск |
| [D3.js](https://d3js.org) | 7 | Graph view |
| [Sortable.js](https://sortablejs.github.io/Sortable) | 1.15.2 | Drag & drop карточек и колонок (desktop + touch) |
| [Motion One](https://motion.dev) | 10.18.0 | Анимации модалок, переходов, stagger |
| [Clusterize.js](https://clusterize.js.org) | 0.19.0 | Виртуализация List view (>50 строк) |
| [Tagify](https://yaireo.github.io/tagify) | latest | Ввод тегов с автокомплитом |
| [Marked.js](https://marked.js.org) | latest | Markdown в поле Notes |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3 | Санитизация HTML из Markdown |
| Google Fonts | — | DM Sans, DM Mono |

---

## Версии файлов

| Файл | Версия | Ключевые изменения |
|------|--------|--------------------|
| `app.js` | v1.3 | Sortable.js drag&drop, Motion One анимации, Clusterize виртуализация, nav groups, showVisits, catalog pill, touch drag |
| `components.js` | v1.3 | Tagify теги, Marked.js notes, openModal/closeModal хелперы, Motion One во всех модалках |
| `data.js` | v1.0 | reorderCategories, exportSelected |
| `schemes.js` | v1.2 | persist CSS vars в localStorage |
| `styles.css` | v1.3 | Tagify override, markdown-body, notes toggle, Sortable классы, nav groups, align-items:start |
| `styles black.css` | v1.3 | Аналогично styles.css |

---

## Известные ограничения

- `collapsedCats` не сохраняется между сессиями — при перезагрузке все колонки раскрыты
- Share генерирует ссылку, но серверной части нет — для реального шаринга нужен бэкенд
- AI-функции (автотеги, саммари) — симуляция с задержкой; для реального AI нужен Anthropic API key
- CORS-прокси для автозаполнения — внешние сервисы, могут быть недоступны
- Clusterize требует список из 50+ строк для активации — на малых данных использует обычный рендер
