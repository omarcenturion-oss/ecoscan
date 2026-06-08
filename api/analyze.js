export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, demo_item } = req.body;
  const GEMINI_KEY = process.env.GEMINI_KEY;

  const prompt = `Eres un experto en clasificación de residuos sólidos en Lima, Perú.

TAREA: Analiza la imagen con MÁXIMO detalle visual. Observa forma, color, textura, transparencia y material.

REGLAS DE CLASIFICACIÓN:
- Papel/cartón: hojas, cajas, periódicos, revistas, sobres → color_bin: Azul
- Plástico PET: botellas transparentes de agua/bebidas → color_bin: Azul  
- Plástico duro: envases de shampoo, detergente → color_bin: Azul
- Vidrio: botellas, frascos → color_bin: Verde
- Metal/aluminio: latas, tapas → color_bin: Azul
- Orgánico: restos de comida, cáscaras → color_bin: Marrón
- Tecnopor: color_bin: Rojo (no reciclable en Lima)
- Bolsas plásticas: color_bin: Rojo (difícil reciclaje)

IMPORTANTE: 
- Si ves hojas de papel blanco → item: "Hojas de papel bond", category: "Papel"
- Si ves caja de cartón → item: "Caja de cartón", category: "Cartón"
- Si ves botella plástica → item: "Botella plástica PET", category: "Plástico"
- Sé MUY específico con lo que realmente ves en la imagen

Responde SOLO con este JSON exacto, sin backticks, sin texto adicional:
{"item":"nombre muy específico de lo que ves","recyclable":true,"category":"Papel/Cartón/Plástico/Vidrio/Metal/Orgánico/Electrónico","confidence":95,"color_bin":"Azul/Verde/Marrón/Rojo/Negro","coins":15,"instructions":"instrucción práctica para Lima","details":"explicación de 2 líneas sobre reciclaje en Lima"}`;

  try {
    let body;

    if (image) {
      body = {
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: image } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      };
    } else {
      body = {
        contents: [{
          parts: [{ text: `${prompt}\n\nEl residuo a analizar es: "${demo_item}". Clasifícalo correctamente según las reglas.` }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
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
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.status(200).json({
      content: [{ text: JSON.stringify(parsed) }]
    });

  } catch (e) {
    console.error("Error:", e.message);
    res.status(500).json({ error: e.message });
  }
}