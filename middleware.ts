import { geolocation, next } from "@vercel/edge";

export const config = {
  matcher: ["/artworks", "/artworks/:path*"],
};

export default function middleware(request: Request) {
  const { country } = geolocation(request);
  const response = next();
  response.headers.append(
    "Set-Cookie",
    `visitor_country=${country ?? "unknown"}; Path=/; Max-Age=86400; SameSite=Lax`,
  );
  return response;
}
