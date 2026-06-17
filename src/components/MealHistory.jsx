import React, { useState } from "react";

export default function MealHistory({ 
  meals, 
  calorieTarget, 
  proteinTarget, 
  selectedDate, 
  onDateChange, 
  onDeleteMeal 
}) {
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [timeframe, setTimeframe] = useState("all"); // all, today, yesterday, week, month, custom
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to format date for human display (e.g. "Today - Tuesday, Jun 16")
  const formatHumanDate = (dateStr) => {
    if (!dateStr) return "";
    
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split("T")[0];

    if (dateStr === todayStr) {
      return "Today";
    }
    if (dateStr === yesterdayStr) {
      return "Yesterday";
    }

    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter meals based on selected timeframe and search query
  const getFilteredMeals = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split("T")[0];
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return meals.filter(meal => {
      if (!meal || !meal.timestamp) return false;
      const dateObj = new Date(meal.timestamp);
      if (isNaN(dateObj.getTime())) return false;
      
      // Search query filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const mealNameMatch = (meal.meal_name || "").toLowerCase().includes(query);
        const ingredientMatch = meal.items && meal.items.some(item => 
          (item.name || "").toLowerCase().includes(query)
        );
        if (!mealNameMatch && !ingredientMatch) return false;
      }

      const dateStr = dateObj.toISOString().split("T")[0];

      if (timeframe === "today") {
        return dateStr === todayStr;
      } else if (timeframe === "yesterday") {
        return dateStr === yesterdayStr;
      } else if (timeframe === "week") {
        return dateObj >= sevenDaysAgo;
      } else if (timeframe === "month") {
        return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
      } else if (timeframe === "custom") {
        return dateStr === selectedDate;
      }
      
      return true; // "all"
    });
  };

  const filteredMeals = getFilteredMeals();

  // Group meals by date string (YYYY-MM-DD)
  const groupMealsByDate = (mealsList) => {
    const groups = {};
    mealsList.forEach(meal => {
      const dateStr = new Date(meal.timestamp).toISOString().split("T")[0];
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(meal);
    });
    return groups;
  };

  const groupedMeals = groupMealsByDate(filteredMeals);
  
  // Sorted dates descending (newest first)
  const sortedDates = Object.keys(groupedMeals).sort((a, b) => new Date(b) - new Date(a));

  const toggleExpandMeal = (id) => {
    if (expandedMealId === id) {
      setExpandedMealId(null);
    } else {
      setExpandedMealId(id);
    }
  };

  return (
    <div className="meal-logger-container animate-fade-in">
      
      {/* Logs Controls Panel */}
      <div className="glass-card mb-2" style={{ padding: "1.2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "1rem", color: "var(--text-primary)" }}>
          📚 Nutrition Logs Feed
        </h2>

        {/* Timeframe Filter Pills */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[
            { id: "all", label: "📋 All History" },
            { id: "today", label: "🍳 Today" },
            { id: "yesterday", label: "🌅 Yesterday" },
            { id: "week", label: "📅 Last 7 Days" },
            { id: "month", label: "🗓️ This Month" },
            { id: "custom", label: "🔍 Custom Date" }
          ].map(pill => (
            <button
              key={pill.id}
              type="button"
              className={`btn-secondary ${timeframe === pill.id ? "active-pill" : ""}`}
              onClick={() => {
                setTimeframe(pill.id);
                setExpandedMealId(null);
              }}
              style={{
                padding: "0.4rem 0.85rem",
                fontSize: "0.8rem",
                borderRadius: "20px",
                border: timeframe === pill.id ? "1px solid var(--accent-calories-start)" : "1px solid var(--border-color)",
                background: timeframe === pill.id ? "rgba(168, 85, 247, 0.12)" : "rgba(255,255,255,0.01)",
                color: timeframe === pill.id ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer",
                fontWeight: timeframe === pill.id ? "700" : "500",
                transition: "all 0.2s ease"
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Contextual Date Picker if Custom timeframe is selected */}
        {timeframe === "custom" && (
          <div className="date-selector-pill mb-1 animate-fade-in" style={{ display: "inline-flex", width: "auto" }}>
            <span>📅</span>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => onDateChange(e.target.value)} 
            />
          </div>
        )}

        {/* Search Input Box */}
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="🔍 Search meals or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 1rem",
              paddingLeft: "2.5rem",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              color: "var(--text-primary)",
              fontSize: "0.9rem"
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "1rem"
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chronological Daily Groupings List */}
      {sortedDates.length === 0 ? (
        <div className="glass-card empty-state" style={{ padding: "3rem 1.5rem" }}>
          <span className="empty-state-icon" style={{ fontSize: "2.5rem" }}>🍽️</span>
          <h3 style={{ color: "var(--text-primary)", marginTop: "1rem", fontSize: "1.1rem" }}>No logs found</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {searchQuery ? "Try searching for another keyword." : "You haven't recorded any meals in this period yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {sortedDates.map(dateStr => {
            const dayMeals = groupedMeals[dateStr];
            
            // Calculate daily totals
            const dayCals = dayMeals.reduce((sum, m) => sum + m.calories, 0);
            const dayProt = dayMeals.reduce((sum, m) => sum + Number(m.protein || 0), 0);
            
            const calPercent = Math.min(100, Math.round((dayCals / calorieTarget) * 100)) || 0;
            const protPercent = Math.min(100, Math.round((dayProt / proteinTarget) * 100)) || 0;

            return (
              <div key={dateStr} className="daily-log-group animate-slide-in">
                {/* Daily Summary Sticky Header */}
                <div 
                  className="glass-card mb-1" 
                  style={{ 
                    padding: "1rem 1.25rem", 
                    borderRadius: "16px",
                    borderLeft: "4px solid var(--accent-calories-start)",
                    background: "rgba(255, 255, 255, 0.015)"
                  }}
                >
                  <div className="d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)" }}>
                        {formatHumanDate(dateStr)}
                      </h3>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {dayMeals.length} meal{dayMeals.length > 1 ? "s" : ""} logged
                      </p>
                    </div>

                    {/* Compact Daily Macro Stats */}
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Calories</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--calories-solid)" }}>
                          {dayCals} / {calorieTarget} kcal
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Protein</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--protein-solid)" }}>
                          {dayProt.toFixed(1)} / {proteinTarget}g
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tiny progress status bars */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.03)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${calPercent}%`, background: "linear-gradient(90deg, var(--accent-calories-start), var(--accent-calories-end))" }} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.03)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${protPercent}%`, background: "linear-gradient(90deg, var(--accent-protein-start), var(--accent-protein-end))" }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meals eaten on this day list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingLeft: "0.25rem" }}>
                  {dayMeals.map(meal => {
                    const isExpanded = expandedMealId === meal.id;
                    const hasItems = meal.items && meal.items.length > 0;
                    const dateObj = new Date(meal.timestamp);
                    const mealTime = isNaN(dateObj.getTime())
                      ? "00:00"
                      : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div 
                        key={meal.id} 
                        className="glass-card" 
                        style={{ 
                          padding: "0.85rem 1rem", 
                          borderRadius: "14px",
                          background: isExpanded ? "rgba(255, 255, 255, 0.025)" : "rgba(255, 255, 255, 0.005)",
                          border: isExpanded ? "1px solid var(--border-color)" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onClick={() => toggleExpandMeal(meal.id)}
                      >
                        <div className="d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                          <div className="meal-history-info">
                            {meal.image_url ? (
                              <img 
                                src={meal.image_url} 
                                alt={meal.meal_name} 
                                className="meal-photo-thumb"
                              />
                            ) : (
                              <div className="meal-photo-thumb" style={{ fontSize: "1.2rem" }}>
                                {(meal.meal_name || "").toLowerCase().includes("egg") ? "🍳" : 
                                 (meal.meal_name || "").toLowerCase().includes("chicken") ? "🍗" :
                                 (meal.meal_name || "").toLowerCase().includes("salad") ? "🥗" : 
                                 (meal.meal_name || "").toLowerCase().includes("rice") ? "🍚" : "🍽️"}
                              </div>
                            )}

                            <div className="meal-details-text">
                              <h4 style={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: "600" }}>{meal.meal_name}</h4>
                              <p style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.75rem" }}>
                                <span>⏱️ {mealTime}</span>
                                <span>•</span>
                                <span style={{ 
                                  background: meal.image_url ? "rgba(56, 189, 248, 0.1)" : "rgba(148, 163, 184, 0.08)",
                                  color: meal.image_url ? "var(--calories-solid)" : "var(--text-secondary)",
                                  padding: "0.05rem 0.35rem",
                                  borderRadius: "4px",
                                  fontSize: "0.65rem",
                                  fontWeight: "600"
                                }}>
                                  {meal.image_url ? "AI Photo Analysis" : meal.isManual ? "Manual Entry" : "Text Analysis"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="meal-history-right" onClick={(e) => e.stopPropagation()}>
                            <div className="meal-history-macros" style={{ marginRight: "0.5rem" }}>
                              <div className="meal-history-cal" style={{ fontSize: "0.9rem" }}>{meal.calories} kcal</div>
                              <div className="meal-history-prot" style={{ fontSize: "0.75rem" }}>
                                {Number(meal.protein || 0).toFixed(1)}g protein
                              </div>
                            </div>
                            <button 
                              className="delete-meal-btn" 
                              onClick={() => onDeleteMeal(meal.id)}
                              title="Delete Meal Log"
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                display: "flex",
                                alignCenter: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                padding: 0
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div 
                            style={{ 
                              marginTop: "0.75rem", 
                              paddingTop: "0.75rem", 
                              borderTop: "1px solid var(--border-color)",
                              cursor: "default"
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h5 className="mb-1" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Ingredient Breakdown
                            </h5>
                            
                            {hasItems ? (
                              <div className="items-breakdown-list">
                                {meal.items.map((item, index) => (
                                  <div key={index} className="breakdown-item" style={{ padding: "0.4rem 0.5rem", borderRadius: "8px" }}>
                                    <div className="breakdown-item-details">
                                      <span className="breakdown-item-name" style={{ fontSize: "0.85rem" }}>{item.name}</span>
                                      <span className="breakdown-item-qty" style={{ fontSize: "0.75rem" }}>
                                        {item.quantity} {item.unit}
                                      </span>
                                    </div>
                                    <div className="breakdown-item-macros" style={{ fontSize: "0.8rem" }}>
                                      <span className="breakdown-item-calories">{item.calories} kcal</span>
                                      <span className="breakdown-item-protein">{item.protein}g protein</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                No ingredient breakdown details available.
                              </p>
                            )}
                          </div>
                        )}
                        
                        {!isExpanded && (
                          <div style={{ textAlign: "center", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                            ▼ Click to view itemized breakdown
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
