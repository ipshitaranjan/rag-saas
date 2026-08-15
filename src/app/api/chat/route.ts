import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { index } from '@/lib/pinecone';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { message, history, conversationId } = await req.json();

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    const matches = queryResponse.matches;

    const context = matches
      .map((match) => `[Source: ${match.metadata?.filename}]\n${match.metadata?.text}`)
      .filter(Boolean)
      .join('\n\n');

    const sources = [...new Set(
      matches
        .map((match) => match.metadata?.filename as string)
        .filter(Boolean)
    )];

    const messages: any[] = [
      {
        role: 'system',
        content: `You are a helpful AI assistant. Answer questions based on the following context from uploaded documents. If the answer is not in the context, say you don't have that information. Always be concise and accurate.

Context:
${context}`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    if (conversationId) {
      await supabase.from('messages').insert([
        { conversation_id: conversationId, role: 'user', content: message },
        { conversation_id: conversationId, role: 'assistant', content: reply },
      ]);

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return NextResponse.json({ reply, sources });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}