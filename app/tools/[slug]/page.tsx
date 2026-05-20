import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TOOL_BY_SLUG, TOOLS } from "@/lib/tools";
import { ToolClientPage } from "./tool-client";

export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const tool = TOOL_BY_SLUG[params.slug as keyof typeof TOOL_BY_SLUG];
  if (!tool) {
    return { title: "Tool not found" };
  }

  return {
    title: tool.title,
    description: tool.description,
  };
}

export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = TOOL_BY_SLUG[params.slug as keyof typeof TOOL_BY_SLUG];
  if (!tool) notFound();

  return <ToolClientPage slug={params.slug} />;
}
