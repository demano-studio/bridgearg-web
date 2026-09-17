import { geolocation, next } from "@vercel/edge";

export const config = {
  matcher: [
    "/((?!assets/|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico|css|js|txt|xml|json|woff2?)$).*)",
  ],
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
