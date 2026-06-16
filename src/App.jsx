import React, { useState, useEffect } from "react";
import { supabase } from "./utils/supabaseClient";
import Dashboard from "./components/Dashboard";
import LogMeal from "./components/LogMeal";
import MealHistory from "./components/MealHistory";
import Settings from "./components/Settings";
import SocialFeed from "./components/SocialFeed";
import UserProfileDetail from "./components/UserProfileDetail";
import Auth from "./components/Auth";

// Timezone-safe local date string generator (YYYY-MM-DD)
const getLocalDateString = (dateInput = new Date()) => {
  const d = typeof dateInput === "string" || typeof dateInput === "number" 
    ? new Date(dateInput) 
    : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_SETTINGS = {
  aiProvider: "gemini",
  apiKey: "",
  groqApiKey: "",
  displayName: "Fitness Buddy",
  username: "fit_buddy",
  avatar: "⚡",
  bio: "Crushing fitness targets on NutriTrack!",
  weight: 70,
  height: 175,
  age: 28,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  calorieTarget: 2000,
  proteinTarget: 120,
  useCalculated: true
};

export default function App() {
  // Config check
  const isSupabaseConfigured = 
    import.meta.env.VITE_SUPABASE_URL && 
    !import.meta.env.VITE_SUPABASE_URL.includes("your-project-id");

  // Auth Session State
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Navigation State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedProfileUsername, setSelectedProfileUsername] = useState(null);

  // Sync state loaded from Database
  const [meals, setMeals] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [waterLogs, setWaterLogs] = useState({});
  const [streakCount, setStreakCount] = useState(0);

  // Social State
  const [socialUsers, setSocialUsers] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);

  // Check Auth State on mount
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch online data when authenticated
  useEffect(() => {
    if (!session) return;

    fetchUserProfile();
    fetchUserMeals();
    fetchWaterLogs();
    fetchSocialTimeline();

    // Pull local storage API settings if any
    const storedSettings = localStorage.getItem("nutritrack_settings");
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        setSettings(prev => ({
          ...prev,
          aiProvider: parsed.aiProvider || "gemini",
          apiKey: parsed.apiKey || "",
          groqApiKey: parsed.groqApiKey || ""
        }));
      } catch (e) {
        console.error(e);
      }
    }
  }, [session]);

  // Sync local AI key settings to LocalStorage for privacy
  useEffect(() => {
    localStorage.setItem("nutritrack_settings", JSON.stringify({
      aiProvider: settings.aiProvider,
      apiKey: settings.apiKey,
      groqApiKey: settings.groqApiKey
    }));
  }, [settings.aiProvider, settings.apiKey, settings.groqApiKey]);

  // Fetch user profile from DB
  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setSettings(prev => ({
          ...prev,
          displayName: data.display_name,
          username: data.username,
          avatar: data.avatar,
          bio: data.bio,
          weight: Number(data.weight),
          height: Number(data.height),
          age: Number(data.age),
          gender: data.gender,
          activityLevel: data.activity_level,
          goal: data.goal,
          calorieTarget: Number(data.calorie_target),
          proteinTarget: Number(data.protein_target),
          isAdmin: data.is_admin || false
        }));
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Fetch user meals from DB
  const fetchUserMeals = async () => {
    try {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", session.user.id)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setMeals(data || []);
      calculateAndSetStreak(data || []);
    } catch (err) {
      console.error("Error fetching meals:", err);
    }
  };

  // Fetch water logs from DB
  const fetchWaterLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;
      
      const mappedLogs = {};
      if (data) {
        data.forEach(log => {
          mappedLogs[log.log_date] = log.count;
        });
      }
      setWaterLogs(mappedLogs);
    } catch (err) {
      console.error("Error fetching water logs:", err);
    }
  };

  // Fetch all social data, profiles, follows, comments, and likes
  const fetchSocialTimeline = async () => {
    try {
      // 1. Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*");
      if (profilesError) throw profilesError;

      // 2. Fetch follow associations of current user
      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", session.user.id);
      
      const followedIds = followsData ? followsData.map(f => f.following_id) : [];
      
      const enrichedProfiles = (profilesData || []).map(p => ({
        ...p,
        followed: followedIds.includes(p.id)
      }));
      setSocialUsers(enrichedProfiles);

      // 3. Fetch meals shared to feed
      const { data: mealsData, error: mealsError } = await supabase
        .from("meals")
        .select("*, profiles(username, display_name, avatar, is_admin)")
        .eq("shared_to_feed", true)
        .order("timestamp", { ascending: false });
      
      if (mealsError) throw mealsError;

      // 4. Fetch likes and comments
      const { data: likesData } = await supabase.from("likes").select("*");
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, profiles(username, is_admin)");

      const compiledFeed = (mealsData || []).map(meal => {
        const mealLikes = likesData 
          ? likesData.filter(l => l.meal_id === meal.id).map(l => {
              const profile = enrichedProfiles.find(p => p.id === l.user_id);
              return profile ? profile.username : "";
            }).filter(Boolean)
          : [];

        const mealComments = commentsData
          ? commentsData.filter(c => c.meal_id === meal.id).map(c => ({
              username: c.profiles?.username || "deleted_user",
              text: c.text,
              isAdmin: c.profiles?.is_admin || false
            }))
          : [];

        return {
          id: meal.id,
          username: meal.profiles?.username || "unknown",
          displayName: meal.profiles?.display_name || "Community Member",
          avatar: meal.profiles?.avatar || "⚡",
          mealName: meal.meal_name,
          calories: meal.calories,
          protein: Number(meal.protein),
          image: meal.image_url,
          timestamp: meal.timestamp,
          likes: mealLikes,
          comments: mealComments,
          isAdmin: meal.profiles?.is_admin || false
        };
      });

      setFeedPosts(compiledFeed);
    } catch (err) {
      console.error("Error fetching social timeline:", err);
    }
  };

  // Streak calculation
  const calculateAndSetStreak = (mealsList) => {
    if (mealsList.length === 0) {
      setStreakCount(0);
      return;
    }

    const loggedDates = [...new Set(mealsList.map(meal => 
      getLocalDateString(meal.timestamp)
    ))].sort((a, b) => new Date(b) - new Date(a));

    const todayStr = getLocalDateString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (!loggedDates.includes(todayStr) && !loggedDates.includes(yesterdayStr)) {
      setStreakCount(0);
      return;
    }

    let streak = 0;
    let checkDate = loggedDates.includes(todayStr) ? new Date() : yesterday;

    while (true) {
      const checkStr = getLocalDateString(checkDate);
      if (loggedDates.includes(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    setStreakCount(streak);
    
    // Sync streak online to public profile
    syncStreakToDb(streak);
  };

  const syncStreakToDb = async (streak) => {
    try {
      await supabase
        .from("profiles")
        .update({ streak })
        .eq("id", session.user.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Log Meal (database sync)
  const handleLogMeal = async (mealData) => {
    try {
      const { data, error } = await supabase
        .from("meals")
        .insert({
          user_id: session.user.id,
          meal_name: mealData.mealName,
          calories: mealData.calories,
          protein: mealData.protein,
          items: mealData.items,
          image_url: mealData.image,
          shared_to_feed: mealData.sharedToFeed,
          timestamp: mealData.timestamp
        })
        .select()
        .single();

      if (error) throw error;

      // Re-fetch everything to get updated states
      await fetchUserMeals();
      await fetchSocialTimeline();
    } catch (err) {
      console.error("Failed to insert meal online:", err);
      throw err;
    }
  };

  // Delete Meal
  const handleDeleteMeal = async (mealId) => {
    if (confirm("Are you sure you want to delete this meal log?")) {
      try {
        const { error } = await supabase
          .from("meals")
          .delete()
          .eq("id", mealId);
        
        if (error) throw error;

        // Update local state instantly (Optimistic UI)
        setMeals(prev => prev.filter(m => m.id !== mealId));
        await fetchSocialTimeline();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Water Actions (database upsert)
  const currentWaterCount = waterLogs[selectedDate] || 0;

  const handleUpdateWater = async (newCount) => {
    try {
      // Optimistic state update
      setWaterLogs(prev => ({ ...prev, [selectedDate]: newCount }));

      const { error } = await supabase
        .from("water_logs")
        .upsert({
          user_id: session.user.id,
          log_date: selectedDate,
          count: newCount
        }, { onConflict: "user_id,log_date" });

      if (error) throw error;
    } catch (err) {
      console.error("Failed to sync water logs:", err);
    }
  };

  // Social Feed Actions
  const handleLikePost = async (postId) => {
    try {
      const post = feedPosts.find(p => p.id === postId);
      if (!post) return;

      const hasLiked = post.likes.includes(settings.username);

      if (hasLiked) {
        // Delete like
        await supabase
          .from("likes")
          .delete()
          .eq("meal_id", postId)
          .eq("user_id", session.user.id);
      } else {
        // Insert like
        await supabase
          .from("likes")
          .insert({
            meal_id: postId,
            user_id: session.user.id
          });
      }

      await fetchSocialTimeline();
    } catch (err) {
      console.error("Like toggle failed:", err);
    }
  };

  const handleCommentPost = async (postId, commentText) => {
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          meal_id: postId,
          user_id: session.user.id,
          text: commentText
        });
      
      if (error) throw error;
      await fetchSocialTimeline();
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleFollowToggle = async (buddyUsername) => {
    try {
      const buddy = socialUsers.find(u => u.username === buddyUsername);
      if (!buddy) return;

      if (buddy.followed) {
        // Unfollow
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", session.user.id)
          .eq("following_id", buddy.id);
      } else {
        // Follow
        await supabase
          .from("follows")
          .insert({
            follower_id: session.user.id,
            following_id: buddy.id
          });
      }

      await fetchSocialTimeline();
    } catch (err) {
      console.error("Follow toggle failed:", err);
    }
  };

  // Profile Detail selection routing
  const handleSelectUser = (username) => {
    if (username === "me" || username === settings.username) {
      setActiveTab("settings");
      setSelectedProfileUsername(null);
    } else {
      setSelectedProfileUsername(username);
      setActiveTab("feed");
    }
  };

  // Filter local values
  const filteredMealsForSelectedDate = meals.filter(meal => 
    getLocalDateString(meal.timestamp) === selectedDate
  );

  const followedBuddies = socialUsers.filter(u => u.followed);

  // Enriched detail view target user (compile their shared logs)
  let selectedProfileUser = null;
  if (selectedProfileUsername) {
    const profile = socialUsers.find(u => u.username === selectedProfileUsername);
    if (profile) {
      const userSharedMeals = feedPosts.filter(p => p.username === selectedProfileUsername);
      selectedProfileUser = {
        ...profile,
        mealsToday: [], // dynamic query if needed, or default empty
        recentLogs: userSharedMeals
      };
    }
  }

  // Loading indicator for session check
  if (sessionLoading) {
    return (
      <div className="d-flex align-center justify-between" style={{ minHeight: "100vh", justifyContent: "center" }}>
        <div className="glass-card loading-overlay">
          <div className="spinner" />
          <h3>Loading Account Session...</h3>
        </div>
      </div>
    );
  }

  // 1. If Supabase is not configured yet (no credentials), show instructions screen
  if (!isSupabaseConfigured) {
    return (
      <div className="d-flex align-center justify-between" style={{ minHeight: "100vh", justifyContent: "center", padding: "1rem" }}>
        <div className="glass-card" style={{ width: "100%", maxWidth: "550px", padding: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "3rem" }}>⚡</span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginTop: "0.5rem" }}>Supabase Setup Required</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              To support free photo uploads and social syncing, a Supabase connection is needed.
            </p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "1rem", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem", color: "var(--text-secondary)" }}>
            <p>1. Go to <strong><a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-calories-start)", textDecoration: "underline" }}>supabase.com</a></strong> and create a free project.</p>
            <p>2. Open your local project folder, open the <strong>`.env`</strong> file, and update:</p>
            <pre style={{ background: "rgba(0,0,0,0.3)", padding: "0.5rem", borderRadius: "8px", color: "var(--text-primary)", fontSize: "0.75rem" }}>
              VITE_SUPABASE_URL=https://your-id.supabase.co{"\n"}
              VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
            </pre>
            <p>3. Go to the Supabase **SQL Editor** tab and execute the setup instructions located in the **`supabase_setup.sql`** file at your project's root.</p>
            <p>4. Save the `.env` file and restart your Vite server (`npm run dev`).</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. If not signed in, render Auth screen
  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <h1>Nutri<span>Track</span></h1>
        </div>

        {/* Navigation */}
        <nav className="nav-tabs">
          <button 
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => { setActiveTab("dashboard"); setSelectedProfileUsername(null); }}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === "log" ? "active" : ""}`}
            onClick={() => { setActiveTab("log"); setSelectedProfileUsername(null); }}
          >
            🥗 Log Meal
          </button>
          <button 
            className={`nav-btn ${activeTab === "feed" ? "active" : ""}`}
            onClick={() => setActiveTab("feed")}
          >
            📣 Feed
          </button>
          <button 
            className={`nav-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => { setActiveTab("history"); setSelectedProfileUsername(null); }}
          >
            📋 Logs
          </button>
          <button 
            className={`nav-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => { setActiveTab("settings"); setSelectedProfileUsername(null); }}
          >
            ⚙️ Settings
          </button>
        </nav>

        {/* Date Picker */}
        <div className="header-actions">
          <div className="date-selector-pill">
            <span>📅</span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
            />
          </div>
        </div>
      </header>

      {/* Content Workspace */}
      <main className="app-content">
        {activeTab === "dashboard" && (
          <Dashboard 
            todayMeals={filteredMealsForSelectedDate}
            calorieTarget={settings.calorieTarget}
            proteinTarget={settings.proteinTarget}
            waterGlassCount={currentWaterCount}
            onAddWater={() => handleUpdateWater(Math.min(12, currentWaterCount + 1))}
            onRemoveWater={() => handleUpdateWater(Math.max(0, currentWaterCount - 1))}
            streakCount={streakCount}
            onNavigateToTab={setActiveTab}
            onDeleteMeal={handleDeleteMeal}
            currentUser={settings}
            buddiesList={followedBuddies}
            onSelectUser={handleSelectUser}
          />
        )}

        {activeTab === "log" && (
          <LogMeal 
            settings={settings}
            onLogMeal={handleLogMeal}
            onNavigateToTab={setActiveTab}
            session={session}
          />
        )}

        {activeTab === "feed" && (
          selectedProfileUser ? (
            <UserProfileDetail 
              user={selectedProfileUser}
              onFollowToggle={handleFollowToggle}
              onBackToFeed={() => setSelectedProfileUsername(null)}
            />
          ) : (
            <SocialFeed 
              feedPosts={feedPosts}
              currentUser={settings}
              onLikePost={handleLikePost}
              onCommentPost={handleCommentPost}
              onSelectUser={handleSelectUser}
            />
          )
        )}

        {activeTab === "history" && (
          <MealHistory 
            meals={meals}
            calorieTarget={settings.calorieTarget}
            proteinTarget={settings.proteinTarget}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onDeleteMeal={handleDeleteMeal}
          />
        )}

        {activeTab === "settings" && (
          <Settings 
            settings={settings}
            onSaveSettings={setSettings}
            session={session}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "1.5rem 1rem", borderTop: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2rem" }}>
        NutriTrack Fitness Dashboard © {new Date().getFullYear()} • Powered by Supabase & Gemini/Groq APIs
      </footer>
    </div>
  );
}
