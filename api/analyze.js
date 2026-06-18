export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, demo_item } = req.body;
  const GEMINI_KEY = process.env.GEMINI_KEY;

  // Definimos las reglas del sistema de forma estricta
  const systemInstruction = `Eres un experto en clasificación de residuos sólidos en Lima, Perú.
Tu única tarea es analizar visualmente el residuo proporcionado y clasificarlo de forma ultra precisa.

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
- Si ves hojas de papel blanco o cuadernos → item: "Hojas de papel bond", category: "Papel", color_bin: "Azul"
- Si ves caja de cartón → item: "Caja de cartón", category: "Cartón", color_bin: "Azul"
- Si ves botella plástica → item: "Botella plástica PET", category: "Plástico", color_bin: "Azul"
- Sé MUY específico con lo que realmente ves en la imagen. No inventes materiales metálicos si el objeto es blanco o traslúcido.

Responde SOLO con este JSON exacto, sin backticks (\`\`\`), sin la palabra "json", sin texto adicional:
{"item":"nombre muy específico de lo que ves","recyclable":true,"category":"Papel/Cartón/Plástico/Vidrio/Metal/Orgánico/Electrónico","confidence":95,"color_bin":"Azul/Verde/Marrón/Rojo/Negro","coins":15,"instructions":"instrucción práctica para Lima","details":"explicación de 2 líneas sobre reciclaje en Lima"}`;

  try {
    let body;

    if (image) {
      // Flujo con CÁMARA REAL (Multimodal)
      body = {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: image } },
            { text: "Analiza minuciosamente esta imagen. Identifica el material predominante del objeto céntrico y devuélvelo en el formato JSON solicitado." }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Mantenemos la temperatura baja para evitar alucinaciones
          maxOutputTokens: 500,
          responseMimeType: "application/json" // Forzamos a Gemini a responder en formato JSON nativo
        }
      };
    } else {
      // Flujo en MODO DEMO (Texto)
      body = {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [{
          parts: [{ text: `El usuario no envió una foto. Clasifica estrictamente el siguiente texto ficticio: "${demo_item}".` }]
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
    
    // Si la API devuelve un error estructural
    if (data.error) {
      throw new Error(data.error.message || "Error en la API de Gemini");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Al usar responseMimeType: "application/json", el texto ya viene limpio sin bloques de Markdown (\`\`\`json)
    const clean = text.trim();
    const parsed = JSON.parse(clean);

    res.status(200).json({
      content: [{ text: JSON.stringify(parsed) }]
    });

  } catch (e) {
    console.error("Error en el Handler:", e.message);
    res.status(500).json({ error: e.message });
  }
}