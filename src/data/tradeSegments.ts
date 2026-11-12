import type { TradeRole } from "@/lib/api";

export const TRADE_STEPS = [
  {
    n: "01",
    title: "Meet",
    body: "Tell us about your project. Your contact learns your palette, scale, budget and timeline before proposing anything.",
  },
  {
    n: "02",
    title: "Selection",
    body: "You receive a curated proposal of original works, with the technical information for each piece, at trade pricing.",
  },
  {
    n: "03",
    title: "Details",
    body: "Packaging, logistics and delivery, coordinated around your project schedule.",
  },
] as const;

export type TradeSegmentSlug =
  | "interior-designers"
  | "architects"
  | "developers"
  | "art-consultants";

export interface TradeSegment {
  slug: TradeSegmentSlug;
  path: string;
  role: TradeRole;
  label: string;
  cardTitle: string;
  cardDescription: string;
  shortLine: string;
  /** Full document title (not appended with — BRIDGEARG). */
  metaTitle: string;
  metaDescription: string;
  h1a: string;
  h1u: string;
  intro: string;
  understand: string;
  cta: string;
  help: readonly { title: string; body: string }[];
}

export const TRADE_SEGMENTS: Record<TradeSegmentSlug, TradeSegment> = {
  "interior-designers": {
    slug: "interior-designers",
    path: "/trade/interior-designers",
    role: "interior_designer",
    label: "Interior Designers",
    cardTitle: "Interior Designers",
    cardDescription:
      "One point of contact for an entire project, residential or hospitality. Curated works that fit your palette, scale and timeline.",
    shortLine: "One point of contact for an entire project, residential or hospitality.",
    metaTitle: "Art for Interior Designers | BridgeArg Trade Program",
    metaDescription:
      "Original Argentine contemporary art for your projects. One contact, curated selections and 15% trade pricing for interior designers.",
    h1a: "Art for your interiors,",
    h1u: "from one contact.",
    intro:
      "Residential or hospitality, one conversation covers the art for your entire project. We select original Argentine contemporary works that fit your palette, scale and timeline.",
    understand:
      "Finding art that matches a moodboard takes hours. Coordinating several artists separately slows a project down. And artwork that arrives late, or doesn’t fit the space, puts the whole delivery at risk.",
    cta: "Bring art into your next interior",
    help: [
      {
        title: "One point of contact for the whole project",
        body: "A single point of contact from first brief to delivery.",
      },
      {
        title: "Curated selections",
        body: "Works chosen for your palette, scale and budget, not a catalogue to sift through.",
      },
      {
        title: "Exact specifications",
        body: "Dimensions and weight for every piece, so you can plan the space with confidence.",
      },
      {
        title: "15% trade pricing",
        body: "On every acquisition made through the program.",
      },
    ],
  },
  architects: {
    slug: "architects",
    path: "/trade/architects",
    role: "architect",
    label: "Architects",
    cardTitle: "Architects",
    cardDescription:
      "Artwork considered as part of the spatial narrative. Clear specs, dimensions and logistics for site coordination.",
    shortLine: "Artwork considered as part of the spatial narrative.",
    metaTitle: "Art for Architects | BridgeArg Trade Program",
    metaDescription:
      "Artwork chosen with the space in mind, with clear specs and dimensions. 15% trade pricing for architects and studios.",
    h1a: "Artwork as part of",
    h1u: "the spatial narrative.",
    intro:
      "Art works best when it is considered alongside the space, not added at the end. We help you choose pieces that belong to the architecture, with the technical information your project needs.",
    understand:
      "Site coordination needs precise data: dimensions, weight, how a piece will be installed. When art is decided late, it rarely feels like it belongs to the design.",
    cta: "Choose art with the space in mind",
    help: [
      {
        title: "Early involvement",
        body: "We can join the conversation while the space is still taking shape.",
      },
      {
        title: "Clear technical information",
        body: "Dimensions and weight for each work, ready to share with your team and your client.",
      },
      {
        title: "Selections by space",
        body: "Proposals built around each room, wall and use.",
      },
      {
        title: "15% trade pricing",
        body: "On every acquisition made through the program.",
      },
    ],
  },
  developers: {
    slug: "developers",
    path: "/trade/developers",
    role: "developer",
    label: "Real Estate Developers",
    cardTitle: "Real Estate Developers",
    cardDescription:
      "Cohesive selections for lobbies, amenities and model units. One provider across every acquisition on your project.",
    shortLine: "Cohesive selections for lobbies, amenities and model units.",
    metaTitle: "Art for Real Estate Developers | BridgeArg Trade Program",
    metaDescription:
      "Cohesive art selections for lobbies, amenities and model units, from one provider. 15% trade pricing on every acquisition.",
    h1a: "Art with identity",
    h1u: "for your shared spaces.",
    intro:
      "Lobbies, amenities and model units speak first. We build cohesive selections from Argentine contemporary artists, so the art gives your development a point of view.",
    understand:
      "Furnishing multiple spaces on a building schedule means coordinating many pieces and many sources. The result can end up uneven, or purely decorative, with no story to tell.",
    cta: "Give your development a point of view",
    help: [
      {
        title: "One provider for the whole program",
        body: "Selection, logistics and delivery coordinated through one contact.",
      },
      {
        title: "A coherent curatorial line",
        body: "Pieces that work together and give your project a character of its own.",
      },
      {
        title: "Stories you can use",
        body: "Each artist and work comes with context that supports how you present the development.",
      },
      {
        title: "15% trade pricing",
        body: "Across every acquisition on your project.",
      },
    ],
  },
  "art-consultants": {
    slug: "art-consultants",
    path: "/trade/art-consultants",
    role: "art_consultant",
    label: "Art Consultants",
    cardTitle: "Art Consultants",
    cardDescription:
      "Direct access to the artists, with authenticity, shipping and customs handled.",
    shortLine: "Direct access to the artists, with documentation and logistics handled.",
    metaTitle: "Art for Art Consultants | BridgeArg Trade Program",
    metaDescription:
      "Direct access to Argentine contemporary artists, with documented authenticity and verified purchases. 15% trade pricing.",
    h1a: "Direct access to",
    h1u: "Argentine contemporary art.",
    intro:
      "Your recommendations carry your reputation. We give you direct access to BridgeArg's artists and their studios, with the documentation your clients expect and the logistics handled.",
    understand:
      "Sourcing for collectors and companies means trusting the provenance of every piece. Reliable documentation, clear artist information and manageable logistics make the difference.",
    cta: "Source with confidence",
    help: [
      {
        title: "Direct access to the artists",
        body: "Biography, background and additional images for your presentations, and direct contact with the artists and their studios.",
      },
      {
        title: "Documented authenticity",
        body: "Every work comes with documentation of authenticity.",
      },
      {
        title: "Shipping and customs handled",
        body: "We crate, ship and clear customs, and deliver to you or to your client's project.",
      },
      {
        title: "15% trade pricing",
        body: "A fixed 15% on every acquisition made through the program, with transparent pricing.",
      },
    ],
  },
};

export const TRADE_SEGMENT_LIST = Object.values(TRADE_SEGMENTS);

export const TRADE_SEGMENT_SLUGS = Object.keys(TRADE_SEGMENTS) as TradeSegmentSlug[];

export function getTradeSegment(slug: string | undefined): TradeSegment | undefined {
  if (!slug) return undefined;
  return TRADE_SEGMENTS[slug as TradeSegmentSlug];
}

export const TRADE_ROLE_QUERY_VALUES: readonly TradeRole[] = [
  "interior_designer",
  "architect",
  "developer",
  "art_consultant",
];

export function parseTradeRoleParam(value: string | null): TradeRole | undefined {
  if (!value) return undefined;
  return TRADE_ROLE_QUERY_VALUES.includes(value as TradeRole)
    ? (value as TradeRole)
    : undefined;
}
