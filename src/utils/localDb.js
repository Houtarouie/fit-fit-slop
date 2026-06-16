// Local database of common foods for autocomplete and offline parsing
export const FOOD_DATABASE = [
  // Proteins
  { name: "Chicken Breast", calories: 165, protein: 31, unit: "100g", category: "Protein", synonyms: ["chicken breast", "chicken breasts", "grilled chicken"] },
  { name: "Chicken Thigh", calories: 209, protein: 26, unit: "100g", category: "Protein", synonyms: ["chicken thigh", "chicken thighs"] },
  { name: "Egg", calories: 70, protein: 6, unit: "piece", category: "Protein", synonyms: ["egg", "eggs", "boiled egg", "boiled eggs", "fried egg", "fried eggs", "scrambled egg", "scrambled eggs"] },
  { name: "Salmon", calories: 206, protein: 22, unit: "100g", category: "Protein", synonyms: ["salmon", "salmon fillet", "grilled salmon"] },
  { name: "Tuna (Canned)", calories: 116, protein: 26, unit: "100g", category: "Protein", synonyms: ["tuna", "canned tuna", "tuna fish"] },
  { name: "Beef (Lean)", calories: 250, protein: 26, unit: "100g", category: "Protein", synonyms: ["beef", "steak", "ground beef", "minced beef"] },
  { name: "Pork Chop", calories: 240, protein: 24, unit: "100g", category: "Protein", synonyms: ["pork", "pork chop", "pork chops"] },
  { name: "Tofu", calories: 76, protein: 8, unit: "100g", category: "Protein", synonyms: ["tofu", "firm tofu"] },
  { name: "Greek Yogurt", calories: 97, protein: 10, unit: "100g", category: "Protein", synonyms: ["greek yogurt", "greek yoghurt", "yogurt", "yoghurt"] },
  { name: "Protein Powder", calories: 120, protein: 24, unit: "scoop (30g)", category: "Protein", synonyms: ["protein powder", "whey protein", "protein shake", "whey", "protein scoop"] },
  { name: "Cottage Cheese", calories: 98, protein: 11, unit: "100g", category: "Protein", synonyms: ["cottage cheese"] },
  
  // Carbs & Grains
  { name: "Brown Rice", calories: 111, protein: 2.6, unit: "100g", category: "Carbs", synonyms: ["brown rice", "cooked brown rice"] },
  { name: "White Rice", calories: 130, protein: 2.7, unit: "100g", category: "Carbs", synonyms: ["white rice", "cooked white rice", "rice"] },
  { name: "Oatmeal", calories: 379, protein: 13.5, unit: "100g dry", category: "Carbs", synonyms: ["oatmeal", "oats", "rolled oats", "porridge"] },
  { name: "Whole Wheat Bread", calories: 80, protein: 4, unit: "slice", category: "Carbs", synonyms: ["bread", "whole wheat bread", "slice of bread", "slices of bread", "toast", "wholemeal bread"] },
  { name: "Sweet Potato", calories: 86, protein: 1.6, unit: "100g", category: "Carbs", synonyms: ["sweet potato", "sweet potatoes", "baked potato"] },
  { name: "White Potato", calories: 77, protein: 2, unit: "100g", category: "Carbs", synonyms: ["potato", "potatoes", "mashed potato"] },
  { name: "Pasta (Cooked)", calories: 131, protein: 5, unit: "100g", category: "Carbs", synonyms: ["pasta", "spaghetti", "macaroni", "noodles"] },
  { name: "Quinoa", calories: 120, protein: 4.4, unit: "100g", category: "Carbs", synonyms: ["quinoa"] },

  // Fats & Nuts
  { name: "Avocado", calories: 160, protein: 2, unit: "100g", category: "Fats", synonyms: ["avocado", "avocados", "half avocado", "whole avocado"] },
  { name: "Peanut Butter", calories: 94, protein: 3.5, unit: "tbsp (16g)", category: "Fats", synonyms: ["peanut butter", "almond butter"] },
  { name: "Almonds", calories: 163, protein: 6, unit: "oz (28g)", category: "Fats", synonyms: ["almonds", "almond", "nuts"] },
  { name: "Olive Oil", calories: 119, protein: 0, unit: "tbsp (13.5g)", category: "Fats", synonyms: ["olive oil", "oil", "butter"] },
  { name: "Chia Seeds", calories: 138, protein: 4.7, unit: "tbsp (28g)", category: "Fats", synonyms: ["chia seeds", "chia"] },

  // Fruits & Vegetables
  { name: "Banana", calories: 89, protein: 1.1, unit: "medium", category: "Fruits/Veg", synonyms: ["banana", "bananas"] },
  { name: "Apple", calories: 52, protein: 0.3, unit: "medium", category: "Fruits/Veg", synonyms: ["apple", "apples"] },
  { name: "Blueberries", calories: 57, protein: 0.7, unit: "100g", category: "Fruits/Veg", synonyms: ["blueberries", "blueberry", "berries"] },
  { name: "Broccoli", calories: 34, protein: 2.8, unit: "100g", category: "Fruits/Veg", synonyms: ["broccoli", "steamed broccoli"] },
  { name: "Spinach", calories: 23, protein: 2.9, unit: "100g", category: "Fruits/Veg", synonyms: ["spinach", "baby spinach"] },
  { name: "Mixed Salad Greens", calories: 15, protein: 1, unit: "cup", category: "Fruits/Veg", synonyms: ["salad", "greens", "mixed greens", "lettuce"] },
  { name: "Tomato", calories: 18, protein: 0.9, unit: "medium", category: "Fruits/Veg", synonyms: ["tomato", "tomatoes"] },
  { name: "Breast of Chicken Salad", calories: 350, protein: 35, unit: "serving", category: "Meals", synonyms: ["chicken salad", "caesar salad"] }
];

// Helper to convert words to numbers
const WORD_TO_NUMBER = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

/**
 * Robust local parser to extract food, calories, and protein from a text description.
 * e.g., "I ate 2 eggs and 150g grilled chicken breast with a slice of bread"
 */
export function parseMealDescriptionLocally(text) {
  if (!text || text.trim() === "") {
    return {
      mealName: "Logged Meal",
      calories: 0,
      protein: 0,
      items: []
    };
  }

  const cleanText = text.toLowerCase().trim();
  
  // Split the text into sub-clauses based on common separators
  const parts = cleanText.split(/,|\band\b|\bwith\b|\bplus\b|\+|\bfor\b/);
  const matchedItems = [];
  
  let totalCalories = 0;
  let totalProtein = 0;

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    // Check for quantity/numbers in this segment
    // Looks for patterns like "150g", "2.5", "2", "half", "one"
    let quantity = 1;
    let unitType = "default";
    
    // Check if there is a number
    const numberMatch = part.match(/(\d+(?:\.\d+)?)\s*(g|grams|oz|ounces|ml|tbsp|tablespoons|scoop|scoops|slice|slices|cup|cups)?/i);
    
    if (numberMatch) {
      quantity = parseFloat(numberMatch[1]);
      if (numberMatch[2]) {
        unitType = numberMatch[2].toLowerCase();
      }
    } else {
      // Check for word numbers
      const words = part.split(/\s+/);
      for (const word of words) {
        if (WORD_TO_NUMBER[word]) {
          quantity = WORD_TO_NUMBER[word];
          break;
        }
        if (word === "half" || word === "1/2") {
          quantity = 0.5;
          break;
        }
      }
    }

    // Search for a matching food in our database
    let bestMatch = null;
    let longestMatchLen = 0;

    for (const food of FOOD_DATABASE) {
      for (const synonym of food.synonyms) {
        if (part.includes(synonym)) {
          // Keep the longest matching synonym to be more specific (e.g., "chicken breast" over "chicken")
          if (synonym.length > longestMatchLen) {
            longestMatchLen = synonym.length;
            bestMatch = food;
          }
        }
      }
    }

    if (bestMatch) {
      let finalCalories = 0;
      let finalProtein = 0;
      let displayQty = quantity;
      let displayUnit = bestMatch.unit;

      // Adjust calculation based on food unit types
      if (bestMatch.unit === "100g") {
        if (unitType.startsWith("g") && quantity > 5) {
          // User input e.g. "150g chicken breast"
          finalCalories = Math.round((bestMatch.calories / 100) * quantity);
          finalProtein = Math.round((bestMatch.protein / 100) * quantity * 10) / 10;
          displayUnit = "g";
        } else {
          // Default serving is 150g if they just say "chicken breast" or a small number like "1"
          const multiplier = quantity > 5 ? 1 : quantity; // if quantity is like 1, 2 (meaning 1 or 2 breasts)
          const servingGrams = multiplier * 150; 
          finalCalories = Math.round((bestMatch.calories / 100) * servingGrams);
          finalProtein = Math.round((bestMatch.protein / 100) * servingGrams * 10) / 10;
          displayQty = servingGrams;
          displayUnit = "g";
        }
      } else {
        // Count-based item like eggs, bread, banana
        finalCalories = Math.round(bestMatch.calories * quantity);
        finalProtein = Math.round(bestMatch.protein * quantity * 10) / 10;
        displayUnit = quantity === 1 ? bestMatch.unit : `${bestMatch.unit}s`;
      }

      matchedItems.push({
        name: bestMatch.name,
        quantity: displayQty,
        unit: displayUnit,
        calories: finalCalories,
        protein: finalProtein
      });

      totalCalories += finalCalories;
      totalProtein += finalProtein;
    }
  }

  // If no items matched, create a generic entry based on average expectations or just a placeholder
  if (matchedItems.length === 0) {
    // Try to guess based on length or just assign a neutral placeholder
    const words = cleanText.split(/\s+/).filter(w => w.length > 2);
    const title = words.length > 0 
      ? words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") 
      : "Custom Meal";
    
    // Search if there is a number at the beginning for calories (e.g. "400 calorie meal")
    const calMatch = cleanText.match(/(\d+)\s*(?:kcal|calorie|calories)/);
    const protMatch = cleanText.match(/(\d+)\s*(?:g|gram|grams)\s*protein/);

    const estCalories = calMatch ? parseInt(calMatch[1]) : 350; // default average meal calories
    const estProtein = protMatch ? parseInt(protMatch[1]) : 15;   // default average meal protein

    return {
      mealName: title,
      calories: estCalories,
      protein: estProtein,
      items: [{
        name: title,
        quantity: 1,
        unit: "serving",
        calories: estCalories,
        protein: estProtein
      }],
      isGeneric: true
    };
  }

  // Generate a clean meal name from the items
  const mealName = matchedItems.map(item => item.name).join(" & ");

  return {
    mealName: mealName,
    calories: totalCalories,
    protein: parseFloat(totalProtein.toFixed(1)),
    items: matchedItems
  };
}
