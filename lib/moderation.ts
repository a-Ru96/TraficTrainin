// Basic nickname filter. It catches common profanity and simple obfuscation (leet speak, dots,
// repeated letters). It is a first line of defence, not a guarantee.
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

// Long, unambiguous stems are matched anywhere in the name.
const STEMS = [
  "fuck", "shit", "bitch", "pussy", "whore", "slut", "bastard", "nigga", "nigger", "faggot", "rapist", "hitler", "porn",
  "vagina", "orospu", "piç", "sikik", "sikis", "götveren", "gotveren", "pezevenk", "kahpe", "puşt",
];
// Short or ambiguous words are matched only as a whole word, so Scunthorpe, Penistone, Essex, Nazir,
// Dickinson or "I am" stay allowed.
const WHOLE_WORDS = new Set([
  "ass", "tit", "tits", "cum", "kkk", "sex", "anal", "dick", "cock", "cunt", "cunts", "penis", "retard", "retarded", "nazi",
  "amk", "sik", "göt", "oç", "ibne", "yarak", "yarrak", "pust",
]);
// Stems without a doubled letter are also checked with every repeated run squeezed to one letter ("FUUUUCK").
const SQUEEZABLE = STEMS.filter((s) => !/(.)\1/.test(s));

function deLeet(s: string): string {
  return s.toLowerCase().replace(/./g, (c) => LEET[c] ?? c);
}

export function isAllowedNickname(nick: string): boolean {
  const words = deLeet(nick)
    .replace(/[_.-]+/g, " ")
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  // Join runs of single letters ("s e x" -> "sex") so spacing the letters out doesn't dodge the check.
  const joined: string[] = [];
  let run = "";
  for (const w of words) {
    if ([...w].length === 1) run += w;
    else { if (run) joined.push(run); run = ""; joined.push(w); }
  }
  if (run) joined.push(run);
  if (joined.some((w) => WHOLE_WORDS.has(w))) return false;

  const letters = deLeet(nick).replace(/[^\p{L}]/gu, "");
  const capped = letters.replace(/(.)\1{2,}/g, "$1$1"); // runs of 3+ become 2
  const squeezed = letters.replace(/(.)\1+/g, "$1"); // every run becomes 1
  if (STEMS.some((st) => capped.includes(st))) return false;
  if (SQUEEZABLE.some((st) => squeezed.includes(st))) return false;
  return true;
}
