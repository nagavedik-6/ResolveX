import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import api, { getErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import Feedback from "../components/Feedback";
import { LocationPicker } from "../components/MapView";

const categories = ["Roads and transportation", "Water supply", "Electricity", "Drainage and sanitation", "Garbage and waste management", "Street lights", "Public safety", "College infrastructure", "Government services", "Other issues"];

export default function ReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    title: "", description: "", category: categories[0], village: user?.village || "",
    district: user?.district || "", longitude: "", latitude: "", priority: "Normal",
    visibility: "public", imageUrl: ""
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return <div className="centered-state"><div className="empty-illustration"><ShieldCheck size={26} /></div><h2>Sign in to report an issue</h2><p>Your reports will be saved to your account so you can follow their progress.</p><Link className="button button-dark" to="/login">Sign in to continue <ArrowRight size={16} /></Link></div>;

  function update(key, value) { setValues((current) => ({ ...current, [key]: value })); }

  function detectLocation() {
    setError("");
    if (!navigator.geolocation) { setError("Location is not available in this browser. You can enter coordinates manually."); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setValues((current) => ({ ...current, longitude: coords.longitude.toFixed(6), latitude: coords.latitude.toFixed(6) })),
      () => setError("We couldn't access your location. Allow location access or enter coordinates manually."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (values.longitude === "" || values.latitude === "") {
      setError("Please enter a location or use the location button. Coordinates are used to place the report on the map.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/complaints", {
        title: values.title,
        description: values.description,
        category: values.category,
        village: values.village,
        district: values.district,
        coordinates: [Number(values.longitude), Number(values.latitude)],
        priority: values.priority,
        visibility: values.visibility,
        imageUrls: values.imageUrl ? [values.imageUrl] : []
      });
      navigate(`/complaints/${data.complaint._id}`, { state: { created: true } });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <div className="form-page">
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to community</Link>
    <div className="form-page-heading"><div className="eyebrow"><span className="eyebrow-dot" /> MAKE A DIFFERENCE</div><h1>Tell us what needs<br /><em>a little attention.</em></h1><p>Clear, thoughtful reports help your neighbors and local teams understand what needs to change.</p></div>
    <form className="report-form panel" onSubmit={submit}>
      <div className="form-section-title"><span>01</span><div><h3>The issue</h3><p>Help us understand what you've noticed.</p></div></div>
      <Feedback>{error}</Feedback>
      <div className="form-stack">
        <label className="form-field"><span>Give it a short title</span><input required minLength="5" maxLength="160" placeholder="e.g. Broken street light near the community hall" value={values.title} onChange={(e) => update("title", e.target.value)} /></label>
        <label className="form-field"><span>What's going on?</span><textarea required minLength="10" maxLength="10000" rows="5" placeholder="Share what happened, where it is, and how it's affecting the neighborhood..." value={values.description} onChange={(e) => update("description", e.target.value)} /></label>
        <div className="form-two-col"><label className="form-field"><span>Category</span><select value={values.category} onChange={(e) => update("category", e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-field"><span>Priority</span><select value={values.priority} onChange={(e) => update("priority", e.target.value)}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label></div>
        <label className="form-field"><span>Photo URL <small>Optional · share a publicly accessible image link</small></span><input type="url" placeholder="https://example.com/photo.jpg" value={values.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} /></label>
      </div>
      <div className="form-section-title section-spaced"><span>02</span><div><h3>Where is it?</h3><p>We use the issue location, not your home address.</p></div></div>
      <div className="form-stack">
        <div className="form-two-col"><label className="form-field"><span>Village or town</span><input required value={values.village} onChange={(e) => update("village", e.target.value)} placeholder="Local area" /></label><label className="form-field"><span>District</span><input required value={values.district} onChange={(e) => update("district", e.target.value)} placeholder="District" /></label></div>
        <div className="location-entry"><div className="location-entry-icon"><MapPin size={18} /></div><div className="location-entry-content"><strong>Pin the issue location</strong><p>Click the map, use your current location, or enter coordinates below.</p><LocationPicker coordinates={[values.longitude, values.latitude]} onSelect={([longitude, latitude]) => setValues((current) => ({ ...current, longitude, latitude }))} /><div className="form-two-col coordinates"><label className="form-field"><span>Longitude</span><input required type="number" step="any" min="-180" max="180" placeholder="e.g. 78.9629" value={values.longitude} onChange={(e) => update("longitude", e.target.value)} /></label><label className="form-field"><span>Latitude</span><input required type="number" step="any" min="-90" max="90" placeholder="e.g. 20.5937" value={values.latitude} onChange={(e) => update("latitude", e.target.value)} /></label></div><button type="button" className="location-button" onClick={detectLocation}><LocateFixed size={15} /> Use my current location</button></div></div>
      </div>
      <div className="form-section-title section-spaced"><span>03</span><div><h3>Who can see it?</h3><p>You can choose to share it with everyone or keep it private.</p></div></div>
      <div className="visibility-options"><label className={values.visibility === "public" ? "visibility-option chosen" : "visibility-option"}><input type="radio" name="visibility" value="public" checked={values.visibility === "public"} onChange={() => update("visibility", "public")} /><span className="visibility-radio" /><span><strong>Community report</strong><small>Visible to your neighbors and local teams.</small></span><span className="visibility-symbol">◎</span></label><label className={values.visibility === "private" ? "visibility-option chosen" : "visibility-option"}><input type="radio" name="visibility" value="private" checked={values.visibility === "private"} onChange={() => update("visibility", "private")} /><span className="visibility-radio" /><span><strong>Private report</strong><small>Only you and authorized administrators can see it.</small></span><span className="visibility-symbol">◌</span></label></div>
      <div className="form-submit-row"><span><ShieldCheck size={15} /> Your personal address is never shown.</span><button className="button button-dark" disabled={busy}>{busy ? "Submitting..." : "Submit your report"} {busy ? <span className="spinner spinner-light" /> : <ArrowRight size={16} />}</button></div>
    </form>
    <div className="report-footnote"><Check size={15} /> Thank you for helping make your community a better place.</div>
  </div>;
}
