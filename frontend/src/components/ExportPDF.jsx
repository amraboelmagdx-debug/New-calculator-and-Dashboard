import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function ExportPDF({ data, results, projectInfo, themeSettings, isDarkMode = true }) {
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    if (!results) {
      toast.error('يرجى إضافة فريق أو موردين أولاً');
      return;
    }

    setExporting(true);
    
    try {
      const logoUrl = themeSettings?.logo_url || '';
      const clientName = projectInfo?.client_name || 'Client';
      const projectName = projectInfo?.project_name || 'Project';
      const salesOwner = projectInfo?.sales_owner || '';
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Calculate totals
      const laborTotal = results?.labor_cost || 0;
      const vendorTotal = results?.vendor_cost || 0;
      const totalRevenue = results?.total_revenue || 0;
      
      // Build team rows
      const teamRows = data?.team_members?.map(tm => {
        const qty = tm.quantity || 1;
        const hours = tm.hours || 0;
        const rate = tm.hourly_rate || 0;
        const total = hours * rate * qty;
        return `
          <tr>
            <td>${tm.role_name || 'Role'}</td>
            <td class="center">${qty}</td>
            <td class="center">${hours}</td>
            <td class="right">${formatCurrency(rate, false)}</td>
            <td class="right bold">${formatCurrency(total, false)}</td>
          </tr>
        `;
      }).join('') || '';

      // Build vendor rows  
      const vendorRows = data?.vendors?.map(v => {
        const qty = v.quantity || 1;
        const unitCost = v.unit_cost || v.cost || 0;
        const totalCost = unitCost * qty;
        const markup = v.markup_percent || 0;
        const clientPrice = totalCost * (1 + markup / 100);
        return `
          <tr>
            <td>${v.service_name || 'Service'}</td>
            <td class="center">${qty}</td>
            <td class="right">${formatCurrency(unitCost, false)}</td>
            <td class="right">${formatCurrency(totalCost, false)}</td>
            <td class="center">${markup}%</td>
            <td class="right bold">${formatCurrency(clientPrice, false)}</td>
          </tr>
        `;
      }).join('') || '';

      const printContent = `
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
          <meta charset="UTF-8">
          <title>Price Proposal - ${projectName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
              font-family: 'Cairo', sans-serif;
              background: #fff;
              color: #1e293b;
              line-height: 1.6;
              font-size: 13px;
            }
            
            .page {
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 48px;
            }
            
            /* Header */
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #0f172a;
            }
            
            .logo {
              max-height: 56px;
              max-width: 140px;
              object-fit: contain;
            }
            
            .header-info {
              text-align: right;
            }
            
            .doc-type {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 6px;
            }
            
            .client-name {
              font-size: 22px;
              font-weight: 700;
              color: #0f172a;
            }
            
            .project-name {
              font-size: 14px;
              color: #475569;
              margin-top: 2px;
            }
            
            /* Sections */
            .section {
              margin-bottom: 28px;
            }
            
            .section-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #0f172a;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            }
            
            /* Tables */
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            
            thead {
              background: #f8fafc;
            }
            
            th {
              padding: 10px 12px;
              font-weight: 600;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #64748b;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            
            td {
              padding: 12px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
            }
            
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 600; color: #0f172a; }
            
            .subtotal-row {
              background: #f8fafc;
            }
            
            .subtotal-row td {
              font-weight: 600;
              color: #0f172a;
              border-bottom: 2px solid #e2e8f0;
            }
            
            /* Summary */
            .summary {
              margin-top: 32px;
              border: 2px solid #0f172a;
              border-radius: 12px;
              overflow: hidden;
            }
            
            .summary-header {
              background: #0f172a;
              color: white;
              padding: 16px 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .summary-body {
              padding: 20px;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .summary-row:last-child {
              border-bottom: none;
              padding-top: 16px;
              margin-top: 8px;
              border-top: 2px solid #0f172a;
            }
            
            .summary-label {
              color: #64748b;
              font-size: 12px;
            }
            
            .summary-value {
              font-weight: 600;
              color: #0f172a;
              font-size: 14px;
            }
            
            .summary-row:last-child .summary-label {
              font-size: 14px;
              font-weight: 600;
              color: #0f172a;
            }
            
            .summary-row:last-child .summary-value {
              font-size: 24px;
              font-weight: 700;
              color: #059669;
            }
            
            /* Footer */
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #94a3b8;
            }
            
            .footer-right {
              text-align: right;
            }
            
            .prepared-name {
              font-weight: 600;
              color: #334155;
              font-size: 12px;
              margin-top: 2px;
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { padding: 20px 32px; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- Header -->
            <header class="header">
              <div>
                ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo" crossorigin="anonymous" />` : ''}
              </div>
              <div class="header-info">
                <div class="doc-type">Price Proposal</div>
                <div class="client-name">${clientName}</div>
                <div class="project-name">${projectName}</div>
              </div>
            </header>
            
            <!-- Internal Team -->
            ${teamRows ? `
              <section class="section">
                <h2 class="section-title">Internal Team</h2>
                <table>
                  <thead>
                    <tr>
                      <th style="width:40%">Role</th>
                      <th class="center" style="width:10%">Qty</th>
                      <th class="center" style="width:12%">Hours</th>
                      <th class="right" style="width:18%">Rate/hr</th>
                      <th class="right" style="width:20%">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teamRows}
                    <tr class="subtotal-row">
                      <td colspan="4" class="right">Subtotal</td>
                      <td class="right bold">SAR ${formatCurrency(laborTotal, false)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            ` : ''}
            
            <!-- External Services -->
            ${vendorRows ? `
              <section class="section">
                <h2 class="section-title">External Services</h2>
                <table>
                  <thead>
                    <tr>
                      <th style="width:30%">Service</th>
                      <th class="center" style="width:10%">Qty</th>
                      <th class="right" style="width:15%">Unit Cost</th>
                      <th class="right" style="width:15%">Total Cost</th>
                      <th class="center" style="width:10%">Markup</th>
                      <th class="right" style="width:20%">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vendorRows}
                    <tr class="subtotal-row">
                      <td colspan="5" class="right">Subtotal</td>
                      <td class="right bold">SAR ${formatCurrency(vendorTotal, false)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            ` : ''}
            
            <!-- Summary -->
            <div class="summary">
              <div class="summary-header">Investment Summary</div>
              <div class="summary-body">
                <div class="summary-row">
                  <span class="summary-label">Internal Team</span>
                  <span class="summary-value">SAR ${formatCurrency(laborTotal, false)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">External Services</span>
                  <span class="summary-value">SAR ${formatCurrency(vendorTotal, false)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Total Investment</span>
                  <span class="summary-value">SAR ${formatCurrency(totalRevenue, false)}</span>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <footer class="footer">
              <div>
                <div>Generated on ${today}</div>
                <div>Valid for 30 days from date of issue</div>
              </div>
              ${salesOwner ? `
                <div class="footer-right">
                  <div>Prepared by</div>
                  <div class="prepared-name">${salesOwner}</div>
                </div>
              ` : ''}
            </footer>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('يرجى السماح بالنوافذ المنبثقة');
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
      setTimeout(() => printWindow.print(), 1500);
      
      toast.success('تم فتح نافذة الطباعة');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('فشل إنشاء PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      disabled={exporting || !results}
      className={`gap-2 ${isDarkMode ? 'bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}
      variant="outline"
      data-testid="export-pdf-btn"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Export Client Price Sheet
    </Button>
  );
}
