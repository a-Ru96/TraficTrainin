import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CATS, SIGNS } from "@/lib/signs";
import { FACTS } from "@/lib/facts";
import { MORE_QUESTIONS } from "@/lib/questions";
import { ALL_CARDS, buildQuiz } from "@/lib/deck";

const root = path.resolve(process.cwd());

describe("sign data", () => {
  it("has unique ids and unique names", () => {
    const ids = SIGNS.map((s) => s.id);
    const names = SIGNS.map((s) => s.en);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every sign a name, tip and valid category", () => {
    const cats = new Set(CATS.map((c) => c.key));
    for (const s of SIGNS) {
      expect(s.en.length, s.id).toBeGreaterThan(2);
      expect(s.tip.length, s.id).toBeGreaterThan(5);
      expect(cats.has(s.cat), `${s.id} category`).toBe(true);
    }
  });

  it("has an image file or an SVG fallback for every sign", () => {
    for (const s of SIGNS) {
      if (s.img) expect(fs.existsSync(path.join(root, "public", s.img)), `${s.id} image file`).toBe(true);
      else expect(s.frame && s.icon, `${s.id} needs an image or an SVG fallback`).toBeTruthy();
    }
  });

  it("gives every dashboard light a colour", () => {
    for (const s of SIGNS.filter((x) => x.cat === "dashboard")) expect(["red", "amber", "green"]).toContain(s.color);
  });

  it("builds one flashcard per sign and per fact with unique ids", () => {
    expect(ALL_CARDS.length).toBe(SIGNS.length + FACTS.length);
    expect(new Set(ALL_CARDS.map((c) => c.id)).size).toBe(ALL_CARDS.length);
  });
});

describe("written questions", () => {
  const all = [
    ...FACTS.map((f) => ({ id: f.id, options: f.options, a: f.a, q: f.q })),
    ...MORE_QUESTIONS.map((m) => ({ id: m.id, options: m.options, a: m.a, q: m.q })),
  ];

  it("has unique ids", () => {
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
  });

  it("has four distinct options and a valid answer index", () => {
    for (const q of all) {
      expect(q.options.length, q.id).toBe(4);
      expect(new Set(q.options).size, `${q.id} duplicate options`).toBe(4);
      expect(q.a, q.id).toBeGreaterThanOrEqual(0);
      expect(q.a, q.id).toBeLessThan(4);
      expect(q.q.endsWith("?") || q.q.endsWith("…"), `${q.id} should read as a question`).toBe(true);
    }
  });
});

describe("quiz builder", () => {
  const cats = ["all", ...CATS.map((c) => c.key)] as const;

  it("always returns well-formed questions (200 runs per category)", () => {
    for (const cat of cats) {
      for (let run = 0; run < 200; run++) {
        const qs = buildQuiz(cat as any, 10);
        expect(qs.length, `${cat} count`).toBeGreaterThan(0);
        expect(new Set(qs.map((q) => q.id)).size, `${cat} duplicate question in one round`).toBe(qs.length);
        for (const q of qs) {
          expect(q.options.length, `${cat}/${q.id} option count`).toBeGreaterThanOrEqual(2);
          expect(q.answer, `${cat}/${q.id} answer index`).toBeGreaterThanOrEqual(0);
          expect(q.answer, `${cat}/${q.id} answer index`).toBeLessThan(q.options.length);
          expect(q.explain.length, `${cat}/${q.id} explain`).toBeGreaterThan(5);
          const keys = q.options.map((o) => o.label ?? o.signId);
          expect(keys.every(Boolean), `${cat}/${q.id} empty option`).toBe(true);
          expect(new Set(keys).size, `${cat}/${q.id} duplicate options ${JSON.stringify(keys)}`).toBe(keys.length);
        }
      }
    }
  });

  it("puts the right sign behind the answer index for name-to-sign questions", () => {
    for (let run = 0; run < 300; run++) {
      for (const q of buildQuiz("all", 10).filter((x) => x.kind === "n2s")) {
        const answerId = q.options[q.answer].signId!;
        const sign = SIGNS.find((s) => s.id === answerId)!;
        expect(q.prompt).toContain(sign.en);
      }
    }
  });

  it("keeps true/false answers consistent with the shown sign", () => {
    for (let run = 0; run < 300; run++) {
      for (const q of buildQuiz("all", 10).filter((x) => x.kind === "tf")) {
        const sign = SIGNS.find((s) => s.id === q.signId)!;
        const claimed = q.prompt.match(/“(.*)”/)![1];
        expect(q.options[q.answer].label).toBe(claimed === sign.en ? "True" : "False");
      }
    }
  });
});
