import { DocTypeKey, DocumentSnapshotData, generateDocumentHtml } from './templates';

export function printDocumentHtml(htmlContent: string, title: string) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to preview and download PDF documents.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Inter', sans-serif;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function downloadDocumentHtml(htmlContent: string, filename: string) {
  if (typeof window === 'undefined') return;

  const blob = new Blob([
    `<!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; padding: 20px; font-family: sans-serif; }
        </style>
      </head>
      <body>${htmlContent}</body>
    </html>`
  ], { type: 'text/html;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
