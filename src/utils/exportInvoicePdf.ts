/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Lights Pakistan Commercial Invoice & Receipt PDF Exporter
 * Generates high-fidelity, audit-ready vector PDF sales order invoices, delivery receipts,
 * and bulk multi-order consolidated dispatch bundles.
 */

import jsPDF from 'jspdf';
import { Customer, SalesOrder } from '../types';

export interface InvoicePdfItem {
  skuCode?: string;
  skuName: string;
  category?: string;
  specification?: string;
  cartons?: number;
  packs?: number;
  quantity: number; // in pcs
  unitPrice: number;
  discountPercent?: number;
  lineTotal: number;
}

export interface InvoicePdfOptions {
  customer: Customer;
  order: SalesOrder | {
    id?: string;
    orderNumber: string;
    orderDate?: string;
    createdAt?: string;
    salesUserName?: string;
    paymentMode?: string;
    status?: string;
    notes?: string;
    totalAmount: number;
    subtotal?: number;
    discountAmount?: number;
    taxAmount?: number;
    items?: any[];
  };
  customItems?: InvoicePdfItem[];
  previousBalance?: number;
  projectedBalance?: number;
  preparedByName?: string;
  remarks?: string;
}

export interface GeneratedPdfResult {
  success: boolean;
  filename: string;
  blob: Blob;
  dataUrl: string;
  doc: jsPDF;
  pageCount: number;
  totalAmount?: number;
}

/**
 * Normalizes item lines and computes financial and carton tallies
 */
export const extractInvoiceMetrics = (options: InvoicePdfOptions) => {
  const { customer, order, customItems } = options;
  const previousBalance = options.previousBalance ?? (customer.currentBalance || customer.openingBalance || 0);

  const items: InvoicePdfItem[] = (customItems || (order.items as any[]) || []).map((item: any) => {
    const qty = Number(item.quantity || item.orderedQuantity || 0);
    const price = Number(item.unitPrice || item.rate || 0);
    const disc = Number(item.discountPercent || 0);
    const lineTotal = Number(item.lineTotal || (qty * price * (1 - disc / 100)));

    const cartons = item.cartons !== undefined 
      ? Number(item.cartons) 
      : item.cartonQty !== undefined 
      ? Number(item.cartonQty) 
      : Math.floor(qty / (item.unitsPerCartonSnapshot || 100));

    const packs = item.packs !== undefined 
      ? Number(item.packs) 
      : item.packQty !== undefined 
      ? Number(item.packQty) 
      : qty % (item.unitsPerCartonSnapshot || 100);

    return {
      skuCode: item.skuCode || item.skuId || item.id || 'NL-SKU',
      skuName: item.skuName || item.name || item.description || 'LED Commercial Lighting',
      category: item.category || '',
      specification: item.specification || '',
      cartons,
      packs,
      quantity: qty,
      unitPrice: price,
      discountPercent: disc,
      lineTotal,
    };
  });

  const grossSubtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const netTotal = order.totalAmount || items.reduce((sum, i) => sum + i.lineTotal, 0);
  const totalDiscount = grossSubtotal > netTotal ? grossSubtotal - netTotal : (order.discountAmount || 0);
  const totalCartons = items.reduce((sum, i) => sum + (i.cartons || 0), 0);
  const totalPacks = items.reduce((sum, i) => sum + (i.packs || 0), 0);
  const totalQuantityPcs = items.reduce((sum, i) => sum + i.quantity, 0);

  const finalProjectedBalance = options.projectedBalance !== undefined 
    ? options.projectedBalance 
    : (previousBalance + netTotal);

  return {
    items,
    grossSubtotal,
    netTotal,
    totalDiscount,
    totalCartons,
    totalPacks,
    totalQuantityPcs,
    previousBalance,
    finalProjectedBalance,
  };
};

/**
 * Internal helper to draw a single invoice document into a jsPDF instance
 */
const renderInvoiceOnDoc = (
  doc: jsPDF,
  options: InvoicePdfOptions,
  isAppendedPage = false
) => {
  if (isAppendedPage) {
    doc.addPage();
  }

  const {
    customer,
    order,
    preparedByName = order.salesUserName || 'Field Sales Officer',
    remarks = order.notes || '',
  } = options;

  const {
    items,
    grossSubtotal,
    netTotal,
    totalDiscount,
    totalCartons,
    totalPacks,
    totalQuantityPcs,
    previousBalance,
    finalProjectedBalance,
  } = extractInvoiceMetrics(options);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;
  const pageStartDocIndex = doc.getNumberOfPages();

  const drawHeader = () => {
    // Top Primary Accent Bar (National Lights Deep Emerald/Teal & Warm Gold)
    doc.setFillColor(0, 107, 95); // #006b5f
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFillColor(217, 163, 38); // Warm Gold Accent Line
    doc.rect(0, 5, pageWidth, 1.2, 'F');

    currentY = 12;

    // Company Brand Name & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 20, 40); // Dark Navy
    doc.text('NATIONAL LIGHTS (PVT) LTD.', margin, currentY);

    // Tagline / Subheading
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text(
      'Illuminating Innovation — Commercial, Industrial & Architectural LED Lighting',
      margin,
      currentY
    );

    // Right-aligned Corporate Credentials
    doc.setFontSize(7.5);
    doc.setTextColor(60, 70, 80);
    doc.text('NTN: 2894102-7 | STRN: 03-00-2894-102-7', pageWidth - margin, 12, { align: 'right' });
    doc.text('UAN: +92 42 111-654-000 | Ph: 091-2212700', pageWidth - margin, 16, { align: 'right' });
    doc.text('Brandreth Rd, Lahore | Reg. Office: Peshawar KPK', pageWidth - margin, 20, { align: 'right' });

    currentY += 3;
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // Title Banner
    currentY += 4;
    doc.setFillColor(242, 248, 246); // Very light mint
    doc.setDrawColor(0, 107, 95);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, currentY, contentWidth, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 107, 95);
    doc.text('COMMERCIAL SALES INVOICE & DELIVERY ORDER RECEIPT', margin + 3, currentY + 5.2);

    const invoiceCode = (order.orderNumber || 'ORD-0000').replace('ORD-', 'INV-');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 20, 40);
    doc.text(`DOC #: ${invoiceCode}`, pageWidth - margin - 3, currentY + 5.2, { align: 'right' });

    currentY += 11;
  };

  const drawFooter = (pgNum: number, totalPgs: number) => {
    const footY = pageHeight - 8;
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, footY - 3, pageWidth - margin, footY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(140, 150, 160);
    doc.text(
      'Official System Generated Commercial Document • National Lights Enterprise System • Peshawar & Lahore',
      margin,
      footY
    );
    doc.text(
      `Page ${pgNum} of ${totalPgs || '1'}`,
      pageWidth - margin,
      footY,
      { align: 'right' }
    );
  };

  // Draw Page 1 Header
  drawHeader();

  // -------------------------------------------------------------
  // CUSTOMER & ORDER PARTICULARS BOXES
  // -------------------------------------------------------------
  const boxHeight = 31;
  const boxWidth = (contentWidth - 4) / 2;

  // Left Box: Customer Info
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFillColor(235, 242, 240);
  doc.rect(margin, currentY, boxWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 107, 95);
  doc.text('CUSTOMER / DEALER INFORMATION', margin + 3, currentY + 4);

  let custY = currentY + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.companyName || 'Valued Customer', margin + 3, custY);

  custY += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Code: ${customer.customerCode || 'CUST-001'}  |  Type: ${(customer as any).customerType || 'Authorized Dealer'}`, margin + 3, custY);

  custY += 4;
  doc.text(`Town / City: ${customer.town || customer.city || 'Regional Outlet'}, Pakistan`, margin + 3, custY);

  custY += 4;
  doc.text(`Phone: ${customer.phone || '—'}  |  Contact: ${customer.contactPerson || 'Proprietor'}`, margin + 3, custY);

  custY += 4;
  doc.text(`Credit Limit: Rs. ${(customer.creditLimit || 0).toLocaleString()} PKR`, margin + 3, custY);

  // Right Box: Order & Commercial Info
  const rightBoxX = margin + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFillColor(235, 242, 240);
  doc.rect(rightBoxX, currentY, boxWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 107, 95);
  doc.text('ORDER & INVOICE PARTICULARS', rightBoxX + 3, currentY + 4);

  let ordY = currentY + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Order Ref:', rightBoxX + 3, ordY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.orderNumber || 'ORD-0000', rightBoxX + 28, ordY);

  ordY += 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Date Issued:', rightBoxX + 3, ordY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const rawDate = order.orderDate || (order.createdAt ? order.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  doc.text(rawDate, rightBoxX + 28, ordY);

  ordY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Booked By:', rightBoxX + 3, ordY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(preparedByName, rightBoxX + 28, ordY);

  ordY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Payment Terms:', rightBoxX + 3, ordY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text((order as any).paymentMode || 'CREDIT (30 DAYS)', rightBoxX + 28, ordY);

  ordY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Approval Status:', rightBoxX + 3, ordY);
  const isApproved = order.status === 'APPROVED';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isApproved ? 16 : 180, isApproved ? 120 : 83, isApproved ? 54 : 9);
  doc.text(isApproved ? 'AUTHORIZED / APPROVED' : 'PENDING (Shahzad Ullah)', rightBoxX + 28, ordY);

  currentY += boxHeight + 6;

  // -------------------------------------------------------------
  // SKU ITEMS TABLE
  // -------------------------------------------------------------
  const colWidths = {
    sr: 8,
    sku: 28,
    desc: 56,
    carton: 16,
    pack: 14,
    qty: 18,
    rate: 22,
    amount: 24,
  };

  const colPositions = {
    sr: margin,
    sku: margin + colWidths.sr,
    desc: margin + colWidths.sr + colWidths.sku,
    carton: margin + colWidths.sr + colWidths.sku + colWidths.desc,
    pack: margin + colWidths.sr + colWidths.sku + colWidths.desc + colWidths.carton,
    qty: margin + colWidths.sr + colWidths.sku + colWidths.desc + colWidths.carton + colWidths.pack,
    rate: margin + colWidths.sr + colWidths.sku + colWidths.desc + colWidths.carton + colWidths.pack + colWidths.qty,
    amount: margin + colWidths.sr + colWidths.sku + colWidths.desc + colWidths.carton + colWidths.pack + colWidths.qty + colWidths.rate,
  };

  const drawTableHeader = () => {
    doc.setFillColor(0, 107, 95); // Deep Teal
    doc.rect(margin, currentY, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);

    doc.text('#', colPositions.sr + 2, currentY + 4.8);
    doc.text('SKU Code', colPositions.sku + 2, currentY + 4.8);
    doc.text('Product Description', colPositions.desc + 2, currentY + 4.8);
    doc.text('Cartons', colPositions.carton + colWidths.carton - 2, currentY + 4.8, { align: 'right' });
    doc.text('Packs', colPositions.pack + colWidths.pack - 2, currentY + 4.8, { align: 'right' });
    doc.text('Qty (Pcs)', colPositions.qty + colWidths.qty - 2, currentY + 4.8, { align: 'right' });
    doc.text('Rate (PKR)', colPositions.rate + colWidths.rate - 2, currentY + 4.8, { align: 'right' });
    doc.text('Amount (PKR)', colPositions.amount + colWidths.amount - 2, currentY + 4.8, { align: 'right' });

    currentY += 7;
  };

  drawTableHeader();

  let currentPageNum = 1;
  const rowHeight = 6.5;

  items.forEach((item, index) => {
    if (currentY + rowHeight > pageHeight - 55) {
      doc.addPage();
      currentPageNum += 1;
      drawHeader();
      drawTableHeader();
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 252, 252);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(235, 240, 245);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);

    doc.text(String(index + 1), colPositions.sr + 2, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text(item.skuCode || 'NL-SKU', colPositions.sku + 2, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    const cleanDesc = item.skuName.length > 32 ? item.skuName.slice(0, 30) + '...' : item.skuName;
    doc.text(cleanDesc, colPositions.desc + 2, currentY + 4.5);

    doc.text(item.cartons ? String(item.cartons) : '—', colPositions.carton + colWidths.carton - 2, currentY + 4.5, { align: 'right' });
    doc.text(item.packs ? String(item.packs) : '—', colPositions.pack + colWidths.pack - 2, currentY + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(item.quantity.toLocaleString(), colPositions.qty + colWidths.qty - 2, currentY + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), colPositions.rate + colWidths.rate - 2, currentY + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(item.lineTotal.toLocaleString(), colPositions.amount + colWidths.amount - 2, currentY + 4.5, { align: 'right' });

    currentY += rowHeight;
  });

  // Table Bottom Total Row
  doc.setFillColor(240, 246, 244);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setDrawColor(0, 107, 95);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.line(margin, currentY + 7, pageWidth - margin, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 107, 95);
  doc.text('TOTAL QUANTITY & MERCHANDISE VALUE', margin + 3, currentY + 4.8);

  doc.text(totalCartons ? `${totalCartons} Ctn` : '—', colPositions.carton + colWidths.carton - 2, currentY + 4.8, { align: 'right' });
  doc.text(totalPacks ? `${totalPacks} Pk` : '—', colPositions.pack + colWidths.pack - 2, currentY + 4.8, { align: 'right' });
  doc.text(`${totalQuantityPcs.toLocaleString()} Pcs`, colPositions.qty + colWidths.qty - 2, currentY + 4.8, { align: 'right' });
  doc.text(`Rs. ${netTotal.toLocaleString()}`, colPositions.amount + colWidths.amount - 2, currentY + 4.8, { align: 'right' });

  currentY += 11;

  // -------------------------------------------------------------
  // FINANCIAL SUMMARY & BALANCE RECONCILIATION BLOCK
  // -------------------------------------------------------------
  if (currentY + 45 > pageHeight - 40) {
    doc.addPage();
    currentPageNum += 1;
    drawHeader();
  }

  const summaryWidth = 90;
  const summaryX = pageWidth - margin - summaryWidth;

  const remarksWidth = contentWidth - summaryWidth - 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, remarksWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 107, 95);
  doc.text('TERMS & DELIVERY INSTRUCTIONS', margin + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const termLines = [
    '1. Goods once sold are subject to National Lights warranty policy.',
    '2. Claims for breakage/shortage must be notified within 48 hours of delivery.',
    '3. Cheque / Cash payments valid only upon official credit confirmation.',
    remarks ? `Notes: ${remarks}` : 'Standard commercial distribution terms applied.',
  ];
  let termY = currentY + 10;
  termLines.forEach((t) => {
    doc.text(t, margin + 3, termY);
    termY += 4.5;
  });

  // Financial Balance Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryX, currentY, summaryWidth, 34, 1.5, 1.5, 'FD');

  let finY = currentY + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Gross Merchandise Subtotal:', summaryX + 3, finY);
  doc.text(`Rs. ${grossSubtotal.toLocaleString()}`, summaryX + summaryWidth - 3, finY, { align: 'right' });

  finY += 4.5;
  if (totalDiscount > 0) {
    doc.text('Trade Discounts / Deductions:', summaryX + 3, finY);
    doc.setTextColor(190, 18, 60);
    doc.text(`- Rs. ${totalDiscount.toLocaleString()}`, summaryX + summaryWidth - 3, finY, { align: 'right' });
    finY += 4.5;
  }

  doc.setTextColor(71, 85, 105);
  doc.text('Previous Account Balance:', summaryX + 3, finY);
  doc.text(`Rs. ${previousBalance.toLocaleString()}`, summaryX + summaryWidth - 3, finY, { align: 'right' });

  finY += 5;
  doc.setFillColor(0, 107, 95);
  doc.rect(summaryX, finY - 3.5, summaryWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NET INVOICE TOTAL:', summaryX + 3, finY + 1);
  doc.text(`Rs. ${netTotal.toLocaleString()} PKR`, summaryX + summaryWidth - 3, finY + 1, { align: 'right' });

  finY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('PROJECTED CLOSING BALANCE:', summaryX + 3, finY + 1);
  doc.setTextColor(0, 107, 95);
  doc.text(`Rs. ${finalProjectedBalance.toLocaleString()} PKR`, summaryX + summaryWidth - 3, finY + 1, { align: 'right' });

  currentY += 38;

  // -------------------------------------------------------------
  // SIGNATURE & AUDIT BLOCKS
  // -------------------------------------------------------------
  if (currentY + 22 > pageHeight - 15) {
    doc.addPage();
    currentPageNum += 1;
    drawHeader();
  }

  const sigWidth = contentWidth / 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.line(margin + 5, currentY + 10, margin + sigWidth - 10, currentY + 10);
  doc.text('ORDER BOOKER / FIELD OFFICER', margin + sigWidth / 2 - 5, currentY + 13.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(preparedByName, margin + sigWidth / 2 - 5, currentY + 16.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.line(margin + sigWidth + 5, currentY + 10, margin + sigWidth * 2 - 10, currentY + 10);
  doc.text('CUSTOMER RECEIVING & STAMP', margin + sigWidth * 1.5, currentY + 13.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Verified Physical Stock', margin + sigWidth * 1.5, currentY + 16.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.line(margin + sigWidth * 2 + 5, currentY + 10, pageWidth - margin - 5, currentY + 10);
  doc.text('EXECUTIVE AUTHORIZATION', margin + sigWidth * 2.5 + 5, currentY + 13.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Shahzad Ullah (Executive Director)', margin + sigWidth * 2.5 + 5, currentY + 16.5, { align: 'center' });

  const totalPagesInDoc = doc.getNumberOfPages();
  const pageEndDocIndex = totalPagesInDoc;
  const invoiceSpecificPages = pageEndDocIndex - pageStartDocIndex + 1;

  for (let p = pageStartDocIndex; p <= pageEndDocIndex; p++) {
    doc.setPage(p);
    drawFooter(p - pageStartDocIndex + 1, invoiceSpecificPages);
  }
};

/**
 * Generates a single sales invoice PDF doc, Blob and Data URL
 */
export const generateSalesInvoicePdfDoc = async (
  options: InvoicePdfOptions
): Promise<GeneratedPdfResult> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  renderInvoiceOnDoc(doc, options, false);

  const invoiceNum = (options.order.orderNumber || 'ORD-0000').replace(/[^a-zA-Z0-9_-]/g, '_');
  const custCleanName = (options.customer.companyName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NationalLight_Invoice_${invoiceNum}_${custCleanName}.pdf`;

  const blob = doc.output('blob');
  const dataUrl = doc.output('dataurlstring');

  return {
    success: true,
    filename,
    blob,
    dataUrl,
    doc,
    pageCount: doc.getNumberOfPages(),
    totalAmount: options.order.totalAmount,
  };
};

/**
 * Generates a single sales invoice PDF Blob directly
 */
export const generateSalesInvoicePdfBlob = (options: InvoicePdfOptions): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  renderInvoiceOnDoc(doc, options, false);
  return doc.output('blob');
};

/**
 * Downloads a single sales invoice PDF
 */
export const downloadSalesInvoicePdf = async (
  options: InvoicePdfOptions
): Promise<{ success: boolean; filename: string; blob: Blob; dataUrl: string }> => {
  const result = await generateSalesInvoicePdfDoc(options);
  result.doc.save(result.filename);
  return {
    success: true,
    filename: result.filename,
    blob: result.blob,
    dataUrl: result.dataUrl,
  };
};

/**
 * Draws an executive bulk manifest cover page on the doc
 */
const renderBulkManifestPage = (
  doc: jsPDF,
  invoices: InvoicePdfOptions[],
  bundleTitle = 'National Lights Enterprise Bulk Invoice Dispatch Bundle'
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(0, 107, 95);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(217, 163, 38);
  doc.rect(0, 5, pageWidth, 1.2, 'F');

  let currentY = 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 20, 40);
  doc.text('NATIONAL LIGHTS (PVT) LTD.', margin, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 110);
  doc.text('Bulk Commercial Invoices & Dispatch Manifest Summary', margin, currentY);

  doc.setFontSize(7.5);
  doc.setTextColor(60, 70, 80);
  doc.text('NTN: 2894102-7 | STRN: 03-00-2894-102-7', pageWidth - margin, 13, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`, pageWidth - margin, 17, { align: 'right' });
  doc.text('Executive Authorization: Shahzad Ullah', pageWidth - margin, 21, { align: 'right' });

  currentY += 4;
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // Title Card
  currentY += 4;
  doc.setFillColor(242, 248, 246);
  doc.setDrawColor(0, 107, 95);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 107, 95);
  doc.text(bundleTitle.toUpperCase(), margin + 3, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 20, 40);
  doc.text(`TOTAL ORDERS: ${invoices.length}`, pageWidth - margin - 3, currentY + 6, { align: 'right' });

  currentY += 12;

  // Aggregate Metrics Summary Bar
  const totalAmountSum = invoices.reduce((sum, inv) => sum + (inv.order.totalAmount || 0), 0);
  const totalSKUsCount = invoices.reduce((sum, inv) => sum + ((inv.order.items as any[])?.length || 1), 0);
  
  const metricBoxW = (contentWidth - 6) / 3;
  const metricBoxH = 15;

  // Box 1: Total Invoices
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, metricBoxW, metricBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INVOICES IN BUNDLE', margin + 3, currentY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(0, 107, 95);
  doc.text(`${invoices.length} Orders`, margin + 3, currentY + 11.5);

  // Box 2: Total SKUs
  const box2X = margin + metricBoxW + 3;
  doc.roundedRect(box2X, currentY, metricBoxW, metricBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL SKUS / LINE ITEMS', box2X + 3, currentY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalSKUsCount} Line Items`, box2X + 3, currentY + 11.5);

  // Box 3: Total Cumulative Amount
  const box3X = margin + (metricBoxW + 3) * 2;
  doc.setFillColor(235, 242, 240);
  doc.roundedRect(box3X, currentY, metricBoxW, metricBoxH, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 107, 95);
  doc.text('CUMULATIVE NET BILLING (PKR)', box3X + 3, currentY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(0, 107, 95);
  doc.text(`Rs. ${totalAmountSum.toLocaleString()} PKR`, box3X + 3, currentY + 11.5);

  currentY += metricBoxH + 5;

  // Manifest Index Table Header
  doc.setFillColor(0, 107, 95);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  const tCols = {
    sr: margin + 2,
    inv: margin + 12,
    date: margin + 38,
    party: margin + 62,
    town: margin + 118,
    skus: margin + 148,
    amt: pageWidth - margin - 2,
  };

  doc.text('#', tCols.sr, currentY + 4.8);
  doc.text('Invoice Ref', tCols.inv, currentY + 4.8);
  doc.text('Date', tCols.date, currentY + 4.8);
  doc.text('Party / Customer Name', tCols.party, currentY + 4.8);
  doc.text('Town', tCols.town, currentY + 4.8);
  doc.text('Items', tCols.skus, currentY + 4.8);
  doc.text('Net Amount (PKR)', tCols.amt, currentY + 4.8, { align: 'right' });

  currentY += 7;

  // Manifest Rows
  const mRowH = 6;
  invoices.forEach((inv, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(250, 252, 252);
      doc.rect(margin, currentY, contentWidth, mRowH, 'F');
    }

    doc.setDrawColor(235, 240, 245);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + mRowH, pageWidth - margin, currentY + mRowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    doc.text(String(idx + 1), tCols.sr, currentY + 4.2);

    doc.setFont('helvetica', 'bold');
    const invCode = (inv.order.orderNumber || 'ORD-0000').replace('ORD-', 'INV-');
    doc.text(invCode, tCols.inv, currentY + 4.2);

    doc.setFont('helvetica', 'normal');
    const dateStr = inv.order.orderDate || (inv.order.createdAt ? inv.order.createdAt.split('T')[0] : '2026-09-20');
    doc.text(dateStr, tCols.date, currentY + 4.2);

    const cName = inv.customer.companyName.length > 28 ? inv.customer.companyName.slice(0, 26) + '...' : inv.customer.companyName;
    doc.text(cName, tCols.party, currentY + 4.2);

    doc.text(inv.customer.city || inv.customer.town || 'Peshawar', tCols.town, currentY + 4.2);
    doc.text(`${(inv.order.items as any[])?.length || 1} SKU`, tCols.skus, currentY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${(inv.order.totalAmount || 0).toLocaleString()}`, tCols.amt, currentY + 4.2, { align: 'right' });

    currentY += mRowH;
  });

  // Total Summary Bottom Bar
  doc.setFillColor(240, 246, 244);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setDrawColor(0, 107, 95);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.line(margin, currentY + 7, pageWidth - margin, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 107, 95);
  doc.text('TOTAL BUNDLE MERCHANDISE DISPATCH VALUE', margin + 3, currentY + 4.8);
  doc.text(`Rs. ${totalAmountSum.toLocaleString()} PKR`, tCols.amt, currentY + 4.8, { align: 'right' });

  // Bottom Sign-off on Manifest Cover
  const footY = pageHeight - 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.line(margin + 5, footY, margin + 55, footY);
  doc.text('DISPATCH AUDIT OFFICER', margin + 30, footY + 4, { align: 'center' });

  doc.line(pageWidth - margin - 55, footY, pageWidth - margin - 5, footY);
  doc.text('EXECUTIVE APPROVER (Shahzad Ullah)', pageWidth - margin - 30, footY + 4, { align: 'center' });
};

/**
 * Generates a consolidated bulk multi-order PDF with cover manifest
 */
export const generateBulkSalesInvoicesPdfDoc = async (
  invoices: InvoicePdfOptions[],
  bundleTitle = 'National Lights Bulk Sales Invoices Dispatch Manifest'
): Promise<GeneratedPdfResult> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 1. Cover manifest page
  renderBulkManifestPage(doc, invoices, bundleTitle);

  // 2. Render each invoice on subsequent pages
  invoices.forEach((inv) => {
    renderInvoiceOnDoc(doc, inv, true);
  });

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.order.totalAmount || 0), 0);
  const filename = `NationalLight_BulkInvoices_${invoices.length}Orders_${new Date().toISOString().split('T')[0]}.pdf`;

  const blob = doc.output('blob');
  const dataUrl = doc.output('dataurlstring');

  return {
    success: true,
    filename,
    blob,
    dataUrl,
    doc,
    pageCount: doc.getNumberOfPages(),
    totalAmount,
  };
};

/**
 * Downloads a bulk consolidated sales orders PDF
 */
export const downloadBulkSalesInvoicesPdf = async (
  invoices: InvoicePdfOptions[],
  bundleTitle?: string
): Promise<GeneratedPdfResult> => {
  const result = await generateBulkSalesInvoicesPdfDoc(invoices, bundleTitle);
  result.doc.save(result.filename);
  return result;
};

/**
 * Helper to build pre-formatted professional WhatsApp message for an invoice
 */
export const buildInvoiceWhatsAppText = (
  customer: Customer,
  order: any,
  options?: { officerName?: string; officerPhone?: string }
): string => {
  const invNo = (order.orderNumber || order.invoiceNo || 'ORD-0000').replace('ORD-', 'INV-');
  const items = order.items || [];
  
  let text = `*NATIONAL LIGHTS PAKISTAN • OFFICIAL TAX INVOICE*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 *Invoice Ref:* ${invNo}\n`;
  text += `📅 *Date:* ${order.orderDate || order.date || new Date().toISOString().split('T')[0]}\n`;
  text += `🏢 *Customer:* ${customer.companyName} (${customer.customerCode || 'NL-DLR'})\n`;
  text += `📍 *Town / Beat:* ${customer.town || customer.city || 'Peshawar'}\n`;
  if (options?.officerName) {
    text += `👤 *Field Officer:* ${options.officerName}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*ITEMIZED PARTICULARS:*\n`;

  items.forEach((it: any, idx: number) => {
    const qty = it.quantity || it.orderedQuantity || 0;
    const rate = it.unitPrice || it.rate || 0;
    const lineTotal = it.lineTotal || (qty * rate);
    const sku = it.skuName || it.name || 'LED Light';
    text += `${idx + 1}. *${sku}*\n   ↳ ${qty} Pcs @ Rs. ${Number(rate).toLocaleString()} = *Rs. ${Number(lineTotal).toLocaleString()}*\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *NET BILL AMOUNT:* Rs. ${Number(order.totalAmount || order.amount || 0).toLocaleString()} PKR\n`;

  if (customer.currentBalance) {
    text += `📊 *Total Account Balance:* Rs. ${customer.currentBalance.toLocaleString()} PKR\n`;
  }

  text += `\n*Executive Authorization:* Shahzad Ullah (Executive Director)\n`;
  text += `_National Lights Pakistan • Peshawar & Lahore_\n`;
  text += `_Helpline: +92 91 111 654 448 | +92 42 111 654 000_`;

  return text;
};

/**
 * Helper to build mailto: URL for sending invoice receipt via email
 */
export const buildInvoiceEmailUrl = (
  customer: Customer,
  order: any,
  recipientEmail?: string,
  officerName?: string
): string => {
  const invNo = (order.orderNumber || order.invoiceNo || 'ORD-0000').replace('ORD-', 'INV-');
  const subject = `National Lights Invoice ${invNo} — ${customer.companyName}`;
  const body = buildInvoiceWhatsAppText(customer, order, { officerName });
  const email = recipientEmail || (customer as any).email || '';

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * Helper to build pre-formatted WhatsApp message for bulk invoices
 */
export const buildBulkInvoiceWhatsAppText = (
  invoices: InvoicePdfOptions[],
  officerName?: string
): string => {
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.order.totalAmount || 0), 0);
  let text = `*NATIONAL LIGHTS PAKISTAN • BULK INVOICES MANIFEST*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📦 *Total Selected Orders:* ${invoices.length}\n`;
  text += `💰 *Cumulative Amount:* Rs. ${totalAmount.toLocaleString()} PKR\n`;
  text += `📅 *Date:* ${new Date().toISOString().split('T')[0]}\n`;
  if (officerName) {
    text += `👤 *Dispatched By:* ${officerName}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*INVOICE BREAKDOWN:*\n`;

  invoices.forEach((inv, idx) => {
    const invNo = (inv.order.orderNumber || 'ORD-0000').replace('ORD-', 'INV-');
    text += `${idx + 1}. *${invNo}* • ${inv.customer.companyName} (${inv.customer.city || 'Peshawar'})\n   ↳ Rs. ${(inv.order.totalAmount || 0).toLocaleString()} PKR\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Executive Approval Authority: Shahzad Ullah_\n`;
  text += `_National Lights Pakistan • Head Office Finance_`;

  return text;
};
