const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Define JSON Schema for Gemini response
const responseSchema = {
  type: "OBJECT",
  properties: {
    words: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          definition: { type: "STRING" },
          sentence: { type: "STRING" },
          category: { type: "STRING", description: "Language of origin, like Afrikaans, French, Latin, Greek, German, Dutch, Italian, or Other (infer from context or headers in the image)" },
          part_of_speech: { type: "STRING" },
          morphemes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING", description: "The syllable or morpheme block (e.g. 'hydro', 'phob')" },
                type: { type: "STRING", enum: ["root", "prefix", "suffix", "syllable"] },
                meaning: { type: "STRING", description: "The meaning of this block (if prefix/suffix/root)" }
              },
              required: ["text", "type"]
            }
          },
          alternate_pronunciations: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          spelling_tip: { type: "STRING", description: "Spelling tip based on the word's language of origin (e.g. 'Greek origin uses ph for /f/')" }
        },
        required: ["word", "definition", "sentence", "category", "part_of_speech", "morphemes"]
      }
    }
  },
  required: ["words"]
};

const extractWordsFromImage = async (imageBuffer, mimeType) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
  }

  // Use gemini-3-pro-preview (3rd gen Pro model) for highly accurate OCR and etymology
  const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-preview",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1
    }
  });

  const prompt = `
    Analyze this page from a spelling bee booklet. 
    Perform OCR to extract all the spelling words listed on this page.
    For each word, do the following:
    1. Clean the spelling: remove leading numbers, dots, dashes or punctuation. Make it correct casing (lowercase unless a proper noun).
    2. Determine its language of origin (category). Look at the section headers in the image (e.g., 'WORDS FROM AFRIKAANS', 'WORDS FROM OTHER LANGUAGES') or infer it if it's not clear or uncategorized.
    3. Generate a high-quality, simple definition suitable for a junior spelling bee participant.
    4. Create a memorable, clear contextual sentence using the word.
    5. Determine its part of speech.
    6. Break the word down into 'Lego Blocks' (morphemes or syllables) with their meanings. E.g. for "hydrophobia", break it into "hydro" (root, meaning: water), "phob" (root, meaning: fear), "ia" (suffix, meaning: condition). If it is a root word that can't be easily broken into morphemes, break it into syllables and explain how it's built.
    7. Provide any common alternate pronunciations if applicable.
    8. Write a helpful spelling tip based on etymology rules (e.g. for Afrikaans: "Afrikaans words often spell the /f/ sound as 'v' and the /v/ sound as 'w'").
    
    Ensure all fields are fully populated and accurate. Return ONLY JSON.
  `;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString("base64"),
      mimeType: mimeType
    }
  };

  try {
    console.log("Sending request to Gemini API for OCR and extraction...");
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    console.log("Gemini API returned response.");
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};

module.exports = {
  extractWordsFromImage
};
