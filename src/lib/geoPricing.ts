const PRICE_HIDDEN_COUNTRIES = ["AR"]; // agregar acá para sumar países ocultos

export function shouldShowPrice(): boolean {
  if (typeof document === "undefined") return true; // SSR/build: default visible
  const match = document.cookie.match(/visitor_country=([^;]+)/);
  const country = match?.[1];
  // Si no se pudo detectar el país, default a VISIBLE (más permisivo)
  return !country || !PRICE_HIDDEN_COUNTRIES.includes(country);
}
