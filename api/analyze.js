export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, demo_item } = req.body;

  const content = image
    ? [
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: image },
        },
        {
          type: "text",
          text: `Eres experto en gestión de residuos sólidos en Lima, Perú.
Analiza la imagen y responde ÚNICAMENTE con JSON válido sin backticks ni texto extra:
{"item":"nombre específico del objeto","recyclable":true,"category":"Plástico/Cartón/Vidrio/Metal/Orgánico/Papel/Electrónico/Mixto","confidence":95,"color_bin":"Azul/Verde/Marrón/Rojo/Negro","coins":15,"instructions":"instrucción específica para Lima","details":"explicación breve sobre reciclaje en Lima"}`,
        },
      ]
    : `Simula análisis de reciclaje en Lima para: "${demo_item}". Responde SOLO JSON válido sin backticks: {"item":"${demo_item}","recyclable":true,"category":"Plástico","confidence":92,"color_bin":"Azul","coins":15,"instructions":"instrucción específica Lima","details":"explicación breve sobre reciclaje en Lima Metropolitana"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
