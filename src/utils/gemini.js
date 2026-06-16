import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Helper to convert base64 image data into the format Gemini expects
 */
function fileToGenerativePart(base64Data, mimeType) {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
}

const SYSTEM_INSTRUCTION = `You are a professional nutrition and dietetics expert. Your task is to analyze the provided meal description or meal image and estimate its nutritional content, specifically focusing on Calories (in kcal) and Protein (in grams).

For your output, you MUST return a valid JSON object matching the following structure:
{
  "mealName": "A descriptive, clean title for the meal",
  "calories": 450, // total estimated calories (integer)
  "protein": 32.5, // total estimated protein in grams (number, max 1 decimal place)
  "items": [ // breakdown of individual ingredients or parts identified
    {
      "name": "Ingredient name",
      "calories": 250, // estimated calories for this ingredient
      "protein": 24.0, // estimated protein for this ingredient
      "quantity": 1,   // estimated quantity
      "unit": "piece/serving/grams" // estimated unit
    }
  ]
}

Be realistic and moderate in your estimations. If the input is too vague, estimate based on standard portions and common recipes. Do not write any markdown codeblock formatting, preamble, or explanations outside of the JSON object itself. Just return the JSON object directly.`;

/**
 * Analyzes a text description of a meal using Gemini 2.5 Flash
 */
export async function analyzeMealText(apiKey, text) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash as default, fallback to gemini-1.5-flash if needed
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `Analyze this meal description: "${text}"\n\nEstimate its calorie and protein content.`;
    
    const result = await model.generateContent([
      { text: SYSTEM_INSTRUCTION },
      { text: prompt }
    ]);
    
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze meal text using Gemini API.");
  }
}

/**
 * Analyzes a meal image (webcam capture or file upload) using Gemini 2.5 Flash
 * @param {string} apiKey - Gemini API Key
 * @param {string} base64Data - Raw base64 data (excluding the "data:image/jpeg;base64," prefix)
 * @param {string} mimeType - e.g., "image/jpeg" or "image/png"
 * @param {string} [additionalText] - Optional description provided by the user alongside the image
 */
export async function analyzeMealImage(apiKey, base64Data, mimeType, additionalText = "") {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const imagePart = fileToGenerativePart(base64Data, mimeType);
    let prompt = "Analyze this meal photo. Estimate its calorie and protein content.";
    if (additionalText && additionalText.trim() !== "") {
      prompt += ` The user also provided this additional context: "${additionalText}"`;
    }

    const result = await model.generateContent([
      { text: SYSTEM_INSTRUCTION },
      imagePart,
      { text: prompt }
    ]);
    
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze meal image using Gemini API.");
  }
}
