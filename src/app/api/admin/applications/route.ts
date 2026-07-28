import { NextRequest, NextResponse } from 'next/server';
import { 
  getApplicationsStore, 
  updateApplicationStatusStore, 
  addApplicationNoteStore 
} from '@/lib/store';

export async function GET() {
  const apps = getApplicationsStore();
  return NextResponse.json({
    success: true,
    data: apps,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, note, author } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Application ID is required' }, { status: 400 });
    }

    let updated = null;

    if (status) {
      updated = updateApplicationStatusStore(id, status);
    }

    if (note) {
      updated = addApplicationNoteStore(id, author || 'Admin', note);
    }

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to update' }, { status: 500 });
  }
}
