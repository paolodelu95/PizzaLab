import type { SourdoughProfile, StarterFeeding } from "./types";

export const starterKindLabel = (kind: SourdoughProfile["kind"]) =>
  kind === "licoli" ? "Li.Co.Li. · 100% idratazione" : "Pasta madre solida · 50% idratazione";

export function starterIntervalHours(profile: SourdoughProfile, at = new Date()) {
  const ageDays = (at.getTime() - new Date(profile.startedAt).getTime()) / 86400000;
  if (profile.phase === "mature") return profile.storage === "fridge" ? 168 : 12;
  if (profile.phase === "creating" && ageDays < 2) return 24;
  return 12;
}

function withPreferredTime(date: Date, preferredTime: string) {
  const [hours, minutes] = preferredTime.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

export function nextStarterFeedAt(profile: SourdoughProfile, from = new Date()) {
  const interval = starterIntervalHours(profile, from);
  if (interval === 12) {
    const morning = withPreferredTime(from, profile.preferredTime);
    const evening = new Date(morning.getTime() + 12 * 3600000);
    if (from < morning) return morning.toISOString();
    if (from < evening) return evening.toISOString();
    return new Date(morning.getTime() + 24 * 3600000).toISOString();
  }
  const candidate = withPreferredTime(
    new Date(from.getTime() + interval * 3600000),
    profile.preferredTime,
  );
  return candidate.toISOString();
}

export function starterFeedAmounts(profile: SourdoughProfile) {
  const starter = profile.starterGrams;
  const flour = starter * profile.feedRatio;
  const water = flour * (profile.kind === "licoli" ? 1 : 0.5);
  return { starter, flour, water, total: starter + flour + water };
}

export function feedingIsReady(feeding: StarterFeeding) {
  return feeding.rise >= 2 && feeding.peakHours >= 3 && feeding.peakHours <= 8;
}

export function addStarterFeeding(
  profile: SourdoughProfile,
  feeding: StarterFeeding,
) {
  const readyStreak = feedingIsReady(feeding) ? profile.readyStreak + 1 : 0;
  const phase = readyStreak >= 3 ? "mature" : profile.phase === "creating" && profile.feedings.length >= 2 ? "strengthening" : profile.phase;
  const updated: SourdoughProfile = {
    ...profile,
    phase,
    storage: phase === "mature" ? profile.storage : "room",
    readyStreak,
    lastFedAt: feeding.at,
    feedings: [feeding, ...profile.feedings].slice(0, 100),
  };
  return { ...updated, nextFeedAt: nextStarterFeedAt(updated, new Date(feeding.at)) };
}

export function createStarterProfile(
  kind: SourdoughProfile["kind"],
  existing = false,
  now = new Date(),
): SourdoughProfile {
  const profile: SourdoughProfile = {
    name: kind === "licoli" ? "Il mio Li.Co.Li." : "La mia pasta madre",
    kind,
    phase: existing ? "strengthening" : "creating",
    storage: "room",
    startedAt: now.toISOString(),
    lastFedAt: null,
    nextFeedAt: now.toISOString(),
    preferredTime: "08:00",
    starterGrams: 30,
    flourName: "Farina forte non sbiancata",
    temperature: kind === "licoli" ? 24 : 26,
    feedRatio: 1,
    readyStreak: 0,
    remindersEnabled: false,
    feedings: [],
  };
  return { ...profile, nextFeedAt: nextStarterFeedAt(profile, new Date(now.getTime() - 60000)) };
}

export function starterReminderDates(profile: SourdoughProfile, count = 14) {
  const dates: Date[] = [];
  let cursor = new Date(profile.nextFeedAt);
  const interval = starterIntervalHours(profile, cursor);
  while (dates.length < count) {
    if (cursor.getTime() > Date.now()) dates.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + interval * 3600000);
  }
  return dates;
}
