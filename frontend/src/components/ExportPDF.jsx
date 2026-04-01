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
      const overheadTotal = results?.overhead_cost || 0;
      const totalCost = results?.total_cost || (laborTotal + vendorTotal + overheadTotal);
      const totalRevenue = results?.total_revenue || 0;
      const netProfit = results?.net_profit || 0;
      const marginPercent = results?.margin_percent || 0;
      
      // Build team rows
      const teamRows = data?.team_members?.map(tm => `
        <tr>
          <td class="role-name">${tm.role_name || 'Role'}</td>
          <td class="center">${tm.hours || 0}</td>
          <td class="mono right">${formatCurrency(tm.hourly_rate || 0, false)}</td>
          <td class="mono right highlight">${formatCurrency((tm.hours || 0) * (tm.hourly_rate || 0), false)}</td>
        </tr>
      `).join('') || '';

      // Build vendor rows
      const vendorRows = data?.vendors?.map(v => `
        <tr>
          <td class="role-name">${v.service_name || 'Service'}</td>
          <td class="mono right">${formatCurrency(v.cost || 0, false)}</td>
          <td class="center">${v.markup_percent || 0}%</td>
          <td class="mono right highlight">${formatCurrency((v.cost || 0) * (1 + (v.markup_percent || 0) / 100), false)}</td>
        </tr>
      `).join('') || '';

      const printContent = `
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
          <meta charset="UTF-8">
          <title>Price Proposal - ${projectName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            :root {
              --primary: #0f172a;
              --secondary: #334155;
              --accent: #3b82f6;
              --success: #10b981;
              --muted: #64748b;
              --light: #f8fafc;
              --border: #e2e8f0;
            }
            
            body {
              font-family: 'Cairo', sans-serif;
              background: white;
              color: var(--primary);
              line-height: 1.5;
            }
            
            .page {
              max-width: 800px;
              margin: 0 auto;
              padding: 48px;
            }
            
            /* Header */
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 32px;
              margin-bottom: 32px;
              border-bottom: 3px solid var(--primary);
            }
            
            .logo-section {
              display: flex;
              align-items: center;
            }
            
            .logo {
              max-height: 64px;
              max-width: 160px;
              object-fit: contain;
            }
            
            .logo-fallback {
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 800;
              font-size: 24px;
            }
            
            .header-info {
              text-align: right;
            }
            
            .doc-type {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 3px;
              color: var(--muted);
              font-weight: 600;
              margin-bottom: 8px;
            }
            
            .client-name {
              font-size: 28px;
              font-weight: 800;
              color: var(--primary);
              margin-bottom: 4px;
            }
            
            .project-name {
              font-size: 16px;
              color: var(--secondary);
            }
            
            /* Section */
            .section {
              margin-bottom: 32px;
            }
            
            .section-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid var(--border);
            }
            
            .section-icon {
              width: 32px;
              height: 32px;
              background: var(--light);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: var(--secondary);
            }
            
            /* Table */
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            
            thead th {
              background: var(--light);
              padding: 14px 16px;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: var(--muted);
              text-align: left;
              border-bottom: 2px solid var(--border);
            }
            
            thead th.right { text-align: right; }
            thead th.center { text-align: center; }
            
            tbody td {
              padding: 16px;
              border-bottom: 1px solid var(--border);
              vertical-align: middle;
            }
            
            tbody tr:last-child td { border-bottom: none; }
            
            .role-name {
              font-weight: 600;
              color: var(--primary);
            }
            
            .mono {
              font-family: 'JetBrains Mono', 'Courier New', monospace;
              font-size: 12px;
            }
            
            .right { text-align: right; }
            .center { text-align: center; }
            
            .highlight {
              font-weight: 700;
              color: var(--primary);
            }
            
            /* Summary */
            .summary {
              background: var(--primary);
              color: white;
              border-radius: 20px;
              padding: 32px;
              margin-top: 40px;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 24px;
              margin-bottom: 28px;
            }
            
            .summary-item {
              background: rgba(255,255,255,0.08);
              border-radius: 12px;
              padding: 20px;
            }
            
            .summary-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: rgba(255,255,255,0.6);
              margin-bottom: 8px;
            }
            
            .summary-value {
              font-family: 'JetBrains Mono', monospace;
              font-size: 22px;
              font-weight: 700;
            }
            
            .summary-value.profit { color: var(--success); }
            
            .summary-total {
              border-top: 1px solid rgba(255,255,255,0.15);
              padding-top: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .total-left {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            
            .total-label {
              font-size: 14px;
              color: rgba(255,255,255,0.7);
            }
            
            .margin-badge {
              background: ${marginPercent >= 30 ? 'var(--success)' : marginPercent >= 15 ? '#f59e0b' : '#ef4444'};
              color: white;
              padding: 6px 14px;
              border-radius: 100px;
              font-size: 12px;
              font-weight: 700;
            }
            
            .total-amount {
              font-family: 'JetBrains Mono', monospace;
              font-size: 36px;
              font-weight: 800;
              color: var(--success);
            }
            
            /* Footer */
            .footer {
              margin-top: 48px;
              padding-top: 24px;
              border-top: 2px solid var(--border);
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .footer-left {
              font-size: 11px;
              color: var(--muted);
              line-height: 1.8;
            }
            
            .footer-right {
              text-align: right;
            }
            
            .prepared-by {
              font-size: 11px;
              color: var(--muted);
              margin-bottom: 4px;
            }
            
            .prepared-name {
              font-size: 14px;
              font-weight: 700;
              color: var(--primary);
            }
            
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { padding: 24px; }
              .section { break-inside: avoid; }
              .summary { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <!-- Header -->
            <header class="header">
              <div class="logo-section">
                ${logoUrl 
                  ? `<img src="${logoUrl}" alt="Logo" class="logo" crossorigin="anonymous" />`
                  : `<div class="logo-fallback">ZAN</div>`
                }
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
                <div class="section-header">
                  <div class="section-icon">👥</div>
                  <h2 class="section-title">Internal Team</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 45%">Role</th>
                      <th class="center" style="width: 15%">Hours</th>
                      <th class="right" style="width: 20%">Rate</th>
                      <th class="right" style="width: 20%">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teamRows}
                    <tr style="background: var(--light);">
                      <td colspan="3" class="role-name" style="text-align: right;">Subtotal</td>
                      <td class="mono right highlight">SAR ${formatCurrency(laborTotal, false)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            ` : ''}
            
            <!-- Vendors -->
            ${vendorRows ? `
              <section class="section">
                <div class="section-header">
                  <div class="section-icon">🏢</div>
                  <h2 class="section-title">External Services</h2>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 45%">Service</th>
                      <th class="right" style="width: 20%">Cost</th>
                      <th class="center" style="width: 15%">Markup</th>
                      <th class="right" style="width: 20%">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vendorRows}
                    <tr style="background: var(--light);">
                      <td colspan="3" class="role-name" style="text-align: right;">Subtotal</td>
                      <td class="mono right highlight">SAR ${formatCurrency(vendorTotal, false)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            ` : ''}
            
            <!-- Summary -->
            <div class="summary">
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Internal Labor</div>
                  <div class="summary-value">SAR ${formatCurrency(laborTotal, false)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">External Services</div>
                  <div class="summary-value">SAR ${formatCurrency(vendorTotal, false)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Overhead Costs</div>
                  <div class="summary-value">SAR ${formatCurrency(overheadTotal, false)}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Net Profit</div>
                  <div class="summary-value profit">SAR ${formatCurrency(netProfit, false)}</div>
                </div>
              </div>
              <div class="summary-total">
                <div class="total-left">
                  <span class="total-label">Total Investment</span>
                  <span class="margin-badge">${marginPercent.toFixed(1)}% Margin</span>
                </div>
                <div class="total-amount">SAR ${formatCurrency(totalRevenue, false)}</div>
              </div>
            </div>
            
            <!-- Footer -->
            <footer class="footer">
              <div class="footer-left">
                <div>Generated on ${today}</div>
                <div>This proposal is valid for 30 days from the date of issue.</div>
              </div>
              ${salesOwner ? `
                <div class="footer-right">
                  <div class="prepared-by">Prepared by</div>
                  <div class="prepared-name">${salesOwner}</div>
                </div>
              ` : ''}
            </footer>
          </div>
        </body>
        </html>
      `;
      
      // Open in new window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('يرجى السماح بالنوافذ المنبثقة');
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for fonts and images to load
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
      
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
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      Export Client Price Sheet
    </Button>
  );
}
