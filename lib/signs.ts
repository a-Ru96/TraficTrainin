// UK (Highway Code) road signs. All visuals are 100x100 SVG drawn in code.
export type Cat = "warning" | "prohibit" | "speed" | "mandatory" | "info" | "dashboard";
export type CatKey = Cat | "safety";
export type Frame =
  | "warn" | "giveway" | "stop" | "prohibit" | "mandatory"
  | "rect" | "natl" | "noentry" | "clearway";

import { SIGN_IMAGES } from "./signImages";
import { DASH_SIGNS } from "./dashboard";

export interface SignDef {
  id: string;
  cat: Cat;
  /** SVG fallback, used only when the sign has no image in /public/signs */
  frame?: Frame;
  icon?: string; // inner SVG markup
  /** set automatically from SIGN_IMAGES */
  img?: string;
  /** dashboard warning lights only */
  color?: "red" | "amber" | "green";
  en: string;
  tip: string;
}

export const CATS: { key: CatKey | "all"; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#6d8cff" },
  { key: "warning", label: "Warning", color: "#f5b94a" },
  { key: "prohibit", label: "Rules", color: "#ff6b6b" },
  { key: "speed", label: "Speed", color: "#ff9f5a" },
  { key: "mandatory", label: "Mandatory", color: "#4cc2ff" },
  { key: "info", label: "Info", color: "#8b9dff" },
  { key: "dashboard", label: "Dashboard lights", color: "#c084fc" },
  { key: "safety", label: "Safety", color: "#3ddc97" },
];

export const FRAMES: Record<Frame, string> = {
  warn: `<polygon points="50,6 95,88 5,88" fill="#fff" stroke="#e11d2e" stroke-width="9" stroke-linejoin="round"/>`,
  giveway: `<polygon points="6,12 94,12 50,92" fill="#fff" stroke="#e11d2e" stroke-width="9" stroke-linejoin="round"/>`,
  stop: `<polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="#d4182a" stroke="#fff" stroke-width="3"/>`,
  prohibit: `<circle cx="50" cy="50" r="43" fill="#fff" stroke="#e11d2e" stroke-width="9"/>`,
  mandatory: `<circle cx="50" cy="50" r="46" fill="#1d4ed8"/>`,
  rect: `<rect x="8" y="16" width="84" height="68" rx="8" fill="#1d4ed8" stroke="#fff" stroke-width="3"/>`,
  natl: `<circle cx="50" cy="50" r="44" fill="#fff" stroke="#111" stroke-width="3"/>`,
  noentry: `<circle cx="50" cy="50" r="45" fill="#d4182a"/>`,
  clearway: `<circle cx="50" cy="50" r="43" fill="#1d4ed8" stroke="#e11d2e" stroke-width="9"/>`,
};

const K = "#111";
const LEFT = "M60 78 V50 H46 V60 L26 44 L46 28 V38 H70 V78 Z";
const tri3 = (poly: string, cx: number, cy: number, c: string) =>
  [0, 120, 240].map((r) => `<polygon points="${poly}" fill="${c}" transform="rotate(${r} ${cx} ${cy})"/>`).join("");
const speed = (n: number) =>
  `<text x="50" y="63" font-size="${n >= 100 ? 30 : 38}" font-weight="800" text-anchor="middle" fill="${K}" font-family="Arial, Helvetica, sans-serif">${n}</text>`;

export const SIGNS: SignDef[] = [
  // ---------- UYARI ----------
  { id: "crossroads", cat: "warning", frame: "warn", en: "Crossroads ahead",
    tip: "Slow down as you approach and check every direction.",
    icon: `<rect x="46" y="34" width="8" height="46" fill="${K}"/><rect x="30" y="52" width="40" height="8" fill="${K}"/>` },
  { id: "tjunction", cat: "warning", frame: "warn", en: "T-junction",
    tip: "The road ends ahead; you must turn left or right.",
    icon: `<rect x="46" y="46" width="8" height="36" fill="${K}"/><rect x="34" y="40" width="32" height="8" fill="${K}"/>` },
  { id: "roundabout-w", cat: "warning", frame: "warn", en: "Roundabout ahead",
    tip: "Give way to traffic from the right and go clockwise.",
    icon: `<circle cx="50" cy="62" r="12" fill="none" stroke="${K}" stroke-width="4"/>${tri3("44,45 55,50 44,55", 50, 62, K)}` },
  { id: "signals", cat: "warning", frame: "warn", en: "Traffic signals ahead",
    tip: "Be ready to stop; on amber, stop if you safely can.",
    icon: `<rect x="40" y="36" width="20" height="42" rx="4" fill="${K}"/><circle cx="50" cy="45" r="4.5" fill="#e11d2e"/><circle cx="50" cy="57" r="4.5" fill="#f59e0b"/><circle cx="50" cy="69" r="4.5" fill="#22c55e"/>` },
  { id: "pedestrians", cat: "warning", frame: "warn", en: "Zebra or parallel crossing ahead",
    tip: "Pedestrians may be crossing. Slow down and be ready to give way.",
    icon: `<circle cx="46" cy="42" r="4.5" fill="${K}"/><path d="M46 48 L50 62 L42 76 M50 62 L58 76 M46 50 L58 56 M46 50 L38 58" stroke="${K}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
  { id: "children", cat: "warning", frame: "warn", en: "Children going to or from school",
    tip: "Children may step into the road suddenly near schools.",
    icon: `<circle cx="41" cy="46" r="4" fill="${K}"/><path d="M41 51 V64 L37 76 M41 64 L45 76 M41 54 L34 62 M41 54 L49 58" stroke="${K}" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="60" cy="50" r="3.2" fill="${K}"/><path d="M60 54 V65 L57 76 M60 65 L63 76 M60 57 L54 62 M60 57 L66 62" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: "slippery", cat: "warning", frame: "warn", en: "Slippery road",
    tip: "Avoid harsh braking and sudden steering.",
    icon: `<path d="M32 58 L38 48 H58 L66 58 Z" fill="${K}"/><rect x="30" y="58" width="38" height="8" rx="2" fill="${K}"/><circle cx="38" cy="68" r="4" fill="${K}" stroke="#fff" stroke-width="1"/><circle cx="60" cy="68" r="4" fill="${K}" stroke="#fff" stroke-width="1"/><path d="M32 78 q4 -5 8 0 t8 0 t8 0 t8 0" stroke="${K}" stroke-width="2.5" fill="none"/>` },
  { id: "steep", cat: "warning", frame: "warn", en: "Steep hill downwards",
    tip: "Use a low gear and don't ride the brakes.",
    icon: `<path d="M30 44 L70 68 H30 Z" fill="${K}"/><text x="50" y="82" font-size="11" font-weight="800" text-anchor="middle" fill="${K}" font-family="Arial, sans-serif">10%</text>` },
  { id: "narrows", cat: "warning", frame: "warn", en: "Road narrows on both sides",
    tip: "Be ready to give way to oncoming vehicles.",
    icon: `<path d="M36 80 V66 Q36 58 44 54 V40" stroke="${K}" stroke-width="5" fill="none"/><path d="M64 80 V66 Q64 58 56 54 V40" stroke="${K}" stroke-width="5" fill="none"/>` },
  { id: "twoway", cat: "warning", frame: "warn", en: "Two-way traffic",
    tip: "The one-way section ends; expect oncoming traffic.",
    icon: `<path d="M40 46 L34 54 H38 V76 H42 V54 H46 Z" fill="${K}"/><path d="M60 78 L54 70 H58 V48 H62 V70 H66 Z" fill="${K}"/>` },
  { id: "roadworks", cat: "warning", frame: "warn", en: "Road works",
    tip: "Watch for workers and obey the speed limit.",
    icon: `<circle cx="46" cy="44" r="4.5" fill="${K}"/><path d="M46 50 L48 62 L42 70 M48 62 L54 66 M46 52 L56 58" stroke="${K}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M30 80 L42 70 H62 L72 80 Z" fill="${K}"/>` },
  { id: "danger", cat: "warning", frame: "warn", en: "Other danger",
    tip: "Read the plate underneath; it explains the hazard.",
    icon: `<rect x="46.5" y="38" width="7" height="24" rx="3" fill="${K}"/><circle cx="50" cy="71" r="4.5" fill="${K}"/>` },
  { id: "bumps", cat: "warning", frame: "warn", en: "Uneven road / humps",
    tip: "Slow down; your vehicle may bounce.",
    icon: `<path d="M28 74 Q38 52 48 74 Q58 52 68 74" stroke="${K}" stroke-width="5" fill="none"/>` },

  // ---------- YASAK & KURAL ----------
  { id: "stop", cat: "prohibit", frame: "stop", en: "Stop",
    tip: "Stop completely at the line, then give way.",
    icon: `<text x="50" y="59" font-size="25" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">STOP</text>` },
  { id: "giveway", cat: "prohibit", frame: "giveway", en: "Give way",
    tip: "Give priority to traffic on the main road.",
    icon: `<text x="50" y="36" font-size="10" font-weight="800" text-anchor="middle" fill="${K}" font-family="Arial, sans-serif">GIVE WAY</text>` },
  { id: "noentry", cat: "prohibit", frame: "noentry", en: "No entry",
    tip: "You can't enter this road from this direction.",
    icon: `<rect x="20" y="42" width="60" height="16" fill="#fff"/>` },
  { id: "noovertake", cat: "prohibit", frame: "prohibit", en: "No overtaking",
    tip: "Don't overtake in this section.",
    icon: `<path d="M30 52 l4 -8 h10 l4 8z" fill="#d4182a"/><rect x="25" y="52" width="26" height="12" rx="3" fill="#d4182a"/><path d="M58 52 l4 -8 h10 l4 8z" fill="${K}"/><rect x="53" y="52" width="26" height="12" rx="3" fill="${K}"/>` },
  { id: "nouturn", cat: "prohibit", frame: "prohibit", en: "No U-turns",
    tip: "You can't turn around here.",
    icon: `<path d="M38 72 V44 a12 12 0 0 1 24 0 V54" stroke="${K}" stroke-width="7" fill="none"/><polygon points="52,52 72,52 62,67" fill="${K}"/>` },
  { id: "noleft", cat: "prohibit", frame: "prohibit", en: "No left turn",
    tip: "Turning left is prohibited.",
    icon: `<path d="${LEFT}" fill="${K}" transform="translate(12 8) scale(.8)"/>` },
  { id: "noright", cat: "prohibit", frame: "prohibit", en: "No right turn",
    tip: "Turning right is prohibited.",
    icon: `<g transform="translate(100 0) scale(-1 1)"><path d="${LEFT}" fill="${K}" transform="translate(12 8) scale(.8)"/></g>` },
  { id: "clearway", cat: "prohibit", frame: "clearway", en: "No stopping (Clearway)",
    tip: "Don't stop at all, except in an emergency.",
    icon: `<path d="M33 33 L67 67 M67 33 L33 67" stroke="#e11d2e" stroke-width="9"/>` },
  { id: "nowaiting", cat: "prohibit", frame: "clearway", en: "No waiting",
    tip: "You may stop briefly to drop off or pick up, but not wait.",
    icon: `<path d="M30 70 L70 30" stroke="#e11d2e" stroke-width="9"/>` },

  // ---------- HIZ ----------
  ...[20, 30, 40, 50, 60, 70].map<SignDef>((n) => ({
    id: `speed${n}`, cat: "speed", frame: "prohibit", en: `${n} mph speed limit`,
    tip: `Don't exceed ${n} mph (about ${Math.round(n * 1.609)} km/h).`,
    icon: speed(n),
  })),
  { id: "nsl", cat: "speed", frame: "natl", en: "National speed limit applies",
    tip: "Cars: 60 mph on single carriageways, 70 mph on dual carriageways and motorways.",
    icon: `<path d="M24 24 L76 76" stroke="${K}" stroke-width="9"/>` },

  // ---------- ZORUNLU ----------
  { id: "turnleft", cat: "mandatory", frame: "mandatory", en: "Turn left ahead",
    tip: "Blue circle = something you must do.",
    icon: `<path d="${LEFT}" fill="#fff" transform="translate(2 -3)"/>` },
  { id: "turnright", cat: "mandatory", frame: "mandatory", en: "Turn right ahead",
    tip: "Blue circle = something you must do.",
    icon: `<g transform="translate(100 0) scale(-1 1)"><path d="${LEFT}" fill="#fff" transform="translate(2 -3)"/></g>` },
  { id: "aheadonly", cat: "mandatory", frame: "mandatory", en: "Ahead only",
    tip: "You can't turn left or right.",
    icon: `<path d="M50 18 L74 46 H58 V82 H42 V46 H26 Z" fill="#fff"/>` },
  { id: "keepleft", cat: "mandatory", frame: "mandatory", en: "Keep left",
    tip: "Pass the obstacle on its left side.",
    icon: `<path d="M50 22 L72 46 H58 V78 H42 V46 H28 Z" fill="#fff" transform="rotate(-135 50 50)"/>` },
  { id: "miniround", cat: "mandatory", frame: "mandatory", en: "Mini-roundabout",
    tip: "Give way to traffic from the right at mini-roundabouts too.",
    icon: `<circle cx="50" cy="50" r="15" fill="none" stroke="#fff" stroke-width="6"/>${tri3("42,26 58,34 42,42", 50, 50, "#fff")}` },
  { id: "minspeed30", cat: "mandatory", frame: "mandatory", en: "Minimum speed 30 mph",
    tip: "Don't drive below 30 mph unless it's unsafe or impracticable.",
    icon: `<text x="50" y="60" font-size="34" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">30</text><text x="50" y="77" font-size="11" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">MIN</text>` },

  // ---------- INFO ----------
  { id: "parking", cat: "info", frame: "rect", en: "Parking place",
    tip: "You can park here.",
    icon: `<text x="50" y="68" font-size="46" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">P</text>` },
  { id: "hospital", cat: "info", frame: "rect", en: "Hospital ahead",
    tip: "Watch out for ambulances.",
    icon: `<rect x="30" y="26" width="40" height="48" rx="3" fill="#fff"/><text x="50" y="62" font-size="34" font-weight="800" text-anchor="middle" fill="#1d4ed8" font-family="Arial, sans-serif">H</text>` },
  { id: "nothrough", cat: "info", frame: "rect", en: "No through road",
    tip: "Dead end: no way through.",
    icon: `<rect x="30" y="28" width="40" height="10" fill="#d4182a"/><rect x="45" y="38" width="10" height="34" fill="#fff"/>` },
  { id: "motorway", cat: "info", frame: "rect", en: "Motorway (start of motorway regulations)",
    tip: "Motorway rules apply: no cyclists, pedestrians or slow vehicles, no U-turns and no reversing.",
    icon: `<path d="M24 68 Q50 28 76 68" stroke="#fff" stroke-width="5" fill="none"/><path d="M36 68 L46 48 M64 68 L54 48" stroke="#fff" stroke-width="4"/>` },
];

// Signs that only exist as images (no SVG fallback needed).
const EXTRA: SignDef[] = [
  // warning
  { id: "bend-right", cat: "warning", en: "Bend to the right", tip: "Slow down before the bend, not in it." },
  { id: "bend-left", cat: "warning", en: "Bend to the left", tip: "Slow down before the bend, not in it." },
  { id: "steep-up", cat: "warning", en: "Steep hill upwards", tip: "Select a lower gear early and keep your momentum." },
  { id: "hump-bridge", cat: "warning", en: "Hump bridge", tip: "You can't see what's on the other side. Slow down." },
  { id: "tunnel", cat: "warning", en: "Tunnel ahead", tip: "Switch on dipped headlights and keep your distance." },
  { id: "swing-bridge", cat: "warning", en: "Opening or swing bridge", tip: "The bridge may be raised. Be ready to stop." },
  { id: "cattle", cat: "warning", en: "Cattle", tip: "Animals may be on the road. Slow down and give them space." },
  { id: "sheep", cat: "warning", en: "Sheep", tip: "Animals may be on the road. Slow down and give them space." },
  { id: "wild-horses", cat: "warning", en: "Wild horses or ponies", tip: "Animals may be on the road. Slow down and give them space." },
  { id: "horse-riders", cat: "warning", en: "Accompanied horses or ponies", tip: "Pass wide and slow, and don't sound your horn." },
  { id: "deer", cat: "warning", en: "Wild animals", tip: "Most likely at dawn and dusk. Slow down." },
  { id: "cattle-grid", cat: "warning", en: "Cattle grid", tip: "A grid in the road surface. Animals may be loose beyond it." },
  { id: "farm", cat: "warning", en: "Agricultural vehicles", tip: "Slow-moving farm vehicles may be on the road." },
  { id: "ford", cat: "warning", en: "Ford", tip: "Test your brakes after crossing the water." },
  { id: "quayside", cat: "warning", en: "Quayside or river bank", tip: "The road runs beside open water. Take care." },
  { id: "aircraft", cat: "warning", en: "Low-flying aircraft or sudden aircraft noise", tip: "Aircraft may be noisy and low. Stay calm and in control." },
  { id: "rocks", cat: "warning", en: "Risk of falling or fallen rocks", tip: "Watch for debris on the road and don't stop below the slope." },
  { id: "crosswind", cat: "warning", en: "Side winds", tip: "Gusts can push your vehicle. Keep a firm grip on the wheel." },
  { id: "queues", cat: "warning", en: "Traffic queues likely ahead", tip: "Slow down early and use hazard lights if the queue is sudden." },
  { id: "humps", cat: "warning", en: "Road humps", tip: "Traffic-calming humps ahead. Slow down." },
  { id: "cyclists", cat: "warning", en: "Cycle route ahead", tip: "Cyclists may be crossing or joining the road ahead." },
  { id: "level-gate", cat: "warning", en: "Level crossing with gate or barrier", tip: "Stop when the lights flash or barriers lower. Never zigzag round." },
  { id: "level-open", cat: "warning", en: "Level crossing without barrier", tip: "Look both ways and listen for trains before you cross." },
  // rules
  { id: "giveprio", cat: "prohibit", en: "Give priority to vehicles from the opposite direction", tip: "On a very narrow road or bridge, let oncoming traffic through first." },
  { id: "priority", cat: "info", en: "Traffic has priority over oncoming vehicles", tip: "Oncoming traffic must give way to you, but stay alert." },
  { id: "novehicles", cat: "prohibit", en: "No vehicles except pedal cycles being pushed", tip: "Vehicles are prohibited. You may push a bicycle through." },
  { id: "nomotor", cat: "prohibit", en: "No motor vehicles", tip: "Cars and motorcycles aren't allowed." },
  { id: "nomoto", cat: "prohibit", en: "No solo motorcycles", tip: "Solo motorcycles aren't allowed." },
  { id: "hgv", cat: "prohibit", en: "No goods vehicles over maximum gross weight (7.5 t)", tip: "Goods vehicles over the weight shown are banned, unless a plate allows loading or unloading." },
  { id: "nohorse", cat: "prohibit", en: "No horse-drawn vehicles", tip: "Horse-drawn vehicles aren't allowed." },
  { id: "noridden", cat: "prohibit", en: "No ridden or accompanied horses", tip: "Horse riders and led horses aren't allowed." },
  { id: "nocaravan", cat: "prohibit", en: "No towed caravans", tip: "Vehicles towing caravans aren't allowed." },
  { id: "nopeds", cat: "prohibit", en: "No pedestrians", tip: "Pedestrians aren't allowed on this road." },
  { id: "nocycle", cat: "prohibit", en: "No cycling", tip: "Cycles aren't allowed." },
  { id: "nobus", cat: "prohibit", en: "No buses (over 8 passenger seats)", tip: "Buses aren't allowed." },
  // mandatory
  { id: "turn-left", cat: "mandatory", en: "Proceed in the direction of the arrow (left)", tip: "You must go in the direction the arrow shows." },
  { id: "turn-right", cat: "mandatory", en: "Proceed in the direction of the arrow (right)", tip: "You must go in the direction the arrow shows." },
  { id: "pass-either", cat: "mandatory", en: "Pass either side", tip: "You may pass the island on either side." },
  { id: "cycles-only", cat: "mandatory", en: "Route for pedal cycles only", tip: "Only cyclists may use this route." },
  { id: "shared", cat: "mandatory", en: "Shared route for pedal cycles and pedestrians only", tip: "Both use the same space. Cyclists should give way to pedestrians." },
  { id: "segregated", cat: "mandatory", en: "Separated track and path for pedal cycles and pedestrians", tip: "Keep to your own side of the line." },
  // speed
  { id: "end-min30", cat: "speed", en: "End of minimum speed 30 mph", tip: "The minimum speed requirement stops here." },
  { id: "zone20", cat: "speed", en: "20 mph zone", tip: "Traffic-calming measures such as humps may follow. Keep to 20 mph." },
  { id: "camera", cat: "speed", en: "Area where speed cameras are in use", tip: "Cameras are used to enforce speed limits in this area." },
  // info
  { id: "cycle-route", cat: "info", en: "Cycle route", tip: "A signed route for cyclists." },
  { id: "homezone", cat: "info", en: "Entrance to a Home Zone", tip: "Residential street. Drive slowly, children may be playing." },
];
SIGNS.push(...EXTRA, ...DASH_SIGNS);
for (const s of SIGNS) if (SIGN_IMAGES.has(s.id)) s.img = `/signs/${s.id}.jpg`;

export const SIGN_MAP: Record<string, SignDef> = Object.fromEntries(SIGNS.map((s) => [s.id, s]));
