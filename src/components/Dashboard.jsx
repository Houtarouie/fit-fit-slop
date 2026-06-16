import React from "react";

export default function Dashboard({ 
  todayMeals, 
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
  onSelectUser
}) {
  // Calculations
  const totalCalories = todayMeals.reduce((acc, meal) => acc + meal.calories, 0);
  const totalProtein = todayMeals.reduce((acc, meal) => acc + meal.protein, 0);

  const calRemaining = calorieTarget - totalCalories;
  const calPercent = Math.min(100, Math.round((totalCalories / calorieTarget) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((totalProtein / proteinTarget) * 100)) || 0;

  // SVG Progress Ring calculations
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const calOffset = circumference - (calPercent / 100) * circumference;
  const protOffset = circumference - (protPercent / 100) * circumference;

  // Build Leaderboard: User + Followed Buddies
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
      {/* Left Column: Progress Rings and Today's Summary */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Progress Rings Card */}
        <div className="glass-card rings-section">
          {/* Calorie Ring */}
          <div className="progress-ring-card">
            <div className="progress-ring-container">
              <svg className="progress-ring-svg" width="160" height="160">
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

      {/* Right Column: Leaderboard, Water, Quick Log */}
      <div className="stats-panel">
        
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
              <span>📷</span> Upload Photo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
