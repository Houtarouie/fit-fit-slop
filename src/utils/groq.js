const GROQ_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

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
 * Analyzes a text description of a meal using Groq's Llama 3.3 70B model
 */
export async function analyzeMealTextGroq(apiKey, text) {
  try {
    const prompt = `Analyze this meal description: "${text}"\n\nEstimate its calorie and protein content.`;

    const response = await fetch(GROQ_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Groq API responded with status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Groq Text Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze meal text using Groq API.");
  }
}

/**
 * Analyzes a meal photo using Groq's Llama 3.2 11B Vision model
 */
export async function analyzeMealImageGroq(apiKey, base64Data, mimeType, additionalText = "") {
  try {
    let prompt = "Analyze this meal photo. Estimate its calorie and protein content.";
    if (additionalText && additionalText.trim() !== "") {
      prompt += ` Additional context from the user: "${additionalText}"`;
    }

    const imageUrl = `data:${mimeType};base64,${base64Data}`;

    const response = await fetch(GROQ_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Groq API responded with status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Groq Image Vision Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze meal image using Groq API.");
  }
}
