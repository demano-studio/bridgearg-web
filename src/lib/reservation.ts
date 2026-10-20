const STORAGE_KEY = "bridgearg_my_reservation";

type StoredReservation = {
  artworkId: number;
  verificationId: string;
};

export function saveMyVerification(artworkId: number, verificationId: string): void {
  try {
    const value: StoredReservation = { artworkId, verificationId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function readMyVerification(artworkId: number): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredReservation>;
    if (parsed.artworkId !== artworkId) return null;
    if (typeof parsed.verificationId !== "string") return null;
    if (!/^[0-9a-f-]{36}$/i.test(parsed.verificationId)) return null;
    return parsed.verificationId;
  } catch {
    return null;
  }
}

export function clearMyVerification(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
