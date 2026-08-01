export default async function handler(req, res) {
  // Allow requests from PIANAR Studio
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const API_KEY = process.env.POLLINATIONS_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: "POLLINATIONS_API_KEY is not configured"
    });
  }

  return res.status(200).json({
    status: "ok",
    message: "PIANAR API is running"
  });
}
