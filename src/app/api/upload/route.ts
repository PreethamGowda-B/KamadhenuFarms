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

    // Enforce 5MB file size limit per file
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: `File is too large. Maximum allowed size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.` },
        { status: 413 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'kcr1lyfv';
    const apiKey = process.env.CLOUDINARY_API_KEY || '112225381679784';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'kLQ6QF5R9g-yV7VyhOArLKm5XLg';

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'File upload service is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Signed Cloudinary Upload
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

    // Cloudinary returned an error — surface it clearly
    console.error('Cloudinary upload failed:', JSON.stringify(json));
    return NextResponse.json(
      {
        success: false,
        message: json.error?.message || 'File upload to cloud storage failed. Please try a smaller file or try again.',
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('File upload API error:', error);
    return NextResponse.json({ success: false, message: 'File upload failed. Please try again.' }, { status: 500 });
  }
}
