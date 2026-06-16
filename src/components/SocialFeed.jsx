import React, { useState } from "react";

// Humanize timestamp (e.g., "3 hours ago", "Yesterday")
function formatAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function SocialFeed({ 
  feedPosts, 
  currentUser,
  onLikePost, 
  onCommentPost, 
  onSelectUser 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [commentInputs, setCommentInputs] = useState({});

  const handleCommentSubmit = (postId, e) => {
    e.preventDefault();
    const commentText = commentInputs[postId] || "";
    if (!commentText.trim()) return;

    onCommentPost(postId, commentText);
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  // Filter posts
  const filteredPosts = feedPosts.filter(post => {
    const term = searchTerm.toLowerCase();
    return (
      post.mealName.toLowerCase().includes(term) ||
      post.username.toLowerCase().includes(term)
    );
  });

  return (
    <div className="meal-logger-container animate-fade-in">
      {/* Feed Filter Header */}
      <div className="glass-card mb-2 d-flex justify-between align-center" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>Community Feed</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            See what others are eating, like, and share your nutritional logs!
          </p>
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: "250px" }}>
          <input
            type="text"
            placeholder="🔍 Search meals or users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Feed Posts List */}
      <div style={{ display: "flex", flexIndex: 1, flexDirection: "column", gap: "1.5rem" }}>
        {filteredPosts.length === 0 ? (
          <div className="glass-card empty-state">
            <span className="empty-state-icon">📣</span>
            <p>No posts found. Start sharing your logs to populate the feed!</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const hasLiked = post.likes.includes(currentUser.username || "me");
            
            return (
              <div key={post.id} className="glass-card" style={{ padding: "1.25rem" }}>
                
                {/* Post User Header */}
                <div className="d-flex justify-between align-center mb-1">
                  <div 
                    className="d-flex align-center gap-1" 
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectUser(post.username)}
                  >
                    <div className="meal-photo-thumb" style={{ width: "36px", height: "36px", fontSize: "1.1rem", borderRadius: "50%", margin: 0 }}>
                      {post.avatar || (post.username === "me" || post.username === currentUser.username ? "⚡" : "👤")}
                    </div>
                    <div>
                      <span style={{ fontWeight: "700", display: "block", fontSize: "0.95rem" }}>
                        {post.displayName || (post.username === "me" || post.username === currentUser.username ? currentUser.displayName || "You" : post.username)}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: "-2px" }}>
                        @{post.username} • {formatAgo(post.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Post Content Details */}
                <div className="mb-2">
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" }}>
                    {post.mealName}
                  </h3>
                  
                  {/* Calorie and Protein Badge Tags */}
                  <div className="d-flex gap-1 mt-1" style={{ flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", background: "rgba(56, 189, 248, 0.08)", color: "var(--calories-solid)", padding: "0.2rem 0.6rem", borderRadius: "8px", fontWeight: "600", border: "1px solid rgba(56, 189, 248, 0.15)" }}>
                      🔥 {post.calories} kcal
                    </span>
                    <span style={{ fontSize: "0.75rem", background: "rgba(244, 63, 94, 0.08)", color: "var(--protein-solid)", padding: "0.2rem 0.6rem", borderRadius: "8px", fontWeight: "600", border: "1px solid rgba(244, 63, 94, 0.15)" }}>
                      💪 {post.protein}g protein
                    </span>
                  </div>
                </div>

                {/* Post Meal Image if present */}
                {post.image && (
                  <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid var(--border-color)", marginBottom: "1rem", maxHeight: "350px" }}>
                    <img 
                      src={post.image} 
                      alt={post.mealName} 
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} 
                    />
                  </div>
                )}

                {/* Likes / Comments Interaction Actions */}
                <div style={{ display: "flex", gap: "1.5rem", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", padding: "0.6rem 0.25rem", margin: "1rem 0" }}>
                  <button 
                    onClick={() => onLikePost(post.id)}
                    style={{ background: "transparent", border: "none", color: hasLiked ? "var(--protein-solid)" : "var(--text-secondary)", cursor: "pointer", display: "flex", alignCenter: "center", gap: "0.4rem", fontSize: "0.9rem", fontWeight: "600", transition: "transform 0.1s" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <span>{hasLiked ? "❤️" : "🤍"}</span> {post.likes.length} Likes
                  </button>
                  <span style={{ color: "var(--text-secondary)", display: "flex", alignCenter: "center", gap: "0.4rem", fontSize: "0.9rem", fontWeight: "600" }}>
                    <span>💬</span> {post.comments.length} Comments
                  </span>
                </div>

                {/* Comments List */}
                {post.comments.length > 0 && (
                  <div style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                    {post.comments.map((comment, idx) => (
                      <div key={idx} style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>
                        <strong style={{ color: "var(--text-primary)", cursor: "pointer" }} onClick={() => onSelectUser(comment.username)}>
                          @{comment.username}
                        </strong>
                        <span style={{ color: "var(--text-secondary)", marginLeft: "0.4rem" }}>
                          {comment.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment Input Form */}
                <form onSubmit={(e) => handleCommentSubmit(post.id, e)} className="d-flex gap-1">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentInputs[post.id] || ""}
                    onChange={(e) => handleCommentChange(post.id, e.target.value)}
                    style={{ flex: 1, padding: "0.5rem 1rem", fontSize: "0.8rem", borderRadius: "10px" }}
                  />
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", borderRadius: "10px", fontWeight: "600" }}
                  >
                    Send
                  </button>
                </form>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
