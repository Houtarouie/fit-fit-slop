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

  // Format date to local date string for comparisons
  const getLocalDateString = (dateObj) => {
    return dateObj.toISOString().split("T")[0];
  };

  // Filter meals for the selected date
  const filteredMeals = meals.filter(meal => {
    const mealDate = new Date(meal.timestamp).toISOString().split("T")[0];
    return mealDate === selectedDate;
  });

  // Calculate totals
  const totalCals = filteredMeals.reduce((sum, m) => sum + m.calories, 0);
  const totalProt = filteredMeals.reduce((sum, m) => sum + Number(m.protein || 0), 0);

  const calPercent = Math.min(100, Math.round((totalCals / calorieTarget) * 100)) || 0;
  const protPercent = Math.min(100, Math.round((totalProt / proteinTarget) * 100)) || 0;

  const toggleExpandMeal = (id) => {
    if (expandedMealId === id) {
      setExpandedMealId(null);
    } else {
      setExpandedMealId(id);
    }
  };

  // Helper to format date for human display (e.g. "Tuesday, Jun 16, 2026")
  const formatHumanDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="meal-logger-container animate-fade-in">
      {/* Date Navigation & Selector Header */}
      <div className="glass-card mb-2 d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Daily Logs</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {formatHumanDate(selectedDate)}
          </p>
        </div>
        <div className="date-selector-pill">
          <span>📅</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => onDateChange(e.target.value)} 
          />
        </div>
      </div>

      {/* Target Progress Panel for Selected Day */}
      <div className="glass-card mb-2" style={{ padding: "1.5rem" }}>
        <h3 className="mb-1" style={{ fontSize: "1rem", fontWeight: "600" }}>Day Summary</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Calorie bar */}
          <div>
            <div className="d-flex justify-between align-center mb-1" style={{ fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>Calories Intake</span>
              <span style={{ fontWeight: "700" }}>
                {totalCals} / {calorieTarget} kcal ({calPercent}%)
              </span>
            </div>
            <div style={{ height: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${calPercent}%`, 
                  background: "linear-gradient(to right, var(--accent-calories-start), var(--accent-calories-end))",
                  borderRadius: "4px",
                  transition: "width 0.5s ease-out"
                }} 
              />
            </div>
          </div>

          {/* Protein bar */}
          <div>
            <div className="d-flex justify-between align-center mb-1" style={{ fontSize: "0.85rem" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>Protein Intake</span>
              <span style={{ fontWeight: "700" }}>
                {totalProt.toFixed(1)} / {proteinTarget}g ({protPercent}%)
              </span>
            </div>
            <div style={{ height: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${protPercent}%`, 
                  background: "linear-gradient(to right, var(--accent-protein-start), var(--accent-protein-end))",
                  borderRadius: "4px",
                  transition: "width 0.5s ease-out"
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* History Items list */}
      <div className="glass-card">
        <h3 className="mb-1" style={{ fontSize: "1.1rem", fontWeight: "700" }}>Meals Log</h3>

        {filteredMeals.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🍽️</span>
            <p>No meals recorded for this day.</p>
          </div>
        ) : (
          <div className="history-list">
            {filteredMeals.map((meal) => {
              const isExpanded = expandedMealId === meal.id;
              const hasItems = meal.items && meal.items.length > 0;
              const mealTime = new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div 
                  key={meal.id} 
                  className="glass-card" 
                  style={{ 
                    padding: "1rem", 
                    borderRadius: "16px",
                    background: isExpanded ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.005)",
                    cursor: "pointer"
                  }}
                  onClick={() => toggleExpandMeal(meal.id)}
                >
                  <div className="d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                    <div className="meal-history-info">
                      {/* Image Thumbnail or Default Icon */}
                      {meal.image ? (
                        <img 
                          src={meal.image} 
                          alt={meal.mealName} 
                          className="meal-photo-thumb"
                        />
                      ) : (
                        <div className="meal-photo-thumb">
                          {meal.mealName.toLowerCase().includes("egg") ? "🍳" : 
                           meal.mealName.toLowerCase().includes("chicken") ? "🍗" :
                           meal.mealName.toLowerCase().includes("salad") ? "🥗" : 
                           meal.mealName.toLowerCase().includes("rice") ? "🍚" : "🍽️"}
                        </div>
                      )}

                      <div className="meal-details-text">
                        <h4 style={{ color: "var(--text-primary)" }}>{meal.mealName}</h4>
                        <p style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span>⏱️ {mealTime}</span>
                          <span>•</span>
                          <span style={{ 
                            background: meal.image ? "rgba(56, 189, 248, 0.1)" : "rgba(148, 163, 184, 0.1)",
                            color: meal.image ? "var(--calories-solid)" : "var(--text-secondary)",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: "600"
                          }}>
                            {meal.image ? "AI Photo Analysis" : meal.isManual ? "Manual Entry" : "Text Analysis"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="meal-history-right" onClick={(e) => e.stopPropagation()}>
                      <div className="meal-history-macros">
                        <div className="meal-history-cal">{meal.calories} kcal</div>
                        <div className="meal-history-prot">{Number(meal.protein || 0).toFixed(1)}g protein</div>
                      </div>
                      <button 
                        className="delete-meal-btn" 
                        onClick={() => onDeleteMeal(meal.id)}
                        title="Delete Meal Log"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  {isExpanded && (
                    <div 
                      style={{ 
                        marginTop: "1rem", 
                        paddingTop: "1rem", 
                        borderTop: "1px solid var(--border-color)",
                        cursor: "default"
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h5 className="mb-1" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Ingredient Breakdown
                      </h5>
                      
                      {hasItems ? (
                        <div className="items-breakdown-list">
                          {meal.items.map((item, index) => (
                            <div key={index} className="breakdown-item">
                              <div className="breakdown-item-details">
                                <span className="breakdown-item-name">{item.name}</span>
                                <span className="breakdown-item-qty">
                                  {item.quantity} {item.unit}
                                </span>
                              </div>
                              <div className="breakdown-item-macros">
                                <span className="breakdown-item-calories">{item.calories} kcal</span>
                                <span className="breakdown-item-protein">{item.protein}g protein</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          No ingredient breakdown details available.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Click to expand hint */}
                  {!isExpanded && (
                    <div style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                      ▼ Click to view itemized breakdown
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
