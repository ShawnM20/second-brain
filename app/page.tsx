import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Brain, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">

      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-amber-400" />
          <span className="font-semibold text-sm tracking-tight">Second Brain</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-amber-400 hover:bg-amber-300 text-black transition-colors px-4 py-2 rounded-lg font-semibold"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero — two column */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div>
            <p className="text-xs font-mono text-amber-400 mb-8 tracking-wider uppercase">
              Personal Knowledge Base · RAG Pipeline
            </p>
            <h1 className="text-5xl lg:text-[3.75rem] font-bold tracking-tight leading-[1.05] mb-6">
              Stop digging<br />through files.<br />
              <span className="text-amber-400">Just ask.</span>
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-sm">
              Upload your PDFs, notes, and docs. Ask anything in plain English.
              Get answers drawn directly from your content — with citations.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/sign-up"
                className="bg-white text-black hover:bg-zinc-100 transition-colors px-6 py-3 rounded-xl font-semibold text-sm inline-flex items-center gap-2"
              >
                Try it free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in"
                className="text-sm text-zinc-500 hover:text-white transition-colors"
              >
                Already have an account →
              </Link>
            </div>
          </div>

          {/* Right — product mockup */}
          <div className="bg-[#161616] border border-[#252525] rounded-2xl overflow-hidden shadow-2xl">
            {/* Window chrome */}
            <div className="border-b border-[#252525] px-4 py-3 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#333]" />
              <span className="text-xs text-zinc-600 ml-2 font-mono">second-brain / chat</span>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4 min-h-[280px]">
              <MockMessage
                role="user"
                text="What were the key takeaways from my Q3 report?"
              />
              <MockMessage
                role="ai"
                text="Based on your Q3 report [Source 1], the three main takeaways were: revenue grew 18% YoY, customer churn dropped to 4.2%, and the new enterprise tier exceeded projections by 23%."
              />
              <MockMessage
                role="user"
                text="Which product line drove most of that growth?"
              />
              <div className="flex items-center gap-2 text-zinc-600 text-xs pl-1 pt-1">
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                </span>
                Searching your documents…
              </div>
            </div>

            {/* Input bar */}
            <div className="border-t border-[#252525] px-4 py-3">
              <div className="bg-[#0d0d0d] border border-[#252525] rounded-lg px-4 py-2.5 text-sm text-zinc-600 font-mono">
                Ask anything about your documents_
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className="border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-14">
            How it works
          </p>
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1a1a1a]">
            {[
              {
                n: "01",
                title: "Upload",
                body: "Drop in a PDF, Word doc, Markdown, or plain text file. Text is extracted, split into overlapping chunks, and sent to Voyage AI for embedding.",
              },
              {
                n: "02",
                title: "Index",
                body: "512-dimensional vectors are stored in Supabase with an HNSW index. Retrieval stays under 100ms even with hundreds of documents.",
              },
              {
                n: "03",
                title: "Chat",
                body: "Your question is embedded and matched against stored chunks. Top results are injected into Llama 3.3's context as grounded evidence before it replies.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="px-0 sm:px-10 py-8 first:pl-0 last:pr-0">
                <p className="text-5xl font-black text-[#1f1f1f] font-mono mb-5 leading-none select-none">
                  {n}
                </p>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="border-t border-[#1a1a1a] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-10">
            Built with
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Framework", value: "Next.js 16" },
              { label: "Database", value: "Supabase + pgvector" },
              { label: "Embeddings", value: "Voyage AI" },
              { label: "LLM", value: "Groq · Llama 3.3 70B" },
              { label: "Auth", value: "Clerk" },
              { label: "AI SDK", value: "Vercel AI SDK" },
              { label: "Styling", value: "Tailwind CSS" },
              { label: "Language", value: "TypeScript" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-[#141414] border border-[#232323] rounded-xl p-4 hover:border-[#333] transition-colors"
              >
                <p className="text-[11px] font-mono text-zinc-600 mb-1">{label}</p>
                <p className="text-sm text-zinc-200 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Ready to try it?</h2>
            <p className="text-zinc-500 text-sm">Free to use. No credit card required.</p>
          </div>
          <Link
            href="/sign-up"
            className="bg-amber-400 hover:bg-amber-300 text-black transition-colors px-7 py-3 rounded-xl font-semibold text-sm inline-flex items-center gap-2 whitespace-nowrap flex-shrink-0"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}

function MockMessage({ role, text }: { role: "user" | "ai"; text: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-amber-400 text-black text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[82%] font-medium leading-snug">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 items-start">
      <div className="h-6 w-6 rounded-full bg-[#222] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#2e2e2e]">
        <Brain className="h-3 w-3 text-amber-400" />
      </div>
      <div className="bg-[#1c1c1c] text-zinc-300 text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] leading-relaxed border border-[#252525]">
        {text}
      </div>
    </div>
  );
}
