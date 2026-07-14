// ai-healing-demo-website — pure client-side app, no backend.
// All "data" lives in localStorage so the site behaves like a real CRUD app
// without needing a server. Seeded fresh on first load only.

const DB_KEY = 'ahd_db_v1';
const SESSION_KEY = 'ahd_session_v1';

function seedDb() {
  return {
    users: [
      { id: 1, username: 'admin', password: 'admin123', role: 'Admin', status: 'active' },
      { id: 2, username: 'jane', password: 'jane123', role: 'Manager', status: 'active' },
      { id: 3, username: 'bob', password: 'bob123', role: 'Viewer', status: 'inactive' },
    ],
    products: [
      { id: 1, name: 'Wireless Mouse', price: 19.99, stock: 42 },
      { id: 2, name: 'Mechanical Keyboard', price: 59.99, stock: 15 },
      { id: 3, name: '27" Monitor', price: 249.0, stock: 8 },
    ],
    orders: [
      { id: 1001, product: 'Wireless Mouse', customer: 'Alice', amount: 19.99, status: 'pending' },
      { id: 1002, product: '27" Monitor', customer: 'Charlie', amount: 249.0, status: 'approved' },
    ],
    nextUserId: 4,
    nextProductId: 4,
    nextOrderId: 1003,
  };
}

function getDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const fresh = seedDb();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
  return JSON.parse(raw);
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function resetDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(seedDb()));
}

// ---------- Auth ----------
function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function login(username, password) {
  const db = getDb();
  const user = db.users.find((u) => u.username === username && u.password === password);
  if (!user) return { ok: false, error: 'Invalid username or password.' };
  if (user.status === 'inactive') return { ok: false, error: 'This account is inactive.' };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role }));
  return { ok: true };
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// ---------- Helpers ----------
// Product names like `27" Monitor` contain a literal double quote, which
// breaks unescaped attribute interpolation (e.g. value="${p.name}").
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- Locator override capture ----------
// Hand-editing a data-test value directly in the static HTML (e.g. to
// simulate a healed/renamed locator) would normally get wiped the instant
// renderShell()/render*Table() overwrite innerHTML on load. Capturing the
// as-served value here, before any render touches the DOM, and re-injecting
// it via testId() keeps that rename alive across every re-render instead of
// reverting to the hardcoded default the next time the page loads.
const dataTestOverrides = {};

function captureDataTestOverrides() {
  document.querySelectorAll('[id][data-test]').forEach((el) => {
    dataTestOverrides[el.id] = el.getAttribute('data-test');
  });
}

function testId(elementId, fallback) {
  return dataTestOverrides[elementId] || fallback;
}

// ---------- Toast ----------
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.setAttribute('data-test', 'toast');
    document.body.appendChild(toast);
  }
  toast.className = `toast show ${type}`;
  toast.textContent = message;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---------- Nav shell ----------
function renderShell(activePage) {
  const session = requireAuth();
  if (!session) return;

  const shellEl = document.getElementById('app-shell');
  if (!shellEl) return;

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { key: 'products', label: 'Products', href: 'products.html' },
    { key: 'users', label: 'Users', href: 'users.html' },
    { key: 'orders', label: 'Orders', href: 'orders.html' },
  ];

  const nav = navItems.map((item) => `
    <li>
      <a href="${item.href}" data-test="nav-${item.key}" class="${item.key === activePage ? 'active' : ''}">${item.label}</a>
    </li>
  `).join('');

  shellEl.innerHTML = `
    <aside class="sidebar">
      <div class="brand">AI Healing Demo</div>
      <ul class="nav-menu" data-test="nav-menu">${nav}</ul>
    </aside>
    <main class="main">
      <div class="topbar">
        <h1 id="page-title"></h1>
        <div class="user-info">
          <span data-test="logged-in-user">${session.username} (${session.role})</span>
          <button class="btn btn-secondary btn-sm" data-test="${testId('logoutBtn', 'logout-button')}" id="logoutBtn">Logout</button>
        </div>
      </div>
      <div id="page-content"></div>
    </main>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    logout();
    window.location.href = 'login.html';
  });
}

function setPageTitle(title) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = title;
}

// ================= LOGIN PAGE =================
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  if (getSession()) {
    window.location.href = 'dashboard.html';
    return;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const result = login(username, password);
    const errorEl = document.getElementById('loginError');
    if (result.ok) {
      errorEl.textContent = '';
      window.location.href = 'dashboard.html';
    } else {
      errorEl.textContent = result.error;
    }
  });
}

// ================= DASHBOARD PAGE =================
function initDashboardPage() {
  const el = document.getElementById('page-content');
  if (!el || !document.body.dataset.page || document.body.dataset.page !== 'dashboard') return;

  const db = getDb();
  setPageTitle('Dashboard');

  const pendingOrders = db.orders.filter((o) => o.status === 'pending').length;
  el.innerHTML = `
    <div class="cards-grid" data-test="dashboard-cards">
      <div class="card" data-test="card-products">
        <div class="card-label">Total Products</div>
        <div class="card-value">${db.products.length}</div>
      </div>
      <div class="card" data-test="card-users">
        <div class="card-label">Total Users</div>
        <div class="card-value">${db.users.length}</div>
      </div>
      <div class="card" data-test="card-orders">
        <div class="card-label">Total Orders</div>
        <div class="card-value">${db.orders.length}</div>
      </div>
      <div class="card" data-test="card-pending-orders">
        <div class="card-label">Pending Orders</div>
        <div class="card-value">${pendingOrders}</div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>Welcome</h2></div>
      <p style="color:var(--muted); font-size:14px;">Use the navigation menu to manage products, users, and orders.</p>
    </div>
  `;
}

// ================= PRODUCTS PAGE =================
function initProductsPage() {
  if (document.body.dataset.page !== 'products') return;
  setPageTitle('Products');
  renderProductsTable('');

  document.getElementById('page-content').addEventListener('click', (e) => {
    if (e.target.id === 'addProductBtn') openProductModal();
    if (e.target.dataset.action === 'delete-product') {
      deleteProduct(Number(e.target.dataset.id));
    }
  });
}

function renderProductsTable(filter) {
  const el = document.getElementById('page-content');
  const db = getDb();
  const products = db.products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));

  const rows = products.length
    ? products.map((p) => `
        <tr data-test="product-row-${p.id}">
          <td>${p.name}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>${p.stock}</td>
          <td><button class="btn btn-danger btn-sm" data-test="delete-product-${p.id}" data-action="delete-product" data-id="${p.id}">Delete</button></td>
        </tr>
      `).join('')
    : `<tr><td colspan="4"><div class="empty-state" data-test="products-empty">No products found.</div></td></tr>`;

  el.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>Product Catalog</h2>
        <div class="search-bar">
          <input type="text" id="productSearch" data-test="${testId('productSearch', 'product-search-input')}" placeholder="Search products..." value="${filter}" />
          <button class="btn" id="addProductBtn" data-test="${testId('addProductBtn', 'add-product-button')}">+ Add Product</button>
        </div>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody data-test="products-table-body">${rows}</tbody>
      </table>
    </div>
    <div class="modal-overlay" id="productModal" data-test="${testId('productModal', 'product-modal')}">
      <div class="modal">
        <h3>Add Product</h3>
        <div class="field">
          <label>Name</label>
          <input type="text" id="newProductName" data-test="${testId('newProductName', 'new-product-name')}" />
        </div>
        <div class="field">
          <label>Price</label>
          <input type="number" id="newProductPrice" data-test="${testId('newProductPrice', 'new-product-price')}" step="0.01" />
        </div>
        <div class="field">
          <label>Stock</label>
          <input type="number" id="newProductStock" data-test="${testId('newProductStock', 'new-product-stock')}" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancelProductBtn" data-test="${testId('cancelProductBtn', 'cancel-product-button')}">Cancel</button>
          <button class="btn" id="saveProductBtn" data-test="${testId('saveProductBtn', 'save-product-button')}">Save</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('productSearch').addEventListener('input', (e) => renderProductsTable(e.target.value));
  document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
  document.getElementById('saveProductBtn').addEventListener('click', saveNewProduct);
}

function openProductModal() {
  document.getElementById('productModal').classList.add('open');
}
function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

function saveNewProduct() {
  const name = document.getElementById('newProductName').value.trim();
  const price = parseFloat(document.getElementById('newProductPrice').value);
  const stock = parseInt(document.getElementById('newProductStock').value, 10);
  if (!name || Number.isNaN(price) || Number.isNaN(stock)) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  const db = getDb();
  db.products.push({ id: db.nextProductId++, name, price, stock });
  saveDb(db);
  closeProductModal();
  showToast('Product added.');
  renderProductsTable('');
}

function deleteProduct(id) {
  const db = getDb();
  db.products = db.products.filter((p) => p.id !== id);
  saveDb(db);
  showToast('Product deleted.');
  renderProductsTable(document.getElementById('productSearch')?.value || '');
}

// ================= USERS PAGE =================
function initUsersPage() {
  if (document.body.dataset.page !== 'users') return;
  setPageTitle('Users');
  renderUsersTable();

  document.getElementById('page-content').addEventListener('click', (e) => {
    if (e.target.id === 'addUserBtn') openUserModal(null);
    if (e.target.dataset.action === 'edit-user') openUserModal(Number(e.target.dataset.id));
    if (e.target.dataset.action === 'delete-user') deleteUser(Number(e.target.dataset.id));
  });
}

function renderUsersTable() {
  const el = document.getElementById('page-content');
  const db = getDb();

  const rows = db.users.map((u) => `
    <tr data-test="user-row-${u.id}">
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" data-test="edit-user-${u.id}" data-action="edit-user" data-id="${u.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-test="delete-user-${u.id}" data-action="delete-user" data-id="${u.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  el.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>User Management</h2>
        <button class="btn" id="addUserBtn" data-test="${testId('addUserBtn', 'add-user-button')}">+ Add User</button>
      </div>
      <table>
        <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody data-test="users-table-body">${rows}</tbody>
      </table>
    </div>
    <div class="modal-overlay" id="userModal" data-test="${testId('userModal', 'user-modal')}">
      <div class="modal">
        <h3 id="userModalTitle">Add User</h3>
        <input type="hidden" id="editUserId" />
        <div class="field">
          <label>Username</label>
          <input type="text" id="userUsername" data-test="${testId('userUsername', 'user-username-input')}" />
        </div>
        <div class="field">
          <label>Role</label>
          <select id="userRole" data-test="${testId('userRole', 'user-role-select')}">
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>
        <div class="field">
          <label>Status</label>
          <select id="userStatus" data-test="${testId('userStatus', 'user-status-select')}">
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancelUserBtn" data-test="${testId('cancelUserBtn', 'cancel-user-button')}">Cancel</button>
          <button class="btn" id="saveUserBtn" data-test="${testId('saveUserBtn', 'save-user-button')}">Save</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('cancelUserBtn').addEventListener('click', closeUserModal);
  document.getElementById('saveUserBtn').addEventListener('click', saveUser);
}

function openUserModal(id) {
  const db = getDb();
  const modal = document.getElementById('userModal');
  const user = id ? db.users.find((u) => u.id === id) : null;

  document.getElementById('userModalTitle').textContent = user ? 'Edit User' : 'Add User';
  document.getElementById('editUserId').value = user ? user.id : '';
  document.getElementById('userUsername').value = user ? user.username : '';
  document.getElementById('userRole').value = user ? user.role : 'Viewer';
  document.getElementById('userStatus').value = user ? user.status : 'active';

  modal.classList.add('open');
}
function closeUserModal() {
  document.getElementById('userModal').classList.remove('open');
}

function saveUser() {
  const id = document.getElementById('editUserId').value;
  const username = document.getElementById('userUsername').value.trim();
  const role = document.getElementById('userRole').value;
  const status = document.getElementById('userStatus').value;

  if (!username) {
    showToast('Username is required.', 'error');
    return;
  }

  const db = getDb();
  if (id) {
    const user = db.users.find((u) => u.id === Number(id));
    if (user) { user.username = username; user.role = role; user.status = status; }
    showToast('User updated.');
  } else {
    db.users.push({ id: db.nextUserId++, username, password: 'temp123', role, status });
    showToast('User added.');
  }
  saveDb(db);
  closeUserModal();
  renderUsersTable();
}

function deleteUser(id) {
  const db = getDb();
  db.users = db.users.filter((u) => u.id !== id);
  saveDb(db);
  showToast('User deleted.');
  renderUsersTable();
}

// ================= ORDERS PAGE =================
function initOrdersPage() {
  if (document.body.dataset.page !== 'orders') return;
  setPageTitle('Orders');
  renderOrdersTable();

  document.getElementById('page-content').addEventListener('click', (e) => {
    if (e.target.id === 'createOrderBtn') openOrderModal();
    if (e.target.dataset.action === 'approve-order') approveOrder(Number(e.target.dataset.id));
  });
}

function renderOrdersTable() {
  const el = document.getElementById('page-content');
  const db = getDb();

  const rows = db.orders.map((o) => `
    <tr data-test="order-row-${o.id}">
      <td>#${o.id}</td>
      <td>${o.product}</td>
      <td>${o.customer}</td>
      <td>$${o.amount.toFixed(2)}</td>
      <td><span class="badge ${o.status}">${o.status}</span></td>
      <td>
        ${o.status === 'pending'
          ? `<button class="btn btn-sm" data-test="approve-order-${o.id}" data-action="approve-order" data-id="${o.id}">Approve</button>`
          : '—'}
      </td>
    </tr>
  `).join('');

  el.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>Orders</h2>
        <button class="btn" id="createOrderBtn" data-test="${testId('createOrderBtn', 'create-order-button')}">+ Create Order</button>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Product</th><th>Customer</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody data-test="orders-table-body">${rows}</tbody>
      </table>
    </div>
    <div class="modal-overlay" id="orderModal" data-test="${testId('orderModal', 'order-modal')}">
      <div class="modal">
        <h3>Create Order</h3>
        <div class="field">
          <label>Product</label>
          <select id="orderProduct" data-test="${testId('orderProduct', 'order-product-select')}">
            ${getDb().products.map((p) => `<option value="${escapeHtml(p.name)}" data-price="${p.price}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Customer</label>
          <input type="text" id="orderCustomer" data-test="${testId('orderCustomer', 'order-customer-input')}" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancelOrderBtn" data-test="${testId('cancelOrderBtn', 'cancel-order-button')}">Cancel</button>
          <button class="btn" id="saveOrderBtn" data-test="${testId('saveOrderBtn', 'save-order-button')}">Create</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('cancelOrderBtn').addEventListener('click', closeOrderModal);
  document.getElementById('saveOrderBtn').addEventListener('click', saveNewOrder);
}

function openOrderModal() {
  document.getElementById('orderModal').classList.add('open');
}
function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('open');
}

function saveNewOrder() {
  const select = document.getElementById('orderProduct');
  const productName = select.value;
  const price = parseFloat(select.selectedOptions[0].dataset.price);
  const customer = document.getElementById('orderCustomer').value.trim();

  if (!customer) {
    showToast('Customer name is required.', 'error');
    return;
  }

  const db = getDb();
  db.orders.push({ id: db.nextOrderId++, product: productName, customer, amount: price, status: 'pending' });
  saveDb(db);
  closeOrderModal();
  showToast('Order created.');
  renderOrdersTable();
}

function approveOrder(id) {
  const db = getDb();
  const order = db.orders.find((o) => o.id === id);
  if (order) order.status = 'approved';
  saveDb(db);
  showToast('Order approved.');
  renderOrdersTable();
}

// ---------- boot ----------
document.addEventListener('DOMContentLoaded', () => {
  captureDataTestOverrides();
  initLoginPage();

  const page = document.body.dataset.page;
  if (page) {
    renderShell(page);
    initDashboardPage();
    initProductsPage();
    initUsersPage();
    initOrdersPage();
  }
});
