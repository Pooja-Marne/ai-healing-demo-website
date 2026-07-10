// Locator Chaos — lets you intentionally break specific `data-test`
// locators on this demo site at runtime, without redeploying, so the AI
// Self-Healing Agent has something real to detect and fix.
//
// Enable/disable:
//   - URL:        ?chaos=on   or   ?chaos=off   (persists to localStorage)
//   - Console:    localStorage.setItem('ahd_chaos', 'on')
//   - UI:         the "Chaos Mode" toggle link on the login page footer
//
// How it works: once enabled, every element whose current data-test value
// matches a key in CHAOS_MAP gets that attribute rewritten to the broken
// value. A MutationObserver re-applies this after every re-render (the app
// re-renders tables on search/add/delete), so the break is durable across
// interactions, not just a one-time DOM edit.

const CHAOS_KEY = 'ahd_chaos';

const CHAOS_MAP = {
  'login-button': 'broken_login_button',
  'logout-button': 'broken_logout_button',
  'add-product-button': 'broken_add_product_button',
  'product-search-input': 'broken_product_search_input',
  'add-user-button': 'broken_add_user_button',
  'create-order-button': 'broken_create_order_button',
  'nav-products': 'broken_nav_products',
};

// Dynamic per-row locators (delete-product-1, edit-user-3, approve-order-1002,
// ...) are matched by PREFIX so chaos still finds them regardless of the id.
const CHAOS_PREFIX_MAP = {
  'delete-product-': 'broken_delete_product-',
  'edit-user-': 'broken_edit_user-',
  'delete-user-': 'broken_delete_user-',
  'approve-order-': 'broken_approve_order-',
};

function isChaosEnabled() {
  return localStorage.getItem(CHAOS_KEY) === 'on';
}

function setChaosEnabled(enabled) {
  localStorage.setItem(CHAOS_KEY, enabled ? 'on' : 'off');
}

function applyChaos() {
  if (!isChaosEnabled()) return;

  for (const [oldVal, newVal] of Object.entries(CHAOS_MAP)) {
    document.querySelectorAll(`[data-test="${oldVal}"]`).forEach((el) => {
      el.setAttribute('data-test', newVal);
    });
  }

  for (const [prefix, newPrefix] of Object.entries(CHAOS_PREFIX_MAP)) {
    document.querySelectorAll(`[data-test^="${prefix}"]`).forEach((el) => {
      const current = el.getAttribute('data-test');
      if (current.startsWith(newPrefix)) return; // already broken
      el.setAttribute('data-test', current.replace(prefix, newPrefix));
    });
  }
}

function initChaosFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const chaosParam = params.get('chaos');
  if (chaosParam === 'on' || chaosParam === 'off') {
    setChaosEnabled(chaosParam === 'on');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initChaosFromUrl();
  applyChaos();

  // Re-apply on every DOM mutation so dynamically re-rendered tables/modals
  // (search results, new rows, reopened modals) stay broken too.
  const observer = new MutationObserver(() => applyChaos());
  observer.observe(document.body, { childList: true, subtree: true, attributes: false });
});
