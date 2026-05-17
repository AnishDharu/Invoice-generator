/**
 * Supabase Configuration & Database Helper
 * 
 * Falls back to localStorage when Supabase is not configured.
 * To enable cloud storage:
 * 1. Create a free project at https://supabase.com
 * 2. Run the SQL from schema.sql in the SQL Editor
 * 3. Replace the placeholder values below
 */

// ========== CREDENTIALS ==========
const SUPABASE_URL = 'https://lgzzmrgtertzftfzpfvm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnenptcmd0ZXJ0emZ0ZnpwZnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzU5MjEsImV4cCI6MjA5MzgxMTkyMX0.SjFSLrGJn9re0g5iB1yXmo9q0DDyG3GUYfUtC4AV4SU';

// ========== COMPANY INFO ==========
const COMPANY_INFO = {
  name: 'Your Company Name',
  address: 'Your Company Address',
  city: 'City, State, PIN',
  country: 'India',
  gstin: 'XXXXXXXXXXXX',
  iec: 'XXXXXXXXXX',
  pan: 'XXXXXXXXXX',
  email: 'info@company.com',
  phone: '+91 XXXXXXXXXX',
  stateCode: '27-Maharashtra',
  endUseCode: 'GNX100',
  bankName: 'Bank Name',
  bankBranch: 'Branch Name',
  accountNo: 'XXXXXXXXXXXX',
  ifscCode: 'XXXXXXXXXXX',
  swiftCode: 'XXXXXXXXXXX'
};

// ========== INITIALIZATION ==========
const isSupabaseConfigured = !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
let supabaseClient = null;

if (isSupabaseConfigured && typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ========== DATABASE LAYER ==========
const db = {

  // --- Consignees ---
  async getConsignees() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('consignees').select('*').order('name');
      if (!error) return data || [];
      console.error('Supabase error:', error);
    }
    return this._localGet('consignees');
  },
  async addConsignee(consignee) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('consignees').insert(consignee).select().single();
      if (!error) return data;
      console.error('Supabase error:', error);
    }
    return this._localAdd('consignees', consignee);
  },
  async updateConsignee(id, updates) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('consignees').update(updates).eq('id', id).select().single();
      if (!error) return data;
      console.error('Supabase error:', error);
    }
    return this._localUpdate('consignees', id, updates);
  },
  async deleteConsignee(id) {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('consignees').delete().eq('id', id);
      if (!error) return true;
      console.error('Supabase error:', error);
    }
    return this._localDelete('consignees', id);
  },

  // --- Product Master ---
  async getProducts() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('products').select('*').order('name');
      if (!error) return data || [];
      console.error('Supabase error:', error);
    }
    return this._localGet('products');
  },
  async addProduct(product) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('products').insert(product).select().single();
      if (!error) return data;
      console.error('Supabase error:', error);
    }
    return this._localAdd('products', product);
  },
  async updateProduct(id, updates) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('products').update(updates).eq('id', id).select().single();
      if (!error) return data;
      console.error('Supabase error:', error);
    }
    return this._localUpdate('products', id, updates);
  },
  async deleteProduct(id) {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('products').delete().eq('id', id);
      if (!error) return true;
      console.error('Supabase error:', error);
    }
    return this._localDelete('products', id);
  },

  // --- Invoices ---
  async getInvoices() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('invoices').select('*').order('created_at', { ascending: false });
      if (!error) return data || [];
      console.error('Supabase error:', error);
    }
    return this._localGet('invoices').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async addInvoice(invoice) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('invoices').insert(invoice).select().single();
      if (!error) return data;
      // Show visible error so user knows what went wrong
      console.error('Supabase addInvoice error:', error);
      if (typeof showToast === 'function') showToast('DB save failed: ' + error.message, true);
      throw new Error(error.message);
    }
    return this._localAdd('invoices', invoice);
  },
  async getInvoiceItems(invoiceId) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('invoice_items').select('*').eq('invoice_id', invoiceId);
      if (!error) return data || [];
      console.error('Supabase error:', error);
    }
    return this._localGetFiltered('invoice_items', 'invoice_id', invoiceId);
  },
  async addInvoiceItems(items) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('invoice_items').insert(items).select();
      if (!error) return data;
      console.error('Supabase addInvoiceItems error:', error);
      if (typeof showToast === 'function') showToast('DB items save failed: ' + error.message, true);
      throw new Error(error.message);
    }
    return items.map(item => this._localAdd('invoice_items', item));
  },

  async getNextInvoiceNumber() {
    let lastNum = 0;
    if (supabaseClient) {
      const { data } = await supabaseClient.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) lastNum = parseInt(data[0].invoice_number.replace(/\D/g, '')) || 0;
    } else {
      const invoices = this._localGet('invoices');
      if (invoices.length > 0) lastNum = Math.max(...invoices.map(inv => parseInt(inv.invoice_number.replace(/\D/g, '')) || 0));
    }
    return `INV-${String(lastNum + 1).padStart(5, '0')}`;
  },

  // --- Exporter (single row — upsert pattern) ---
  async getExporter() {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('exporter').select('*').limit(1).single();
      if (!error && data) return data;
      if (error && error.code !== 'PGRST116') console.error('Supabase error:', error); // PGRST116 = no rows
    }
    // fallback to localStorage
    return JSON.parse(localStorage.getItem('exporterSettings') || 'null');
  },
  async saveExporter(exporterData) {
    if (supabaseClient) {
      // Check if a row already exists
      const { data: existing } = await supabaseClient.from('exporter').select('id').limit(1).single();
      if (existing) {
        // Update existing row
        const { data, error } = await supabaseClient.from('exporter').update(exporterData).eq('id', existing.id).select().single();
        if (!error) return data;
        console.error('Supabase error:', error);
      } else {
        // Insert first row
        const { data, error } = await supabaseClient.from('exporter').insert(exporterData).select().single();
        if (!error) return data;
        console.error('Supabase error:', error);
      }
    }
    // fallback to localStorage
    localStorage.setItem('exporterSettings', JSON.stringify(exporterData));
    return exporterData;
  },

  // --- localStorage helpers ---
  _localGet(table) {
    return JSON.parse(localStorage.getItem(`iieg_${table}`) || '[]');
  },
  _localAdd(table, item) {
    const items = this._localGet(table);
    item.id = item.id || crypto.randomUUID();
    item.created_at = item.created_at || new Date().toISOString();
    items.push(item);
    localStorage.setItem(`iieg_${table}`, JSON.stringify(items));
    return item;
  },
  _localUpdate(table, id, updates) {
    const items = this._localGet(table);
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates };
      localStorage.setItem(`iieg_${table}`, JSON.stringify(items));
      return items[idx];
    }
    return null;
  },
  _localDelete(table, id) {
    const items = this._localGet(table).filter(i => i.id !== id);
    localStorage.setItem(`iieg_${table}`, JSON.stringify(items));
    return true;
  },
  _localGetFiltered(table, key, value) {
    return this._localGet(table).filter(i => i[key] === value);
  }
};
