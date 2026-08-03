export default async function handler(req, res) {

  /* =====================================
     CORS
  ===================================== */

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  /* =====================================
     API STATUS
  ===================================== */

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "PIANAR API is running"
    });
  }


  /* =====================================
     ONLY POST ALLOWED
  ===================================== */

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }


  try {

   const {
  prompt,
  style = "",
  size = "1024x1024",
  quality = "standard",
  count = 1,
  referenceImage = null
} = req.body || {}; 


    /* =====================================
       VALIDATE PROMPT
    ===================================== */

    if (
      !prompt ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required"
      });
    }


    /* =====================================
       API KEY
    ===================================== */

    const API_KEY =
      process.env.POLLINATIONS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error:
          "POLLINATIONS_API_KEY is not configured"
      });
    }


    /* =====================================
       IMAGE SIZE
    ===================================== */

    const allowedSizes = {
      "1024x1024": [1024, 1024],
      "1024x1536": [1024, 1536],
      "1536x1024": [1536, 1024]
    };

    const selectedSize =
      allowedSizes[size] ||
      allowedSizes["1024x1024"];

    const width = selectedSize[0];
    const height = selectedSize[1];


    /* =====================================
       FINAL PROMPT
    ===================================== */

    let finalPrompt = prompt.trim();

    if (
      style &&
      typeof style === "string" &&
      style.trim()
    ) {
      finalPrompt +=
        ", " + style.trim() + " style";
    }


    /* =====================================
       POLLINATIONS URL
    ===================================== */

    const params = new URLSearchParams();

    params.set("model", "flux");
    params.set("width", String(width));
    params.set("height", String(height));
    params.set("nologo", "true");

    if (quality === "hd") {
      params.set("quality", "hd");
    }

    const pollinationsUrl =
      "https://gen.pollinations.ai/image/" +
      encodeURIComponent(finalPrompt) +
      "?" +
      params.toString();


    /* =====================================
       GENERATE IMAGE SERVER-SIDE
    ===================================== */

    const imageResponse = await fetch(
      pollinationsUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`
        }
      }
    );


    if (!imageResponse.ok) {

      const errorText =
        await imageResponse.text();

      console.error(
        "Pollinations error:",
        imageResponse.status,
        errorText
      );

      return res.status(imageResponse.status).json({
        success: false,
        error: "Pollinations image generation failed",
        status: imageResponse.status
      });
    }


    /* =====================================
       CONVERT IMAGE TO BASE64
    ===================================== */

    const arrayBuffer =
      await imageResponse.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    const contentType =
      imageResponse.headers.get("content-type") ||
      "image/jpeg";

    const imageUrl =
      `data:${contentType};base64,${buffer.toString("base64")}`;


    /* =====================================
       RESPONSE
    ===================================== */

    return res.status(200).json({
      success: true,

      imageUrl,

      settings: {
        width,
        height,
        quality,
        count
      }
    });


  } catch (error) {

    console.error(
      "PIANAR API Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Image generation failed"
    });
  }
}
