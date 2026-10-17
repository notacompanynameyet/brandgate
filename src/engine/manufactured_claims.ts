import type { BrandProfile } from "@/types";
import { checkRules } from "./rules";
export const checkManufacturedClaims = (text: string, profile?: Partial<BrandProfile>) => checkRules(text, profile).spans.filter((span) => span.category === "manufactured-claim");
