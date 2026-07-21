import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const artists = [
  { id: 1, name: "Artista Ejemplo 1", slug: "artista-ejemplo-1" },
  { id: 2, name: "Artista Ejemplo 2", slug: "artista-ejemplo-2" },
  { id: 3, name: "Artista Ejemplo 3", slug: "artista-ejemplo-3" },
  { id: 4, name: "Artista Ejemplo 4", slug: "artista-ejemplo-4" },
];

const artworks = [
  { id: 1, title: "Sin Título I", priceUsd: 4500, imageUrl: "bridgearg-work1.jpg", artistId: 1, year: "2024", medium: "Óleo sobre lienzo", dimensions: "120 x 150 cm", status: "available" as const },
  { id: 2, title: "Diálogo I", priceUsd: 8000, imageUrl: "bridgearg-work2.jpg", artistId: 2, year: "2024", medium: "Instalación", dimensions: "Variable", status: "available" as const },
  { id: 3, title: "Volumen I", priceUsd: 12000, imageUrl: "bridgearg-work3.jpg", artistId: 3, year: "2024", medium: "Bronce", dimensions: "45 x 30 x 30 cm", status: "available" as const },
  { id: 4, title: "Acumulación", priceUsd: 1800, imageUrl: "bridgearg-work4.jpg", artistId: 4, year: "2024", medium: "Técnica mixta", dimensions: "60 x 80 cm", status: "available" as const },
  { id: 5, title: "Composición en Azul", priceUsd: 3200, imageUrl: "bridgearg-work2.jpg", artistId: 1, year: "2024", medium: "Acrílico sobre lienzo", dimensions: "100 x 100 cm", status: "sold" as const },
  { id: 6, title: "Resonancias", priceUsd: 5500, imageUrl: "bridgearg-work3.jpg", artistId: 2, year: "2024", medium: "Video arte", dimensions: "12 min loop", status: "available" as const },
];

async function main() {
  for (const artist of artists) {
    const { id, ...data } = artist;
    await prisma.artist.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  for (const artwork of artworks) {
    const { id, ...data } = artwork;
    await prisma.artwork.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
  console.log("Seed completed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
