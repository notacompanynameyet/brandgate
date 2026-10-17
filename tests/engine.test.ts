import assert from "node:assert/strict";
import test from "node:test";
import {
  checkRules,
  detectSpans,
  extractDNA,
  routeContent
} from "@/engine";

test("detectSpans finds AI-slop terms case-insensitively with source offsets", () => {
  const text = "Unlock a robust workflow for your team.";
  const spans = detectSpans(text);

  assert.deepEqual(
    spans.filter((span) => span.category === "ai-slop").map((span) => span.text),
    ["Unlock", "robust"]
  );
  assert.equal(text.slice(spans[0].start, spans[0].end), spans[0].text);
});

test("checkRules applies custom brand words and hard-rule failures", () => {
  const result = checkRules("Our competitor is always wrong and this is forbidden.", {
    bannedWords: ["forbidden"]
  });

  assert.equal(result.pass, false);
  assert.ok(result.spans.some((span) => span.category === "hard-rule"));
  assert.ok(result.spans.some((span) => span.category === "banned-word"));
  assert.ok(result.findings.length >= 2);
  assert.ok(result.score < 100);
});

test("extractDNA summarizes valid samples and rejects too-small inputs", () => {
  const posts = [
    "Build calm systems for thoughtful teams.",
    "Thoughtful teams build systems that last.",
    "Calm systems make hard work feel clear."
  ];
  const dna = extractDNA(posts);

  assert.equal(dna.sampleCount, 3);
  assert.ok(dna.vocabulary.includes("systems"));
  assert.equal(dna.sentenceLength.range.length, 2);
  assert.ok(dna.punctuation);
  assert.throws(() => extractDNA(posts.slice(0, 2)), /requires between 3 and 10 posts/);
});

test("routeContent preserves generic content and splits long Threads content", () => {
  assert.deepEqual(routeContent("A short post", "generic"), [
    { channel: "generic", text: "A short post", index: 0 }
  ]);

  const longText = Array.from(
    { length: 20 },
    (_, index) => `Sentence ${index + 1} explains a useful, repeatable workflow.`
  ).join(" ");
  const pieces = routeContent(longText, "threads");
  assert.ok(pieces.length > 1);
  assert.equal(pieces[0].index, 0);
  assert.match(pieces[0].text, /1\//);
  assert.match(pieces.at(-1)?.text ?? "", new RegExp(`${pieces.length}/${pieces.length}`));
});
