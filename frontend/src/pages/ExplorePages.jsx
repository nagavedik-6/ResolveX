import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Activity, ArrowRight, LocateFixed, MapPin, Search } from "lucide-react";
import api, { getErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";
import Feedback from "../components/Feedback";
import { StatusBadge } from "../components/ComplaintCard";

export function MapPage() {
  const [complaints, setComplaints] = useState([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    api.get(`/complaints?${params}`).then(({ data }) => setComplaints(data.complaints || [])).catch((e) => setError(getErrorMessage(e)));
  }, [category, status, from, to]);

  const visible = useMemo(() => complaints.filter((item) => `${item.title} ${item.village} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [complaints, search]);
  function locate() {
    if (!navigator.geolocation) { setError("Location services are unavailable."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setError("");
      setLocating(false);
      api.get(`/complaints/nearby?longitude=${coords.longitude}&latitude=${coords.latitude}&radiusMeters=25000`)
        .then(({ data }) => setComplaints(data.complaints || []))
        .catch((e) => setError(getErrorMessage(e)));
    }, () => { setLocating(false); setError("Couldn't access your location. Please allow location access and try again."); });
  }

  return <div className="map-page">
    <div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> SEE THE BIGGER PICTURE</div><h1>Issues, <em>on the map.</em></h1><p>Explore what neighbors are reporting in the places we share.</p></div><button className="button button-outline" onClick={locate}><LocateFixed size={16} />{locating ? "Finding you..." : "Near me"}</button></div>
    <Feedback>{error}</Feedback>
    <div className="map-filters panel"><label className="search-field"><Search size={16} /><input placeholder="Search a place or issue" value={search} onChange={(e) => setSearch(e.target.value)} /></label><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{["Roads and transportation", "Water supply", "Electricity", "Drainage and sanitation", "Garbage and waste management", "Street lights", "Public safety", "College infrastructure", "Government services", "Other issues"].map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select><label className="date-filter"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="date-filter"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label><span className="map-result-count"><span className="pulse-dot" />{visible.length} reports</span></div>
    <div className="map-layout"><div className="map-wrap"><MapView complaints={visible} /></div><aside className="map-side-list"><div className="map-list-heading"><div><div className="eyebrow">IN THIS VIEW</div><h3>Community reports <span className="count-pill">{visible.length}</span></h3></div><span className="map-legend-dot" /></div>{visible.length ? visible.slice(0, 8).map((item) => <Link className="map-list-item" key={item._id} to={`/complaints/${item._id}`}><span className={`list-status-dot status-dot-${item.status.toLowerCase().replaceAll(" ", "-")}`} /><div><strong>{item.title}</strong><span><MapPin size={12} />{item.village} · {item.category}</span></div><StatusBadge status={item.status} /></Link>) : <div className="map-empty">No reports in this view yet.</div>}<Link className="text-link map-list-footer" to="/">See all community reports <ArrowRight size={14} /></Link></aside></div>
    <div className="map-legend"><span><i className="legend-dot urgent" />High priority</span><span><i className="legend-dot pending" />Submitted</span><span><i className="legend-dot progress" />In progress</span><span><i className="legend-dot resolved" />Resolved</span><span className="map-data-note">Map data © OpenStreetMap contributors</span></div>
  </div>;
}

export function TrackPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.get(`/complaints/track/${encodeURIComponent(trackingId.trim())}`);
      setResult(data);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  }

  return <div className="track-page"><div className="track-intro"><div className="track-icon"><Activity size={21} /></div><div className="eyebrow">FOLLOW THE PROGRESS</div><h1>A little clarity<br /><em>goes a long way.</em></h1><p>Enter your ResolveX tracking ID to see where your report is in its journey.</p></div><form className="track-form panel" onSubmit={submit}><label className="form-field"><span>Your tracking ID</span><input required placeholder="e.g. RX-A1B2C3D4E5F6" value={trackingId} onChange={(e) => setTrackingId(e.target.value)} /></label><button className="button button-dark" disabled={loading}>{loading ? "Looking it up..." : "Check progress"} <ArrowRight size={16} /></button><small>Your tracking ID was shared when you submitted the report.</small></form><Feedback>{error}</Feedback>
    {result && <div className="tracking-result panel"><div className="tracking-result-head"><div><div className="eyebrow">REPORT {result.trackingId}</div><h2>Here's the latest.</h2></div><StatusBadge status={result.status} /></div><div className="tracking-summary">{result.department?.name && <span><b>Department</b>{result.department.name}</span>}{result.assignedOfficer?.fullName && <span><b>Assigned to</b>{result.assignedOfficer.fullName}</span>}<span><b>Submitted</b>{new Date(result.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}</span></div><div className="timeline">{result.statusHistory?.map((step, index) => <div className={`timeline-item ${index === 0 ? "timeline-first" : ""}`} key={`${step.status}-${step.changedAt}`}><span className="timeline-node">{index === result.statusHistory.length - 1 ? <span /> : null}</span><div><strong>{step.status}</strong><small>{new Date(step.changedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</small>{step.note && <p>{step.note}</p>}</div></div>)}</div></div>}
    <div className="track-help">Need a hand? <Link to={user ? "/my-complaints" : "/login"}>Visit your reports <ArrowRight size={14} /></Link></div></div>;
}
