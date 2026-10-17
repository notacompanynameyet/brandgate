import type { BrandProfile } from "@/types";
import { checkRules } from "./rules";
export const checkBannedWords = (text: string, profile?: Partial<BrandProfile>) => checkRules(text, profile).spans.filter((span) => span.category === "banned-word");
