import { SIGNS, SIGN_MAP, CatKey } from "./signs";
import { FACTS } from "./facts";
import { sample, shuffle } from "./util";

export interface Card {
  id: string;
  cat: CatKey;
  signId?: string;
  front: string;
  back: string;
  backSub?: string;
  tip?: string;
}

export const ALL_CARDS: Card[] = [
  ...SIGNS.map<Card>((s) => ({
    id: `s:${s.id}`, cat: s.cat, signId: s.id,
    front: "What does this sign mean?", back: s.en, tip: s.tip,
  })),
  ...FACTS.map<Card>((f) => ({
    id: `f:${f.id}`, cat: "safety",
    front: f.title, back: f.text,
  })),
];

export function deckFor(cat: CatKey | "all"): Card[] {
  return cat === "all" ? ALL_CARDS : ALL_CARDS.filter((c) => c.cat === cat);
}

// ---------- Quiz ----------
export interface Option { label?: string; signId?: string }
export interface Question {
  id: string;
  kind: "s2n" | "n2s" | "fact";
  prompt: string;
  signId?: string;
  options: Option[];
  answer: number;
  explain: string;
}

function signQuestion(id: string, kind: "s2n" | "n2s"): Question {
  const s = SIGN_MAP[id];
  const same = SIGNS.filter((x) => x.id !== id && x.cat === s.cat && x.en !== s.en);
  const other = SIGNS.filter((x) => x.id !== id && x.cat !== s.cat && x.en !== s.en);
  const pool = [...sample(same, 3), ...sample(other, 3)].slice(0, 3);
  // top up from other categories if the same category has too few
  const distractors = pool.length >= 3 ? pool : [...pool, ...sample(other, 3 - pool.length)];
  const opts = shuffle([s, ...distractors]);
  const answer = opts.findIndex((o) => o.id === id);
  const explain = `${s.en} — ${s.tip}`;
  if (kind === "s2n") {
    return { id: `${kind}:${id}`, kind, prompt: "What does this sign mean?", signId: id,
      options: opts.map((o) => ({ label: o.en })), answer, explain };
  }
  return { id: `${kind}:${id}`, kind, prompt: `Which one is “${s.en}”?`,
    options: opts.map((o) => ({ signId: o.id })), answer, explain };
}

function factQuestion(id: string): Question {
  const f = FACTS.find((x) => x.id === id)!;
  const order = shuffle(f.options.map((label, i) => ({ label, i })));
  return { id: `fact:${id}`, kind: "fact", prompt: f.q, options: order.map((o) => ({ label: o.label })),
    answer: order.findIndex((o) => o.i === f.a), explain: `${f.title}: ${f.text}` };
}

export function buildQuiz(cat: CatKey | "all", n = 10): Question[] {
  const signMix = (ids: string[], count: number) =>
    sample(ids, count).map((id) => signQuestion(id, Math.random() < 0.7 ? "s2n" : "n2s"));
  if (cat === "safety") return sample(FACTS.map((f) => f.id), n).map(factQuestion);
  if (cat === "all") {
    const nFacts = Math.round(n * 0.3);
    return shuffle([
      ...signMix(SIGNS.map((s) => s.id), n - nFacts),
      ...sample(FACTS.map((f) => f.id), nFacts).map(factQuestion),
    ]);
  }
  const ids = SIGNS.filter((s) => s.cat === cat).map((s) => s.id);
  return signMix(ids, Math.min(n, ids.length));
}
