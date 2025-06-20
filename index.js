import { GoogleGenAI } from "@google/genai";

// ditaruh di .env
const ai = new GoogleGenAI({ apiKey: "" });

async function main() {
    const model = await ai.model.get({ model: "gemini-2.0-flash" });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

await main();

// 2 jenis import syntax
// CommonJS --> require() untuk import, module.exports untuk export
// ES Module --> import untuk import, export untuk export