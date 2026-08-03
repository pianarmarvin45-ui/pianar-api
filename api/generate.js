export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { text, voice_id } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Text is required"
      });
    }

    const API_KEY = process.env.ELEVENLABS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "ELEVENLABS_API_KEY is not configured"
      });
    }

    // Default ElevenLabs voice if no voice_id is sent
    const voiceId =
      voice_id || "21m00Tcm4TlvDq8ikWAM";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
          "Accept": "audio/mpeg"
        },

        body: JSON.stringify({
          text: text.trim(),

          model_id: "eleven_multilingual_v2",

          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "ElevenLabs API Error:",
        response.status,
        errorText
      );

      return res.status(response.status).json({
        success: false,
        error: "ElevenLabs voice generation failed",
        details: errorText.slice(0, 500)
      });
    }

    const arrayBuffer = await response.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const audioBase64 = buffer.toString("base64");

    return res.status(200).json({
      success: true,
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`
    });

  } catch (error) {
    console.error("PIANAR TTS Error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Voice generation failed"
    });
  }
}
