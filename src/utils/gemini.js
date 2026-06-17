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

CRITICAL RULES FOR CALORIE AND PROTEIN ESTIMATION:
1. portion weight scaling: You MUST scale the calories and protein of each ingredient based on its weight or quantity. For example, if 100g of dry soya chunks has 52g protein and 330 kcal, then 240g of dry soya chunks MUST be calculated as 2.4 * 52 = 124.8g protein and 2.4 * 330 = 792 kcal. Do not return default 100g values for larger or smaller portion weights!
2. dry vs cooked weights: Differentiate between raw/dry weight and cooked/wet weight. Dry ingredients (such as dry soya chunks, raw rice, raw oats) are highly calorie- and protein-dense. For example, dry soya chunks are about 52g to 54g of protein per 100g. Cooked/hydrated versions weigh much more due to water but have the same total macronutrients. If the input specifies "dry" or "raw" weight, you must use the dry weight nutritional densities.
3. mathematical consistency: The total 'calories' and 'protein' of the meal MUST be mathematically consistent and equal the sum of the scaled calories and protein of the individual items listed in the 'items' breakdown.

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

/**
 * Generates personalized fitness and diet coach insights based on biometrics and today's intake
 */
export async function getCoachAdviceGemini(apiKey, profile, todayIntake) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemInstruction = `You are Coach Marcus, a highly encouraging, elite fitness trainer and nutritional expert. Your tone is motivating, professional, concise, and athletic. You analyze the user's current day intake and biometrics, and provide a single brief paragraph (max 3 sentences) of highly actionable, encouraging coaching feedback. Never output markdown code block, JSON, or greeting preamble. Just output the coach advice text directly. Keep it short and impactful.`;

    const prompt = `User Biometrics:
- Weight: ${profile.weight} kg
- Height: ${profile.height} cm
- Age: ${profile.age} years old
- Gender: ${profile.gender}
- Goal: ${profile.goal}
- Activity Level: ${profile.activityLevel}

Today's Intake so far:
- Total Calories consumed: ${todayIntake.calories} kcal (Target: ${profile.calorieTarget} kcal)
- Total Protein consumed: ${todayIntake.protein} g (Target: ${profile.proteinTarget} g)

Give a short coaching tip for the rest of the day.`;

    const result = await model.generateContent([
      { text: systemInstruction },
      { text: prompt }
    ]);

    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini Coach Error:", error);
    throw new Error(error.message || "Failed to generate coaching insights.");
  }
}
