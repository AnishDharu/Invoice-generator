/**
 * Invoice Helpers — Currency, Number-to-Words, HTML Preview
 */

function getCurrencySymbol(c) { return c === 'INR' ? '₹' : '$'; }
function getCurrencyName(c) { return c === 'INR' ? 'INDIAN RUPEES' : 'UNITED STATE DOLLARS'; }

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and ' + convert(n%100) : '');
    if (n < 100000) return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + convert(n%1000) : '');
    if (n < 10000000) return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + convert(n%100000) : '');
    return convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + convert(n%10000000) : '');
  }
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = convert(intPart);
  if (decPart > 0) result += ' AND CENT ' + convert(decPart);
  return result + ' ONLY.';
}

function generateInvoicePreview(invoice, items) {
  const sym = getCurrencySymbol(invoice.currency);
  const currSym = invoice.currency;
  const total = items.reduce((s, i) => s + (i.quantity * i.price), 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const dateStr = new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let itemRows = '';
  items.forEach((item, i) => {
    const amt = item.quantity * item.price;
    const desc = item.description ? `<strong>${item.product_name}</strong> ${item.description}` : `<strong>${item.product_name}</strong>`;
    itemRows += `<tr>
      <td>${item.marks || ''}</td>
      <td>${i === 0 ? (invoice.num_packages || '') : ''}</td>
      <td>${desc}</td>
      <td style="text-align:center">${item.hsn_code || ''}</td>
      <td style="text-align:right">${item.quantity.toFixed(2)}</td>
      <td style="text-align:right">${parseFloat(item.price).toFixed(2)}</td>
      <td style="text-align:right">${amt.toFixed(2)}</td>
    </tr>`;
  });

  let notesHtml = '';
  if (invoice.product_notes) {
    invoice.product_notes.split('\n').filter(l => l.trim()).forEach(line => {
      notesHtml += `<tr><td></td><td></td><td colspan="5" style="font-size:10px">${line.trim()}</td></tr>`;
    });
  }

  return `
  <div class="invoice-paper">
    <div class="inv-header"><h2>COMMERCIAL INVOICE</h2></div>
    <div class="inv-grid-2">
      <div class="inv-box">
        <div class="inv-label">Exporter:</div>
        <strong>${COMPANY_INFO.name}</strong><br>${COMPANY_INFO.address}<br>${COMPANY_INFO.city}<br>${COMPANY_INFO.country}
      </div>
      <div class="inv-box">
        <table class="inv-detail-table">
          <tr><td class="inv-label">Invoice No</td><td class="inv-label">Dated</td></tr>
          <tr><td>${invoice.invoice_number}</td><td>${dateStr}</td></tr>
          <tr><td class="inv-label">TERMS OF PAYMENT</td><td class="inv-label">Terms of Delivery</td></tr>
          <tr><td>${invoice.payment_terms || ''}</td><td>${invoice.delivery_terms || ''}</td></tr>
          <tr><td class="inv-label">Supplier's Ref</td><td class="inv-label">Date</td></tr>
          <tr><td>${invoice.supplier_ref || ''}</td><td></td></tr>
        </table>
      </div>
    </div>
    <div class="inv-grid-2">
      <div class="inv-box">
        <div class="inv-label">Consignee:</div>
        <strong>${invoice.customer_name}</strong><br>
        ${(invoice.customer_address || '').replace(/\\n/g, '<br>').replace(/\n/g, '<br>')}<br>
      </div>
      <div class="inv-box">
        <table class="inv-detail-table">
          <tr><td class="inv-label">PAN NO</td><td class="inv-label">GST NO</td></tr>
          <tr><td>${COMPANY_INFO.pan}</td><td>${invoice.customer_gst || ''}</td></tr>
          <tr><td class="inv-label">AD-CODE</td><td class="inv-label">IEC CODE</td></tr>
          <tr><td>${invoice.ad_code || ''}</td><td>${COMPANY_INFO.iec}</td></tr>
          <tr><td class="inv-label">Despatched through</td><td class="inv-label">Destination</td></tr>
          <tr><td>${invoice.despatched_through || ''}</td><td>${invoice.destination || ''}</td></tr>
        </table>
      </div>
    </div>
    <div class="inv-grid-2">
      <div class="inv-box">
        <div class="inv-label">Notify Party:</div>
        ${(invoice.notify_party || invoice.customer_name).replace(/\\n/g, '<br>').replace(/\n/g, '<br>')}
      </div>
      <div class="inv-box">
        <table class="inv-detail-table">
          <tr><td class="inv-label">Enduse code</td><td class="inv-label">State Code</td></tr>
          <tr><td>${COMPANY_INFO.endUseCode || ''}</td><td>${COMPANY_INFO.stateCode || ''}</td></tr>
          <tr><td colspan="2">${invoice.container_details || ''}</td></tr>
        </table>
      </div>
    </div>
    <table class="inv-table">
      <thead>
        <tr>
          <th style="width:65px">Marks &<br>Nos.</th>
          <th style="width:65px">No. & Kind<br>of Pkgs.</th>
          <th>Description of Goods</th>
          <th style="width:70px">HS CODE</th>
          <th style="width:65px">QUANTITY<br><small>CARTONS</small></th>
          <th style="width:70px">RATE / DOZ<br><small>${currSym}</small></th>
          <th style="width:80px">AMOUNT<br><small>${currSym}</small></th>
        </tr>
      </thead>
      <tbody>${itemRows}${notesHtml}</tbody>
      <tfoot>
        <tr class="inv-total-row">
          <td colspan="2"></td>
          <td style="font-size:10px">INCOTERM 2020 ${invoice.delivery_terms || ''} ${invoice.destination || ''}</td>
          <td></td>
          <td style="text-align:right"><strong>${totalQty.toFixed(2)}</strong></td>
          <td></td>
          <td style="text-align:right"><strong>${total.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
    <div class="inv-box" style="margin-top:6px">
      <div class="inv-label">Amount Chargable ( in words )</div>
      <strong>${getCurrencyName(invoice.currency)} : ${numberToWords(total).toUpperCase()}</strong>
    </div>
    <div class="inv-box" style="margin-top:6px">
      <strong>NET WT:</strong> ${invoice.net_weight || '0.00'} &nbsp;&nbsp;
      <strong>GROSS WT:</strong> ${invoice.gross_weight || '0.00'}
    </div>
    <div class="inv-box" style="margin-top:6px; font-size:9px; line-height:1.6">
      SUPPLY MEANT FOR EXPORT UNDER LETTER OF UNDERTAKING WITHOUT PAYMENT OF IGST.<br>
      Application Reference Number (ARN) is AD27032417409Y Dated 25/03/2024<br><br>
      EXPORT UNDER DUTY DRAWBACK<br>
      WE INTEND TO CLAIM REWARDS UNDER REMISSION OF DUTIES AND TAKES ON EXPORTED PRODUCTS (RoDTEP) SCHEME.
    </div>
    <div class="inv-grid-2" style="margin-top:6px">
      <div class="inv-box" style="font-size:9px">
        WE HEREBY DECLARE THAT WE WILL AVAIL<br>
        BENEFIT OF CHAPTER 3 OF FOREIGN TRADE POLICY<br><br>
        <strong>Declaration:</strong><br>
        We declare that this invoice shows the actual price of the goods described
        and that all particulars are true and correct.
      </div>
      <div class="inv-box" style="text-align:right">
        <strong>For ${COMPANY_INFO.name}</strong>
        <br><br><br><br>
        <strong>Authorised Signatory</strong>
      </div>
    </div>
  </div>`;
}
