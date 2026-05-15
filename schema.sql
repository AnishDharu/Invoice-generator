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
  customer_name TEXT,
  customer_address TEXT,
  customer_country TEXT,
  customer_gst TEXT,
  notify_party TEXT,
  payment_terms TEXT,
  delivery_terms TEXT,
  ad_code TEXT,
  destination TEXT,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
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

ALTER TABLE consignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on consignees" ON consignees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
