import { FALLBACK_ARTIST_NAME, type WorkFromApi } from "@/lib/api";

export const COLLECTION_SEED_KEY = "bridgearg:collection-seed";

export function getArtistKey(work: WorkFromApi): string {
  return work.artistName?.trim() || FALLBACK_ARTIST_NAME;
}

/** Session-stable seed: same tab keeps the mix; new session gets a new one. */
export function getCollectionSeed(): number {
  try {
    const raw = sessionStorage.getItem(COLLECTION_SEED_KEY);
    if (raw != null && raw !== "") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed >>> 0;
    }
    const seed = (Math.random() * 0xffffffff) >>> 0;
    sessionStorage.setItem(COLLECTION_SEED_KEY, String(seed));
    return seed;
  } catch {
    return (Math.random() * 0xffffffff) >>> 0;
  }
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with seeded RNG. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Prefer no consecutive works by the same artist; never more than 2 in a row
 * when an alternative exists later in the list. Deterministic, no infinite loops.
 */
export function breakArtistRuns(works: WorkFromApi[]): WorkFromApi[] {
  const arr = [...works];
  const n = arr.length;

  for (let i = 0; i < n; i++) {
    const key = getArtistKey(arr[i]);
    const prev = i > 0 ? getArtistKey(arr[i - 1]) : null;
    const prev2 = i > 1 ? getArtistKey(arr[i - 2]) : null;

    const wouldBeThird = prev === key && prev2 === key;
    const wouldBeSecond = prev === key;

    if (!wouldBeSecond && !wouldBeThird) continue;

    // Find a later work with a different artist than the previous one (and this slot's artist).
    let swapAt = -1;
    for (let k = i + 1; k < n; k++) {
      const kKey = getArtistKey(arr[k]);
      if (kKey === key) continue;
      if (prev != null && kKey === prev && wouldBeThird) continue;
      if (prev != null && kKey === prev && wouldBeSecond) continue;
      swapAt = k;
      break;
    }

    // Soften: if avoiding consecutive failed, still break a 3-run if possible.
    if (swapAt < 0 && wouldBeThird) {
      for (let k = i + 1; k < n; k++) {
        if (getArtistKey(arr[k]) !== key) {
          swapAt = k;
          break;
        }
      }
    }

    if (swapAt >= 0) {
      const tmp = arr[i];
      arr[i] = arr[swapAt];
      arr[swapAt] = tmp;
    }
  }

  return arr;
}

/**
 * Pull as many distinct artists as possible into the first `frontSize` slots
 * (desktop first 3 rows), preserving relative order among the remainder.
 */
export function diversifyFront(works: WorkFromApi[], frontSize = 9): WorkFromApi[] {
  if (works.length <= frontSize) return [...works];

  const pool = [...works];
  const front: WorkFromApi[] = [];
  const seen = new Set<string>();

  while (front.length < frontSize && pool.length > 0) {
    let idx = pool.findIndex((w) => !seen.has(getArtistKey(w)));
    if (idx < 0) idx = 0;
    const [picked] = pool.splice(idx, 1);
    front.push(picked);
    seen.add(getArtistKey(picked));
  }

  return [...front, ...pool];
}

/** Full curated mix: shuffle → diversify front → break artist runs. */
export function curatedCollectionOrder(works: WorkFromApi[], seed: number): WorkFromApi[] {
  if (works.length <= 1) return [...works];
  const shuffled = seededShuffle(works, seed);
  const fronted = diversifyFront(shuffled, 9);
  return breakArtistRuns(fronted);
}
