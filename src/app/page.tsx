import fs from 'fs';
import path from 'path';

export default function RootHomePage() {
  const htmlPath = path.join(process.cwd(), 'index.html');
  let htmlContent = '';

  try {
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
    // Extract inner HTML inside <body>...</body> so Next.js renders full page
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      htmlContent = bodyMatch[1];
    }
  } catch (e) {
    console.error('Failed to read index.html', e);
  }

  return (
    <>
      <link rel="stylesheet" href="/styles.css?v=20261004_v38" />
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js" async />
      <script src="/script.js?v=20261004_v38" defer />
    </>
  );
}
