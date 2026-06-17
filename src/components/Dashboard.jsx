import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { getCoachAdviceGemini } from "../utils/gemini";
import { getCoachAdviceGroq } from "../utils/groq";

export default function Dashboard({ 
  todayMeals, 
  allMeals = [],
  calorieTarget, 
  proteinTarget, 
  waterGlassCount, 
  onAddWater, 
  onRemoveWater, 
  streakCount, 
  onNavigateToTab,
  onDeleteMeal,
  currentUser,
  buddiesList,
  onSelectUser,
  onProfileUpdate
}) {
  // Calculations
  const totalCalories = todayMeals.reduce((acc, meal) => acc + meal.calories, 0);
  const totalProtein = todayMeals.reduce((acc, meal) => acc + Number(meal.protein || 0), 0);

  const calRemaining = calorieTarget - totalCalories;
  const calPercent = Math.min(100, Math.round((totalCalories / calorieTarget) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((totalProtein / proteinTarget) * 100)) || 0;

  // SVG Progress Ring calculations
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const calOffset = circumference - (calPercent / 100) * circumference;
  const protOffset = circumference - (protPercent / 100) * circumference;

  // Biometrics calculations (BMI, BMR, TDEE)
  const weightVal = Number(currentUser.weight) || 70;
  const heightVal = Number(currentUser.height) || 175;
  const ageVal = Number(currentUser.age) || 28;
  const genderVal = currentUser.gender || "male";
  const activityVal = currentUser.activityLevel || "moderate";

  const bmi = weightVal / ((heightVal / 100) ** 2);
  
  let bmiCategory = "Normal Weight";
  let bmiColor = "var(--success)";
  if (bmi < 18.5) {
    bmiCategory = "Underweight";
    bmiColor = "#fbbf24";
  } else if (bmi >= 25 && bmi < 29.9) {
    bmiCategory = "Overweight";
    bmiColor = "#fb923c";
  } else if (bmi >= 30) {
    bmiCategory = "Obese";
    bmiColor = "#ef4444";
  }

  // Mifflin-St Jeor Equation
  let bmr = 10 * weightVal + 6.25 * heightVal - 5 * ageVal;
  bmr = genderVal === "male" ? bmr + 5 : bmr - 161;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  const tdee = Math.round(bmr * (activityMultipliers[activityVal] || 1.2));

  // Weight Logging State
  const [weightInput, setWeightInput] = useState(currentUser.weight || "");
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);

  useEffect(() => {
    setWeightInput(currentUser.weight || "");
  }, [currentUser.weight]);

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    const weightNum = parseFloat(weightInput);
    if (isNaN(weightNum) || weightNum <= 0) return;

    try {
      setIsUpdatingWeight(true);
      setWeightSaved(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No active user session");

      const { error } = await supabase
        .from("profiles")
        .update({ weight: weightNum })
        .eq("id", user.id);

      if (error) throw error;

      setWeightSaved(true);
      if (onProfileUpdate) await onProfileUpdate();
      setTimeout(() => setWeightSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update weight:", err);
      alert("Failed to update weight in the database. Please try again.");
    } finally {
      setIsUpdatingWeight(false);
    }
  };

  // AI Fit-Coach States
  const [coachTip, setCoachTip] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");

  const fetchCoachAdvice = async () => {
    setCoachLoading(true);
    setCoachError("");
    setCoachTip("");

    const profile = {
      weight: weightVal,
      height: heightVal,
      age: ageVal,
      gender: genderVal,
      goal: currentUser.goal || "maintain",
      activityLevel: activityVal,
      calorieTarget,
      proteinTarget
    };

    const todayIntake = {
      calories: totalCalories,
      protein: totalProtein
    };

    const globalGroqApiKey = import.meta.env.VITE_GROQ_API_KEY || "";
    const groqKey = currentUser.groqApiKey?.trim() || globalGroqApiKey;
    const geminiKey = currentUser.apiKey?.trim() || "";

    try {
      if (currentUser.aiProvider === "gemini" && geminiKey) {
        const advice = await getCoachAdviceGemini(geminiKey, profile, todayIntake);
        setCoachTip(advice);
      } else if (currentUser.aiProvider === "groq" && groqKey) {
        const advice = await getCoachAdviceGroq(groqKey, profile, todayIntake);
        setCoachTip(advice);
      } else {
        // Local Smart Fallback Advice if API key is missing
        setTimeout(() => {
          let advice = "Great tracking discipline today! Maintain a consistent schedule of water intake and focus on getting 7-8 hours of deep sleep to optimize recovery.";
          if (totalProtein < proteinTarget * 0.5) {
            advice = "Coach Marcus says: You are falling behind on your daily protein target! Incorporate some high-density protein (e.g. egg whites, lean chicken, or dry soya chunks) into your next meal to trigger muscle protein synthesis.";
          } else if (totalCalories > calorieTarget * 0.9) {
            advice = "Coach Marcus says: You are rapidly approaching your calorie ceiling. Shift towards high-volume, low-density foods (cucumbers, celery, and spinach) to manage satiety without pushing past your budget.";
          } else if (totalProtein >= proteinTarget && calRemaining > 200) {
            advice = "Coach Marcus says: Superb! You've crushed your protein targets. Refuel with clean complex carbohydrates (oatmeal, brown rice, or sweet potatoes) to replenish muscle glycogen stores.";
          }
          setCoachTip(advice);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setCoachError(err.message || "Failed to generate coaching insights.");
    } finally {
      setCoachLoading(false);
    }
  };

  // 7-Day Macro Trends data extraction
  const getLast7DaysData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      
      const dayMeals = (allMeals || []).filter(m => {
        if (!m || !m.timestamp) return false;
        return m.timestamp.split("T")[0] === dateStr;
      });

      const dayCals = dayMeals.reduce((sum, m) => sum + m.calories, 0);
      const dayProt = dayMeals.reduce((sum, m) => sum + Number(m.protein || 0), 0);

      const label = d.toLocaleDateString([], { weekday: 'short' });
      data.push({
        dateStr,
        label,
        calories: dayCals,
        protein: dayProt
      });
    }
    return data;
  };

  const trendsData = getLast7DaysData();
  const maxCalVal = Math.max(...trendsData.map(d => d.calories), calorieTarget, 2000);
  const maxProtVal = Math.max(...trendsData.map(d => d.protein), proteinTarget, 100);
  const calTargetY = 150 - (calorieTarget / maxCalVal) * 120;

  // Build Leaderboard
  const activeUserEntry = {
    username: "me",
    displayName: currentUser.displayName || "You",
    avatar: currentUser.avatar || "⚡",
    streak: streakCount,
    isMe: true,
    isAdmin: currentUser.isAdmin
  };

  const followedBuddiesEntries = buddiesList.map(buddy => ({
    username: buddy.username,
    displayName: buddy.display_name || buddy.displayName || buddy.username,
    avatar: buddy.avatar || "⚡",
    streak: buddy.streak || 0,
    isMe: false,
    isAdmin: buddy.is_admin || false
  }));

  const leaderboard = [activeUserEntry, ...followedBuddiesEntries].sort((a, b) => b.streak - a.streak);

  return (
    <div className="dashboard-grid animate-fade-in">
      {/* Left Column: Progress Rings and Logs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Progress Rings Card */}
        <div className="glass-card rings-section">
          {/* Calorie Ring */}
          <div className="progress-ring-card">
            <div className="progress-ring-container">
              <svg className="progress-ring-svg" width="160" height="160">
                <defs>
                  <linearGradient id="calories-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--accent-calories-start)" />
                    <stop offset="100%" stopColor="var(--accent-calories-end)" />
                  </linearGradient>
                </defs>
                <circle
                  className="progress-ring-bg"
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth="12"
                />
                <circle
                  className="progress-ring-bar calories-stroke"
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={calOffset}
                />
              </svg>
              <div className="ring-text">
                <span className="ring-value">{totalCalories}</span>
                <span className="ring-unit">kcal</span>
                <span className="ring-target">Target {calorieTarget}</span>
              </div>
            </div>
            <h3 className="ring-label">Calories</h3>
            <p className="ring-desc">
              {calRemaining >= 0 
                ? `${calRemaining} kcal remaining` 
                : `${Math.abs(calRemaining)} kcal over target`}
            </p>
          </div>

          {/* Protein Ring */}
          <div className="progress-ring-card">
            <div className="progress-ring-container">
              <svg className="progress-ring-svg" width="160" height="160">
                <defs>
                  <linearGradient id="protein-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--accent-protein-start)" />
                    <stop offset="100%" stopColor="var(--accent-protein-end)" />
                  </linearGradient>
                </defs>
                <circle
                  className="progress-ring-bg"
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth="12"
                />
                <circle
                  className="progress-ring-bar protein-stroke"
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={protOffset}
                />
              </svg>
              <div className="ring-text">
                <span className="ring-value">{totalProtein.toFixed(0)}</span>
                <span className="ring-unit">grams</span>
                <span className="ring-target">Target {proteinTarget}g</span>
              </div>
            </div>
            <h3 className="ring-label">Protein</h3>
            <p className="ring-desc">
              {totalProtein >= proteinTarget 
                ? "Target achieved! Great job!" 
                : `${(proteinTarget - totalProtein).toFixed(0)}g remaining`}
            </p>
          </div>
        </div>

        {/* 7-Day Macro Trends SVG Chart */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div className="d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              📊 7-Day Nutrition Trends
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              🟥 Calories (kcal) • 🟦 Protein (g)
            </span>
          </div>

          <div style={{ width: "100%", overflowX: "auto", marginTop: "1rem" }}>
            <svg viewBox="0 0 400 180" width="100%" height="100%" style={{ minWidth: "350px", overflow: "visible" }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.8"/>
                </linearGradient>
                <linearGradient id="protGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8"/>
                </linearGradient>
              </defs>

              {/* Baseline Grid Line */}
              <line x1="30" y1="150" x2="380" y2="150" stroke="var(--border-color)" strokeWidth="1" />
              <text x="25" y="152" textAnchor="end" fill="var(--text-muted)" fontSize="8">0</text>

              {/* Dotted target line */}
              <line x1="30" y1={calTargetY} x2="380" y2={calTargetY} stroke="rgba(249, 115, 22, 0.35)" strokeWidth="1" strokeDasharray="3 3" />
              <text x="35" y={calTargetY - 4} fill="rgba(249, 115, 22, 0.75)" fontSize="7" fontWeight="800">
                DAILY TARGET: {calorieTarget} kcal
              </text>

              {trendsData.map((day, idx) => {
                const calHeight = (day.calories / maxCalVal) * 120;
                const calY = 150 - calHeight;
                const protHeight = (day.protein / maxProtVal) * 120;
                const protY = 150 - protHeight;
                const xPos = 45 + idx * 48;

                return (
                  <g key={idx}>
                    {/* Calories Bar */}
                    <rect
                      x={xPos}
                      y={calY}
                      width="15"
                      height={Math.max(2, calHeight)}
                      rx="3"
                      fill="url(#calGrad)"
                    />
                    {/* Protein Bar */}
                    <rect
                      x={xPos + 18}
                      y={protY}
                      width="15"
                      height={Math.max(2, protHeight)}
                      rx="3"
                      fill="url(#protGrad)"
                    />
                    
                    {/* X Label */}
                    <text
                      x={xPos + 16}
                      y="166"
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      fontSize="9"
                      fontWeight="600"
                    >
                      {day.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Today's Logged Meals Summary */}
        <div className="glass-card">
          <div className="history-header">
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Meals Logged Today</h2>
            <button 
              className="btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "10px" }}
              onClick={() => onNavigateToTab("history")}
            >
              Detailed Log
            </button>
          </div>
          
          {todayMeals.length === 0 ? (
            <div className="empty-state" style={{ padding: "2.5rem 1rem" }}>
              <span className="empty-state-icon">🥗</span>
              <p>No meals logged for today yet.</p>
              <button 
                className="btn-primary" 
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", marginTop: "0.5rem" }}
                onClick={() => onNavigateToTab("log")}
              >
                Log Your First Meal
              </button>
            </div>
          ) : (
            <div className="items-breakdown-list mt-1">
              {todayMeals.map((meal) => (
                <div key={meal.id} className="breakdown-item" style={{ background: "rgba(255, 255, 255, 0.015)" }}>
                  <div className="breakdown-item-details">
                    <span className="breakdown-item-name" style={{ fontSize: "0.95rem" }}>
                      {meal.mealName}
                    </span>
                    <span className="breakdown-item-qty" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {meal.image ? " • Image Logged" : " • Text Logged"}
                      {meal.sharedToFeed ? " • Shared to Feed" : ""}
                    </span>
                  </div>
                  <div className="d-flex align-center gap-1">
                    <div className="breakdown-item-macros" style={{ textAlign: "right" }}>
                      <span className="breakdown-item-calories">{meal.calories} kcal</span>
                      <span className="breakdown-item-protein" style={{ display: "block", fontSize: "0.75rem" }}>
                        {meal.protein}g protein
                      </span>
                    </div>
                    <button 
                      className="delete-meal-btn" 
                      onClick={() => onDeleteMeal(meal.id)}
                      title="Delete Meal"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: AI Coach, Biometrics, Leaderboard, Water */}
      <div className="stats-panel">
        
        {/* Biometrics & BMI Assessment Widget */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h3 className="mb-2" style={{ fontSize: "1.05rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>🧬</span> Health Profile & BMI
          </h3>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div 
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.02)",
                border: `3px solid ${bmiColor}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.05rem",
                fontWeight: "800"
              }}
            >
              {bmi.toFixed(1)}
            </div>
            
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>BMI Status</div>
              <div style={{ fontSize: "1rem", fontWeight: "800", color: bmiColor }}>{bmiCategory}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                TDEE estimate: <strong>{tdee} kcal/day</strong>
              </div>
            </div>
          </div>

          {/* Quick Weight Logger Form */}
          <form onSubmit={handleWeightSubmit} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>
              Log Current Weight (kg)
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="70"
                step="0.1"
                min="30"
                max="300"
                required
                style={{
                  flex: 1,
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.85rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "var(--text-primary)"
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isUpdatingWeight}
                style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
              >
                {isUpdatingWeight ? "..." : "Log"}
              </button>
            </div>
            {weightSaved && (
              <p style={{ fontSize: "0.75rem", color: "var(--success)", marginTop: "0.35rem", fontWeight: "600" }}>
                ✓ Weight updated successfully!
              </p>
            )}
          </form>
        </div>

        {/* AI Fit-Coach Marcus Widget */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div className="d-flex justify-between align-center mb-1">
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>🤖</span> Coach Marcus Advice
            </h3>
            <button
              type="button"
              className="btn-secondary"
              disabled={coachLoading}
              onClick={fetchCoachAdvice}
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", borderRadius: "8px" }}
            >
              {coachLoading ? "Thinking..." : "Get Advice ⚡"}
            </button>
          </div>

          <div 
            style={{ 
              background: "rgba(255, 255, 255, 0.01)", 
              border: "1px solid var(--border-color)", 
              borderRadius: "12px", 
              padding: "0.85rem 1rem",
              marginTop: "0.5rem",
              minHeight: "70px",
              display: "flex",
              alignItems: "center"
            }}
          >
            {coachLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                <span>Coach Marcus is reviewing today's stats...</span>
              </div>
            ) : coachError ? (
              <p style={{ fontSize: "0.8rem", color: "var(--danger)" }}>⚠️ {coachError}</p>
            ) : coachTip ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.4", fontStyle: "italic" }}>
                "{coachTip}"
              </p>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Click the <strong>Get Advice</strong> button to let Coach Marcus review your biometrics and daily macro progression.
              </p>
            )}
          </div>
        </div>

        {/* Fit-Buddies Streak Leaderboard */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h3 className="mb-2" style={{ fontSize: "1.05rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>🏆</span> Fit-Buddies Leaderboard
          </h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {leaderboard.map((player, idx) => (
              <div 
                key={player.username} 
                className="d-flex align-center justify-between"
                style={{ 
                  background: player.isMe ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.01)",
                  border: player.isMe ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "0.5rem 0.75rem",
                  cursor: player.isMe ? "default" : "pointer"
                }}
                onClick={() => !player.isMe && onSelectUser(player.username)}
              >
                <div className="d-flex align-center gap-1">
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-muted)", width: "16px" }}>
                    #{idx + 1}
                  </span>
                  <div className="meal-photo-thumb" style={{ width: "30px", height: "30px", fontSize: "0.95rem", borderRadius: "50%", margin: 0 }}>
                    {player.avatar}
                  </div>
                  <span 
                    style={{ fontSize: "0.9rem", fontWeight: player.isMe ? "700" : "600", display: "flex", alignItems: "center", gap: "0.25rem" }}
                    className={player.isAdmin ? "admin-glow" : ""}
                  >
                    {player.displayName} {player.isMe ? "(You)" : ""}
                    {player.isAdmin && <span className="crown-badge" style={{ fontSize: "0.85rem" }}>👑</span>}
                  </span>
                </div>
                
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--accent-streak)" }}>
                  🔥 {player.streak} d
                </span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
            Follow other members on the <strong>Community Feed</strong> to see them here!
          </div>
        </div>

        {/* Water Tracker Card */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div className="water-tracker">
            <div className="water-info">
              <div className="water-icon">💧</div>
              <div className="water-details">
                <h3>Water Intake</h3>
                <p>{waterGlassCount * 250} ml logged</p>
              </div>
            </div>
            <div className="water-controls">
              <button className="water-btn" onClick={onRemoveWater} title="Remove 250ml">-</button>
              <button className="water-btn" onClick={onAddWater} title="Add 250ml">+</button>
            </div>
          </div>
          
          <div className="water-glasses">
            {Array.from({ length: 8 }).map((_, index) => (
              <div 
                key={index} 
                className={`water-drop ${index < waterGlassCount ? "filled" : ""}`}
                title={`${(index + 1) * 250} ml`}
              />
            ))}
          </div>
        </div>

        {/* Quick Log Options */}
        <div className="glass-card quick-log-card">
          <h2>Quick Meal Log</h2>
          <div className="quick-log-buttons">
            <button className="btn-primary" onClick={() => onNavigateToTab("log")}>
              <span>📝</span> Log Text
            </button>
            <button className="btn-secondary" onClick={() => onNavigateToTab("log")}>
              <span>📸</span> Upload Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
