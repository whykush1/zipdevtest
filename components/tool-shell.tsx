import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ToolShell({ title, description, children }: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
        ← Back to all tools
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">{title}</h1>
      <p className="mt-2 text-zinc-600">{description}</p>
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6">{children}</section>
    </main>
  );
}
