/**
 * Venue details shown on the public website. Edit here; every page reads from this file.
 * Facts (address, nights, hours) come from the original 11:11 website.
 */
export const SITE = {
  name: "11:11",
  fullName: "Eleven Eleven Lounge",
  tagline: "The time of your life",
  city: "Nairobi",
  /** The venue's clock, for the website's live "open now / doors in" status. */
  timezone: "Africa/Nairobi",
  address: "3rd Floor, Broadwalk Mall, Ojijo Road",
  phone: "+254 116 111 144",
  /** Digits only, for wa.me links. */
  whatsapp: "254116111144",
  /** Added to local numbers that start with 0 when opening WhatsApp chats with guests. */
  countryCode: "254",
  instagram: "eleven11_nbo",
  hashtags: ["#1111nairobi", "#thetimeofyourlife", "#nairobinightlife"],
  minAge: 21,
  doorsOpen: "10PM",
  closes: "6AM",
} as const;

export type Night = {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  dayName: string;
  numeral: string;
  title: string;
  blurb: string;
  hours: string;
};

/** Weekly residencies. Booking is only possible on these nights. */
export const NIGHTS: Night[] = [
  {
    day: 4,
    dayName: "Thursday",
    numeral: "I",
    title: "Ladies Love 11",
    blurb: "A night that belongs to the women who set the city's pace. Dressed up, turned up, and the DJ playing to the room.",
    hours: "10PM — 6AM",
  },
  {
    day: 5,
    dayName: "Friday",
    numeral: "II",
    title: "Velour Fridays",
    blurb: "Soft lights, rich sound and the first exhale of the weekend. Velour sets the mood for everything after it.",
    hours: "10PM — 6AM",
  },
  {
    day: 6,
    dayName: "Saturday",
    numeral: "III",
    title: "The Heat",
    blurb: "The week's peak. Headline sets, a packed floor and a crowd that doesn't hold anything back.",
    hours: "10PM — 6AM",
  },
  {
    day: 0,
    dayName: "Sunday",
    numeral: "IV",
    title: "After Glow",
    blurb: "The slow, golden end to the weekend. Deeper grooves, easy company, and no rush to leave.",
    hours: "10PM — 6AM",
  },
];

export const EXPERIENCE = [
  {
    n: "01",
    kicker: "Sound",
    title: "The music",
    body: "Afrobeats, Amapiano, Hip-Hop and Top 40, mixed by DJs who read the room and keep it moving until close.",
  },
  {
    n: "02",
    kicker: "Service",
    title: "Table service",
    body: "Book ahead and your table is set when you arrive. One host looks after you all night, and you can order from your phone.",
  },
  {
    n: "03",
    kicker: "Atmosphere",
    title: "The ambience",
    body: "Celestial lighting, futuristic design and a crowd that dresses for the occasion. Built to feel like nowhere else.",
  },
];

/** Areas of the venue for the "Inside 11:11" carousel. Edit freely. */
export const SPACES = [
  { name: "The Floor", tag: "Dance floor", capacity: "Standing", body: "The heart of the room. Under the celestial rig, a few steps from the DJ, where the night happens loudest.", icon: "floor" },
  { name: "VIP Section", tag: "Raised", capacity: "6–12 guests", body: "A raised section with its own host, bottle service and a clear view over the whole floor.", icon: "vip" },
  { name: "Booths", tag: "Private", capacity: "4–8 guests", body: "Curved booths along the wall: close enough to the music, quiet enough to talk.", icon: "booth" },
  { name: "The Bar", tag: "High tables", capacity: "2–4 guests", body: "Bar seats and high tables for smaller groups who like to watch the room move.", icon: "bar" },
  { name: "DJ Booth", tag: "Sound", capacity: "Resident & guest DJs", body: "Afrobeats, Amapiano, Hip-Hop and Top 40, played by DJs who read the room until close.", icon: "dj" },
  { name: "The Entrance", tag: "Arrival", capacity: "Doors 10PM", body: "Quote your reservation code at the door and your host walks you straight to your table.", icon: "door" },
] as const;

export const FAQS = [
  { q: "What are your opening hours?", a: "We open Thursday to Sunday. Doors open at 10PM and the night runs until 6AM." },
  { q: "Is there an age limit?", a: `Yes. Guests must be ${SITE.minAge}+ and may be asked for ID at the door.` },
  { q: "How do table reservations work?", a: "Send the form below. Our team confirms your booking by phone or WhatsApp, and you quote your reservation code at the door." },
  { q: "Can I book for a large group?", a: "Yes, up to 30 guests through the form. For bigger groups or a private event, message us on WhatsApp." },
  { q: "How do I order once I'm at my table?", a: "Scan the QR code on your table to see the menu, choose your host and order. Your bill updates live on your phone." },
  { q: "How can I pay?", a: "Cash, bank transfer or card (POS). Pay your host, who closes your bill on the spot." },
];

export const SEATING_LABELS = { standard: "Standard table", vip: "VIP section", booth: "Booth", bar: "Bar / high table" } as const;
export const OCCASIONS = ["Birthday", "Anniversary", "Celebration", "Business", "Night out"] as const;

/** Arrival times offered: 10:00 PM to 2:00 AM every 30 minutes. */
export const ARRIVAL_TIMES = ["22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00"];

export function formatArrival(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const OPEN_DAYS = new Set(NIGHTS.map((n) => n.day));

/** Weekday (0 = Sunday) of a YYYY-MM-DD date. */
export function weekday(day: string) {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export function nightFor(day: string) {
  return NIGHTS.find((n) => n.day === weekday(day)) ?? null;
}

/** The next `count` open nights starting from `today` (YYYY-MM-DD). */
export function upcomingNights(today: string, count = 8) {
  const out: { date: string; night: Night }[] = [];
  const d = new Date(`${today}T12:00:00Z`);
  for (let i = 0; out.length < count && i < 120; i++) {
    const day = d.toISOString().slice(0, 10);
    const night = nightFor(day);
    if (night) out.push({ date: day, night });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function formatNightDate(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

/** wa.me needs an international number: "0803 123 4567" → "254803…" using the venue's country code. */
export function whatsappNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? SITE.countryCode + d.slice(1) : d;
}

export const whatsappLink = (text?: string) => `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
