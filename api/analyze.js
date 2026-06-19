export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, demo_item } = req.body;
  const GEMINI_KEY = process.env.GEMINI_KEY;

  const systemInstruction = `Eres un experto en clasificación estricta de residuos sólidos para iniciativas ambientales en Lima, Perú.
Tu única tarea es analizar visualmente la imagen proporcionada y clasificar de forma fidedigna los materiales.

REGLAS DE CLASIFICACIÓN URBANAS:
- Papel/cartón: hojas, cajas de embalajes, periódicos, revistas, sobres → color_bin: Azul
- Plástico PET: botellas transparentes de agua o bebidas gaseosas → color_bin: Azul  
- Plástico duro: envases de shampoo, detergente o tapitas → color_bin: Azul
- Vidrio: botellas, jarras transparentes, vasos de vidrio, frascos → color_bin: Verde
- Metal/aluminio: latas de bebidas, latas de conserva, tapas metálicas → color_bin: Azul
- Orgánico: restos de comida, cáscaras de fruta, verduras, hojas secas → color_bin: Marrón
- Tecnopor: vasos, bandejas de tecnopor blanco → color_bin: Rojo (no reciclable en Lima)
- Bolsas plásticas: bolsas de mercado, empaques flexibles → color_bin: Rojo (difícil reciclaje)

REGLAS CRÍTICAS DE ENFOQUE MULTIMODAL:
1. Analiza con MÁXIMO detalle visual la transparencia, los bordes y el reflejo de la luz.
2. Si el objeto es translúcido, transparente o muestra el fondo a través de él, clasifícalo como Vidrio ("category": "Vidrio", "color_bin": "Verde") o Plástico PET según corresponda. NO lo confundas con una lata de aluminio opaca.
3. Sé muy específico con el nombre del residuo real.

Responde ÚNICAMENTE con esta estructura JSON pura, sin bloques de texto markdown, sin envolver en caracteres de comillas invertidas (\`\`\`) ni la palabra "json":
{"item":"nombre muy específico de lo que ves","recyclable":true,"category":"Papel/Cartón/Plástico/Vidrio/Metal/Orgánico/Electrónico","confidence":95,"color_bin":"Azul/Verde/Marrón/Rojo/Negro","coins":15,"instructions":"instrucción práctica para Lima","details":"explicación de 2 líneas sobre reciclaje en Lima"}`;

  try {
    let body;

    if (image) {
      body = {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: image } },
            { text: "Analiza minuciosamente el objeto céntrico de la imagen. Identifica con precisión su material (observa si es transparente como vidrio o plástico, u opaco como metal) y mapea las reglas correspondientes al JSON solicitado." }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: "application/json"
        }
      };
    } else {
      body = {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          parts: [{ text: `Clasifica estrictamente el siguiente texto ficticio simulado: "${demo_item}".` }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: "application/json"
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
    
    if (data.error) {
      throw new Error(data.error.message || "Error devuelto por la API de Gemini");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.trim();
    const parsed = JSON.parse(clean);

    res.status(200).json({
      content: [{ text: JSON.stringify(parsed) }]
    });

  } catch (e) {
    console.error("Error en Tubería de Análisis:", e.message);
    res.status(500).json({ error: e.message });
  }
}