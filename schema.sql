CREATE TABLE consignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  address_line3 TEXT,
  address_line4 TEXT,
  lan_no TEXT,
  country TEXT,
  gst_tax_id TEXT,
  notify_name TEXT,
  notify_address_line1 TEXT,
  notify_address_line2 TEXT,
  notify_address_line3 TEXT,
  notify_address_line4 TEXT,
  notify_lan_no TEXT,
  payment_terms TEXT,
  delivery_terms TEXT,
  ad_code TEXT,
  destination TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hsn_code TEXT,
  unit TEXT DEFAULT 'PCS',
  marks TEXT,
  description TEXT,
  packaging_type TEXT DEFAULT 'Bottle',
  unit_weight NUMERIC,
  packing_qty INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  consignee_id UUID REFERENCES consignees(id),
  -- Exporter snapshot
  exporter_name TEXT,
  exporter_address TEXT,
  exporter_city TEXT,
  exporter_country TEXT,
  exporter_pan TEXT,
  exporter_iec TEXT,
  exporter_gstin TEXT,
  exporter_ad_code TEXT,
  exporter_state_code TEXT,
  exporter_enduse_code TEXT,
  -- Consignee snapshot
  customer_name TEXT,
  cons_addr1 TEXT,
  cons_addr2 TEXT,
  cons_addr3 TEXT,
  cons_addr4 TEXT,
  cons_lan_no TEXT,
  customer_gst TEXT,
  -- Notify party snapshot
  notify_name TEXT,
  notify_addr1 TEXT,
  notify_addr2 TEXT,
  notify_addr3 TEXT,
  notify_addr4 TEXT,
  notify_lan_no TEXT,
  -- Trade terms
  payment_terms TEXT,
  delivery_terms TEXT,
  destination TEXT,
  currency TEXT DEFAULT 'USD',
  total_amount NUMERIC DEFAULT 0,
  -- Shipping
  supplier_ref TEXT,
  despatched_through TEXT,
  container_details TEXT,
  num_packages TEXT,
  net_weight TEXT,
  gross_weight TEXT,
  product_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  hsn_code TEXT,
  marks TEXT,
  description TEXT,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'PCS',
  price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exporter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  country TEXT DEFAULT 'INDIA',
  pan TEXT,
  iec TEXT,
  gstin TEXT,
  state_code TEXT,
  ad_code TEXT,
  enduse_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exporter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on consignees" ON consignees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exporter" ON exporter FOR ALL USING (true) WITH CHECK (true);
