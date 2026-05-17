/**
 * Import Export Invoice Generator — Main Application Logic
 * Handles consignee CRUD, product master CRUD, invoice creation,
 * multi-product support, invoice history, and tab navigation.
 */

// ===== Global State =====
let consignees = [];
let productMaster = [];
let invoiceHistory = [];
let selectedConsignee = null;
let editingConsigneeId = null;
let editingProductId = null;
let editingInvoiceId = null; // Tracks if we're editing a history invoice
let currentInvoiceNumber = '';
let invoiceProductCounter = 0;

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', async () => {
  // Show Supabase notice if not configured
  if (!isSupabaseConfigured) {
    document.getElementById('supabase-notice').style.display = 'flex';
  }

  // Load all data
  await loadConsignees();
  await loadProducts();
  await loadInvoiceHistory();

  // Set today's date
  document.getElementById('invoice-date').valueAsDate = new Date();

  // Setup event listeners
  setupTabNavigation();
  setupConsigneeSearch();
  setupProductSearch();
  loadExporter();
});

// ===== Tab Navigation =====
function setupTabNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

// ===== Toast Notifications =====
function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

// ========================================
// CONSIGNEE MANAGEMENT
// ========================================
async function loadConsignees() {
  consignees = await db.getConsignees();
  renderConsigneeList();
  populateConsigneeDropdown();
}

function renderConsigneeList(filter = '') {
  const list = document.getElementById('consignee-list');
  const filtered = filter
    ? consignees.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        (c.country || '').toLowerCase().includes(filter.toLowerCase()) ||
        (c.destination || '').toLowerCase().includes(filter.toLowerCase()))
    : consignees;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏢</div><p>${filter ? 'No consignees found' : 'No consignees yet. Add your first consignee!'}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(c => `
    <div class="card customer-card" id="cons-card-${c.id}">
      <div class="customer-info">
        <h3>${c.name}</h3>
        <p>${c.address || ''}${c.country ? ', ' + c.country : ''}</p>
        ${c.destination ? `<span class="tag">📍 ${c.destination}</span>` : ''}
        ${c.gst_tax_id ? ` <span class="tag">GST: ${c.gst_tax_id}</span>` : ''}
      </div>
      <div class="customer-actions">
        <button class="btn btn-secondary btn-icon btn-sm" onclick="editConsignee('${c.id}')" title="Edit">✏️</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteConsignee('${c.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function populateConsigneeDropdown() {
  const select = document.getElementById('consignee-select');
  const currentVal = select.value;
  select.innerHTML = '<option value="">— Select Consignee —</option>';
  consignees.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name} (${c.country || 'N/A'})</option>`;
  });
  select.value = currentVal;
}

function setupConsigneeSearch() {
  const input = document.getElementById('consignee-search');
  if (input) input.addEventListener('input', (e) => renderConsigneeList(e.target.value));
}

function onConsigneeSelect(selectEl) {
  const id = selectEl.value;
  if (!id) {
    selectedConsignee = null;
    document.getElementById('selected-consignee-info').classList.add('hidden');
    return;
  }
  selectedConsignee = consignees.find(c => c.id === id);
  if (selectedConsignee) {
    const info = document.getElementById('selected-consignee-info');
    info.classList.remove('hidden');
    document.getElementById('sel-cons-name').textContent = selectedConsignee.name;
    let details = [selectedConsignee.address_line1, selectedConsignee.address_line2, selectedConsignee.country].filter(Boolean).join(', ');
    if (selectedConsignee.destination) details += ` | Dest: ${selectedConsignee.destination}`;
    if (selectedConsignee.payment_terms) details += ` | ${selectedConsignee.payment_terms}`;
    document.getElementById('sel-cons-details').textContent = details;
  }
}

function clearConsigneeSelection() {
  selectedConsignee = null;
  document.getElementById('consignee-select').value = '';
  document.getElementById('selected-consignee-info').classList.add('hidden');
}

function openConsigneeModal(isEdit = false) {
  document.getElementById('consignee-modal').classList.add('active');
  document.getElementById('consignee-modal-title').textContent = isEdit ? 'Edit Consignee' : 'Add Consignee';
  if (!isEdit) {
    editingConsigneeId = null;
    document.getElementById('cons-form').reset();
  }
}

function closeConsigneeModal() {
  document.getElementById('consignee-modal').classList.remove('active');
  editingConsigneeId = null;
}

async function editConsignee(id) {
  const c = consignees.find(c => c.id === id);
  if (!c) return;
  editingConsigneeId = id;
  document.getElementById('cons-name').value = c.name;
  document.getElementById('cons-addr1').value = c.address_line1 || '';
  document.getElementById('cons-addr2').value = c.address_line2 || '';
  document.getElementById('cons-addr3').value = c.address_line3 || '';
  document.getElementById('cons-addr4').value = c.address_line4 || '';
  document.getElementById('cons-lan').value = c.lan_no || '';
  document.getElementById('cons-country').value = c.country || '';
  document.getElementById('cons-gst').value = c.gst_tax_id || '';
  document.getElementById('cons-notify-name').value = c.notify_name || '';
  document.getElementById('cons-notify-addr1').value = c.notify_address_line1 || '';
  document.getElementById('cons-notify-addr2').value = c.notify_address_line2 || '';
  document.getElementById('cons-notify-addr3').value = c.notify_address_line3 || '';
  document.getElementById('cons-notify-addr4').value = c.notify_address_line4 || '';
  document.getElementById('cons-notify-lan').value = c.notify_lan_no || '';
  document.getElementById('cons-payment-terms').value = c.payment_terms || '';
  document.getElementById('cons-delivery-terms').value = c.delivery_terms || '';
  document.getElementById('cons-destination').value = c.destination || '';
  openConsigneeModal(true);
}

async function saveConsignee() {
  const name = document.getElementById('cons-name').value.trim();
  if (!name) { showToast('Consignee name is required', true); return; }

  const data = {
    name,
    address_line1: document.getElementById('cons-addr1').value.trim(),
    address_line2: document.getElementById('cons-addr2').value.trim(),
    address_line3: document.getElementById('cons-addr3').value.trim(),
    address_line4: document.getElementById('cons-addr4').value.trim(),
    lan_no: document.getElementById('cons-lan').value.trim(),
    country: document.getElementById('cons-country').value.trim(),
    gst_tax_id: document.getElementById('cons-gst').value.trim(),
    notify_name: document.getElementById('cons-notify-name').value.trim(),
    notify_address_line1: document.getElementById('cons-notify-addr1').value.trim(),
    notify_address_line2: document.getElementById('cons-notify-addr2').value.trim(),
    notify_address_line3: document.getElementById('cons-notify-addr3').value.trim(),
    notify_address_line4: document.getElementById('cons-notify-addr4').value.trim(),
    notify_lan_no: document.getElementById('cons-notify-lan').value.trim(),
    payment_terms: document.getElementById('cons-payment-terms').value.trim(),
    delivery_terms: document.getElementById('cons-delivery-terms').value.trim(),
    destination: document.getElementById('cons-destination').value.trim()
  };

  if (editingConsigneeId) {
    await db.updateConsignee(editingConsigneeId, data);
    showToast('Consignee updated!');
  } else {
    await db.addConsignee(data);
    showToast('Consignee added!');
  }

  closeConsigneeModal();
  await loadConsignees();
}

async function deleteConsignee(id) {
  if (!confirm('Delete this consignee?')) return;
  await db.deleteConsignee(id);
  showToast('Consignee deleted');
  if (selectedConsignee && selectedConsignee.id === id) clearConsigneeSelection();
  await loadConsignees();
}

// ========================================
// PRODUCT MASTER MANAGEMENT
// ========================================
async function loadProducts() {
  productMaster = await db.getProducts();
  renderProductMasterList();
  populateProductDropdown();
}

function renderProductMasterList(filter = '') {
  const list = document.getElementById('product-master-list');
  const filtered = filter
    ? productMaster.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        (p.hsn_code || '').toLowerCase().includes(filter.toLowerCase()))
    : productMaster;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><p>${filter ? 'No products found' : 'No products yet. Add your first product!'}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(p => `
    <div class="card customer-card" id="prod-card-${p.id}">
      <div class="customer-info">
        <h3>${p.name}</h3>
        <p>${p.description || 'No description'}</p>
        ${p.hsn_code ? `<span class="tag">HSN: ${p.hsn_code}</span>` : ''}
        ${p.marks ? ` <span class="tag">Marks: ${p.marks}</span>` : ''}
        <span class="tag">${p.unit || 'PCS'}</span>
        ${p.packaging_type ? ` <span class="tag">📦 ${p.packaging_type}</span>` : ''}
        ${p.unit_weight ? ` <span class="tag">⚖️ ${p.unit_weight}Kg</span>` : ''}
        ${p.packing_qty ? ` <span class="tag">📋 ${p.packing_qty}/carton</span>` : ''}
      </div>
      <div class="customer-actions">
        <button class="btn btn-secondary btn-icon btn-sm" onclick="editProduct('${p.id}')" title="Edit">✏️</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteProduct('${p.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function populateProductDropdown() {
  const select = document.getElementById('add-product-select');
  select.innerHTML = '<option value="">— Choose Product —</option>';
  productMaster.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.name} (HSN: ${p.hsn_code || 'N/A'})</option>`;
  });
}

function setupProductSearch() {
  const input = document.getElementById('product-search');
  if (input) input.addEventListener('input', (e) => renderProductMasterList(e.target.value));
}

function openProductModal(isEdit = false) {
  document.getElementById('product-modal').classList.add('active');
  document.getElementById('product-modal-title').textContent = isEdit ? 'Edit Product' : 'Add Product';
  if (!isEdit) {
    editingProductId = null;
    document.getElementById('prod-form').reset();
  }
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
  editingProductId = null;
}

async function editProduct(id) {
  const p = productMaster.find(p => p.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById('prod-master-name').value = p.name;
  document.getElementById('prod-master-hsn').value = p.hsn_code || '';
  document.getElementById('prod-master-unit').value = p.unit || 'PCS';
  document.getElementById('prod-master-marks').value = p.marks || '';
  document.getElementById('prod-master-desc').value = p.description || '';
  document.getElementById('prod-master-pkg-type').value = p.packaging_type || 'Bottle';
  document.getElementById('prod-master-unit-wt').value = p.unit_weight || '';
  document.getElementById('prod-master-pkg-qty').value = p.packing_qty || '';
  openProductModal(true);
}

async function saveProduct() {
  const name = document.getElementById('prod-master-name').value.trim();
  if (!name) { showToast('Product name is required', true); return; }

  const data = {
    name,
    hsn_code: document.getElementById('prod-master-hsn').value.trim(),
    unit: document.getElementById('prod-master-unit').value,
    marks: document.getElementById('prod-master-marks').value.trim(),
    description: document.getElementById('prod-master-desc').value.trim(),
    packaging_type: document.getElementById('prod-master-pkg-type').value,
    unit_weight: parseFloat(document.getElementById('prod-master-unit-wt').value) || null,
    packing_qty: parseInt(document.getElementById('prod-master-pkg-qty').value) || null
  };

  if (editingProductId) {
    await db.updateProduct(editingProductId, data);
    showToast('Product updated!');
  } else {
    await db.addProduct(data);
    showToast('Product added!');
  }

  closeProductModal();
  await loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await db.deleteProduct(id);
  showToast('Product deleted');
  await loadProducts();
}

// ========================================
// INVOICE PRODUCT ROWS
// ========================================

// Add product from master dropdown
function addProductFromMaster() {
  const select = document.getElementById('add-product-select');
  const id = select.value;
  if (!id) { showToast('Select a product first', true); return; }

  const product = productMaster.find(p => p.id === id);
  if (!product) return;

  addInvoiceProductRow({
    product_name: product.name,
    hsn_code: product.hsn_code || '',
    marks: product.marks || '',
    description: product.description || '',
    unit: product.unit || 'PCS',
    quantity: '',
    price: '',
    packaging_type: product.packaging_type || '',
    unit_weight: product.unit_weight || 0,
    packing_qty: product.packing_qty || 0
  });

  select.value = '';
}

// Add a blank custom product row
function addCustomProductRow() {
  addInvoiceProductRow({
    product_name: '',
    hsn_code: '',
    marks: '',
    description: '',
    unit: 'PCS',
    quantity: '',
    price: '',
    packaging_type: '',
    unit_weight: 0,
    packing_qty: 0
  });
}

function addInvoiceProductRow(data) {
  invoiceProductCounter++;
  const id = invoiceProductCounter;
  const container = document.getElementById('invoice-product-list');
  const div = document.createElement('div');
  div.className = 'product-item';
  div.id = `inv-prod-${id}`;
  // Store packaging data as data attributes for weight calculation
  div.dataset.unitWeight = data.unit_weight || 0;
  div.dataset.packingQty = data.packing_qty || 0;
  div.dataset.packagingType = data.packaging_type || '';
  const pkgLabel = data.packaging_type && data.unit_weight
    ? `<span class="tag" style="margin-top:4px">📦 ${data.packaging_type} | ⚖️ ${data.unit_weight}Kg/unit${data.packing_qty ? ` | ${data.packing_qty}/carton` : ''}</span>`
    : '';
  div.innerHTML = `
    <button class="remove-btn" onclick="removeInvoiceProduct(${id})" title="Remove">✕</button>
    <div class="product-grid">
      <div class="full-width form-group">
        <label>Product Name</label>
        <input type="text" class="ip-name" value="${escapeHtml(data.product_name)}" placeholder="Product name">
      </div>
      <div class="form-group">
        <label>HSN Code</label>
        <input type="text" class="ip-hsn" value="${escapeHtml(data.hsn_code)}" placeholder="HSN">
      </div>
      <div class="form-group">
        <label>Marks & Nos</label>
        <input type="text" class="ip-marks" value="${escapeHtml(data.marks)}" placeholder="Marks">
      </div>
      <div class="full-width form-group">
        <label>Description</label>
        <input type="text" class="ip-desc" value="${escapeHtml(data.description)}" placeholder="Description of goods">
      </div>
      <div class="form-group">
        <label>Quantity</label>
        <input type="number" class="ip-qty" value="${data.quantity}" placeholder="0" min="0" step="any" oninput="updateInvoiceProductAmount(${id})">
      </div>
      <div class="form-group">
        <label>Rate</label>
        <input type="number" class="ip-rate" value="${data.price}" placeholder="0.00" min="0" step="any" oninput="updateInvoiceProductAmount(${id})">
      </div>
    </div>
    ${pkgLabel}
    <div class="product-amount" id="inv-prod-amt-${id}">Amount: 0.00</div>
  `;
  container.appendChild(div);
  updateInvoiceTotal();
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function removeInvoiceProduct(id) {
  const el = document.getElementById(`inv-prod-${id}`);
  if (el) { el.remove(); updateInvoiceTotal(); }
}

function updateInvoiceProductAmount(id) {
  const row = document.getElementById(`inv-prod-${id}`);
  if (!row) return;
  const qty = parseFloat(row.querySelector('.ip-qty').value) || 0;
  const rate = parseFloat(row.querySelector('.ip-rate').value) || 0;
  const amount = qty * rate;
  const currency = document.getElementById('invoice-currency').value;
  const sym = getCurrencySymbol(currency);
  row.querySelector(`#inv-prod-amt-${id}`).textContent = `Amount: ${sym}${amount.toFixed(2)}`;
  updateInvoiceTotal();
  recalcTotalWeight();
}

// Auto-calculate net & gross weight from all product rows
function recalcTotalWeight() {
  let totalNetWeight = 0;
  document.querySelectorAll('#invoice-product-list .product-item').forEach(row => {
    const qty = parseFloat(row.querySelector('.ip-qty')?.value) || 0;
    const unitWt = parseFloat(row.dataset.unitWeight) || 0;
    if (qty > 0 && unitWt > 0) {
      totalNetWeight += qty * unitWt;
    }
  });
  if (totalNetWeight > 0) {
    document.getElementById('inv-net-wt').value = totalNetWeight.toFixed(2);
    // Gross weight = net weight + ~2-5% packaging overhead
    document.getElementById('inv-gross-wt').value = (totalNetWeight * 1.03).toFixed(2);
  }
}

function updateInvoiceTotal() {
  let total = 0;
  document.querySelectorAll('#invoice-product-list .product-item').forEach(row => {
    const qty = parseFloat(row.querySelector('.ip-qty')?.value) || 0;
    const rate = parseFloat(row.querySelector('.ip-rate')?.value) || 0;
    total += qty * rate;
  });
  const currency = document.getElementById('invoice-currency').value;
  const sym = getCurrencySymbol(currency);
  document.getElementById('invoice-total').textContent = `${sym}${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // Update amount in words
  document.getElementById('amount-words').textContent = `${currency} ${numberToWords(total)}`;
}

function getInvoiceProductItems() {
  const items = [];
  document.querySelectorAll('#invoice-product-list .product-item').forEach(row => {
    const name = row.querySelector('.ip-name')?.value?.trim();
    const qty = parseFloat(row.querySelector('.ip-qty')?.value) || 0;
    const rate = parseFloat(row.querySelector('.ip-rate')?.value) || 0;
    if (name && qty > 0 && rate > 0) {
      items.push({
        product_name: name,
        hsn_code: row.querySelector('.ip-hsn')?.value?.trim() || '',
        marks: row.querySelector('.ip-marks')?.value?.trim() || '',
        description: row.querySelector('.ip-desc')?.value?.trim() || '',
        unit: 'PCS',
        quantity: qty,
        price: rate,
        amount: qty * rate
      });
    }
  });
  return items;
}

// ========================================
// INVOICE PREVIEW & EXPORT
// ========================================

function buildInvoiceObject(items) {
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  // Use cached exporter from Supabase (loaded on page init)
  const exp = cachedExporter || {};
  return {
    invoice_number: document.getElementById('invoice-number').value,
    invoice_date: document.getElementById('invoice-date').value,
    consignee_id: selectedConsignee.id,
    // Exporter details (PAN, IEC, AD-CODE, GSTIN belong here)
    exporter_name: exp.name || COMPANY_INFO.name,
    exporter_address: exp.address_line1 || COMPANY_INFO.address,
    exporter_city: exp.address_line2 || COMPANY_INFO.city,
    exporter_country: exp.country || COMPANY_INFO.country,
    exporter_pan: exp.pan || '',
    exporter_iec: exp.iec || '',
    exporter_gstin: exp.gstin || '',
    exporter_ad_code: exp.ad_code || '',
    exporter_state_code: exp.state_code || '',
    exporter_enduse_code: exp.enduse_code || '',
    // Consignee details
    customer_name: selectedConsignee.name,
    cons_addr1: selectedConsignee.address_line1 || '',
    cons_addr2: selectedConsignee.address_line2 || '',
    cons_addr3: selectedConsignee.address_line3 || '',
    cons_addr4: selectedConsignee.address_line4 || '',
    cons_lan_no: selectedConsignee.lan_no || '',
    customer_gst: selectedConsignee.gst_tax_id || '',
    // Notify party
    notify_name: selectedConsignee.notify_name || '',
    notify_addr1: selectedConsignee.notify_address_line1 || '',
    notify_addr2: selectedConsignee.notify_address_line2 || '',
    notify_addr3: selectedConsignee.notify_address_line3 || '',
    notify_addr4: selectedConsignee.notify_address_line4 || '',
    notify_lan_no: selectedConsignee.notify_lan_no || '',
    // Trade terms
    payment_terms: selectedConsignee.payment_terms,
    delivery_terms: selectedConsignee.delivery_terms,
    destination: selectedConsignee.destination,
    currency: document.getElementById('invoice-currency').value,
    total_amount: total,
    // Shipping details
    supplier_ref: document.getElementById('inv-supplier-ref').value.trim(),
    despatched_through: document.getElementById('inv-despatched').value.trim(),
    container_details: document.getElementById('inv-container').value.trim(),
    num_packages: document.getElementById('inv-num-pkgs').value.trim(),
    net_weight: document.getElementById('inv-net-wt').value.trim(),
    gross_weight: document.getElementById('inv-gross-wt').value.trim(),
    product_notes: document.getElementById('inv-product-notes').value.trim()
  };
}

function previewInvoice() {
  if (!selectedConsignee) { showToast('Please select a consignee', true); return; }
  const items = getInvoiceProductItems();
  if (items.length === 0) { showToast('Add at least one product with quantity and rate', true); return; }

  const invoice = buildInvoiceObject(items);
  const html = generateInvoicePreview(invoice, items);
  document.getElementById('preview-content').innerHTML = html;
  document.getElementById('preview-modal').classList.add('active');
}

function closePreviewModal() {
  document.getElementById('preview-modal').classList.remove('active');
}

async function downloadExcel() {
  if (!selectedConsignee) { showToast('Please select a consignee', true); return; }
  const items = getInvoiceProductItems();
  if (items.length === 0) { showToast('Add at least one product', true); return; }

  const invoice = buildInvoiceObject(items);

  // Save to DB before downloading (upsert: update if editing, insert if new)
  try {
    if (editingInvoiceId) {
      // Update existing invoice
      if (supabaseClient) {
        await supabaseClient.from('invoice_items').delete().eq('invoice_id', editingInvoiceId);
        const { error } = await supabaseClient.from('invoices').update(invoice).eq('id', editingInvoiceId);
        if (error) throw new Error(error.message);
        const itemsWithId = items.map(item => ({ ...item, invoice_id: editingInvoiceId }));
        await db.addInvoiceItems(itemsWithId);
      }
      editingInvoiceId = null;
    } else {
      // Insert new invoice
      const saved = await db.addInvoice(invoice);
      if (saved && saved.id) {
        const itemsWithId = items.map(item => ({ ...item, invoice_id: saved.id }));
        await db.addInvoiceItems(itemsWithId);
      }
    }
    await loadInvoiceHistory();
  } catch (e) {
    console.error('Save error:', e);
    showToast('Save failed: ' + e.message, true);
  }

  await exportToExcel(invoice, items);
  showToast('Invoice saved & downloaded!');
}

async function saveAndDownload() {
  const items = getInvoiceProductItems();
  if (items.length === 0) return;

  const invoice = buildInvoiceObject(items);

  // Save invoice to DB
  const saved = await db.addInvoice(invoice);
  if (saved && saved.id) {
    const itemsWithId = items.map(item => ({ ...item, invoice_id: saved.id }));
    await db.addInvoiceItems(itemsWithId);
  }

  // Download Excel
  await exportToExcel(invoice, items);

  showToast('Invoice saved & downloaded!');
  closePreviewModal();
  await loadInvoiceHistory();
}

async function resetInvoiceForm() {
  clearConsigneeSelection();
  document.getElementById('invoice-product-list').innerHTML = '';
  invoiceProductCounter = 0;
  document.getElementById('invoice-number').value = '';
  document.getElementById('invoice-date').valueAsDate = new Date();
  // Clear shipping fields
  document.getElementById('inv-supplier-ref').value = '';
  document.getElementById('inv-despatched').value = '';
  document.getElementById('inv-container').value = '';
  document.getElementById('inv-num-pkgs').value = '';
  document.getElementById('inv-net-wt').value = '';
  document.getElementById('inv-gross-wt').value = '';
  document.getElementById('inv-product-notes').value = '';
  updateInvoiceTotal();
}

// ========================================
// INVOICE HISTORY
// ========================================
async function loadInvoiceHistory() {
  invoiceHistory = await db.getInvoices();
  renderHistoryList();
}

function renderHistoryList() {
  const list = document.getElementById('history-list');
  if (invoiceHistory.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No invoices generated yet</p></div>';
    return;
  }

  list.innerHTML = invoiceHistory.map(inv => {
    const sym = getCurrencySymbol(inv.currency || 'USD');
    const date = new Date(inv.invoice_date || inv.created_at).toLocaleDateString('en-IN');
    return `
      <div class="card">
        <div class="history-card">
          <div class="history-info">
            <h3>${inv.invoice_number}</h3>
            <p>${inv.customer_name} · ${date}</p>
          </div>
          <div class="history-amount">${sym}${parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="history-actions">
          <button class="btn btn-secondary btn-sm" onclick="editHistoryInvoice('${inv.id}')">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" onclick="viewHistoryInvoice('${inv.id}')">👁️ View</button>
          <button class="btn btn-primary btn-sm" onclick="redownloadInvoice('${inv.id}')">📥 Excel</button>
          <button class="btn btn-danger btn-sm" onclick="deleteInvoice('${inv.id}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

async function viewHistoryInvoice(id) {
  const inv = invoiceHistory.find(i => i.id === id);
  if (!inv) return;
  const items = await db.getInvoiceItems(id);
  const html = generateInvoicePreview(inv, items);
  document.getElementById('preview-content').innerHTML = html;
  document.getElementById('preview-modal').classList.add('active');
}

async function redownloadInvoice(id) {
  const inv = invoiceHistory.find(i => i.id === id);
  if (!inv) return;
  const items = await db.getInvoiceItems(id);
  await exportToExcel(inv, items);
  showToast('Excel downloaded!');
}

async function deleteInvoice(id) {
  if (!confirm('Delete this invoice? This cannot be undone.')) return;
  if (supabaseClient) {
    // invoice_items cascade-deletes automatically
    const { error } = await supabaseClient.from('invoices').delete().eq('id', id);
    if (error) { showToast('Delete failed: ' + error.message, true); return; }
  } else {
    // localStorage fallback
    const invoices = JSON.parse(localStorage.getItem('iieg_invoices') || '[]').filter(i => i.id !== id);
    localStorage.setItem('iieg_invoices', JSON.stringify(invoices));
    const items = JSON.parse(localStorage.getItem('iieg_invoice_items') || '[]').filter(i => i.invoice_id !== id);
    localStorage.setItem('iieg_invoice_items', JSON.stringify(items));
  }
  showToast('Invoice deleted');
  await loadInvoiceHistory();
}

async function editHistoryInvoice(id) {
  const inv = invoiceHistory.find(i => i.id === id);
  if (!inv) return;
  const items = await db.getInvoiceItems(id);

  // Switch to invoice tab
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-tab="invoice"]').classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-invoice').classList.add('active');

  // Fill invoice header
  document.getElementById('invoice-number').value = inv.invoice_number || '';
  document.getElementById('invoice-date').value = inv.invoice_date || '';
  document.getElementById('invoice-currency').value = inv.currency || 'USD';

  // Select consignee
  if (inv.consignee_id) {
    const sel = document.getElementById('consignee-select');
    sel.value = inv.consignee_id;
    onConsigneeSelect(sel);
  }

  // Fill shipping details
  document.getElementById('inv-supplier-ref').value = inv.supplier_ref || '';
  document.getElementById('inv-despatched').value = inv.despatched_through || '';
  document.getElementById('inv-container').value = inv.container_details || '';
  document.getElementById('inv-num-pkgs').value = inv.num_packages || '';
  document.getElementById('inv-net-wt').value = inv.net_weight || '';
  document.getElementById('inv-gross-wt').value = inv.gross_weight || '';
  document.getElementById('inv-product-notes').value = inv.product_notes || '';

  // Clear existing product rows and load saved items
  document.getElementById('invoice-product-list').innerHTML = '';
  invoiceProductCounter = 0;
  items.forEach(item => {
    addInvoiceProductRow({
      product_name: item.product_name || '',
      hsn_code: item.hsn_code || '',
      marks: item.marks || '',
      description: item.description || '',
      unit: item.unit || 'PCS',
      quantity: item.quantity || '',
      price: item.price || '',
      packaging_type: '',
      unit_weight: 0,
      packing_qty: 0
    });
  });

  updateInvoiceTotal();

  // Remember the invoice ID so download will UPDATE instead of INSERT
  editingInvoiceId = id;

  showToast('Invoice loaded for editing. Make changes and download again.');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Currency Change Handler =====
function onCurrencyChange() {
  updateInvoiceTotal();
  document.querySelectorAll('#invoice-product-list .product-item').forEach(row => {
    const id = parseInt(row.id.replace('inv-prod-', ''));
    updateInvoiceProductAmount(id);
  });
}

// ========================================
// EXPORTER SETTINGS (Supabase-backed)
// ========================================

let cachedExporter = {}; // In-memory cache for buildInvoiceObject

async function saveExporter() {
  const data = {
    name: document.getElementById('exp-name').value.trim(),
    address_line1: document.getElementById('exp-addr1').value.trim(),
    address_line2: document.getElementById('exp-addr2').value.trim(),
    country: document.getElementById('exp-country').value.trim(),
    pan: document.getElementById('exp-pan').value.trim(),
    iec: document.getElementById('exp-iec').value.trim(),
    gstin: document.getElementById('exp-gstin').value.trim(),
    state_code: document.getElementById('exp-statecode').value.trim(),
    ad_code: document.getElementById('exp-adcode').value.trim(),
    enduse_code: document.getElementById('exp-enduse').value.trim()
  };

  if (!data.name) { showToast('Company name is required', true); return; }

  await db.saveExporter(data);
  cachedExporter = data;
  showToast('Exporter details saved!');
}

async function loadExporter() {
  const data = await db.getExporter();
  if (!data) return;
  cachedExporter = data;
  if (data.name) document.getElementById('exp-name').value = data.name;
  if (data.address_line1) document.getElementById('exp-addr1').value = data.address_line1;
  if (data.address_line2) document.getElementById('exp-addr2').value = data.address_line2;
  if (data.country) document.getElementById('exp-country').value = data.country;
  if (data.pan) document.getElementById('exp-pan').value = data.pan;
  if (data.iec) document.getElementById('exp-iec').value = data.iec;
  if (data.gstin) document.getElementById('exp-gstin').value = data.gstin;
  if (data.state_code) document.getElementById('exp-statecode').value = data.state_code;
  if (data.ad_code) document.getElementById('exp-adcode').value = data.ad_code;
  if (data.enduse_code) document.getElementById('exp-enduse').value = data.enduse_code;
}
