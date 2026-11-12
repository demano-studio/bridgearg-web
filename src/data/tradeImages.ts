const UI_ASSETS_BASE =
  "https://wzofuvxsvomntglezygh.supabase.co/storage/v1/object/public/ui-assets/";

function asset(file: string): string {
  return `${UI_ASSETS_BASE}${file}`;
}

export const TRADE_IMAGES = {
  hero: {
    src: asset("fondo_hora.jpg"),
    alt: "Work by Hora French",
    caption: "(In situ) Hora French",
    captionMeta: "Painting",
  },
  cards: {
    "interior-designers": {
      src: asset("fondo_ale_2.jpg"),
      alt: "Work by Alejandra Espinosa",
    },
    architects: {
      src: asset("fondo_roger_2.jpeg"),
      alt: "Work by Roger Mantegani",
    },
    developers: {
      src: asset("fondo_boyo_3.jpg"),
      alt: "Work by Boyo Quintana",
    },
    "art-consultants": {
      src: asset("fondo_caro_2.jpg"),
      alt: "Work by Carolina Caeiro",
    },
  },
  covers: {
    "interior-designers": {
      src: asset("fondo_fabio_2.jpg"),
      alt: "Work by Fabio Egea",
    },
    architects: {
      src: asset("fondo_jose_2.jpg"),
      alt: "Work by José Benito",
    },
    developers: {
      src: asset("fondo_mariano_2.jpg"),
      alt: "Work by Mariano Castañeda",
    },
    "art-consultants": {
      src: asset("fondo_tulio.jpg"),
      alt: "Work by Tulio Romano",
    },
  },
} as const;
