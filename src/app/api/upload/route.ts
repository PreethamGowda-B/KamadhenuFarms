import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminSessionFromRequest, checkRateLimitDistributed, getClientIp } from '@/lib/auth';
import { getSalesSessionFromRequest } from '@/lib/salesAuth';

const ALLOWED_FOLDERS = new Set(['kamadhenu_resumes', 'kamadhenu_shops', 'kamadhenu_products']);
const RESUME_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const IMAGE_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp']);

function hasValidMagicBytes(buf: Buffer, mime: string): boolean {
  if (buf.length < 4) return false;
  if (mime === 'application/pdf') {
    return buf.subarray(0, 4).toString('ascii') === '%PDF';
  }
  if (mime === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/webp') {
    return buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return buf[0] === 0x50 && buf[1] === 0x4b; // ZIP container for DOCX
  }
  if (mime === 'application/msword') {
    return buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0; // OLE2 DOC
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = await checkRateLimitDistributed(`upload:${ip}`, 20, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many file uploads. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = ((formData.get('folder') as string) || 'kamadhenu_resumes').trim();
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : null;

    if (!folder) {
      return NextResponse.json(
        { success: false, message: 'Invalid upload destination folder.' },
        { status: 400 }
      );
    }

    // Require Sales Executive or Admin authentication for internal CRM / catalog uploads
    if (folder !== 'kamadhenu_resumes') {
      const [salesSession, adminSession] = await Promise.all([
        getSalesSessionFromRequest(req),
        Promise.resolve(getAdminSessionFromRequest(req)),
      ]);
      if (!salesSession && !adminSession) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized upload request.' },
          { status: 401 }
        );
      }
    }

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 });
    }

    // Enforce 5MB file size limit per file
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: `File size must be between 1B and 5MB.` },
        { status: 413 }
      );
    }

    const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
    const allowedMimes = folder === 'kamadhenu_resumes' ? RESUME_ALLOWED_MIME : IMAGE_ALLOWED_MIME;
    if (!allowedMimes.has(file.type) || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, message: 'Unsupported file format. Only approved document/image formats are permitted.' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidMagicBytes(fileBuffer, file.type)) {
      return NextResponse.json(
        { success: false, message: 'File content does not match the declared file type.' },
        { status: 400 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary configuration error: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is missing.');
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
