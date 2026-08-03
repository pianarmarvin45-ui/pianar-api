export default async function handler(req, res) {

  /* =====================================
     CORS
  ===================================== */

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  if (req.method === "OPTIONS") {

    return res
      .status(200)
      .end();

  }


  /* =====================================
     API STATUS
  ===================================== */

  if (req.method === "GET") {

    return res
      .status(200)
      .json({

        status: "ok",

        message:
          "PIANAR API is running"

      });

  }


  /* =====================================
     ONLY POST
  ===================================== */

  if (req.method !== "POST") {

    return res
      .status(405)
      .json({

        success: false,

        error:
          "Method not allowed"

      });

  }


  try {

    /* =====================================
       REQUEST DATA
    ===================================== */

    const {

      prompt,

      referenceImages = []

    } = req.body || {};


    /* =====================================
       VALIDATE PROMPT
    ===================================== */

    if (
      !prompt ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {

      return res
        .status(400)
        .json({

          success: false,

          error:
            "Prompt is required"

        });

    }


    /* =====================================
       API KEY
    ===================================== */

    const API_KEY =
      process.env
        .POLLINATIONS_API_KEY;


    if (!API_KEY) {

      return res
        .status(500)
        .json({

          success: false,

          error:
            "POLLINATIONS_API_KEY is not configured"

        });

    }


    /* =====================================
       CLEAN REFERENCE IMAGES
    ===================================== */

    const validReferenceImages =
      Array.isArray(referenceImages)

        ? referenceImages
            .filter(
              image =>
                typeof image === "string" &&
                image.startsWith(
                  "data:image/"
                )
            )
            .slice(0, 10)

        : [];


    const hasReferenceImages =
      validReferenceImages.length > 0;


    /* =====================================
       TEXT TO IMAGE MODE
       NO REFERENCE IMAGE
    ===================================== */

    if (!hasReferenceImages) {

      const params =
        new URLSearchParams();


      params.set(
        "model",
        "flux"
      );


      /*
       * Default canvas only.
       *
       * User can describe desired
       * aspect ratio / composition
       * directly inside the prompt.
       */

      params.set(
        "width",
        "1024"
      );

      params.set(
        "height",
        "1024"
      );


      params.set(
        "nologo",
        "true"
      );


      const imageUrl =
        "https://gen.pollinations.ai/image/" +
        encodeURIComponent(
          prompt.trim()
        ) +
        "?" +
        params.toString();


      const imageResponse =
        await fetch(
          imageUrl,
          {

            method: "GET",

            headers: {

              Authorization:
                `Bearer ${API_KEY}`

            }

          }
        );


      if (!imageResponse.ok) {

        const errorText =
          await imageResponse.text();


        console.error(
          "Pollinations Text-to-Image Error:",
          imageResponse.status,
          errorText
        );


        return res
          .status(
            imageResponse.status
          )
          .json({

            success: false,

            error:
              "Pollinations image generation failed"

          });

      }


      const arrayBuffer =
        await imageResponse
          .arrayBuffer();


      const buffer =
        Buffer.from(
          arrayBuffer
        );


      const contentType =
        imageResponse.headers.get(
          "content-type"
        ) ||
        "image/jpeg";


      const generatedImage =
        `data:${contentType};base64,${buffer.toString("base64")}`;


      return res
        .status(200)
        .json({

          success: true,

          mode:
            "text-to-image",

          imageUrl:
            generatedImage

        });

    }


    /* =====================================
       IMAGE + PROMPT MODE
    ===================================== */

    /*
     * Convert Base64 reference image
     * into an actual binary file.
     *
     * This is different from our old
     * method that tried to put Base64
     * directly inside the image URL.
     */

    const firstReference =
      validReferenceImages[0];


    const match =
      firstReference.match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
      );


    if (!match) {

      return res
        .status(400)
        .json({

          success: false,

          error:
            "Invalid reference image"

        });

    }


    const mimeType =
      match[1];


    const base64Data =
      match[2];


    const imageBuffer =
      Buffer.from(
        base64Data,
        "base64"
      );


    let extension =
      "jpg";


    if (
      mimeType === "image/png"
    ) {

      extension =
        "png";

    }

    else if (
      mimeType === "image/webp"
    ) {

      extension =
        "webp";

    }


    /* =====================================
       BUILD MULTIPART REQUEST
    ===================================== */

    const form =
      new FormData();


    form.append(
      "prompt",
      prompt.trim()
    );


    form.append(
      "model",
      "kontext"
    );


    const imageBlob =
      new Blob(
        [imageBuffer],
        {
          type:
            mimeType
        }
      );


    form.append(
      "image",
      imageBlob,
      `reference.${extension}`
    );


    /* =====================================
       POLLINATIONS IMAGE EDIT
    ===================================== */

    const editResponse =
      await fetch(
        "https://gen.pollinations.ai/v1/images/edits",
        {

          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${API_KEY}`

          },

          body:
            form

        }
      );


    if (!editResponse.ok) {

      const errorText =
        await editResponse.text();


      console.error(
        "Pollinations Image Edit Error:",
        editResponse.status,
        errorText
      );


      return res
        .status(
          editResponse.status
        )
        .json({

          success: false,

          error:
            "Reference image generation failed",

          details:
            errorText.slice(
              0,
              500
            )

        });

    }


    /* =====================================
       READ EDIT RESPONSE
    ===================================== */

    const responseType =
      editResponse.headers
        .get("content-type") ||
      "";


    /*
     * Some image APIs return the
     * actual image bytes.
     */

    if (
      responseType.startsWith(
        "image/"
      )
    ) {

      const arrayBuffer =
        await editResponse
          .arrayBuffer();


      const buffer =
        Buffer.from(
          arrayBuffer
        );


      const generatedImage =
        `data:${responseType};base64,${buffer.toString("base64")}`;


      return res
        .status(200)
        .json({

          success: true,

          mode:
            "image-edit",

          imageUrl:
            generatedImage

        });

    }


    /*
     * If Pollinations returns JSON,
     * read the generated image URL/data.
     */

    const data =
      await editResponse.json();


    let generatedImage =
      null;


    if (
      typeof data.imageUrl ===
      "string"
    ) {

      generatedImage =
        data.imageUrl;

    }


    else if (
      typeof data.url ===
      "string"
    ) {

      generatedImage =
        data.url;

    }


    else if (
      Array.isArray(data.data) &&
      data.data.length
    ) {

      if (
        typeof data.data[0]?.url ===
        "string"
      ) {

        generatedImage =
          data.data[0].url;

      }

      else if (
        typeof data.data[0]?.b64_json ===
        "string"
      ) {

        generatedImage =
          "data:image/png;base64," +
          data.data[0].b64_json;

      }

    }


    if (!generatedImage) {

      console.error(
        "Unexpected Pollinations Response:",
        data
      );


      return res
        .status(502)
        .json({

          success: false,

          error:
            "No edited image returned"

        });

    }


    /* =====================================
       ONE RESULT
    ===================================== */

    return res
      .status(200)
      .json({

        success: true,

        mode:
          "image-edit",

        imageUrl:
          generatedImage

      });


  }

  catch (error) {

    console.error(
      "PIANAR API Error:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        error:
          error?.message ||
          "Image generation failed"

      });

  }

}
