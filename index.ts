// Vercel entrypoint - api/index.ts handles the actual serverless function
export default function handler() {
  return new Response("API routes are available at /api/*", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

