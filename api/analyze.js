export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, demo_item } = req.body;
  const GEMINI_KEY = process.env.GEMINI_KEY;

  const prompt = `Eres experto en gestión de residuos sólidos en Lima, Perú.
Analiza y responde ÚNICAMENTE con JSON válido sin backticks ni texto extra:
{"item":"nombre específico","recyclable":true,"category":"Plástico/Cartón/Vidrio/Metal/Orgánico/Papel/Electrónico/Mixto","confidence":95,"color_bin":"Azul/Verde/Marrón/Rojo/Negro","coins":15,"instructions":"instrucción específica para Lima","details":"explicación breve"}`;

  try {
    let body;

    if (image) {
      body = {
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: image } },
            { text: prompt }
          ]
        }]
      };
    } else {
      body = {
        contents: [{
          parts: [{ text: `${prompt}\n\nAnaliza este residuo: "${demo_item}"` }]
        }]
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Convertimos respuesta de Gemini al formato que espera el frontend
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Devolvemos en formato compatible con el frontend
    res.status(200).json({
      content: [{ text: JSON.stringify(parsed) }]
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}