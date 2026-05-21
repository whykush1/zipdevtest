import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOL_BY_SLUG, TOOLS } from "@/lib/tools";
import { ToolClientPage } from "./tool-client";

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOL_BY_SLUG[slug as keyof typeof TOOL_BY_SLUG];
  if (!tool) {
    return { title: "Tool not found" };
  }

  return {
    title: tool.title,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = TOOL_BY_SLUG[slug as keyof typeof TOOL_BY_SLUG];
  if (!tool) notFound();

  return <ToolClientPage slug={slug} />;
}
