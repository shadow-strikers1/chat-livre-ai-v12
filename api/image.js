// api/image.js
// Pollinations image generation proxy.
// Configure POLLINATIONS_API_KEY in Vercel Environment Variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed. Use POST."
    });
  }

  try {
    const { prompt, seed } = req.body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt de imagem é obrigatório."
      });
    }

    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "POLLINATIONS_API_KEY não configurada na Vercel."
      });
    }

    const params = new URLSearchParams({
      width: "1024",
      height: "1024",
      nologo: "true"
    });

    if (seed !== undefined && seed !== null && String(seed).trim() !== "") {
      params.set("seed", String(seed));
    }

    const imageUrl =
      "https://gen.pollinations.ai/image/" +
      encodeURIComponent(prompt.trim()) +
      "?" +
      params.toString();

    // Validate that Pollinations accepts the request before returning the URL.
    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return res.status(response.status || 502).json({
        error: "Falha ao gerar imagem.",
        details: body.slice(0, 500)
      });
    }

    return res.status(200).json({
      url: imageUrl
    });
  } catch (error) {
    console.error("Image API error:", error);
    return res.status(500).json({
      error: "Erro interno ao gerar imagem."
    });
  }
}
