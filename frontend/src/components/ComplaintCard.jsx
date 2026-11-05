import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, MapPin, MessageCircle, Share2 } from "lucide-react";
import api, { getErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext";

function timeAgo(date) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function ComplaintCard({ complaint }) {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [count, setCount] = useState(complaint.supportCount || 0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("resolvex_saved") || "[]").includes(complaint._id); }
    catch { return false; }
  });

  async function toggleSupport() {
    if (!user) {
      setError("Sign in to support a community report.");
      return;
    }
    setError("");
    try {
      const { data } = supported
        ? await api.delete(`/complaints/${complaint._id}/support`)
        : await api.post(`/complaints/${complaint._id}/support`);
      setSupported(data.supported);
      setCount(data.supportCount);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function share() {
    const url = `${window.location.origin}/complaints/${complaint._id}`;
    try {
      await navigator.clipboard.writeText(url);
      setError("Link copied to clipboard.");
    } catch {
      setError(url);
    }
  }

  function toggleSaved() {
    const stored = JSON.parse(localStorage.getItem("resolvex_saved") || "[]");
    const updated = saved ? stored.filter((id) => id !== complaint._id) : [...new Set([...stored, complaint._id])];
    localStorage.setItem("resolvex_saved", JSON.stringify(updated));
    setSaved(!saved);
  }

  const author = complaint.author;
  return (
    <article className="post-card">
      <div className="post-heading">
        <div className="post-author">
          <div className="avatar avatar-green">{author?.profilePictureUrl ? <img src={author.profilePictureUrl} alt="" /> : author?.fullName?.[0]?.toUpperCase() || "R"}</div>
          <div><strong>{author?.fullName || "Community member"}</strong><span><MapPin size={12} />{complaint.village || author?.village || "Local community"} <i>·</i> {timeAgo(complaint.createdAt)}</span></div>
        </div>
        <Link className="icon-button muted-icon" to={`/complaints/${complaint._id}`} aria-label="Open report"><span aria-hidden="true">↗</span></Link>
      </div>
      {complaint.imageUrls?.[0] && <Link to={`/complaints/${complaint._id}`} className="post-image"><img src={complaint.imageUrls[0]} alt={complaint.title} loading="lazy" /></Link>}
      <div className="post-body">
        <div className="post-tags"><span className="category-tag">{complaint.category}</span><StatusBadge status={complaint.status} /></div>
        <Link to={`/complaints/${complaint._id}`} className="post-title">{complaint.title}</Link>
        <p>{complaint.description}</p>
        <div className="post-location"><MapPin size={14} />{complaint.village}{complaint.district ? `, ${complaint.district}` : ""}<span>·</span><Link to="/map">View on map ↗</Link></div>
        <div className="post-actions">
          <button className={`action-button ${supported ? "is-supported" : ""}`} onClick={toggleSupport}><Heart size={18} fill={supported ? "currentColor" : "none"} /><span>{count} <small>support</small></span></button>
          <Link className="action-button" to={`/complaints/${complaint._id}#discussion`}><MessageCircle size={18} /><span><small>Discuss</small></span></Link>
          <button className="action-button" onClick={share}><Share2 size={17} /><span><small>Share</small></span></button>
          <button className={`action-bookmark ${saved ? "saved" : ""}`} onClick={toggleSaved} aria-label={saved ? "Remove saved report" : "Save report"} title={saved ? "Saved" : "Save report"}><Bookmark size={18} fill={saved ? "currentColor" : "none"} /></button>
        </div>
        {error && <div className={error.startsWith("Sign in") ? "inline-note" : "inline-note success-note"}>{error}</div>}
      </div>
    </article>
  );
}

export function StatusBadge({ status }) {
  const className = String(status || "Submitted").toLowerCase().replaceAll(" ", "-");
  return <span className={`status-badge status-${className}`}><span />{status || "Submitted"}</span>;
}
