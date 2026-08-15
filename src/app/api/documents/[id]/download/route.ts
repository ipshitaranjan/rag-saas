import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSignedDownloadUrl } from '@/lib/s3';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.s3_key) {
      return NextResponse.json({ error: 'File not available for download' }, { status: 404 });
    }

    const url = await getSignedDownloadUrl(document.s3_key);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to get download URL' }, { status: 500 });
  }
}