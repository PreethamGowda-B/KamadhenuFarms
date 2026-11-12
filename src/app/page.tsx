import fs from 'fs';
import path from 'path';
import { GalleryLightboxSection } from '@/components/home/GalleryLightboxSection';

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
    // Strip any nested <script> tags to prevent duplicate script execution
    htmlContent = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  } catch (e) {
    console.error('Failed to read index.html', e);
  }

  const galleryStartToken = '<section class="gallery" id="gallery">';
  const galleryStartIdx = htmlContent.indexOf(galleryStartToken);
  const galleryEndIdx =
    galleryStartIdx !== -1 ? htmlContent.indexOf('</section>', galleryStartIdx) : -1;

  const beforeGalleryHtml =
    galleryStartIdx !== -1 && galleryEndIdx !== -1
      ? htmlContent.slice(0, galleryStartIdx)
      : htmlContent;
  const afterGalleryHtml =
    galleryStartIdx !== -1 && galleryEndIdx !== -1
      ? htmlContent.slice(galleryEndIdx + '</section>'.length)
      : '';

  return (
    <>
      <link rel="stylesheet" href="/styles.css?v=20261112_v88" />
      <div dangerouslySetInnerHTML={{ __html: beforeGalleryHtml }} />
      {galleryStartIdx !== -1 && galleryEndIdx !== -1 && <GalleryLightboxSection />}
      {afterGalleryHtml && <div dangerouslySetInnerHTML={{ __html: afterGalleryHtml }} />}
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js" async />
      <script src="/script.js?v=20261112_v88" defer />
    </>
  );
}
