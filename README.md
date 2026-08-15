# DocuMind — AI Document Intelligence Platform

DocuMind is a RAG (Retrieval-Augmented Generation) SaaS platform that lets you upload documents and have AI-powered conversations about their content. Built with Next.js, OpenAI, Pinecone, Supabase, and AWS S3.

---

## 🚀 Features

- **Multi-format document support** — Upload PDF, DOCX, TXT, CSV, and PPTX files
- **AI-powered Q&A** — Ask questions and get answers grounded strictly in your documents
- **Source citations** — Every answer shows which document it came from
- **Persistent chat history** — All conversations saved to PostgreSQL via Supabase
- **File storage** — Raw files stored permanently in AWS S3 with download support
- **Per-conversation isolation** — Each chat only searches its own uploaded documents
- **Collapsible sidebar** — Clean ChatGPT-inspired UI with dark/light mode
- **New chat flow** — Each conversation starts fresh with its own document context

---

## 🧠 How It Works

### Upload Pipeline
1. User uploads a file (PDF, DOCX, TXT, CSV, PPTX)
2. File is stored in **AWS S3** for permanent storage and future download
3. Text is extracted using format-specific parsers (unpdf, mammoth, officeparser)
4. Text is split into **500-character chunks** with **50-character overlap** using a sliding window algorithm — overlap ensures no context is lost at boundaries
5. Each chunk is converted into a **1536-dimensional vector** using OpenAI's `text-embedding-3-small` model
6. Vectors are upserted into **Pinecone** with metadata: `{ filename, chunkIndex, conversationId }`
7. Document record is saved to **Supabase** linked to the conversation

### Query Pipeline
1. User sends a question
2. Question is embedded using the same OpenAI model
3. **Pinecone** performs cosine similarity search — returns top 5 most relevant chunks, filtered by `conversationId` so results never bleed across conversations
4. Retrieved chunks are assembled into a context block with source attribution
5. Context + conversation history + question are sent to **GPT-4o mini**
6. GPT answers strictly based on provided context — no hallucination
7. Answer + source citations returned to user
8. Both messages saved to Supabase for conversation history

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, Tailwind CSS, TypeScript |
| LLM | OpenAI GPT-4o mini |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Vector DB | Pinecone (serverless, cosine similarity) |
| Database | PostgreSQL via Supabase |
| File Storage | AWS S3 |
| Document Parsing | unpdf, mammoth, officeparser |

---

## 📁 Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts
│   │   ├── upload/
│   │   │   └── route.ts
│   │   ├── conversations/
│   │   └── documents/
│   │       └── [id]/
│   │           └── download/
│   │               └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Chat.tsx
│   └── Sidebar.tsx
└── lib/
    ├── openai.ts
    ├── pinecone.ts
    ├── s3.ts
    └── supabase.ts
```
---

## ⚙️ Setup

### 1. Clone the repository
```bash
git clone https://github.com/ipshitaranjan/rag-saas.git
cd rag-saas
npm install
```

### 2. Set up environment variables
Create a `.env.local` file in the root:
```env
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=rag-documents
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_bucket_name
```

### 3. Set up Supabase tables
Run this SQL in your Supabase SQL editor:
```sql
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  s3_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Set up Pinecone
- Create a new index named `rag-documents`
- Dimension: `1536`
- Metric: `cosine`
- Type: `dense`
- Capacity: `serverless`

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 API Keys Required

| Service | Purpose | Get it at |
|---|---|---|
| OpenAI | LLM + Embeddings | platform.openai.com |
| Pinecone | Vector database | pinecone.io |
| Supabase | PostgreSQL database | supabase.com |
| AWS | S3 file storage | aws.amazon.com |

---

## 👩‍💻 Built By

Ipshita Ranjan — Full Stack AI Engineer Intern at The Vinci Labs