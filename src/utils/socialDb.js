// Mock Social Network Database for NutriTrack Community

export const MOCK_USERS = [
  {
    username: "sarah_fit",
    displayName: "Sarah Jenkins",
    avatar: "🥗",
    bio: "Pilates enthusiast & meal prep enthusiast. On a fat loss journey!",
    weight: 64,
    height: 168,
    age: 26,
    gender: "female",
    activityLevel: "moderate",
    goal: "lose",
    calorieTarget: 1650,
    proteinTarget: 115,
    streak: 12,
    followed: true,
    mealsToday: [
      { id: "sm_1", mealName: "Avocado Egg Toast", calories: 340, protein: 14, timestamp: new Date(new Date().setHours(8, 30)).toISOString() },
      { id: "sm_2", mealName: "Berry Whey Smoothie Bowl", calories: 380, protein: 26, timestamp: new Date(new Date().setHours(12, 15)).toISOString() }
    ],
    recentLogs: [
      {
        id: "post_1",
        username: "sarah_fit",
        mealName: "Shrimp Quinoa salad with cilantro dressing",
        calories: 420,
        protein: 34,
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80",
        likes: ["marcus_build", "elena_running"],
        comments: [
          { username: "marcus_build", text: "High protein, low carb! Perfect meal right there! 💪" },
          { username: "elena_running", text: "Recipe for the dressing please? Looks so fresh!" }
        ]
      },
      {
        id: "post_2",
        username: "sarah_fit",
        mealName: "Greek yogurt cup with mixed almonds & honey",
        calories: 210,
        protein: 16,
        timestamp: new Date(Date.now() - 25 * 3600000).toISOString(), // 25 hours ago
        likes: ["tyler_nutrition"],
        comments: []
      }
    ]
  },
  {
    username: "marcus_build",
    displayName: "Marcus Chen",
    avatar: "💪",
    bio: "Powerlifting & Hypertrophy coach. Bulking season is active. 🏋️‍♂️",
    weight: 88,
    height: 182,
    age: 31,
    gender: "male",
    activityLevel: "active",
    goal: "gain",
    calorieTarget: 3200,
    proteinTarget: 180,
    streak: 25,
    followed: true,
    mealsToday: [
      { id: "mm_1", mealName: "Mass Gainer Shake", calories: 850, protein: 50, timestamp: new Date(new Date().setHours(7, 0)).toISOString() },
      { id: "mm_2", mealName: "Double Chicken Breast Rice Bowl", calories: 920, protein: 72, timestamp: new Date(new Date().setHours(13, 0)).toISOString() }
    ],
    recentLogs: [
      {
        id: "post_3",
        username: "marcus_build",
        mealName: "Ribeye Steak with Roasted Asparagus & Garlic Potatoes",
        calories: 950,
        protein: 68,
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80",
        likes: ["sarah_fit", "tyler_nutrition"],
        comments: [
          { username: "tyler_nutrition", text: "Excellent iron intake. Solid calories too." },
          { username: "sarah_fit", text: "Whoa, that looks amazing, but I'd exceed my target in one meal! 😂" }
        ]
      },
      {
        id: "post_4",
        username: "marcus_build",
        mealName: "12 Scrambled Egg Whites & Oatmeal",
        calories: 580,
        protein: 48,
        timestamp: new Date(Date.now() - 30 * 3600000).toISOString(), // 30 hours ago
        likes: ["elena_running"],
        comments: [
          { username: "sarah_fit", text: "12 egg whites! Dedication!" }
        ]
      }
    ]
  },
  {
    username: "elena_running",
    displayName: "Elena Rostova",
    avatar: "🏃‍♀️",
    bio: "Marathon runner in training. Fueling for performance and recovery.",
    weight: 58,
    height: 164,
    age: 24,
    gender: "female",
    activityLevel: "active",
    goal: "maintain",
    calorieTarget: 2400,
    proteinTarget: 95,
    streak: 8,
    followed: false,
    mealsToday: [
      { id: "em_1", mealName: "Oatmeal with Blueberries & Chia Seeds", calories: 410, protein: 11, timestamp: new Date(new Date().setHours(8, 0)).toISOString() }
    ],
    recentLogs: [
      {
        id: "post_5",
        username: "elena_running",
        mealName: "Large Pasta bowl with chicken meatballs & tomato basil sauce",
        calories: 780,
        protein: 38,
        timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), // 6 hours ago
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
        likes: ["sarah_fit", "marcus_build"],
        comments: [
          { username: "marcus_build", text: "Carbo-loading done right! 🍝" }
        ]
      }
    ]
  },
  {
    username: "tyler_nutrition",
    displayName: "Coach Tyler",
    avatar: "🎓",
    bio: "Certified Sports Dietitian. Helping athletes reach peak energy states.",
    weight: 80,
    height: 178,
    age: 35,
    gender: "male",
    activityLevel: "moderate",
    goal: "maintain",
    calorieTarget: 2600,
    proteinTarget: 150,
    streak: 42,
    followed: true,
    mealsToday: [
      { id: "tm_1", mealName: "Poached Eggs, Sourdough & Smoked Salmon", calories: 510, protein: 34, timestamp: new Date(new Date().setHours(7, 30)).toISOString() }
    ],
    recentLogs: [
      {
        id: "post_6",
        username: "tyler_nutrition",
        mealName: "Tuna Salad stuffed Avocado Halves",
        calories: 480,
        protein: 38,
        timestamp: new Date(Date.now() - 10 * 3600000).toISOString(), // 10 hours ago
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80",
        likes: ["sarah_fit", "elena_running", "marcus_build"],
        comments: [
          { username: "elena_running", text: "Simple, clean, and nutritious. My go-to snack." }
        ]
      }
    ]
  }
];

// LocalStorage helpers to initialize social db and profiles
export function initializeSocialDb() {
  if (!localStorage.getItem("nutritrack_social_users")) {
    localStorage.setItem("nutritrack_social_users", JSON.stringify(MOCK_USERS));
  }
}

export function getSocialUsers() {
  initializeSocialDb();
  return JSON.parse(localStorage.getItem("nutritrack_social_users"));
}

export function saveSocialUsers(users) {
  localStorage.setItem("nutritrack_social_users", JSON.stringify(users));
}
