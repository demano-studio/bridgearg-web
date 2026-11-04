import type { TradeRole } from "@/lib/api";

export const TRADE_STEPS = [
  {
    n: "01",
    title: "Meet",
    body: "We talk through your project — program, palette, budget and dates — so the selection starts from real constraints.",
  },
  {
    n: "02",
    title: "Selection",
    body: "We prepare a curated proposal with 15% trade pricing on every acquisition, ready for client presentation.",
  },
  {
    n: "03",
    title: "Details",
    body: "Packaging, logistics and shipping are coordinated with your construction or installation schedule.",
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
  cardTitle: string;
  cardLines: readonly [string, string];
  /** Full document title (not appended with — BRIDGEARG). */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  understand: string;
  help: readonly { title: string; body: string }[];
}

export const TRADE_SEGMENTS: Record<TradeSegmentSlug, TradeSegment> = {
  "interior-designers": {
    slug: "interior-designers",
    path: "/trade/interior-designers",
    role: "interior_designer",
    cardTitle: "Interior Designers",
    cardLines: [
      "Residential or hospitality — one advisor for the entire project.",
      "Curated Argentine contemporary works for your palette, scale and timeline.",
    ],
    metaTitle: "Art for Interior Designers | BridgeArg Trade Program",
    metaDescription:
      "Original Argentine contemporary art for your projects. One advisor, curated selections and 15% trade pricing for interior designers.",
    h1: "Art for your interiors, from one advisor.",
    intro:
      "Residential or hospitality, one conversation covers the art for your entire project. We select original Argentine contemporary works that fit your palette, scale and timeline.",
    understand:
      "Finding art that matches a moodboard takes hours. Coordinating several artists separately slows a project down. And artwork that arrives late or doesn't fit the space puts the whole delivery at risk.",
    help: [
      {
        title: "One advisor for the whole project.",
        body: "A single point of contact from first brief to delivery.",
      },
      {
        title: "Curated selections.",
        body: "Works chosen for your palette, scale and budget, not a catalogue to sift through.",
      },
      {
        title: "Exact specifications.",
        body: "Dimensions and weight for every piece, so you can plan the space with confidence.",
      },
      {
        title: "15% trade pricing.",
        body: "On every acquisition made through the program.",
      },
    ],
  },
  architects: {
    slug: "architects",
    path: "/trade/architects",
    role: "architect",
    cardTitle: "Architects",
    cardLines: [
      "Artwork chosen with the space in mind, not added at the end.",
      "Clear specs, dimensions and 15% trade pricing.",
    ],
    metaTitle: "Art for Architects | BridgeArg Trade Program",
    metaDescription:
      "Artwork chosen with the space in mind, with clear specs and dimensions. 15% trade pricing for architects and studios.",
    h1: "Artwork as part of the spatial narrative.",
    intro:
      "Art works best when it is considered alongside the space, not added at the end. We help you choose pieces that belong to the architecture, with the technical information your project needs.",
    understand:
      "Site coordination needs precise data: dimensions, weight, how a piece will be installed. When art is decided late, it rarely feels like it belongs to the design.",
    help: [
      {
        title: "Early involvement.",
        body: "We can join the conversation while the space is still taking shape.",
      },
      {
        title: "Clear technical information.",
        body: "Dimensions and weight for each work, ready to share with your team and your client.",
      },
      {
        title: "Selections by space.",
        body: "Proposals built around each room, wall and use.",
      },
      {
        title: "15% trade pricing.",
        body: "On every acquisition made through the program.",
      },
    ],
  },
  developers: {
    slug: "developers",
    path: "/trade/developers",
    role: "developer",
    cardTitle: "Real Estate Developers",
    cardLines: [
      "Cohesive selections for lobbies, amenities and model units.",
      "One provider, with 15% trade pricing on every acquisition.",
    ],
    metaTitle: "Art for Real Estate Developers | BridgeArg Trade Program",
    metaDescription:
      "Cohesive art selections for lobbies, amenities and model units, from one provider. 15% trade pricing on every acquisition.",
    h1: "Art with identity for your shared spaces.",
    intro:
      "Lobbies, amenities and model units speak first. We build cohesive selections from Argentine contemporary artists, so the art gives your development a point of view.",
    understand:
      "Furnishing multiple spaces on a building schedule means coordinating many pieces and many sources. The result can end up uneven, or purely decorative, with no story to tell.",
    help: [
      {
        title: "One provider for the whole program.",
        body: "Selection, logistics and delivery coordinated through one advisor.",
      },
      {
        title: "A coherent curatorial line.",
        body: "Pieces that work together and give your project a character of its own.",
      },
      {
        title: "Stories you can use.",
        body: "Each artist and work comes with context that supports how you present the development.",
      },
      {
        title: "15% trade pricing.",
        body: "Across every acquisition on your project.",
      },
    ],
  },
  "art-consultants": {
    slug: "art-consultants",
    path: "/trade/art-consultants",
    role: "art_consultant",
    cardTitle: "Art Consultants",
    cardLines: [
      "Direct access to BridgeArg's Argentine contemporary roster.",
      "Documented authenticity, verified purchases and 15% trade pricing.",
    ],
    metaTitle: "Art for Art Consultants | BridgeArg Trade Program",
    metaDescription:
      "Direct access to Argentine contemporary artists, with documented authenticity and verified purchases. 15% trade pricing.",
    h1: "Direct access to Argentine contemporary art.",
    intro:
      "Your recommendations carry your reputation. We give you direct access to BridgeArg's roster of Argentine contemporary artists, with the documentation your clients expect.",
    understand:
      "Sourcing for collectors and companies means trusting the provenance of every piece. Reliable documentation, clear artist information and manageable logistics make the difference.",
    help: [
      {
        title: "Direct access to the roster.",
        body: "Artists with biography, background and additional images for your presentations.",
      },
      {
        title: "Documented authenticity.",
        body: "Every work comes with documentation of authenticity.",
      },
      {
        title: "Verified purchases.",
        body: "A secure acquisition process with identity verification and protected payment.",
      },
      {
        title: "15% trade pricing.",
        body: "On every acquisition made through the program.",
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
