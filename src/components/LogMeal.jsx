import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { analyzeMealText, analyzeMealImage } from "../utils/gemini";
import { analyzeMealTextGroq, analyzeMealImageGroq } from "../utils/groq";
import { parseMealDescriptionLocally } from "../utils/localDb";

const PRESET_DEMO_MEALS = [
  {
    name: "Grilled Salmon with Avocado Salad",
    imageEmoji: "🐟🥑🥗",
    calories: 520,
    protein: 38,
    items: [
      { name: "Salmon Fillet", calories: 320, protein: 32, quantity: 150, unit: "g" },
      { name: "Avocado", calories: 120, protein: 1.5, quantity: 0.5, unit: "whole" },
      { name: "Mixed Green Salad", calories: 60, protein: 3.5, quantity: 1, unit: "serving" },
      { name: "Olive Oil Dressing", calories: 20, protein: 1, quantity: 0.5, unit: "tbsp" }
    ],
    mockImage: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Berry Protein Oatmeal Bowl",
    imageEmoji: "🥣🫐🍌",
    calories: 420,
    protein: 28,
    items: [
      { name: "Rolled Oats", calories: 180, protein: 6, quantity: 50, unit: "g" },
      { name: "Whey Protein Powder", calories: 120, protein: 20, quantity: 1, unit: "scoop" },
      { name: "Blueberries & Banana", calories: 90, protein: 1, quantity: 1, unit: "serving" },
      { name: "Almonds", calories: 30, protein: 1, quantity: 5, unit: "pieces" }
    ],
    mockImage: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Chicken Rice & Broccoli Fit-Meal",
    imageEmoji: "🍗🍚🥦",
    calories: 480,
    protein: 42,
    items: [
      { name: "Grilled Chicken Breast", calories: 250, protein: 36, quantity: 150, unit: "g" },
      { name: "Cooked Brown Rice", calories: 180, protein: 4, quantity: 150, unit: "g" },
      { name: "Steamed Broccoli", calories: 50, protein: 2, quantity: 100, unit: "g" }
    ],
    mockImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"
  }
];

export default function LogMeal({ settings, onLogMeal, onNavigateToTab, session }) {
  const [activeTab, setActiveTab] = useState("text"); // text, photo, manual
  
  // Settings unpack
  const globalGroqApiKey = import.meta.env.VITE_GROQ_API_KEY || "";
  const aiProvider = settings.aiProvider || (globalGroqApiKey ? "groq" : "gemini");
  const apiKey = settings.apiKey || "";
  const groqApiKey = settings.groqApiKey || globalGroqApiKey;

  // Text Tab State
  const [textDescription, setTextDescription] = useState("");
  
  // Photo Tab State
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null); // base64 string
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [photoDescription, setPhotoDescription] = useState("");
  
  // Shared Social Toggle
  const [shareToFeed, setShareToFeed] = useState(true);

  // Manual Tab State
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");

  // Loading & Result States
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggedSuccessfully, setIsLoggedSuccessfully] = useState(false);

  // Refs for camera
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setErrorMsg("");
      setCapturedImage(null);
      setImagePreviewUrl(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg("Unable to access camera. Please check browser permissions or upload an image file instead.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const base64Img = canvas.toDataURL("image/jpeg");
      setCapturedImage(base64Img);
      setImagePreviewUrl(base64Img);
      stopCamera();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setImagePreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Convert Base64 to Binary and Upload to Supabase Storage
  const uploadImageToSupabase = async (base64Image) => {
    if (!base64Image || !session) return null;
    
    // If it's already a hosted URL (e.g. Unsplash presets), return it directly
    if (base64Image.startsWith("http")) return base64Image;

    try {
      const mimeType = base64Image.substring(5, base64Image.indexOf(";"));
      const base64Data = base64Image.substring(base64Image.indexOf(",") + 1);
      
      // Decode base64 to binary
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      const fileExt = mimeType.split("/")[1] || "jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      const { error } = await supabase.storage
        .from("meal-photos")
        .upload(filePath, blob, {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: false
        });
        
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from("meal-photos")
        .getPublicUrl(filePath);
        
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("Storage upload error:", err);
      throw new Error("Failed to save meal photo online. Make sure 'meal-photos' bucket is created and set to PUBLIC.");
    }
  };

  const handleSelectPreset = async (preset) => {
    setIsLoading(true);
    setAnalysisResult(null);
    setErrorMsg("");
    setCapturedImage(preset.mockImage);
    setImagePreviewUrl(preset.mockImage);
    
    setTimeout(() => {
      setAnalysisResult({
        mealName: preset.name,
        calories: preset.calories,
        protein: preset.protein,
        items: preset.items,
        isPreset: true
      });
      setIsLoading(false);
    }, 1200);
  };

  const handleAnalyzeText = async (e) => {
    e.preventDefault();
    if (!textDescription.trim()) return;

    setIsLoading(true);
    setAnalysisResult(null);
    setErrorMsg("");
    
    try {
      if (aiProvider === "gemini" && apiKey.trim()) {
        const result = await analyzeMealText(apiKey, textDescription);
        setAnalysisResult(result);
      } else if (aiProvider === "groq" && groqApiKey.trim()) {
        const result = await analyzeMealTextGroq(groqApiKey, textDescription);
        setAnalysisResult(result);
      } else {
        const result = parseMealDescriptionLocally(textDescription);
        setAnalysisResult({ ...result, isOffline: true });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze meal text.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!capturedImage) return;

    setIsLoading(true);
    setAnalysisResult(null);
    setErrorMsg("");

    try {
      // If it's a mock preset image, skip API vision extraction and mock
      if (capturedImage.startsWith("http")) {
        // Mock analysis already loaded in handleSelectPreset
        setIsLoading(false);
        return;
      }

      const commaIdx = capturedImage.indexOf(",");
      const base64Data = capturedImage.substring(commaIdx + 1);
      const mimeType = capturedImage.substring(5, capturedImage.indexOf(";"));

      if (aiProvider === "gemini" && apiKey.trim()) {
        const result = await analyzeMealImage(apiKey, base64Data, mimeType, photoDescription);
        setAnalysisResult(result);
      } else if (aiProvider === "groq" && groqApiKey.trim()) {
        const result = await analyzeMealImageGroq(groqApiKey, base64Data, mimeType, photoDescription);
        setAnalysisResult(result);
      } else {
        setTimeout(() => {
          const textInputGuess = photoDescription.trim() 
            ? parseMealDescriptionLocally(photoDescription)
            : null;
          
          if (textInputGuess && !textInputGuess.isGeneric) {
            setAnalysisResult({
              ...textInputGuess,
              mealName: `Photo: ${textInputGuess.mealName}`,
              isOfflineMock: true
            });
          } else {
            setAnalysisResult({
              mealName: "Analyzed Plate Meal (Mock)",
              calories: 450,
              protein: 30,
              items: [
                { name: "Estimated Lean Meat / Protein", calories: 250, protein: 26, quantity: 1, unit: "serving" },
                { name: "Estimated Complex Carbohydrates", calories: 150, protein: 3, quantity: 1, unit: "serving" },
                { name: "Vegetables & Fibers", calories: 50, protein: 1, quantity: 1, unit: "serving" }
              ],
              isOfflineMock: true
            });
          }
          setIsLoading(false);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze meal photo.");
      setIsLoading(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!analysisResult) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      let onlineImageUrl = null;
      if (capturedImage) {
        // Upload photo to Supabase storage bucket
        onlineImageUrl = await uploadImageToSupabase(capturedImage);
      }

      await onLogMeal({
        mealName: analysisResult.mealName,
        calories: analysisResult.calories,
        protein: analysisResult.protein,
        items: analysisResult.items,
        image: onlineImageUrl,
        sharedToFeed: shareToFeed,
        timestamp: new Date().toISOString()
      });

      setIsLoggedSuccessfully(true);
      setAnalysisResult(null);
      setTextDescription("");
      setPhotoDescription("");
      setCapturedImage(null);
      setImagePreviewUrl(null);
      
      setTimeout(() => {
        setIsLoggedSuccessfully(false);
        onNavigateToTab(shareToFeed ? "feed" : "dashboard");
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to log meal to the database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualCalories || !manualProtein) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      await onLogMeal({
        mealName: manualName,
        calories: parseInt(manualCalories),
        protein: parseFloat(manualProtein),
        items: [{
          name: manualName,
          calories: parseInt(manualCalories),
          protein: parseFloat(manualProtein),
          quantity: 1,
          unit: "serving"
        }],
        isManual: true,
        sharedToFeed: shareToFeed,
        timestamp: new Date().toISOString()
      });

      setManualName("");
      setManualCalories("");
      setManualProtein("");
      
      setIsLoggedSuccessfully(true);
      setTimeout(() => {
        setIsLoggedSuccessfully(false);
        onNavigateToTab(shareToFeed ? "feed" : "dashboard");
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to log manual meal.");
    } finally {
      setIsLoading(false);
    }
  };

  const prefillTemplate = (text) => {
    setTextDescription(text);
  };

  const hasApiKey = (aiProvider === "gemini" && apiKey.trim()) || (aiProvider === "groq" && groqApiKey.trim());

  return (
    <div className="meal-logger-container animate-fade-in">
      {isLoggedSuccessfully && (
        <div className="glass-card mb-2" style={{ border: "1px solid var(--success)", background: "rgba(16, 185, 129, 0.08)" }}>
          <div className="d-flex align-center gap-1">
            <span style={{ fontSize: "1.5rem", color: "var(--success)" }}>✅</span>
            <div>
              <h4 style={{ color: "var(--text-primary)" }}>Meal Logged!</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {shareToFeed ? "Logged and shared to the community feed!" : "Successfully added to your daily intake budget."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="log-tabs">
        <button 
          className={`log-tab-btn ${activeTab === "text" ? "active" : ""}`}
          onClick={() => { setActiveTab("text"); setAnalysisResult(null); stopCamera(); }}
        >
          📝 Description Text
        </button>
        <button 
          className={`log-tab-btn ${activeTab === "photo" ? "active" : ""}`}
          onClick={() => { setActiveTab("photo"); setAnalysisResult(null); }}
        >
          📷 Meal Photo / AI Vision
        </button>
        <button 
          className={`log-tab-btn ${activeTab === "manual" ? "active" : ""}`}
          onClick={() => { setActiveTab("manual"); setAnalysisResult(null); stopCamera(); }}
        >
          ✍️ Manual Quick Log
        </button>
      </div>

      {!hasApiKey && activeTab !== "manual" && (
        <div className="api-alert">
          <span className="api-alert-icon">💡</span>
          <div>
            <p><strong>Running in offline demo mode ({aiProvider === "gemini" ? "Gemini" : "Groq"}).</strong></p>
            <p style={{ marginTop: "0.2rem" }}>
              Insert your API Key in the <span style={{ color: "var(--accent-calories-start)", cursor: "pointer", textDecoration: "underline", fontWeight: "600" }} onClick={() => onNavigateToTab("settings")}>Settings</span> tab to unlock automated AI meal scans.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="api-alert" style={{ background: "rgba(244, 63, 94, 0.08)", borderColor: "rgba(244, 63, 94, 0.3)" }}>
          <span className="api-alert-icon" style={{ color: "var(--danger)" }}>⚠️</span>
          <div>
            <p style={{ color: "var(--text-primary)" }}><strong>Error</strong></p>
            <p style={{ marginTop: "0.2rem" }}>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* TEXT TAB */}
      {activeTab === "text" && !isLoading && !analysisResult && (
        <div className="glass-card">
          <form onSubmit={handleAnalyzeText}>
            <div className="form-group">
              <label>What did you eat?</label>
              <textarea
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                placeholder="Describe your meal (e.g. 2 scrambled eggs, whole wheat toast, chicken breast)..."
                rows="4"
                required
              />
            </div>
            
            <div className="mb-2">
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "600" }}>
                Quick Templates:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", borderRadius: "10px" }}
                  onClick={() => prefillTemplate("2 scrambled eggs with two slices of whole wheat toast and butter")}
                >
                  🍳 Eggs & Toast
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", borderRadius: "10px" }}
                  onClick={() => prefillTemplate("150g grilled chicken breast with 1 cup cooked white rice and broccoli")}
                >
                  🍗 Chicken & Rice
                </button>
              </div>
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="checkbox" 
                id="share_text_feed" 
                checked={shareToFeed} 
                onChange={(e) => setShareToFeed(e.target.checked)} 
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="share_text_feed" style={{ margin: 0, cursor: "pointer", textTransform: "none", fontSize: "0.85rem" }}>
                Share this meal log to the Community Social Feed
              </label>
            </div>

            <button type="submit" className="btn-primary w-100 mt-1">
              Analyze Meal Nutrition 🔍
            </button>
          </form>
        </div>
      )}

      {/* PHOTO TAB */}
      {activeTab === "photo" && !isLoading && !analysisResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card">
            <h3 className="mb-2" style={{ fontSize: "1.1rem" }}>Upload or Capture Meal</h3>
            
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: "none" }} 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />

            {!cameraActive && !imagePreviewUrl && (
              <div className="photo-uploader-box" onClick={triggerFileSelect}>
                <div className="upload-icon">📷</div>
                <div>
                  <p style={{ fontWeight: "700" }}>Drag & Drop meal photo here</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    or click to browse local files
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}
                  onClick={(e) => { e.stopPropagation(); startCamera(); }}
                >
                  Use Webcam
                </button>
              </div>
            )}

            {cameraActive && (
              <div className="webcam-container">
                <video ref={videoRef} autoPlay playsInline className="webcam-feed" />
                <div className="camera-controls">
                  <button type="button" className="btn-primary" onClick={capturePhoto}>
                    Capture Meal 📸
                  </button>
                  <button type="button" className="btn-secondary" onClick={stopCamera}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {imagePreviewUrl && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem" }}>
                <img src={imagePreviewUrl} alt="Meal Preview" className="captured-preview" />
                
                <div className="form-group w-100">
                  <label>Additional details (Optional context)</label>
                  <input
                    type="text"
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    placeholder="e.g. 'Salmon cooked in olive oil, 150g white rice'"
                  />
                </div>

                <div className="form-group w-100" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                  <input 
                    type="checkbox" 
                    id="share_photo_feed" 
                    checked={shareToFeed} 
                    onChange={(e) => setShareToFeed(e.target.checked)} 
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label htmlFor="share_photo_feed" style={{ margin: 0, cursor: "pointer", textTransform: "none", fontSize: "0.85rem" }}>
                    Share this meal log to the Community Social Feed
                  </label>
                </div>

                <div className="camera-controls w-100">
                  <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={handleAnalyzeImage}>
                    Analyze Photo ({aiProvider.toUpperCase()}) 🤖
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => { setImagePreviewUrl(null); setCapturedImage(null); }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {!imagePreviewUrl && !cameraActive && (
            <div className="glass-card">
              <h3 className="mb-1" style={{ fontSize: "1rem", fontWeight: "600" }}>Demo Presets</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {PRESET_DEMO_MEALS.map((preset, index) => (
                  <div 
                    key={index} 
                    className="breakdown-item" 
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    <div className="d-flex align-center gap-1">
                      <span style={{ fontSize: "1.5rem" }}>{preset.imageEmoji}</span>
                      <div>
                        <span className="breakdown-item-name">{preset.name}</span>
                        <span className="breakdown-item-qty" style={{ display: "block" }}>Demo preset plate</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "0.85rem" }}>
                      <span style={{ color: "var(--calories-solid)", fontWeight: "700" }}>{preset.calories} kcal</span>
                      <span style={{ display: "block", color: "var(--protein-solid)" }}>{preset.protein}g protein</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL TAB */}
      {activeTab === "manual" && (
        <div className="glass-card">
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label>Meal Description / Name</label>
              <input
                type="text"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g. Scrambled eggs and avocado toast"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Estimated Calories (kcal)</label>
                <input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(e.target.value)}
                  placeholder="350"
                  required
                />
              </div>
              <div className="form-group">
                <label>Estimated Protein (grams)</label>
                <input
                  type="number"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  placeholder="24"
                  step="0.1"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="checkbox" 
                id="share_manual_feed" 
                checked={shareToFeed} 
                onChange={(e) => setShareToFeed(e.target.checked)} 
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="share_manual_feed" style={{ margin: 0, cursor: "pointer", textTransform: "none", fontSize: "0.85rem" }}>
                Share this meal log to the Community Social Feed
              </label>
            </div>

            <button type="submit" className="btn-primary w-100 mt-1">
              Log Meal Manually ✍
            </button>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="glass-card loading-overlay">
          <div className="spinner" />
          <div style={{ textAlign: "center" }}>
            <h4 style={{ fontWeight: "700", animation: "pulse 1s infinite" }}>Analyzing Nutrition...</h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Scanning food density parameters...
            </p>
          </div>
        </div>
      )}

      {analysisResult && !isLoading && (
        <div className="glass-card analysis-card">
          <div className="analysis-header">
            <div className="analysis-title">
              <span className="sparkle-icon">✨</span>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>AI Analysis Result</h3>
            </div>
          </div>

          <h2 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            {analysisResult.mealName}
          </h2>

          <div className="analysis-metrics">
            <div className="metric-badge metric-calories">
              <div className="metric-badge-label">Calories</div>
              <div className="metric-badge-value text-gradient-cal">{analysisResult.calories} kcal</div>
            </div>
            <div className="metric-badge metric-protein">
              <div className="metric-badge-label">Protein</div>
              <div className="metric-badge-value text-gradient-prot">{analysisResult.protein}g</div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "0.05em", fontWeight: "600", marginBottom: "0.5rem" }}>
              Identified Ingredients Breakdown:
            </h4>
            <div className="items-breakdown-list">
              {analysisResult.items && analysisResult.items.map((item, index) => (
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
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleSaveMeal}>
              Confirm and Log Meal ✅
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => { setAnalysisResult(null); setErrorMsg(""); }}
            >
              Cancel / Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
