import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Settings({ settings, onSaveSettings, session }) {
  const [aiProvider, setAiProvider] = useState(settings.aiProvider || "gemini");
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [groqApiKey, setGroqApiKey] = useState(settings.groqApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  
  // Social identity
  const [displayName, setDisplayName] = useState(settings.displayName || "");
  const [username, setUsername] = useState(settings.username || "");
  const [avatar, setAvatar] = useState(settings.avatar || "⚡");
  const [bio, setBio] = useState(settings.bio || "");

  // Profile metrics
  const [weight, setWeight] = useState(settings.weight || 70);
  const [height, setHeight] = useState(settings.height || 175);
  const [age, setAge] = useState(settings.age || 28);
  const [gender, setGender] = useState(settings.gender || "male");
  const [activityLevel, setActivityLevel] = useState(settings.activityLevel || "moderate");
  const [goal, setGoal] = useState(settings.goal || "maintain");
  
  // Targets (either calculated or custom)
  const [calorieTarget, setCalorieTarget] = useState(settings.calorieTarget || 2000);
  const [proteinTarget, setProteinTarget] = useState(settings.proteinTarget || 120);
  const [useCalculated, setUseCalculated] = useState(settings.useCalculated !== false);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load profile from Supabase on mount
  useEffect(() => {
    async function loadDbProfile() {
      if (!session) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setDisplayName(data.display_name || "");
          setUsername(data.username || "");
          setAvatar(data.avatar || "⚡");
          setBio(data.bio || "");
          setWeight(Number(data.weight) || 70);
          setHeight(Number(data.height) || 175);
          setAge(Number(data.age) || 28);
          setGender(data.gender || "male");
          setActivityLevel(data.activity_level || "moderate");
          setGoal(data.goal || "maintain");
          setCalorieTarget(Number(data.calorie_target) || 2000);
          setProteinTarget(Number(data.protein_target) || 120);
        }
      } catch (err) {
        console.error("Error loading profile from DB:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDbProfile();
  }, [session]);

  // Auto-calculation of targets based on profile parameters
  useEffect(() => {
    if (!useCalculated) return;

    let bmr = 0;
    if (gender === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725
    };
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);

    let targetCals = Math.round(tdee);
    let targetProtein = 120;

    if (goal === "lose") {
      targetCals = Math.round(tdee - 500);
      targetProtein = Math.round(weight * 2.0);
    } else if (goal === "gain") {
      targetCals = Math.round(tdee + 300);
      targetProtein = Math.round(weight * 2.2);
    } else {
      targetProtein = Math.round(weight * 1.6);
    }

    if (targetCals < 1200) targetCals = 1200;
    if (targetProtein < 40) targetProtein = 40;

    setCalorieTarget(targetCals);
    setProteinTarget(targetProtein);
  }, [weight, height, age, gender, activityLevel, goal, useCalculated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSaveSuccess(false);

    try {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!cleanUsername) throw new Error("Username must contain alphanumeric characters or underscores.");

      // 1. Save social profile & biometrics online in Supabase profiles
      const { error } = await supabase
        .from("profiles")
        .update({
          username: cleanUsername,
          display_name: displayName,
          avatar,
          bio,
          weight: parseFloat(weight),
          height: parseFloat(height),
          age: parseInt(age),
          gender,
          activity_level: activityLevel,
          goal,
          calorie_target: parseInt(calorieTarget),
          protein_target: parseInt(proteinTarget),
          updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

      if (error) throw error;

      // 2. Save API provider keys locally for device privacy
      onSaveSettings({
        aiProvider,
        apiKey,
        groqApiKey,
        displayName,
        username: cleanUsername,
        avatar,
        bio,
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        gender,
        activityLevel,
        goal,
        calorieTarget: parseInt(calorieTarget),
        proteinTarget: parseInt(proteinTarget),
        useCalculated
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save settings to database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
    }
  };

  return (
    <div className="meal-logger-container">
      <div className="glass-card mb-2">
        <div className="settings-card-header d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2>Profile & AI Configuration</h2>
            <p>Signed in as: <strong style={{ color: "var(--accent-calories-start)" }}>{session?.user?.email}</strong></p>
          </div>
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ color: "var(--danger)", borderColor: "rgba(244,63,94,0.2)" }} 
            onClick={handleSignOut}
          >
            Sign Out 🔒
          </button>
        </div>

        {saveSuccess && (
          <div className="api-alert" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
            <span className="api-alert-icon" style={{ color: "var(--success)" }}>✓</span>
            <p style={{ color: "var(--text-primary)" }}>Settings synced to database successfully!</p>
          </div>
        )}

        {errorMsg && (
          <div className="api-alert" style={{ background: "rgba(244, 63, 94, 0.08)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
            <span className="api-alert-icon" style={{ color: "var(--danger)" }}>⚠️</span>
            <p style={{ color: "var(--text-primary)" }}>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="settings-grid">
          
          {/* AI Settings Section */}
          <div>
            <h3 className="mb-1" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>AI Assistant Configuration</h3>
            
            <div className="form-group">
              <label>AI Provider</label>
              <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                <option value="gemini">Google Gemini AI</option>
                <option value="groq">Groq AI (Free Llama 3 models)</option>
                <option value="none">Offline Demo Mode (Local Database Parsing)</option>
              </select>
            </div>

            {aiProvider === "gemini" && (
              <div className="form-group">
                <label>Gemini API Key</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {aiProvider === "groq" && (
              <div className="form-group">
                <label>Groq API Key</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type={showGroqKey ? "text" : "password"}
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="gsk_..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                  >
                    {showGroqKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr style={{ borderColor: "var(--border-color)" }} />

          {/* Social Identity Section */}
          <div>
            <h3 className="mb-1" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>Social Fitness Profile</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Fit"
                  required
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alex_fit"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Profile Avatar Emoji</label>
                <select value={avatar} onChange={(e) => setAvatar(e.target.value)}>
                  <option value="⚡">⚡ Lightning Bolt</option>
                  <option value="🥗">🥗 Salad Plate</option>
                  <option value="💪">💪 Flexing Muscle</option>
                  <option value="🏃‍♂️">🏃‍♂️ Running Male</option>
                  <option value="🏃‍♀️">🏃‍♀️ Running Female</option>
                  <option value="🏋️‍♂️">🏋️‍♂️ Powerlifter</option>
                  <option value="🥑">🥑 Avocado</option>
                  <option value="🔥">🔥 Fitness Fire</option>
                </select>
              </div>
              <div className="form-group">
                <label>Short Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio..."
                  rows="2"
                  style={{ resize: "none" }}
                />
              </div>
            </div>
          </div>

          <hr style={{ borderColor: "var(--border-color)" }} />

          {/* Biometrics */}
          <div>
            <h3 className="mb-1" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>Biometrics</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="30"
                  max="300"
                  required
                />
              </div>
              <div className="form-group">
                <label>Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min="100"
                  max="250"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="10"
                  max="120"
                  required
                />
              </div>
              <div className="form-group">
                <label>Biological Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Activity Level</label>
                <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                  <option value="sedentary">Sedentary (Little/no exercise)</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="active">Very Active</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fitness Goal</label>
                <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                  <option value="lose">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain">Build Muscle</option>
                </select>
              </div>
            </div>
          </div>

          <hr style={{ borderColor: "var(--border-color)" }} />

          {/* Target calculations */}
          <div>
            <div className="d-flex justify-between align-center mb-1">
              <h3 style={{ fontSize: "1rem", color: "var(--text-primary)" }}>Daily Target Budgets</h3>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={useCalculated}
                  onChange={(e) => setUseCalculated(e.target.checked)}
                />
                Use Auto-Calculated Targets
              </label>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Daily Calorie Target (kcal)</label>
                <input
                  type="number"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  disabled={useCalculated}
                  min="500"
                  max="10000"
                  required
                />
              </div>
              <div className="form-group">
                <label>Daily Protein Target (g)</label>
                <input
                  type="number"
                  value={proteinTarget}
                  onChange={(e) => setProteinTarget(e.target.value)}
                  disabled={useCalculated}
                  min="10"
                  max="500"
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-100 mt-1" disabled={loading}>
            {loading ? "Saving to Database..." : "Save and Sync Profile 💾"}
          </button>
        </form>
      </div>
    </div>
  );
}
