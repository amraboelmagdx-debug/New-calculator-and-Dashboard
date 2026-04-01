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
      const companyName = themeSettings?.company_name || 'ZAN';
      const logoUrl = themeSettings?.logo_url || '';
      const clientName = projectInfo?.client_name || 'Client';
      const projectName = projectInfo?.project_name || 'Project';
      const salesOwner = projectInfo?.sales_owner || '';
      
      // Build team members section
      const teamSection = data?.team_members?.length > 0 ? `
        <div class="section">
          <div class="section-title">Internal Team</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Hours</th>
                <th>Rate/hr</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.team_members.map(tm => `
                <tr>
                  <td>${tm.role_name || 'Role'}</td>
                  <td class="mono">${tm.hours || 0}</td>
                  <td class="mono">SAR ${formatCurrency(tm.hourly_rate || 0, false)}</td>
                  <td class="mono">SAR ${formatCurrency((tm.hours || 0) * (tm.hourly_rate || 0), false)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '';

      // Build vendors section
      const vendorSection = data?.vendors?.length > 0 ? `
        <div class="section">
          <div class="section-title">External Services</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Cost</th>
                <th>Markup</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.vendors.map(v => `
                <tr>
                  <td>${v.service_name || 'Service'}</td>
                  <td class="mono">SAR ${formatCurrency(v.cost || 0, false)}</td>
                  <td class="mono">${v.markup_percent || 0}%</td>
                  <td class="mono">SAR ${formatCurrency((v.cost || 0) * (1 + (v.markup_percent || 0) / 100), false)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '';

      // Logo handling - check if it's a valid URL
      const logoHtml = logoUrl ? `
        <img src="${logoUrl}" alt="${companyName}" class="logo-img" crossorigin="anonymous" />
      ` : `
        <div class="logo-fallback">${companyName.substring(0, 3).toUpperCase()}</div>
      `;

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Price Proposal - ${projectName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Cairo', sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 40px;
              max-width: 850px;
              margin: 0 auto;
              background: white;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 40px;
              padding-bottom: 24px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .logo-container {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            
            .logo-img {
              max-width: 80px;
              max-height: 80px;
              object-fit: contain;
            }
            
            .logo-fallback {
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 18px;
            }
            
            .company-name {
              font-size: 24px;
              font-weight: 700;
              color: #0f172a;
            }
            
            .header-right {
              text-align: right;
            }
            
            .document-title {
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            
            .client-name {
              font-size: 22px;
              font-weight: 700;
              color: #0f172a;
            }
            
            .project-name {
              font-size: 14px;
              color: #64748b;
              margin-top: 4px;
            }
            
            .section {
              margin-bottom: 32px;
            }
            
            .section-title {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #64748b;
              margin-bottom: 16px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
              font-weight: 600;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            
            .data-table th {
              text-align: left;
              padding: 12px 16px;
              background: #f8fafc;
              color: #64748b;
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .data-table th:last-child,
            .data-table td:last-child {
              text-align: right;
            }
            
            .data-table td {
              padding: 14px 16px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
            }
            
            .data-table tr:last-child td {
              border-bottom: none;
            }
            
            .mono {
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
            }
            
            .summary-box {
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              color: white;
              border-radius: 16px;
              padding: 28px;
              margin-top: 32px;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            
            .summary-item {
              padding: 16px;
              background: rgba(255,255,255,0.05);
              border-radius: 10px;
            }
            
            .summary-label {
              font-size: 11px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            
            .summary-value {
              font-family: 'JetBrains Mono', monospace;
              font-size: 18px;
              font-weight: 600;
            }
            
            .total-row {
              padding-top: 20px;
              border-top: 1px solid rgba(255,255,255,0.15);
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .total-label {
              font-size: 14px;
              color: #94a3b8;
            }
            
            .total-value {
              font-family: 'JetBrains Mono', monospace;
              font-size: 32px;
              font-weight: 700;
              color: #10b981;
            }
            
            .margin-badge {
              display: inline-block;
              padding: 4px 12px;
              background: ${(results?.margin_percent || 0) >= 30 ? '#10b981' : (results?.margin_percent || 0) >= 15 ? '#f59e0b' : '#ef4444'};
              color: white;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-left: 12px;
            }
            
            .footer {
              margin-top: 48px;
              padding-top: 24px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #94a3b8;
              font-size: 11px;
            }
            
            .footer-left {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            
            @media print {
              body {
                padding: 20px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .section {
                break-inside: avoid;
              }
              .summary-box {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              ${logoHtml}
              <span class="company-name">${companyName}</span>
            </div>
            <div class="header-right">
              <div class="document-title">Price Proposal</div>
              <div class="client-name">${clientName}</div>
              <div class="project-name">${projectName}</div>
            </div>
          </div>
          
          ${teamSection}
          ${vendorSection}
          
          <div class="summary-box">
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Internal Labor</div>
                <div class="summary-value">SAR ${formatCurrency(results?.labor_cost || 0, false)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Vendor Costs</div>
                <div class="summary-value">SAR ${formatCurrency(results?.vendor_cost || 0, false)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Overhead</div>
                <div class="summary-value">SAR ${formatCurrency(results?.overhead_cost || 0, false)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Net Profit</div>
                <div class="summary-value" style="color: #10b981;">SAR ${formatCurrency(results?.net_profit || 0, false)}</div>
              </div>
            </div>
            <div class="total-row">
              <div>
                <span class="total-label">Total Investment</span>
                <span class="margin-badge">${(results?.margin_percent || 0).toFixed(1)}% Margin</span>
              </div>
              <div class="total-value">SAR ${formatCurrency(results?.total_revenue || 0, false)}</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-left">
              <span>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>This proposal is valid for 30 days from the date of issue.</span>
            </div>
            ${salesOwner ? `<div>Prepared by: ${salesOwner}</div>` : ''}
          </div>
        </body>
        </html>
      `;
      
      // Open in new window and print
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('يرجى السماح بالنوافذ المنبثقة');
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content and fonts to load
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 300);
      };
      
      // Fallback if onload doesn't fire
      setTimeout(() => {
        printWindow.print();
      }, 1000);
      
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
