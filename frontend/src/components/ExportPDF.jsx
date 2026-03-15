import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function ExportPDF({ opportunity, results }) {
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    setExporting(true);
    
    try {
      // Create a print-friendly HTML document
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Price Proposal - ${opportunity.opportunity_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Manrope', sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .logo {
              width: 60px;
              height: 60px;
              background: #0f172a;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 18px;
            }
            
            .header-right {
              text-align: right;
            }
            
            .document-title {
              font-size: 14px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 4px;
            }
            
            .client-name {
              font-size: 24px;
              font-weight: 700;
              color: #0f172a;
            }
            
            .opportunity-name {
              font-size: 16px;
              color: #64748b;
              margin-top: 4px;
            }
            
            .section {
              margin-bottom: 32px;
            }
            
            .section-title {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #64748b;
              margin-bottom: 16px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .scope-card {
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 16px;
            }
            
            .scope-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            
            .scope-name {
              font-size: 16px;
              font-weight: 600;
              color: #0f172a;
            }
            
            .scope-total {
              font-family: 'JetBrains Mono', monospace;
              font-size: 16px;
              font-weight: 600;
              color: #0f172a;
            }
            
            .product-list {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            
            .product-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .product-item:last-child {
              border-bottom: none;
            }
            
            .product-name {
              color: #475569;
            }
            
            .product-price {
              font-family: 'JetBrains Mono', monospace;
              color: #0f172a;
            }
            
            .summary-box {
              background: #0f172a;
              color: white;
              border-radius: 12px;
              padding: 24px;
              margin-top: 32px;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .summary-row:last-child {
              border-bottom: none;
            }
            
            .summary-label {
              color: #94a3b8;
            }
            
            .summary-value {
              font-family: 'JetBrains Mono', monospace;
              font-weight: 500;
            }
            
            .total-row {
              margin-top: 16px;
              padding-top: 16px;
              border-top: 2px solid rgba(255,255,255,0.2);
            }
            
            .total-label {
              font-size: 14px;
              color: #94a3b8;
            }
            
            .total-value {
              font-family: 'JetBrains Mono', monospace;
              font-size: 28px;
              font-weight: 700;
            }
            
            .footer {
              margin-top: 48px;
              padding-top: 24px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #94a3b8;
              font-size: 12px;
            }
            
            @media print {
              body {
                padding: 20px;
              }
              .scope-card {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">OPE</div>
            <div class="header-right">
              <div class="document-title">Price Proposal</div>
              <div class="client-name">${opportunity.client}</div>
              <div class="opportunity-name">${opportunity.opportunity_name}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Scope Breakdown</div>
            ${results.scopes?.map(scope => `
              <div class="scope-card">
                <div class="scope-header">
                  <div class="scope-name">${scope.name}</div>
                  <div class="scope-total">SAR ${formatCurrency(scope.vendor_revenue + (scope.labor_cost * 1.5), false)}</div>
                </div>
                <div class="product-list">
                  ${scope.products?.map(product => `
                    <div class="product-item">
                      <span class="product-name">${product.name}</span>
                      <span class="product-price">SAR ${formatCurrency(product.estimated_revenue || product.labor_cost * 1.5, false)}</span>
                    </div>
                  `).join('') || '<div class="product-item"><span class="product-name">No products</span></div>'}
                </div>
              </div>
            `).join('') || ''}
          </div>
          
          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Subtotal (Services)</span>
              <span class="summary-value">SAR ${formatCurrency(results.summary?.total_revenue - (results.summary?.vendor_revenue || 0) - (results.summary?.staffing_revenue || 0), false)}</span>
            </div>
            ${results.summary?.vendor_revenue > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Third Party Services</span>
                <span class="summary-value">SAR ${formatCurrency(results.summary.vendor_revenue, false)}</span>
              </div>
            ` : ''}
            ${results.summary?.staffing_revenue > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Staffing Services</span>
                <span class="summary-value">SAR ${formatCurrency(results.summary.staffing_revenue, false)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <div class="total-label">Total Investment</div>
              <div class="total-value">SAR ${formatCurrency(results.summary?.total_revenue, false)}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>This proposal is valid for 30 days from the date of issue.</p>
          </div>
        </body>
        </html>
      `;
      
      // Open in new window and print
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for fonts to load
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      toast.success('PDF generated! Use browser print dialog to save.');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      disabled={exporting}
      className="w-full gap-2"
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
