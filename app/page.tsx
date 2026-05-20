import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, TOOLS } from "@/lib/tools";
import { SearchBar } from "./search-bar";

export const metadata: Metadata = {
  title: "Home",
  description: "Find browser-based tools for video, audio, images, PDF, and utility workflows.",
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
        <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          zip.dev MVP
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">All-in-one browser tools hub</h1>
        <p className="mt-3 max-w-3xl text-zinc-600">
          Convert, trim, compress, merge, and package files directly in your browser. No uploads to a server.
        </p>
        <div className="mt-5">
          <SearchBar />
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <span
              key={category}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
              data-category={category}
            >
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" id="tool-grid">
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group rounded-xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md"
            data-tool-card
            data-title={tool.title.toLowerCase()}
            data-description={tool.description.toLowerCase()}
            data-category={tool.category}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{tool.category}</p>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900 group-hover:text-blue-700">{tool.title}</h3>
            <p className="mt-2 text-sm text-zinc-600">{tool.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
