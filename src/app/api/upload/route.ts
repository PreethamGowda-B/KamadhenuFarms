import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'kamadhenu_resumes';

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'kamadhenuhoneyfarms';
    const apiKey = process.env.CLOUDINARY_API_KEY || '112225381679784';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'kLQ6QF5R9g-yV7VyhOArLKm5XLg';

    // 1. Signed Cloudinary Upload
    if (cloudName && apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('api_key', apiKey);
      cloudinaryFormData.append('timestamp', timestamp.toString());
      cloudinaryFormData.append('signature', signature);
      cloudinaryFormData.append('folder', folder);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      const json = await cloudinaryRes.json();
      if (cloudinaryRes.ok && json.secure_url) {
        return NextResponse.json({
          success: true,
          url: json.secure_url,
          public_id: json.public_id,
        });
      }
      console.error('Cloudinary API error:', json);
    }

    // 2. Base64 / Data URL fallback
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error('File upload API error:', error);
    return NextResponse.json({ success: false, message: 'File upload failed' }, { status: 500 });
  }
}
