export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "PIANAR API is running"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt is required"
      });
    }

    const API_KEY = process.env.POLLINATIONS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        error: "POLLINATIONS_API_KEY is not configured"
      });
    }

    const imageUrl =
      "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(prompt) +
      "?width=1024&height=1024&nologo=true&key=" +
      encodeURIComponent(API_KEY);

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Image generation failed"
    });
  }
}
