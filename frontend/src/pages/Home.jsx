import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownUp, ArrowRight, ArrowUpRight, MapPin, Plus, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import api, { getErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import ComplaintCard from "../components/ComplaintCard";
import Feedback from "../components/Feedback";

const filters = ["For you", "My village", "Nearby", "Most supported"];

export default function Home() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState("For you");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (filter === "Nearby") {
      if (!navigator.geolocation) {
        setError("Location access is unavailable in this browser.");
        setLoading(false);
        return () => { active = false; };
      }
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        api.get(`/complaints/nearby?longitude=${coords.longitude}&latitude=${coords.latitude}&radiusMeters=25000`)
          .then(({ data }) => { if (active) setComplaints(data.complaints || []); })
          .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
          .finally(() => { if (active) setLoading(false); });
      }, () => {
        if (active) {
          setError("Allow location access to discover reports nearby.");
          setComplaints([]);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }
    if (filter === "My village" && !user?.village) {
      setError("Sign in to explore reports from your village.");
      setComplaints([]);
      setLoading(false);
      return () => { active = false; };
    }
    const params = new URLSearchParams({ limit: "50" });
    if (filter === "My village" && user?.village) params.set("village", user.village);
    if (filter === "Most supported") params.set("sort", "supported");
    if (category) params.set("category", category);
    api.get(`/complaints?${params}`)
      .then(({ data }) => { if (active) setComplaints(data.complaints || []); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, category, user?.village]);

  const shown = useMemo(() => complaints.filter((item) => `${item.title} ${item.description} ${item.village} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [complaints, search]);
  const categories = ["All categories", "Roads and transportation", "Water supply", "Electricity", "Drainage and sanitation", "Garbage and waste management", "Street lights", "Public safety", "College infrastructure", "Government services", "Other issues"];

  return (
    <div className="community-layout">
      <section className="feed-column">
        <div className="welcome-strip">
          <div className="welcome-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> THE NEIGHBORHOOD BOARD</div>
            <h1>Better things happen<br /><em>when we show up.</em></h1>
            <p>Real issues. Real neighbors. A little more progress, together.</p>
            <div className="welcome-actions"><Link className="button button-dark" to={user ? "/report" : "/login"}><Plus size={17} /> Report an issue <ArrowRight size={16} /></Link><Link className="text-link" to="/map">Explore the map <ArrowUpRight size={15} /></Link></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-sun" /><div className="hero-hill hero-hill-back" /><div className="hero-hill hero-hill-front" />
            <div className="hero-house"><div className="house-roof" /><div className="house-wall"><span className="house-window" /><span className="house-door" /></div></div>
            <div className="hero-sign"><span>our place</span><b>↗</b></div><div className="hero-spark">✳</div>
          </div>
        </div>
        <div className="section-heading feed-heading"><div><div className="eyebrow">WHAT'S HAPPENING</div><h2>Community board <span className="count-pill">{complaints.length}</span></h2></div><Link className="view-map-link" to="/map"><MapPin size={15} /> Open map <ArrowUpRight size={14} /></Link></div>
        <div className="feed-toolbar">
          <div className="feed-tabs">{filters.map((item) => <button key={item} className={filter === item ? "feed-tab selected" : "feed-tab"} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <label className="search-field feed-search"><Search size={15} /><input placeholder="Search reports" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ F</kbd></label>
        </div>
        <div className="filter-row">
          <span><ArrowDownUp size={14} /> Showing latest</span>
          <select value={category} onChange={(event) => setCategory(event.target.value === "All categories" ? "" : event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item} value={item === "All categories" ? "" : item}>{item}</option>)}</select>
        </div>
        <Feedback>{error}</Feedback>
        {loading ? <div className="loading-state"><span className="spinner" />Finding reports in your community...</div> :
          shown.length ? <div className="post-list">{shown.map((complaint) => <ComplaintCard key={complaint._id} complaint={complaint} />)}</div> :
            <div className="empty-state"><div className="empty-illustration"><Sparkles size={28} /></div><h3>No reports just yet</h3><p>Be the first to share something your community can work on together.</p><Link className="button button-dark" to={user ? "/report" : "/login"}><Plus size={16} /> Report an issue</Link></div>}
      </section>
      <aside className="community-aside">
        <div className="aside-card location-card"><div className="aside-card-head"><span className="aside-icon"><MapPin size={18} /></span><span className="tiny-label">YOUR LOCAL AREA</span><button className="subtle-arrow" aria-label="Explore map">↗</button></div><h3>{user?.village || "Find your community"}</h3><p>{user ? `${user.district}, ${user.state}` : "Sign in to see reports around you."}</p><Link to={user ? "/map" : "/login"} className="aside-link">{user ? "See what's nearby" : "Join the community"} <ArrowRight size={14} /></Link><div className="area-rings"><span /><span /><span /><div className="area-pin"><MapPin size={16} fill="currentColor" /></div></div></div>
        <div className="aside-card mini-stats-card"><div className="aside-title-row"><div><div className="eyebrow">COMMUNITY PULSE</div><h3>A little progress</h3></div><span className="pulse-dot" /></div><div className="mini-stat"><span className="mini-stat-icon green"><ShieldCheck size={16} /></span><span>Issues resolved</span><strong>{complaints.filter((item) => item.status === "Resolved").length}</strong></div><div className="mini-stat"><span className="mini-stat-icon yellow"><Users size={16} /></span><span>Neighbors speaking up</span><strong>{new Set(complaints.map((item) => item.author?._id).filter(Boolean)).size}</strong></div><div className="mini-stat"><span className="mini-stat-icon blue"><MapPin size={16} /></span><span>Areas represented</span><strong>{new Set(complaints.map((item) => item.village).filter(Boolean)).size}</strong></div><div className="progress-caption"><span>Every report moves us forward</span><span>↗</span></div></div>
        <div className="aside-card gentle-card"><div className="gentle-flower">✳</div><span className="eyebrow">A GENTLE REMINDER</span><h3>Your voice belongs here.</h3><p>Every thoughtful report helps make our shared spaces better for everyone.</p><Link to={user ? "/report" : "/login"} className="text-link">Share what matters <ArrowRight size={14} /></Link></div>
        <div className="aside-foot"><span>Made for neighbors,</span><span>not noise. <span className="aside-heart">♥</span></span></div>
      </aside>
    </div>
  );
}
