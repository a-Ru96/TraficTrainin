// Road safety facts (UK Highway Code). Each fact is both a flashcard and a quiz question.
export interface Fact {
  id: string;
  title: string;
  text: string;
  q: string;
  options: string[];
  a: number;
}

export const FACTS: Fact[] = [
  { id: "stop30", title: "Stopping distance at 30 mph",
    text: "Thinking distance 9 m + braking distance 14 m = about 23 m (6 car lengths). Distance grows fast as speed rises.",
    q: "What is the typical total stopping distance at 30 mph?", options: ["12 m", "23 m", "36 m", "53 m"], a: 1 },
  { id: "stop70", title: "Stopping distance at 70 mph",
    text: "Thinking distance 21 m + braking distance 75 m = about 96 m. Keep your distance on the motorway.",
    q: "What is the typical total stopping distance at 70 mph?", options: ["53 m", "73 m", "96 m", "120 m"], a: 2 },
  { id: "gap", title: "The two-second rule",
    text: "Leave at least a 2-second gap from the vehicle ahead on dry roads. Double it in the wet (4 seconds), and up to 10 times in ice.",
    q: "How big a time gap should you leave on a wet road?", options: ["2 seconds", "3 seconds", "At least 4 seconds", "1 second"], a: 2 },
  { id: "drink", title: "Drink and driving",
    text: "The limit is 80 mg per 100 ml of blood in England, Wales and N. Ireland, and 50 mg in Scotland. The real rule: if you drink, don't drive.",
    q: "What is the safest approach to alcohol and driving?", options: ["Just one drink", "Don't drink at all", "Chew gum", "Drive slowly"], a: 1 },
  { id: "belt", title: "Seat belts",
    text: "The driver is responsible for making sure passengers under 14 wear a seat belt. Buckle up in the back too!",
    q: "Who is responsible for seat belts of passengers under 14?", options: ["The child", "The driver", "The front passenger", "Nobody"], a: 1 },
  { id: "phone", title: "Phones at the wheel",
    text: "Holding a phone while driving is illegal, even when you're stopped in traffic or at a red light.",
    q: "Using a hand-held phone while driving is …", options: ["Illegal", "Fine for short calls", "Only banned on motorways", "Only banned at night"], a: 0 },
  { id: "tyre", title: "Tyre tread depth",
    text: "The legal minimum is 1.6 mm across the central three-quarters of the tyre. Grip on wet roads depends on it.",
    q: "What is the legal minimum tread depth for car tyres?", options: ["0.5 mm", "1.0 mm", "1.6 mm", "3 mm"], a: 2 },
  { id: "cycle", title: "Overtaking cyclists",
    text: "Leave at least 1.5 m when overtaking a cyclist at up to 30 mph. Give even more room at higher speeds.",
    q: "How much space should you leave when overtaking a cyclist (up to 30 mph)?", options: ["0.5 m", "1 m", "1.5 m", "3 m"], a: 2 },
  { id: "hierarchy", title: "Protect the vulnerable",
    text: "The Highway Code says those who can do the most harm have the greatest responsibility to reduce the danger they pose to others.",
    q: "Who is the most vulnerable road user?", options: ["Lorry driver", "Car driver", "Pedestrian", "Bus driver"], a: 2 },
  { id: "fog", title: "Fog lights",
    text: "Use fog lights only when visibility drops below 100 m, and switch them off when it improves.",
    q: "When should you use fog lights?", options: ["Visibility under 500 m", "Visibility under 200 m", "Visibility under 100 m", "Whenever it rains"], a: 2 },
  { id: "break", title: "Take a break",
    text: "Tiredness is a factor in a large share of serious crashes. Take a 15-minute break at least every 2 hours.",
    q: "How often should you take a break on a long journey?", options: ["Every 30 minutes", "At least every 2 hours", "Every 6 hours", "No need"], a: 1 },
  { id: "left", title: "Driving on the left",
    text: "In the UK and many Commonwealth countries traffic drives on the left, and roundabouts go clockwise.",
    q: "Which side of the road does traffic use in the UK?", options: ["Right", "Left", "It depends on the road", "Either side"], a: 1 },
  { id: "limits", title: "Car speed limits",
    text: "Built-up areas (with street lights) 30 mph in England and Scotland (20 mph in Wales), single carriageways 60 mph, dual carriageways and motorways 70 mph.",
    q: "What is the national speed limit for cars on a single carriageway?", options: ["50 mph", "60 mph", "70 mph", "40 mph"], a: 1 },
  { id: "childseat", title: "Child seats",
    text: "Children must use a suitable child car seat until they are 135 cm tall or 12 years old, whichever comes first.",
    q: "Up to what height must a child use a car seat?", options: ["100 cm", "120 cm", "135 cm", "150 cm"], a: 2 },
  { id: "dutch", title: "The Dutch Reach",
    text: "Open the car door with your FAR hand. Your body turns, you spot cyclists coming from behind and avoid 'dooring' them.",
    q: "What is the safest way to open a car door?", options: ["Open it quickly", "Use your far hand and look over your shoulder", "Sound the horn", "Only check the rear-view mirror"], a: 1 },
];
