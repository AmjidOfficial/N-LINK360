/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Lights Pakistan Customer Ledger PDF Exporter
 * Generates high-fidelity, audit-ready vector PDF transaction statements for offline analysis.
 */

import jsPDF from 'jspdf';
import { Customer } from '../types';

export interface LedgerPdfEntry {
  id?: string;
  date: string;
  reference: string;
  particulars: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface CustomerLedgerPdfOptions {
  customer: Customer;
  entries: LedgerPdfEntry[];
  openingBalance?: number;
  totalDebits?: number;
  totalCredits?: number;
  closingBalance?: number;
  startDate?: string;
  endDate?: string;
  selectedMonths?: string[];
  preparedByName?: string;
}

export const downloadCustomerLedgerPdf = async (
  options: CustomerLedgerPdfOptions
): Promise<{ success: boolean; filename: string }> => {
  const {
    customer,
    entries,
    openingBalance = customer.openingBalance || 0,
    startDate,
    endDate,
    selectedMonths,
    preparedByName = 'Syed Zain (Executive Director)',
  } = options;

  const totalDebits =
    options.totalDebits !== undefined
      ? options.totalDebits
      : entries.reduce((sum, e) => sum + (e.debit || 0), 0);

  const totalCredits =
    options.totalCredits !== undefined
      ? options.totalCredits
      : entries.reduce((sum, e) => sum + (e.credit || 0), 0);

  const closingBalance =
    options.closingBalance !== undefined
      ? options.closingBalance
      : entries.length > 0
      ? entries[0].balance
      : customer.currentBalance || openingBalance;

  // Initialize PDF (A4 Portrait: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  let currentY = margin;

  // Helper to draw clean header on every page
  const drawHeader = (pageNumber: number) => {
    // Top Primary Accent Bar (National Lights Deep Teal & Gold)
    doc.setFillColor(0, 107, 95); // #006b5f
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFillColor(217, 163, 38); // Warm Gold Accent Line
    doc.rect(0, 5, pageWidth, 1.2, 'F');

    currentY = 12;

    // Company Brand Name & Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 20, 40); // Dark Navy #001428
    doc.text('NATIONAL LIGHTS (PVT) LTD.', margin, currentY);

    // Tagline / Subheading
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text(
      'Illuminating Innovation — Premium Commercial & Architectural LED Solutions',
      margin,
      currentY
    );

    // Right-aligned Corporate Credentials
    doc.setFontSize(7.5);
    doc.setTextColor(60, 70, 80);
    doc.text('NTN: 2894102-7 | STRN: 03-00-2894-102-7', pageWidth - margin, 12, {
      align: 'right',
    });
    doc.text(
      'UAN: +92 42 111-654-000 | Ph: 091-2212700',
      pageWidth - margin,
      16,
      { align: 'right' }
    );
    doc.text(
      'Head Office: Brandreth Rd, Lahore | Reg: Peshawar KPK',
      pageWidth - margin,
      20,
      { align: 'right' }
    );

    currentY += 3;
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // Statement Title Banner
    currentY += 4;
    doc.setFillColor(242, 245, 248);
    doc.roundedRect(margin, currentY, contentWidth, 7.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 107, 95);
    doc.text('OFFICIAL CUSTOMER TRANSACTION LEDGER & STATEMENT OF ACCOUNT', margin + 3, currentY + 5);

    const generatedOnStr = `Generated: ${new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 120);
    doc.text(generatedOnStr, pageWidth - margin - 3, currentY + 5, { align: 'right' });

    currentY += 10;
  };

  // Helper to draw Footer on every page
  const drawFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - 12;

    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 140);
    doc.text(
      'N-LINK 360 Enterprise ERP • Strictly Confidential • Official National Lights Commercial Record',
      margin,
      footerY + 2
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY + 2, {
      align: 'right',
    });

    // Bottom Decorative Bar
    doc.setFillColor(0, 107, 95);
    doc.rect(0, pageHeight - 2, pageWidth, 2, 'F');
  };

  // Draw Page 1 Header
  drawHeader(1);

  // 1. Customer Information & Financial Summary (2 Column layout)
  const summaryBoxY = currentY;
  const summaryBoxHeight = 35;
  const colWidth = (contentWidth - 4) / 2;

  // Left Box: Customer Profile Details
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 220, 226);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, summaryBoxY, colWidth, summaryBoxHeight, 2, 2, 'FD');

  // Customer Profile Header
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(margin, summaryBoxY, colWidth, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 30, 60);
  doc.text('CUSTOMER / DEALER PROFILE', margin + 3, summaryBoxY + 4.5);

  let cY = summaryBoxY + 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 20, 40);
  doc.text(customer.companyName || 'Registered Dealer', margin + 3, cY);

  cY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 90);
  doc.text(`Party Code: `, margin + 3, cY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 107, 95);
  doc.text(customer.customerCode || 'DL-8839', margin + 20, cY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 80, 90);
  doc.text(`Contact: ${customer.contactPerson || 'Proprietor'} (${customer.phone || 'N/A'})`, margin + 45, cY);

  cY += 4.5;
  doc.text(`Address: ${customer.address || customer.city || 'Commercial Market, KPK'}`, margin + 3, cY);

  cY += 4.5;
  doc.text(`Territory / City: ${customer.city || customer.territory || 'Peshawar'}`, margin + 3, cY);
  doc.text(`Credit Limit: Rs. ${(customer.creditLimit || 350000).toLocaleString()}`, margin + 50, cY);

  cY += 4.5;
  doc.text(`Credit Days: ${customer.creditDays || 30} Days`, margin + 3, cY);
  doc.text(`Account Status: ${customer.status || 'ACTIVE'}`, margin + 50, cY);

  // Right Box: Financial Reconciliation & Date Filter
  const rightBoxX = margin + colWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 220, 226);
  doc.roundedRect(rightBoxX, summaryBoxY, colWidth, summaryBoxHeight, 2, 2, 'FD');

  // Financial Header
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(rightBoxX, summaryBoxY, colWidth, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 30, 60);
  doc.text('STATEMENT RECONCILIATION SUMMARY', rightBoxX + 3, summaryBoxY + 4.5);

  let rY = summaryBoxY + 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 80, 90);
  const dateRangeLabel =
    startDate && endDate
      ? `${startDate} to ${endDate}`
      : selectedMonths && selectedMonths.length > 0 && !selectedMonths.includes('All Months')
      ? selectedMonths.join(', ')
      : 'All Recorded Transactions';
  doc.text(`Statement Period: ${dateRangeLabel}`, rightBoxX + 3, rY);

  // Metrics 4-Box Grid inside Right Box
  rY += 3.5;
  const gridW = (colWidth - 6) / 2;
  const gridH = 9;

  // Opening Balance Metric
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX + 2, rY, gridW, gridH, 1, 1, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 110, 120);
  doc.text('OPENING BALANCE', rightBoxX + 4, rY + 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 50, 100);
  doc.text(`Rs. ${openingBalance.toLocaleString()}`, rightBoxX + 4, rY + 7);

  // Range Debits (Invoices) Metric
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(rightBoxX + 4 + gridW, rY, gridW, gridH, 1, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 50, 50);
  doc.text('TOTAL DEBITS (INV+)', rightBoxX + 6 + gridW, rY + 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(186, 26, 26);
  doc.text(`+Rs. ${totalDebits.toLocaleString()}`, rightBoxX + 6 + gridW, rY + 7);

  // Range Credits (Payments) Metric
  rY += gridH + 1.5;
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(rightBoxX + 2, rY, gridW, gridH, 1, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 120, 90);
  doc.text('TOTAL CREDITS (REC-)', rightBoxX + 4, rY + 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 107, 95);
  doc.text(`-Rs. ${totalCredits.toLocaleString()}`, rightBoxX + 4, rY + 7);

  // Net Closing Balance Metric
  doc.setFillColor(0, 20, 40);
  doc.roundedRect(rightBoxX + 4 + gridW, rY, gridW, gridH, 1, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(118, 244, 224); // #76f4e0
  doc.text('NET CLOSING BALANCE', rightBoxX + 6 + gridW, rY + 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Rs. ${closingBalance.toLocaleString()}`, rightBoxX + 6 + gridW, rY + 7);

  currentY = summaryBoxY + summaryBoxHeight + 5;

  // 2. Transaction Statement Table Header
  const tableColWidths = {
    sr: 8,
    date: 22,
    ref: 26,
    particulars: 66,
    debit: 21,
    credit: 21,
    balance: 22,
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(0, 107, 95); // Deep Teal
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let x = margin + 2;
    doc.text('#', x, y + 4.8);
    x += tableColWidths.sr;

    doc.text('DATE', x, y + 4.8);
    x += tableColWidths.date;

    doc.text('REFERENCE #', x, y + 4.8);
    x += tableColWidths.ref;

    doc.text('PARTICULARS & DESCRIPTION', x, y + 4.8);
    x += tableColWidths.particulars;

    doc.text('DEBIT (INV+)', x + tableColWidths.debit - 2, y + 4.8, { align: 'right' });
    x += tableColWidths.debit;

    doc.text('CREDIT (REC-)', x + tableColWidths.credit - 2, y + 4.8, { align: 'right' });
    x += tableColWidths.credit;

    doc.text('BALANCE', x + tableColWidths.balance - 2, y + 4.8, { align: 'right' });
  };

  drawTableHeader(currentY);
  currentY += 7;

  // 3. Render Table Rows with Pagination
  let rowCount = 0;
  const sortedEntries = [...entries]; // Render chronological entries

  if (sortedEntries.length === 0) {
    // Empty row placeholder
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, 12, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 140);
    doc.text(
      'No transactions recorded for this customer in the selected date range.',
      pageWidth / 2,
      currentY + 7,
      { align: 'center' }
    );
    currentY += 12;
  } else {
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const rowHeight = 7.5;

      // Check for page break (Leave 35mm at bottom for Bank & Signature footer)
      if (currentY + rowHeight > pageHeight - 40) {
        doc.addPage();
        drawHeader(doc.getNumberOfPages());
        drawTableHeader(currentY);
        currentY += 7;
      }

      // Alternating row background
      if (rowCount % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');

      // Thin bottom row border
      doc.setDrawColor(230, 235, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

      let x = margin + 2;

      // 1. SR #
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 110, 120);
      doc.text(`${i + 1}`, x, currentY + 5);
      x += tableColWidths.sr;

      // 2. Date
      doc.setTextColor(50, 60, 70);
      doc.text(entry.date || 'N/A', x, currentY + 5);
      x += tableColWidths.date;

      // 3. Reference No
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 30, 60);
      doc.text(entry.reference || '—', x, currentY + 5);
      x += tableColWidths.ref;

      // 4. Particulars (Truncate if too long)
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 50, 60);
      const safeParticulars = entry.particulars || 'Transaction Ledger Entry';
      const truncated =
        safeParticulars.length > 44 ? safeParticulars.substring(0, 42) + '...' : safeParticulars;
      doc.text(truncated, x, currentY + 5);
      x += tableColWidths.particulars;

      // 5. Debit Amount
      if (entry.debit) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(186, 26, 26); // Red
        doc.text(`Rs. ${entry.debit.toLocaleString()}`, x + tableColWidths.debit - 2, currentY + 5, {
          align: 'right',
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 170, 180);
        doc.text('—', x + tableColWidths.debit - 2, currentY + 5, { align: 'right' });
      }
      x += tableColWidths.debit;

      // 6. Credit Amount
      if (entry.credit) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 107, 95); // Emerald Teal
        doc.text(`Rs. ${entry.credit.toLocaleString()}`, x + tableColWidths.credit - 2, currentY + 5, {
          align: 'right',
        });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 170, 180);
        doc.text('—', x + tableColWidths.credit - 2, currentY + 5, { align: 'right' });
      }
      x += tableColWidths.credit;

      // 7. Cumulative Balance
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 20, 40);
      doc.text(`Rs. ${entry.balance.toLocaleString()}`, x + tableColWidths.balance - 2, currentY + 5, {
        align: 'right',
      });

      currentY += rowHeight;
      rowCount++;
    }
  }

  // 4. Totals Footer Row
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setDrawColor(0, 107, 95);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  doc.line(margin, currentY + 8, margin + contentWidth, currentY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 30, 60);
  doc.text('STATEMENT TOTALS & CLOSING RECONCILIATION', margin + 3, currentY + 5.5);

  const debitX = margin + tableColWidths.sr + tableColWidths.date + tableColWidths.ref + tableColWidths.particulars;
  doc.setTextColor(186, 26, 26);
  doc.text(`Rs. ${totalDebits.toLocaleString()}`, debitX + tableColWidths.debit - 2, currentY + 5.5, {
    align: 'right',
  });

  const creditX = debitX + tableColWidths.debit;
  doc.setTextColor(0, 107, 95);
  doc.text(`Rs. ${totalCredits.toLocaleString()}`, creditX + tableColWidths.credit - 2, currentY + 5.5, {
    align: 'right',
  });

  const balX = creditX + tableColWidths.credit;
  doc.setTextColor(0, 20, 40);
  doc.text(`Rs. ${closingBalance.toLocaleString()}`, balX + tableColWidths.balance - 2, currentY + 5.5, {
    align: 'right',
  });

  currentY += 12;

  // Check if we need space for Banking Details and Signatures
  if (currentY + 35 > pageHeight - 15) {
    doc.addPage();
    drawHeader(doc.getNumberOfPages());
  }

  // 5. Official Banking Settlement Details Box
  const bankBoxY = currentY;
  const bankBoxHeight = 18;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(215, 220, 226);
  doc.roundedRect(margin, bankBoxY, contentWidth, bankBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 107, 95);
  doc.text('OFFICIAL CORPORATE SETTLEMENT BANK ACCOUNTS:', margin + 3, bankBoxY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 70, 80);
  doc.text(
    '• Meezan Bank Limited: Title: National Lights (Pvt) Ltd | A/C: 0215-0105893201 | IBAN: PK68 MEZN 0002 1501 0589 3201',
    margin + 3,
    bankBoxY + 9
  );
  doc.text(
    '• Habib Bank Limited (HBL): Title: National Lights (Pvt) Ltd | A/C: 1029-7901234503 | Raast Instant ID: 03008456789',
    margin + 3,
    bankBoxY + 13.5
  );

  currentY += bankBoxHeight + 5;

  // 6. Verification & Sign-off Blocks (2 Columns)
  const signBlockY = currentY;
  const signBlockWidth = (contentWidth - 10) / 2;

  // Left Sign Block: Finance Manager
  doc.setDrawColor(180, 190, 200);
  doc.setLineWidth(0.3);
  doc.line(margin + 5, signBlockY + 12, margin + 5 + signBlockWidth - 10, signBlockY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 20, 40);
  doc.text('Authorized Finance Sign-off', margin + 5, signBlockY + 15.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 110, 120);
  doc.text(`Prepared by: ${preparedByName} | Verified Accounts`, margin + 5, signBlockY + 19);

  // Right Sign Block: Dealer Acknowledgement
  const rightSignX = margin + signBlockWidth + 10;
  doc.line(rightSignX + 5, signBlockY + 12, rightSignX + 5 + signBlockWidth - 10, signBlockY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 20, 40);
  doc.text('Dealer / Receiver Acknowledgement', rightSignX + 5, signBlockY + 15.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 110, 120);
  doc.text('Signature & Official Commercial Stamp', rightSignX + 5, signBlockY + 19);

  // Final Pass: Apply Footers with Total Page Count
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // Format Filename
  const cleanCompanyName = (customer.companyName || 'Statement')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .slice(0, 30);
  const cleanCode = (customer.customerCode || 'NL').replace(/[^a-zA-Z0-9]/g, '');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `National_Lights_Ledger_${cleanCode}_${cleanCompanyName}_${dateStr}.pdf`;

  // Trigger browser download
  doc.save(filename);

  return {
    success: true,
    filename,
  };
};
