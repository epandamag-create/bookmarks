/**
 * @file security.js - Security utilities for Bookmark OS
 * @description Provides XSS protection, input validation, and sanitization
 * @version 2.0.0
 */

// ── XSS PROTECTION ──

/**
 * Sanitizes HTML string to prevent XSS attacks
 * @param {string} html - Raw HTML string to sanitize
 * @returns {string} - Sanitized HTML string
 */
export function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  
  // Use DOMPurify if available (loaded in index.html)
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      ADD_ATTR: ['target'],
      FORCE_ADD_TARGET_BLANK_ATTR: false,
    });
  }
  
  // Fallback: strip all HTML tags
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Plain text to escape
 * @returns {string} - Escaped text safe for innerHTML
 */
export function escapeHTML(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Creates a safe text element without XSS risk
 * @param {string} tag - HTML tag name
 * @param {string} [className] - Optional CSS class
 * @param {string} [text] - Text content (automatically escaped)
 * @returns {HTMLElement} - Safe element
 */
export function createSafeElement(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) {
    el.textContent = String(text);
  }
  return el;
}

// ── INPUT VALIDATION ──

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  
  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }
  
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL is too long (max 2048 characters)' };
  }
  
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates bookmark title
 * @param {string} title - Title to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateTitle(title) {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required' };
  }
  
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Title cannot be empty' };
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: 'Title is too long (max 200 characters)' };
  }
  
  // Check for potentially dangerous patterns
  if (/<script/i.test(trimmed) || /javascript:/i.test(trimmed)) {
    return { valid: false, error: 'Title contains invalid characters' };
  }
  
  return { valid: true };
}

/**
 * Validates tag name
 * @param {string} tag - Tag to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateTag(tag) {
  if (!tag || typeof tag !== 'string') {
    return { valid: false, error: 'Tag is required' };
  }
  
  const trimmed = tag.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Tag cannot be empty' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'Tag is too long (max 50 characters)' };
  }
  
  // Only allow alphanumeric, hyphens, underscores
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Tag can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true };
}

/**
 * Validates description text
 * @param {string} description - Description to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateDescription(description) {
  if (!description) {
    return { valid: true }; // Optional field
  }
  
  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be text' };
  }
  
  if (description.length > 1000) {
    return { valid: false, error: 'Description is too long (max 1000 characters)' };
  }
  
  return { valid: true };
}

/**
 * Validates notes text
 * @param {string} notes - Notes to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateNotes(notes) {
  if (!notes) {
    return { valid: true }; // Optional field
  }
  
  if (typeof notes !== 'string') {
    return { valid: false, error: 'Notes must be text' };
  }
  
  if (notes.length > 5000) {
    return { valid: false, error: 'Notes are too long (max 5000 characters)' };
  }
  
  return { valid: true };
}

/**
 * Validates color hex code
 * @param {string} color - Color code to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateColor(color) {
  if (!color) {
    return { valid: true }; // Optional field
  }
  
  if (typeof color !== 'string') {
    return { valid: false, error: 'Color must be a string' };
  }
  
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return { valid: false, error: 'Invalid color format (use #RRGGBB)' };
  }
  
  return { valid: true };
}

// ── SAFE DOM MANIPULATION ──

/**
 * Safely sets text content on an element
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to set
 */
export function safeSetText(element, text) {
  if (!element) return;
  element.textContent = String(text ?? '');
}

/**
 * Safely sets HTML content on an element with sanitization
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML to set (will be sanitized)
 */
export function safeSetHTML(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHTML(html);
}

/**
 * Creates a link element safely
 * @param {string} href - URL for the link
 * @param {string} text - Link text
 * @param {string} [className] - Optional CSS class
 * @returns {HTMLAnchorElement} - Safe anchor element
 */
export function createSafeLink(href, text, className = '') {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  if (className) a.className = className;
  return a;
}

// ── IMPORT VALIDATION ──

/**
 * Maximum import file size (10MB)
 */
export const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

/**
 * Validates file size before import
 * @param {File} file - File to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateFileSize(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (file.size > MAX_IMPORT_SIZE) {
    return { 
      valid: false, 
      error: `File is too large (max ${MAX_IMPORT_SIZE / 1024 / 1024}MB)` 
    };
  }
  
  return { valid: true };
}

/**
 * Validates file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Allowed MIME types or extensions
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export function validateFileType(file, allowedTypes) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  for (const type of allowedTypes) {
    if (type.startsWith('.')) {
      // Extension check
      if (fileName.endsWith(type)) {
        return { valid: true };
      }
    } else {
      // MIME type check
      if (fileType.includes(type)) {
        return { valid: true };
      }
    }
  }
  
  return { 
    valid: false, 
    error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}` 
  };
}

// ── RATE LIMITING ──

/**
 * Simple rate limiter to prevent DoS
 * @template {(...args: any[]) => any} T
 * @param {T} fn - Function to limit
 * @param {number} delay - Minimum delay between calls (ms)
 * @returns {T} - Wrapped function
 */
export function rateLimit(fn, delay) {
  let lastCall = 0;
  let timeout = null;
  
  return /** @type {T} */ (function(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);
    
    if (remaining <= 0) {
      lastCall = now;
      return fn.apply(this, args);
    }
    
    if (timeout) clearTimeout(timeout);
    return new Promise((resolve) => {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        resolve(fn.apply(this, args));
      }, remaining);
    });
  });
}

// ── ERROR HANDLING ──

/**
 * Safe JSON parse with error handling
 * @param {string} json - JSON string to parse
 * @param {*} [defaultValue] - Default value if parsing fails
 * @returns {*} - Parsed data or default value
 */
export function safeJSONParse(json, defaultValue = null) {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn('JSON parse error:', e);
    return defaultValue;
  }
}

/**
 * Safe localStorage get with error handling
 * @param {string} key - Storage key
 * @param {*} [defaultValue] - Default value if retrieval fails
 * @returns {*} - Stored value or default
 */
export function safeLocalStorageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return safeJSONParse(item, defaultValue);
  } catch (e) {
    console.warn('localStorage get error:', e);
    return defaultValue;
  }
}

/**
 * Safe localStorage set with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} - Success status
 */
export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('localStorage set error:', e);
    return false;
  }
}

// Export for browser global access
if (typeof window !== 'undefined') {
  window.SecurityUtils = {
    sanitizeHTML,
    escapeHTML,
    createSafeElement,
    validateURL,
    validateTitle,
    validateTag,
    validateDescription,
    validateNotes,
    validateColor,
    safeSetText,
    safeSetHTML,
    createSafeLink,
    MAX_IMPORT_SIZE,
    validateFileSize,
    validateFileType,
    rateLimit,
    safeJSONParse,
    safeLocalStorageGet,
    safeLocalStorageSet,
  };
}
