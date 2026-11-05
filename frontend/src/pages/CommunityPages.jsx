import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, Check, Clock3, MapPin, MessageCircle, Send, ShieldCheck, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import ComplaintCard, { StatusBadge } from "../components/ComplaintCard";
import Feedback from "../components/Feedback";

export function MyReportsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get("/complaints?limit=100")
      .then(({ data }) => setComplaints(data.complaints || []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  return <div className="simple-page"><div className="page-title-row"><div><div className="eyebrow">YOUR CONTRIBUTION</div><h1>My <em>reports.</em></h1><p>Every report is a small act of care for the place we share.</p></div><Link className="button button-dark" to="/report">+ Report an issue <ArrowRight size={16} /></Link></div><Feedback>{error}</Feedback>{loading ? <Loading /> : complaints.length ? <div className="my-report-list">{complaints.map((item) => <ComplaintCard key={item._id} complaint={item} />)}</div> : <EmptyState title="Your story starts here" text="When you submit a community report, you can follow its progress here." action={<Link className="button button-dark" to="/report">Report an issue <ArrowRight size={16} /></Link>} />}</div>;
}

export function ComplaintDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(location.state?.created ? "Your report was submitted. You can follow updates on this page." : "");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [report, discussion] = await Promise.all([
        api.get(`/complaints/${id}`),
        api.get(`/complaints/${id}/comments`)
      ]);
      setComplaint(report.data.complaint);
      setComments(discussion.data.comments || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addComment(event) {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      if (editingComment) {
        await api.put(`/complaints/${id}/comments/${editingComment._id}`, { text: text.trim() });
        setEditingComment(null);
        setText("");
        await load();
        return;
      }
      const { data } = await api.post(`/complaints/${id}/comments`, { text: text.trim(), parentId: replyTo?._id });
      setComments((current) => [...current, data.comment]);
      setText("");
      setReplyTo(null);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }

  function editComment(comment) {
    setReplyTo(null);
    setEditingComment(comment);
    setText(comment.text);
    document.getElementById("comment-input")?.focus();
  }

  async function reportContent(target) {
    if (!user) { setError("Sign in to report inappropriate content."); return; }
    const reason = window.prompt("Why are you reporting this content?");
    if (!reason?.trim()) return;
    try {
      await api.post("/reports", target.commentId
        ? { commentId: target.commentId, reason: reason.trim() }
        : { complaintId: target.complaintId, reason: reason.trim() });
      setSuccess("Thank you. Your report has been sent to the moderation team.");
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }

  async function removeComment(commentId) {
    if (!window.confirm("Delete this comment and its replies?")) return;
    try {
      await api.delete(`/complaints/${id}/comments/${commentId}`);
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }

  async function deleteComplaint() {
    if (!window.confirm("Delete this report? This action cannot be undone.")) return;
    try { await api.delete(`/complaints/${id}`); navigate("/my-complaints"); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  }

  if (loading) return <Loading />;
  if (error && !complaint) return <div className="centered-state"><div className="empty-illustration"><MapPin size={25} /></div><h2>We couldn't find this report</h2><p>{error}</p><Link className="button button-dark" to="/">Back to community</Link></div>;
  if (!complaint) return null;

  const myReport = user && (user._id === complaint.author?._id || user.id === complaint.author?._id);
  const canManage = user?.role === "admin" || user?.role === "officer";
  const rootComments = comments.filter((item) => !item.parent);
  const repliesFor = (parentId) => comments.filter((item) => String(item.parent?._id || item.parent) === String(parentId));
  return <div className="detail-page">
    <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to community</Link>
    <Feedback type="success">{success}</Feedback><Feedback>{error}</Feedback>
    <div className="detail-layout"><article className="detail-main panel">
      {complaint.imageUrls?.[0] && <img className="detail-image" src={complaint.imageUrls[0]} alt={complaint.title} />}
      <div className="detail-content">
        <div className="post-tags"><span className="category-tag">{complaint.category}</span><StatusBadge status={complaint.status} />{complaint.visibility === "private" && <span className="private-badge"><ShieldCheck size={12} /> Private</span>}</div>
        <h1>{complaint.title}</h1>
        <div className="detail-byline"><div className="avatar avatar-green">{complaint.author?.profilePictureUrl ? <img src={complaint.author.profilePictureUrl} alt="" /> : complaint.author?.fullName?.[0] || "R"}</div><div><strong>{complaint.author?.fullName || "Community member"}</strong><span>{complaint.village}{complaint.district ? `, ${complaint.district}` : ""} · {new Date(complaint.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span></div></div>
        <p className="detail-description">{complaint.description}</p>
        <div className="detail-location"><MapPin size={16} /><span><b>Issue location</b>{complaint.village}, {complaint.district}</span><Link to="/map">View on map ↗</Link></div>
        {user && complaint.visibility === "public" && <button className="report-content-link" onClick={() => reportContent({ complaintId: complaint._id })}>Report inappropriate content</button>}
        <div className="tracking-id-box"><span><small>TRACKING ID</small><strong>{complaint.trackingId}</strong></span><Link to={`/track?id=${complaint.trackingId}`}>Track progress <ArrowRight size={14} /></Link></div>
        <div className="status-history-mini"><div className="eyebrow">STATUS HISTORY</div>{complaint.statusHistory?.map((step) => <div key={`${step.status}${step.changedAt}`}><span className="history-dot" /><span><b>{step.status}</b><small>{new Date(step.changedAt).toLocaleString()}</small>{step.note && <small>{step.note}</small>}</span></div>)}</div>
        {canManage && <ManagementPanel complaint={complaint} onUpdated={load} />}
        {(myReport || user?.role === "admin") && <button className="danger-link" onClick={deleteComplaint}><Trash2 size={15} /> Delete report</button>}
      </div>
      <div className="discussion-section" id="discussion"><div className="discussion-heading"><div><div className="eyebrow">NEIGHBORS TALKING</div><h2>Community discussion <span className="count-pill">{comments.length}</span></h2></div></div>
        {user ? <form className="comment-composer" onSubmit={addComment}><div className="avatar avatar-small">{user.fullName?.[0]?.toUpperCase()}</div><div className="composer-input">{editingComment && <div className="replying-to">Editing your comment<button type="button" onClick={() => { setEditingComment(null); setText(""); }}>Cancel</button></div>}{replyTo && <div className="replying-to">Replying to {replyTo.author?.fullName}<button type="button" onClick={() => { setReplyTo(null); setText(""); }}>Cancel</button></div>}<textarea id="comment-input" rows="2" placeholder="Add something helpful to the conversation..." value={text} onChange={(e) => setText(e.target.value)} /><div className="composer-bottom"><span>Keep it kind and constructive.</span><button className="button button-dark button-small" disabled={!text.trim()}><Send size={14} /> {editingComment ? "Save" : "Post"}</button></div></div></form> : <div className="sign-in-discussion"><MessageCircle size={17} /> Want to join the conversation? <Link to="/login">Sign in</Link></div>}
        {rootComments.length ? <div className="comment-list">{rootComments.map((comment) => <CommentItem key={comment._id} comment={comment} replies={repliesFor(comment._id)} getReplies={repliesFor} user={user} onReply={(item) => { setEditingComment(null); setReplyTo(item); setText(""); }} onEdit={editComment} onDelete={removeComment} onReport={reportContent} />)}</div> : <div className="comments-empty">A thoughtful first comment can make all the difference.</div>}
      </div>
    </article><aside className="detail-aside"><div className="aside-card detail-status-card"><div className="eyebrow">WHERE THINGS STAND</div><h3>Progress, together.</h3><StatusBadge status={complaint.status} /><p>Use your tracking ID to come back and see how this report moves forward.</p><div className="detail-status-meta"><span><Clock3 size={15} />Reported</span><strong>{new Date(complaint.createdAt).toLocaleDateString()}</strong></div><div className="detail-status-meta"><span><ShieldCheck size={15} />Department</span><strong>{complaint.department?.name || "Not assigned yet"}</strong></div><Link className="button button-dark full-button" to={`/track?id=${complaint.trackingId}`}>Follow this report <ArrowRight size={15} /></Link></div><div className="aside-card gentle-card"><div className="gentle-flower">✳</div><span className="eyebrow">GOOD NEIGHBOR ENERGY</span><h3>Helpful beats heated.</h3><p>Thoughtful support and practical ideas are what move a community forward.</p></div></aside></div>
  </div>;
}

function CommentItem({ comment, replies, getReplies, user, onReply, onEdit, onDelete, onReport }) {
  const own = user && (user._id === comment.author?._id || user.id === comment.author?._id);
  return <div className={`comment-item ${comment.depth ? "reply-comment" : ""}`}><div className="avatar avatar-small">{comment.author?.profilePictureUrl ? <img src={comment.author.profilePictureUrl} alt="" /> : comment.author?.fullName?.[0]?.toUpperCase() || "N"}</div><div className="comment-content"><div className="comment-bubble"><strong>{comment.author?.fullName || "Neighbor"}</strong><p>{comment.text}</p></div><div className="comment-meta"><span>{new Date(comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>{user && comment.depth < 3 && <button onClick={() => onReply(comment)}>Reply</button>}{own && <button onClick={() => onEdit(comment)}>Edit</button>}{user && <button onClick={() => onReport({ commentId: comment._id })}>Report</button>}{(own || user?.role === "admin") && <button onClick={() => onDelete(comment._id)}>Delete</button>}</div>{replies.map((reply) => <CommentItem key={reply._id} comment={reply} replies={getReplies(reply._id)} getReplies={getReplies} user={user} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onReport={onReport} />)}</div></div>;
}

function ManagementPanel({ complaint, onUpdated }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [departmentId, setDepartmentId] = useState(complaint.department?._id || "");
  const [officerId, setOfficerId] = useState(complaint.assignedOfficer?._id || "");
  useEffect(() => {
    if (user?.role !== "admin") return;
    Promise.all([api.get("/departments"), api.get("/admin/users?role=officer&limit=100")])
      .then(([departmentResponse, userResponse]) => {
        setDepartments(departmentResponse.data.departments || []);
        setOfficers(userResponse.data.users || []);
      })
      .catch((e) => setMessage(getErrorMessage(e)));
  }, [user?.role]);
  async function updateStatus(event) {
    event.preventDefault();
    try {
      await api.post(`/complaints/${complaint._id}/status`, { status, note });
      setMessage("Status updated.");
      setNote("");
      onUpdated();
    } catch (e) { setMessage(getErrorMessage(e)); }
  }
  async function assignComplaint(event) {
    event.preventDefault();
    setMessage("");
    try {
      await api.put(`/admin/complaints/${complaint._id}/assign`, {
        departmentId: departmentId || null,
        officerId: officerId || null,
        note
      });
      setMessage("Department and officer assignment saved.");
      onUpdated();
    } catch (e) { setMessage(getErrorMessage(e)); }
  }
  if (user?.role === "officer" && complaint.assignedOfficer?._id !== user._id && complaint.assignedOfficer !== user._id) return null;
  return <div className="management-panel"><div className="eyebrow">STAFF ACTION</div>{user?.role === "admin" && <form className="management-assignment" onSubmit={assignComplaint}><div className="form-two-col"><label className="form-field"><span>Department</span><select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setOfficerId(""); }}><option value="">Unassigned</option>{departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label className="form-field"><span>Responsible officer</span><select value={officerId} onChange={(e) => setOfficerId(e.target.value)}><option value="">Unassigned</option>{officers.filter((item) => !departmentId || item.department?._id === departmentId || item.department === departmentId).map((item) => <option key={item._id} value={item._id}>{item.fullName}</option>)}</select></label></div><button className="button button-outline button-small">Save assignment <Check size={14} /></button></form>}<form className="management-status" onSubmit={updateStatus}><div className="form-two-col"><label className="form-field"><span>Update status</span><select value={status} onChange={(e) => setStatus(e.target.value)}>{["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field"><span>Update note</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional update" /></label></div><button className="button button-dark button-small">Save status <Check size={14} /></button></form>{message && <small className="management-message">{message}</small>}</div>;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/notifications").then(({ data }) => setNotifications(data.notifications || [])).catch((e) => setError(getErrorMessage(e))); }, []);
  async function markRead(item) {
    if (item.readAt) return;
    try {
      const { data } = await api.put(`/notifications/${item._id}/read`);
      setNotifications((current) => current.map((notice) => notice._id === item._id ? data.notification : notice));
    } catch (e) { setError(getErrorMessage(e)); }
  }
  return <div className="simple-page narrow-page"><div className="page-title-row"><div><div className="eyebrow">A LITTLE UPDATE</div><h1>Your <em>notifications.</em></h1><p>News about the issues and conversations you care about.</p></div><Bell size={22} className="title-icon" /></div><Feedback>{error}</Feedback><div className="notification-list">{notifications.length ? notifications.map((item) => <button key={item._id} className={`notification-item ${item.readAt ? "" : "unread"}`} onClick={() => { markRead(item); if (item.complaint?._id) window.location.href = `/complaints/${item.complaint._id}`; }}><span className="notification-icon"><Bell size={17} /></span><span className="notification-copy"><strong>{item.message}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span>{!item.readAt && <span className="unread-dot" />}</button>) : <EmptyState title="All caught up" text="When something happens on a report you're part of, you'll find it here." />}</div></div>;
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [values, setValues] = useState(null);
  if (!user) return <div className="centered-state"><h2>Sign in to see your profile</h2><Link className="button button-dark" to="/login">Sign in <ArrowRight size={16} /></Link></div>;
  function startEditing() {
    setValues({
      fullName: user.fullName || "", village: user.village || "", district: user.district || "",
      state: user.state || "", mobileNumber: user.mobileNumber || "", profilePictureUrl: user.profilePictureUrl || ""
    });
    setEditing(true);
    setError("");
    setSuccess("");
  }
  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      const { data } = await api.put("/auth/me", values);
      updateUser(data.user);
      setEditing(false);
      setSuccess("Your profile has been updated.");
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }
  return <div className="simple-page narrow-page"><div className="eyebrow">YOUR PLACE IN THE COMMUNITY</div><h1>My <em>profile.</em></h1><Feedback type="success">{success}</Feedback><Feedback>{error}</Feedback><div className="profile-card panel"><div className="profile-avatar">{user.profilePictureUrl ? <img src={user.profilePictureUrl} alt="" /> : user.fullName?.[0]?.toUpperCase()}</div><h2>{user.fullName}</h2><p>{user.village}, {user.district}, {user.state}</p><span className="role-pill">{user.role}</span><div className="profile-divider" />{editing ? <form className="profile-edit-form" onSubmit={saveProfile}><label className="form-field"><span>Full name</span><input required minLength="2" maxLength="100" value={values.fullName} onChange={(e) => setValues({ ...values, fullName: e.target.value })} /></label><div className="form-two-col"><label className="form-field"><span>Village / town</span><input required value={values.village} onChange={(e) => setValues({ ...values, village: e.target.value })} /></label><label className="form-field"><span>District</span><input required value={values.district} onChange={(e) => setValues({ ...values, district: e.target.value })} /></label></div><div className="form-two-col"><label className="form-field"><span>State</span><input required value={values.state} onChange={(e) => setValues({ ...values, state: e.target.value })} /></label><label className="form-field"><span>Mobile number</span><input type="tel" value={values.mobileNumber} onChange={(e) => setValues({ ...values, mobileNumber: e.target.value })} /></label></div><label className="form-field"><span>Profile image URL</span><input type="url" placeholder="https://..." value={values.profilePictureUrl} onChange={(e) => setValues({ ...values, profilePictureUrl: e.target.value })} /></label><div className="profile-edit-actions"><button type="button" className="button button-outline" onClick={() => setEditing(false)}>Cancel</button><button className="button button-dark" disabled={busy}>{busy ? "Saving..." : "Save profile"} <Check size={15} /></button></div></form> : <><div className="profile-details"><div><span>Email address</span><strong>{user.email}</strong></div>{user.mobileNumber && <div><span>Mobile number</span><strong>{user.mobileNumber}</strong></div>}<div><span>Neighborhood</span><strong>{user.village}, {user.district}</strong></div><div><span>Member since</span><strong>{new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}</strong></div></div><div className="profile-actions"><button className="button button-outline" onClick={startEditing}>Edit profile</button><Link className="button button-dark" to="/my-complaints">View my reports <ArrowRight size={15} /></Link></div></>}<p className="profile-privacy"><ShieldCheck size={14} /> Your contact information is never shown on public reports.</p></div></div>;
}

export function AssignedPage() {
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/complaints/assigned").then(({ data }) => setComplaints(data.complaints || [])).catch((e) => setError(getErrorMessage(e))).finally(() => setLoading(false)); }, []);
  return <div className="simple-page"><div className="eyebrow">DEPARTMENT WORKSPACE</div><h1>Assigned <em>to me.</em></h1><p className="page-lead">Reports assigned to your account for review and action.</p><Feedback>{error}</Feedback>{loading ? <Loading /> : complaints.length ? <div className="my-report-list">{complaints.map((item) => <ComplaintCard key={item._id} complaint={item} />)}</div> : <EmptyState title="No reports assigned yet" text="When a report is assigned to you, it will show up here." />}</div>;
}

export function EmptyState({ title, text, action }) {
  return <div className="empty-state"><div className="empty-illustration"><MessageCircle size={27} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
function Loading() { return <div className="loading-state"><span className="spinner" />Just a moment...</div>; }
