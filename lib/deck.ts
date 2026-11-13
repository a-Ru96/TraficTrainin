import { SIGNS, SIGN_MAP, CatKey, Cat, SignDef } from "./signs";
import { FACTS } from "./facts";
import { MORE_QUESTIONS } from "./questions";
import { sample, shuffle } from "./util";

// ---------- Flashcards ----------
export type Tone = "red" | "amber" | "green";
export interface Card {
  id: string;
  cat: CatKey;
  signId?: string;
  front: string;
  back: string;
  tip?: string;
  badge?: { text: string; tone: Tone };
}

const TONE_TEXT: Record<Tone, string> = { red: "Red warning light", amber: "Amber warning light", green: "Green indicator" };

export const ALL_CARDS: Card[] = [
  ...SIGNS.map<Card>((s) => ({
    id: `s:${s.id}`, cat: s.cat, signId: s.id,
    front: s.cat === "dashboard" ? "What does this warning light mean?" : "What does this sign mean?",
    back: s.en, tip: s.tip,
    badge: s.color ? { text: TONE_TEXT[s.color], tone: s.color } : undefined,
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
export type Kind = "s2n" | "n2s" | "s2tip" | "s2cat" | "tf" | "urgency" | "fact";
export interface Question {
  id: string;
  kind: Kind;
  prompt: string;
  signId?: string;
  options: Option[];
  answer: number;
  explain: string;
}

const GROUP_LABEL: Record<Exclude<Cat, "dashboard">, string> = {
  warning: "Warning sign",
  prohibit: "Rules and prohibitions",
  speed: "Speed-related sign",
  mandatory: "Mandatory (you must do this)",
  info: "Information sign",
};

const URGENCY: { tone: Tone | "blue"; label: string }[] = [
  { tone: "red", label: "Red: urgent. Stop safely and deal with it" },
  { tone: "amber", label: "Amber: a fault or caution. Get it checked soon" },
  { tone: "green", label: "Green: a system is switched on and working" },
  { tone: "blue", label: "Blue: main beam headlights are on" },
];

// tips used by exactly one sign (generic shared tips make poor answers)
const TIP_COUNT = SIGNS.reduce<Record<string, number>>((m, s) => ((m[s.tip] = (m[s.tip] || 0) + 1), m), {});

const isDash = (s: SignDef) => s.cat === "dashboard";

/** Wrong answers for a sign: same family first (road vs dashboard), same category preferred. */
function distractors(s: SignDef, n: number, pred: (x: SignDef) => boolean = () => true): SignDef[] {
  const pool = SIGNS.filter((x) => x.id !== s.id && isDash(x) === isDash(s) && x.en !== s.en && pred(x));
  const same = pool.filter((x) => x.cat === s.cat);
  const other = pool.filter((x) => x.cat !== s.cat);
  const picked = [...sample(same, n)];
  if (picked.length < n) picked.push(...sample(other, n - picked.length));
  return picked.slice(0, n);
}

function mcq(id: string, kind: Kind, prompt: string, texts: string[], answer: number, explain: string, signId?: string): Question {
  return { id, kind, prompt, signId, options: texts.map((label) => ({ label })), answer, explain };
}

function signQuestion(id: string, kind: Kind): Question {
  const s = SIGN_MAP[id];
  const explain = `${s.en}. ${s.tip}`;
  const qid = `${kind}:${id}`;

  if (kind === "n2s") {
    const opts = shuffle([s, ...distractors(s, 3)]);
    return { id: qid, kind, prompt: `Which one is “${s.en}”?`, options: opts.map((o) => ({ signId: o.id })),
      answer: opts.findIndex((o) => o.id === id), explain };
  }

  if (kind === "tf") {
    const isTrue = Math.random() < 0.5;
    const other = distractors(s, 1)[0];
    const claimed = isTrue || !other ? s.en : other.en;
    const truth = claimed === s.en;
    return mcq(qid, kind, `True or false? This ${isDash(s) ? "warning light" : "sign"} means “${claimed}”.`,
      ["True", "False"], truth ? 0 : 1, truth ? explain : `No, it's “${s.en}”. ${s.tip}`, id);
  }

  if (kind === "s2cat" && !isDash(s)) {
    const key = s.cat as Exclude<Cat, "dashboard">;
    const keys = shuffle([key, ...sample((Object.keys(GROUP_LABEL) as typeof key[]).filter((k) => k !== key), 3)]);
    return mcq(qid, kind, "Which group does this sign belong to?", keys.map((k) => GROUP_LABEL[k]),
      keys.indexOf(key), `${s.en} is a ${GROUP_LABEL[key].toLowerCase()}. ${s.tip}`, id);
  }

  if (kind === "urgency" && s.color) {
    const order = shuffle(URGENCY);
    return mcq(qid, kind, "What does the colour of this warning light tell you?", order.map((o) => o.label),
      order.findIndex((o) => o.tone === s.color), `${s.en}: ${s.tip}`, id);
  }

  if (kind === "s2tip" && TIP_COUNT[s.tip] === 1) {
    const wrong = distractors(s, 3, (x) => TIP_COUNT[x.tip] === 1 && x.tip !== s.tip);
    if (wrong.length === 3) {
      const opts = shuffle([s, ...wrong]);
      return mcq(qid, kind, isDash(s) ? "What is this warning light telling you?" : "What should you do, or what does this sign tell you?",
        opts.map((o) => o.tip), opts.findIndex((o) => o.id === id), explain, id);
    }
  }

  // default: sign -> name
  const opts = shuffle([s, ...distractors(s, 3)]);
  return mcq(qid, "s2n", isDash(s) ? "What does this warning light mean?" : "What does this sign mean?",
    opts.map((o) => o.en), opts.findIndex((o) => o.id === id), explain, id);
}

function pickKind(s: SignDef): Kind {
  const kinds: Kind[] = isDash(s)
    ? ["s2n", "s2n", "n2s", "s2tip", "urgency", "urgency", "tf"]
    : ["s2n", "s2n", "n2s", "s2tip", "s2cat", "tf", "tf"];
  return kinds[Math.floor(Math.random() * kinds.length)];
}

const FACT_QS = [
  ...FACTS.map((f) => ({ id: f.id, q: f.q, options: f.options, a: f.a, explain: `${f.title}: ${f.text}` })),
  ...MORE_QUESTIONS,
];

function factQuestion(id: string): Question {
  const f = FACT_QS.find((x) => x.id === id)!;
  const order = shuffle(f.options.map((label, i) => ({ label, i })));
  return mcq(`fact:${id}`, "fact", f.q, order.map((o) => o.label), order.findIndex((o) => o.i === f.a), f.explain);
}

export function buildQuiz(cat: CatKey | "all", n = 10): Question[] {
  const signQs = (pool: SignDef[], count: number) => sample(pool, count).map((s) => signQuestion(s.id, pickKind(s)));
  const road = SIGNS.filter((s) => !isDash(s));
  const dash = SIGNS.filter(isDash);

  if (cat === "safety") return sample(FACT_QS.map((f) => f.id), n).map(factQuestion);
  if (cat === "dashboard") return signQs(dash, n);
  if (cat === "all") {
    const nFacts = Math.round(n * 0.3);
    const nDash = Math.round(n * 0.2);
    return shuffle([
      ...signQs(road, n - nFacts - nDash),
      ...signQs(dash, nDash),
      ...sample(FACT_QS.map((f) => f.id), nFacts).map(factQuestion),
    ]);
  }
  return signQs(SIGNS.filter((s) => s.cat === cat), Math.min(n, SIGNS.filter((s) => s.cat === cat).length));
}
