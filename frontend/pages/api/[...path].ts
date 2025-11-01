// Next.js API proxy - optional, for CORS or API routing
// Not required if backend CORS is properly configured

export default function handler(req: any, res: any) {
  res.status(404).json({ error: "API proxy not implemented" });
}

