/**
 * @file types.js - JSDoc type definitions for Bookmark OS
 * @description Provides TypeScript-like type safety via JSDoc annotations
 * @version 2.0.0
 */

/**
 * @typedef {Object} Bookmark
 * @property {string} id - Unique identifier (prefix: bk_)
 * @property {string} title - Bookmark title
 * @property {string} url - Full URL (http/https)
 * @property {string} description - Short description
 * @property {string[]} tags - Array of tag names
 * @property {string} notes - User notes (Markdown supported)
 * @property {string} favicon - Emoji or URL for favicon
 * @property {string} color - Hex color code (#RRGGBB)
 * @property {string} createdAt - ISO 8601 timestamp
 * @property {string} updatedAt - ISO 8601 timestamp
 * @property {number} visitCount - Number of times opened
 * @property {boolean} favorite - Whether bookmarked as favorite
 * @property {string} aiSummary - AI-generated summary
 * @property {string[]} aiTopics - AI-suggested topics
 * @property {string} categoryId - Reference to Category.id
 * @property {boolean} inCatalog - Whether in archive/catalog
 */

/**
 * @typedef {Object} Category
 * @property {string} id - Unique identifier (prefix: cat_)
 * @property {string} name - Display name
 * @property {string} color - Hex color code (#RRGGBB)
 * @property {string} tabId - Reference to Tab.id
 * @property {number} [order] - Sort order within tab
 */

/**
 * @typedef {Object} Tab
 * @property {string} id - Unique identifier (prefix: tab_)
 * @property {string} name - Display name
 * @property {string} color - Hex color code (#RRGGBB)
 * @property {boolean} isShared - Whether tab is shared
 * @property {string} sharePassword - Password for shared access (hashed)
 * @property {string} shareTitle - Custom title for shared view
 */

/**
 * @typedef {Object} TagInfo
 * @property {string} tag - Tag name
 * @property {number} count - Usage count
 */

/**
 * @typedef {Object} SearchResult
 * @property {Bookmark} item - Matched bookmark
 * @property {string[]} matchedFields - Fields that matched the query
 */

/**
 * @typedef {'dashboard'|'list'|'starred'|'tags'|'graph'|'tools'|'settings'} ViewType
 */

/**
 * @typedef {Object} AppState
 * @property {ViewType} view - Current view
 * @property {string|null} activeTabId - Selected tab ID
 * @property {Set<string>} selectedIds - Selected bookmark IDs for bulk actions
 * @property {{field: string, dir: 'asc'|'desc'}} listSort - List sort settings
 * @property {'table'|'cards'} listLayout - List view layout
 * @property {string|null} listTagFilter - Active tag filter
 * @property {boolean} showCatalog - Whether showing catalog/archived
 * @property {boolean} showVisits - Whether showing visit counts
 * @property {string|null} toolsMode - Current tools mode
 * @property {any} toolsResults - Tools execution results
 * @property {string|null} focusedCardId - Currently focused card
 * @property {Set<string>} collapsedCats - Collapsed category IDs
 * @property {string} searchQuery - Current search query
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string} [error] - Error message if invalid
 */

/**
 * @typedef {Object} ImportResult
 * @property {number} imported - Number of items imported
 * @property {number} skipped - Number of items skipped
 * @property {string[]} errors - Error messages
 */

/**
 * @typedef {Object} ExportOptions
 * @property {string[]} [bookmarkIds] - Specific IDs to export (all if omitted)
 * @property {string} [tabId] - Export single tab
 * @property {'json'|'xlsx'} format - Export format
 */

/**
 * @typedef {Object} ToastMessage
 * @property {string} message - Message text
 * @property {'success'|'error'|'warning'|'info'} type - Message type
 * @property {number} [duration] - Display duration in ms
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id - Node ID (bookmark or tag)
 * @property {string} label - Display label
 * @property {'bookmark'|'tag'} type - Node type
 * @property {string} [color] - Node color
 * @property {number} [size] - Node size
 */

/**
 * @typedef {Object} GraphLink
 * @property {string} source - Source node ID
 * @property {string} target - Target node ID
 * @property {number} [value] - Link weight
 */

/**
 * @typedef {Object} GraphData
 * @property {GraphNode[]} nodes - All nodes
 * @property {GraphLink[]} links - All links
 */

// Type validation helpers (runtime)

/**
 * Validates that a value is a non-empty string
 * @param {*} value - Value to check
 * @returns {value is string}
 */
export function isString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Validates that a value is a positive integer
 * @param {*} value - Value to check
 * @returns {value is number}
 */
export function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Validates that a value is a valid URL string
 * @param {*} value - Value to check
 * @returns {value is string}
 */
export function isValidURL(value) {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates that a value is a valid hex color
 * @param {*} value - Value to check
 * @returns {value is string}
 */
export function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * Validates that a value is a valid ISO date string
 * @param {*} value - Value to check
 * @returns {value is string}
 */
export function isValidISODate(value) {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validates a Bookmark object structure
 * @param {*} obj - Object to validate
 * @returns {obj is Bookmark}
 */
export function isValidBookmark(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return (
    isString(obj.id) &&
    isString(obj.title) &&
    isValidURL(obj.url) &&
    Array.isArray(obj.tags) &&
    isString(obj.categoryId) &&
    typeof obj.favorite === 'boolean' &&
    typeof obj.inCatalog === 'boolean'
  );
}

/**
 * Validates a Category object structure
 * @param {*} obj - Object to validate
 * @returns {obj is Category}
 */
export function isValidCategory(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return (
    isString(obj.id) &&
    isString(obj.name) &&
    isValidHexColor(obj.color) &&
    isString(obj.tabId)
  );
}

/**
 * Validates a Tab object structure
 * @param {*} obj - Object to validate
 * @returns {obj is Tab}
 */
export function isValidTab(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return (
    isString(obj.id) &&
    isString(obj.name) &&
    isValidHexColor(obj.color) &&
    typeof obj.isShared === 'boolean'
  );
}

// Export for browser global access
if (typeof window !== 'undefined') {
  window.TypeUtils = {
    isString,
    isPositiveInteger,
    isValidURL,
    isValidHexColor,
    isValidISODate,
    isValidBookmark,
    isValidCategory,
    isValidTab,
  };
}
