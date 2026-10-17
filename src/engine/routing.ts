import type { Channel } from "@/types";

export interface RoutedPost { channel: Channel; text: string; index: number; }
export interface ChannelRouting {
  recommended_format: string;
  warnings: string[];
  media_required: number;
  preview: RoutedPost[];
}

export function splitThreads(text: string, limit = 500): string[] {
  if (text.length <= limit) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const result: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && `${current} ${sentence}`.length > limit) { result.push(current); current = sentence; }
    else current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) result.push(current);
  return result;
}

export function routeContent(text: string, channel: Channel = "generic"): RoutedPost[] {
  const pieces = channel === "threads" ? splitThreads(text) : [text];
  return pieces.map((piece, index) => ({ channel, text: channel === "threads" && pieces.length > 1 ? `${piece}\n\n${index + 1}/${pieces.length}` : piece, index }));
}

export function routeDetails(text: string, channel: Channel = "generic", mediaCount = 0): ChannelRouting {
  const preview = routeContent(text, channel);
  const warnings: string[] = [];
  let recommended_format = "single post";
  let media_required = 0;
  if (channel === "threads") recommended_format = preview.length > 1 ? "numbered Threads sequence" : "single Threads post";
  if (channel === "x" || channel === "twitter") {
    recommended_format = "short post";
    if (text.length > 280) warnings.push("Draft exceeds the 280-character X limit.");
  }
  if (channel === "linkedin") {
    recommended_format = "text post";
    if (text.length > 3_000) warnings.push("Draft exceeds a practical LinkedIn text-post length.");
    if (/https?:\/\//i.test(text)) warnings.push("Outbound links can reduce LinkedIn distribution; consider placing the link in the first comment.");
  }
  if (channel === "instagram") {
    recommended_format = mediaCount > 1 ? "carousel caption" : "single-image caption";
    media_required = 1;
    if (text.length > 2_200) warnings.push("Instagram captions are limited to 2,200 characters.");
  }
  if (channel === "pinterest") {
    recommended_format = "pin description";
    media_required = 1;
    if (text.length > 500) warnings.push("Pinterest descriptions should stay below 500 characters.");
  }
  return { recommended_format, warnings, media_required, preview };
}

export const route = routeContent;
