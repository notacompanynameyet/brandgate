/** Terms and patterns are deliberately small, transparent and versionable. */
export const AI_SLOP_TERMS = [
  "delve", "dive deep", "unlock", "game-changer", "game changer", "leverage", "synergy",
  "seamless", "robust", "cutting-edge", "cutting edge", "revolutionize", "revolutionary",
  "in today's fast-paced", "fast-paced", "in a world where", "it is important to note", "let's explore",
  "at the end of the day", "join us on this journey", "paradigm shift", "harness the power",
  "elevate", "transformative", "navigate the", "without further ado", "ultimate"
] as const;

export const DEFAULT_BANNED_WORDS = ["literally", "obviously", "just", "simply", "cheap", "guaranteed"];

export const DEFAULT_HARD_RULES = [
  "No absolute promises (always, never, guaranteed)",
  "No invented statistics or unnamed customer claims",
  "No competitor attacks or discriminatory language"
];

export const MANUFACTURED_CLAIM_PATTERNS: readonly RegExp[] = [
  /\b(?:100%|one hundred percent)\s+(?:guaranteed|effective|safe|accurate)\b/gi,
  /\b(?:everyone|customers? everywhere|thousands of customers)\s+(?:uses?|loves?|is using)\b/gi,
  /\b(?:#?1|number one|the best)\s+(?:tool|product|platform|solution)\b/gi,
  /\b(?:studies|research|data|experts?)\s+(?:show|say|prove)\b/gi,
  /\b(?:up to|over|more than)\s+\d+%\s+(?:more|faster|better)\b/gi,
  /\b(?:guarantee|guarantees|guaranteed)\s+\d+%\s+(?:better|more|faster|results?|taste)\b/gi
];

export const AI_SLOP_STRUCTURAL_PATTERNS: readonly RegExp[] = [
  /(?:^|\n)\s*(?:introduction|key takeaways?|conclusion)\s*:/gi,
  /\b(?:firstly|secondly|thirdly|finally)\b/gi,
  /[✨🚀🔥💡🌟]{2,}/gu
];

export const HARD_RULE_PATTERNS: readonly RegExp[] = [
  /(?<!almost\s)\b(?:always|never|guaranteed|guarantee|no risk|risk[- ]free)\b/gi,
  /\b(?:idiot|stupid|dumb|crazy|insane)\b/gi,
  /\b(?:our competitor|competitor[s]?|unlike [a-z0-9]+)/gi,
  /\bcomment\s+["']?[A-Z][A-Z0-9 _-]*["']?\s+(?:below|down here)\b/gi
];
