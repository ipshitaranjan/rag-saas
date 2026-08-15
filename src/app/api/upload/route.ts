import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { index } from '@/lib/pinecone';
import { supabase } from '@/lib/supabase';
import { uploadToS3 } from '@/lib/s3';
import mammoth from 'mammoth';

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const { extractText } = await import('unpdf');
    const uint8Array = new Uint8Array(buffer);
    const { text } = await extractText(uint8Array, { mergePages: true });
    return text;
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  } else if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
    return buffer.toString('utf-8');
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    filename.endsWith('.pptx')
  ) {
    const { parseOffice } = await import('officeparser');
    const ast = await parseOffice(buffer, { fileType: 'pptx' } as any);
    const text = typeof ast === 'string' ? ast : extractTextFromAST(ast);
    return text;
  }
  throw new Error('Unsupported file type');
}

function extractTextFromAST(ast: any): string {
  if (!ast) return '';
  if (typeof ast === 'string') return ast;
  if (Array.isArray(ast)) return ast.map(extractTextFromAST).join(' ');
  if (typeof ast === 'object') {
    const parts: string[] = [];
    if (ast.text) parts.push(ast.text);
    if (ast.children) parts.push(extractTextFromAST(ast.children));
    if (ast.content) parts.push(extractTextFromAST(ast.content));
    if (parts.length === 0) {
      return Object.values(ast).map(extractTextFromAST).join(' ');
    }
    return parts.join(' ');
  }
  return String(ast);
}

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const s3Key = await uploadToS3(buffer, file.name, file.type);
    console.log('Uploaded to S3:', s3Key);

    const text = await extractText(buffer, file.type, file.name);

    console.log('Extracted text length:', text.length);

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from file.' }, { status: 400 });
    }

    const chunks = chunkText(text);
    const filteredChunks = chunks.filter(c => c.trim().length > 0);

    if (filteredChunks.length === 0) {
      return NextResponse.json({ error: 'No valid text chunks found.' }, { status: 400 });
    }

    const embeddings = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: filteredChunks,
    });

    const vectors = embeddings.data.map((embedding, i) => ({
      id: `${file.name}-chunk-${i}-${Date.now()}`,
      values: embedding.embedding,
      metadata: {
        text: filteredChunks[i],
        filename: file.name,
        chunkIndex: i,
        conversationId: conversationId || 'default',
      },
    }));

    await index.upsert({ records: vectors } as any);

    if (conversationId) {
      await supabase.from('documents').insert({
        conversation_id: conversationId,
        filename: file.name,
        s3_key: s3Key,
      });

      const { data: conv } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', conversationId)
        .single();

      if (conv?.title === 'New Chat') {
        await supabase
          .from('conversations')
          .update({ title: file.name.replace(/\.[^/.]+$/, '') })
          .eq('id', conversationId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${vectors.length} chunks from ${file.name}`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}