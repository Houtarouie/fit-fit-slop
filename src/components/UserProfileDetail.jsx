import React, { useState, useEffect } from "react";

export default function UserProfileDetail({ 
  user, 
  onFollowToggle, 
  onBackToFeed 
}) {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // If the viewed user is an admin, trigger the King Intro overlay
    if (user && user.is_admin) {
      setShowIntro(true);
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 3000); // 3 seconds royal intro
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!user) return null;

  const totalCalsToday = user.mealsToday ? user.mealsToday.reduce((sum, m) => sum + m.calories, 0) : 0;
  const totalProtToday = user.mealsToday ? user.mealsToday.reduce((sum, m) => sum + m.protein, 0) : 0;

  const calPercent = Math.min(100, Math.round((totalCalsToday / user.calorieTarget) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((totalProtToday / user.proteinTarget) * 100)) || 0;

  const getGoalLabel = (goalCode) => {
    const goals = {
      lose: "Weight Loss (Caloric Deficit)",
      maintain: "Maintain Weight",
      gain: "Muscle Gain (Caloric Surplus)"
    };
    return goals[goalCode] || "Maintain";
  };

  const getActivityLabel = (actCode) => {
    const levels = {
      sedentary: "Sedentary",
      light: "Lightly Active",
      moderate: "Moderately Active",
      active: "Very Active"
    };
    return levels[actCode] || "Moderate";
  };

  const isUserAdmin = user.is_admin === true;

  return (
    <div className="meal-logger-container animate-fade-in">
      
      {/* 👑 KING INTRO ANIMATION OVERLAY 👑 */}
      {showIntro && (
        <div className="king-intro-overlay">
          <div className="sparkles-container">
            <span className="sparkle-star" style={{ top: "15%", left: "15%", animationDelay: "0.2s" }}>✨</span>
            <span className="sparkle-star" style={{ top: "25%", left: "80%", animationDelay: "0.5s" }}>⭐</span>
            <span className="sparkle-star" style={{ top: "60%", left: "20%", animationDelay: "0.8s" }}>✨</span>
            <span className="sparkle-star" style={{ top: "75%", left: "75%", animationDelay: "1.1s" }}>⭐</span>
            <span className="sparkle-star" style={{ top: "45%", left: "85%", animationDelay: "0.3s" }}>✨</span>
            <span className="sparkle-star" style={{ top: "80%", left: "30%", animationDelay: "1.5s" }}>👑</span>
          </div>
          <div className="king-intro-crown">👑</div>
          <h2 className="king-intro-text">King {user.display_name || user.username}</h2>
          <p className="king-intro-sub">Bow down to the NutriTrack Admin! 👑</p>
        </div>
      )}

      {/* Back Header */}
      <button 
        className="btn-secondary mb-2" 
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem" }}
        onClick={onBackToFeed}
      >
        ← Back to Feed
      </button>

      {/* Profile Info Card */}
      <div className={`glass-card mb-2 ${isUserAdmin ? "admin-profile-card" : ""}`}>
        <div className="d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div className="d-flex align-center gap-1">
            <div 
              className="meal-photo-thumb" 
              style={{ 
                width: "64px", 
                height: "64px", 
                fontSize: "2rem", 
                borderRadius: "50%",
                border: isUserAdmin ? "2px solid #ffd700" : "1px solid var(--border-color)",
                boxShadow: isUserAdmin ? "0 0 10px rgba(255, 215, 0, 0.4)" : "none"
              }}
            >
              {isUserAdmin ? "👑" : (user.avatar || "👤")}
            </div>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={isUserAdmin ? "admin-glow" : ""}>
                  {user.displayName || user.display_name}
                </span>
                {isUserAdmin && <span className="crown-badge">👑</span>}
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                @{user.username} {isUserAdmin && <strong style={{ color: "#ffd700", fontSize: "0.75rem", marginLeft: "0.25rem" }}>[ADMIN]</strong>}
              </p>
            </div>
          </div>
          
          <button 
            className={user.followed ? "btn-secondary" : "btn-primary"}
            style={{ borderRadius: "12px", padding: "0.6rem 1.25rem" }}
            onClick={() => onFollowToggle(user.username)}
          >
            {user.followed ? "🤝 Following" : "➕ Follow Buddy"}
          </button>
        </div>

        <p style={{ marginTop: "1rem", fontSize: "0.95rem", color: "var(--text-primary)", fontStyle: "italic" }}>
          "{user.bio || "No bio added yet."}"
        </p>

        {/* Biometrics Badges */}
        <div className="d-flex gap-1 mt-2" style={{ flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", padding: "0.3rem 0.75rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
            ⚖️ <strong>Weight:</strong> {user.weight} kg
          </span>
          <span style={{ fontSize: "0.8rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", padding: "0.3rem 0.75rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
            📏 <strong>Height:</strong> {user.height} cm
          </span>
          <span style={{ fontSize: "0.8rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)", padding: "0.3rem 0.75rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
            🔥 <strong>Streak:</strong> {user.streak} Days
          </span>
        </div>
      </div>

      {/* Today's Target Tracking Progress */}
      <div className="glass-card mb-2">
        <h3 className="mb-2" style={{ fontSize: "1.1rem" }}>Today's Target Budgets</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {/* Calorie progress bar */}
          <div>
            <div className="d-flex justify-between align-center mb-1" style={{ fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Calories Consumed</span>
              <span style={{ fontWeight: "700" }}>
                {totalCalsToday} / {user.calorieTarget} kcal ({calPercent}%)
              </span>
            </div>
            <div style={{ height: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${calPercent}%`, 
                  background: "linear-gradient(to right, var(--accent-calories-start), var(--accent-calories-end))",
                  borderRadius: "5px",
                  transition: "width 0.5s ease-out"
                }} 
              />
            </div>
          </div>

          {/* Protein progress bar */}
          <div>
            <div className="d-flex justify-between align-center mb-1" style={{ fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Protein Consumed</span>
              <span style={{ fontWeight: "700" }}>
                {totalProtToday} / {user.proteinTarget}g ({protPercent}%)
              </span>
            </div>
            <div style={{ height: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${protPercent}%`, 
                  background: "linear-gradient(to right, var(--accent-protein-start), var(--accent-protein-end))",
                  borderRadius: "5px",
                  transition: "width 0.5s ease-out"
                }} 
              />
            </div>
          </div>
        </div>

        <div className="d-flex gap-2" style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
          <div>🎯 <strong>Goal:</strong> {getGoalLabel(user.goal)}</div>
          <div>🏋️‍♂️ <strong>Activity:</strong> {getActivityLabel(user.activity_level || user.activityLevel)}</div>
        </div>
      </div>

      {/* User's Recent Logged Posts History */}
      <div className="glass-card">
        <h3 className="mb-2" style={{ fontSize: "1.1rem" }}>Recent Food Shared</h3>

        {user.recentLogs.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <span className="empty-state-icon">🍽️</span>
            <p>No meals shared by this user yet.</p>
          </div>
        ) : (
          <div className="items-breakdown-list">
            {user.recentLogs.map((log) => (
              <div key={log.id} className="breakdown-item" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.75rem", padding: "1rem" }}>
                <div className="d-flex justify-between align-center">
                  <div>
                    <span className="breakdown-item-name" style={{ fontSize: "1.05rem" }}>{log.mealName}</span>
                    <span className="breakdown-item-qty" style={{ fontSize: "0.75rem" }}>
                      {new Date(log.timestamp).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--calories-solid)", fontWeight: "700" }}>{log.calories} kcal</span>
                    <span style={{ display: "block", color: "var(--protein-solid)", fontSize: "0.75rem" }}>{log.protein}g protein</span>
                  </div>
                </div>

                {log.image && (
                  <div style={{ maxHeight: "200px", overflow: "hidden", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    <img src={log.image} alt={log.mealName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "1rem" }}>
                  <span>❤️ {log.likes.length} Likes</span>
                  <span>💬 {log.comments.length} Comments</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
