/**
 * Template-Based Excel Export
 * Loads INVOICE PL.xlsx as template, overwrites cells with invoice data, exports.
 * All formatting (borders, merges, fonts, alignment) comes from the template.
 *
 * Cell Mapping:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ EXPORTER (rows 3-8)        │ INVOICE DETAILS (rows 3-8)           │
 * │ A4: Company Name           │ D4: Invoice No    │ F4: Date         │
 * │ A5: Address Line 1         │ D6: Payment Terms │ F6: Delivery     │
 * │ A6: Address Line 2         │ D8: Supplier Ref  │                  │
 * │ A7: Country                │                   │                  │
 * ├─────────────────────────────┼──────────────────────────────────────┤
 * │ CONSIGNEE (rows 9-13)      │ PAN/GST/AD/IEC from EXPORTER        │
 * │ A10: Name                  │ D10: PAN (exp)    │ F10: GST (cons)  │
 * │ A11: Addr1                 │ D12: AD-CODE(exp) │ F12: IEC (exp)   │
 * │ A12: Addr2                 │                   │                  │
 * │ A13: Addr3  C13: LAN NO    │                   │                  │
 * ├─────────────────────────────┼──────────────────────────────────────┤
 * │ NOTIFY (rows 14-18)        │ D14: Despatched   │ F14: Destination │
 * │ A15: Name                  │ D16: Enduse(exp)  │ F16: State(exp)  │
 * │ A16: Addr1                 │ F17: Container    │                  │
 * │ A17: Addr2  C18: LAN NO    │                   │                  │
 * │ A18: Addr3                 │                   │                  │
 * └─────────────────────────────────────────────────────────────────────┘
 */

async function exportToExcel(invoice, items) {
  const total = items.reduce((s, i) => s + (i.quantity * i.price), 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const currSym = invoice.currency || 'USD';
  const dateStr = new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // ══════════ 1. LOAD TEMPLATE ══════════
  const response = await fetch('/INVOICE PL.xlsx');
  if (!response.ok) throw new Error('Template not found! Make sure INVOICE PL.xlsx exists.');
  const arrayBuffer = await response.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.getWorksheet(1);

  // ══════════ 2. EXPORTER DETAILS (rows 4-7) ══════════
  ws.getCell('A4').value = invoice.exporter_name;
  ws.getCell('A5').value = invoice.exporter_address;
  ws.getCell('A6').value = invoice.exporter_city;
  ws.getCell('A7').value = invoice.exporter_country;

  // ══════════ 3. INVOICE HEADER (right panel rows 4-8) ══════════
  ws.getCell('D4').value = invoice.invoice_number;
  ws.getCell('F4').value = dateStr;
  ws.getCell('D6').value = invoice.payment_terms || '';
  ws.getCell('F6').value = invoice.delivery_terms || '';
  ws.getCell('D8').value = invoice.supplier_ref || '';

  // ══════════ 4. CONSIGNEE (rows 10-13) ══════════
  ws.getCell('A10').value = invoice.customer_name;
  ws.getCell('A11').value = invoice.cons_addr1;
  ws.getCell('A12').value = invoice.cons_addr2;
  ws.getCell('A13').value = invoice.cons_addr3;
  // LAN NO in C13 (combine addr4 + LAN)
  const consC13 = [ invoice.cons_lan_no ? `LAN NO: ${invoice.cons_lan_no}` : ''].filter(Boolean).join('    ');
  ws.getCell('C13').value = consC13;

  // PAN, GST, AD-CODE, IEC (from EXPORTER)
  ws.getCell('D10').value = invoice.exporter_pan;
  ws.getCell('F10').value = invoice.exporter_gstin;
  ws.getCell('D12').value = invoice.exporter_ad_code;
  ws.getCell('F12').value = invoice.exporter_iec;

  // ══════════ 5. NOTIFY PARTY (rows 14-18) ══════════
  ws.getCell('D14').value = invoice.despatched_through || '';
  ws.getCell('F14').value = invoice.destination || '';
  ws.getCell('A15').value = invoice.notify_name;
  ws.getCell('A16').value = invoice.notify_addr1;
  ws.getCell('A17').value = invoice.notify_addr2;
  ws.getCell('A18').value = invoice.notify_addr3;
  // LAN NO in C18 (combine addr4 + LAN)
  const notifyC18 = [ invoice.notify_lan_no ? `LAN NO: ${invoice.notify_lan_no}` : ''].filter(Boolean).join('    ');
  ws.getCell('C18').value = notifyC18;

  // Enduse code & State code (from EXPORTER)
  ws.getCell('D16').value = invoice.exporter_enduse_code;
  ws.getCell('F16').value = invoice.exporter_state_code;

  // Container
  ws.getCell('F17').value = invoice.container_details || '';

  // Currency labels
  ws.getCell('F20').value = currSym;
  ws.getCell('G20').value = currSym;

  // ══════════ 6. CLEAR PRODUCT AREA (rows 21-42) ══════════
  for (let row = 21; row <= 42; row++)
    for (let c = 1; c <= 7; c++)
      ws.getCell(row, c).value = '';

  // ══════════ 7. FILL PRODUCT ROWS (starting row 23) ══════════
  items.forEach((item, i) => {
    if (i >= 20) return;
    const row = 23 + i;
    const amt = item.quantity * item.price;

    ws.getCell(row, 1).value = (i === 0) ? (item.marks || '') : '';
    if (i === 0) ws.getCell(row, 2).value = invoice.num_packages ? invoice.num_packages.split(' ')[0] || '' : '';
    if (i === 1) ws.getCell(row, 2).value = invoice.num_packages ? invoice.num_packages.split(' ').slice(1).join(' ') || '' : '';
    const descCell = ws.getCell(row, 3);
    descCell.value = item.description ? `${item.product_name} ${item.description}` : item.product_name;
    descCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getCell(row, 4).value = item.hsn_code || '';
    ws.getCell(row, 5).value = item.quantity;
    ws.getCell(row, 5).numFmt = '#,##0.00';
    ws.getCell(row, 6).value = item.price;
    ws.getCell(row, 6).numFmt = '#,##0.00';
    ws.getCell(row, 7).value = amt;
    ws.getCell(row, 7).numFmt = '#,##0.00';
  });

  // Product notes
  if (invoice.product_notes) {
    const notesStart = 23 + items.length + 3;
    invoice.product_notes.split('\n').forEach((line, i) => {
      const row = notesStart + i;
      if (row <= 42) ws.getCell(row, 3).value = line.trim();
    });
  }

  // ══════════ 8. FOOTER ══════════
  const incText = `INCOTERM 2020 ${invoice.delivery_terms || 'C&F'} ${invoice.destination || ''}`.trim();
  ws.getCell('C43').value = incText;
  ws.getCell('E43').value = totalQty;
  ws.getCell('E43').numFmt = '#,##0.00';
  ws.getCell('G43').value = total;
  ws.getCell('G43').numFmt = '#,##0.00';

  const amtWords = `${getCurrencyName(invoice.currency)} : ${numberToWords(total).toUpperCase()}`;
  ws.getCell('A45').value = amtWords;

  ws.getCell('B47').value = parseFloat(invoice.net_weight) || 0;
  ws.getCell('B47').numFmt = '#,##0.00';
  ws.getCell('B48').value = parseFloat(invoice.gross_weight) || 0;
  ws.getCell('B48').numFmt = '#,##0.00';

  ws.getCell('F57').value = `For ${invoice.exporter_name}`;

  // ══════════ 9. EXPORT ══════════
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${invoice.invoice_number}.xlsx`);
}
