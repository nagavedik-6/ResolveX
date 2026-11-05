import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Building2, CircleAlert, ClipboardList, Users } from "lucide-react";
import api, { getErrorMessage } from "../api";
import { StatusBadge } from "../components/ComplaintCard";
import Feedback from "../components/Feedback";
import { EmptyState } from "./CommunityPages";

export function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState("");

  async function load() {
    try {
      const [dashboard, list] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get(`/complaints?limit=100${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ""}`)
      ]);
      setSummary(dashboard.data);
      setComplaints(list.data.complaints || []);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }
  useEffect(() => { load(); }, [statusFilter]);

  async function updateStatus(item, nextStatus) {
    setUpdating(item._id);
    try {
      await api.post(`/complaints/${item._id}/status`, { status: nextStatus, note: "Updated by administrator" });
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setUpdating(""); }
  }

  const cards = [
    { label: "All reports", value: summary?.totalComplaints ?? "—", icon: ClipboardList, className: "stat-green" },
    { label: "Neighbors", value: summary?.totalUsers ?? "—", icon: Users, className: "stat-blue" },
    { label: "Community notes", value: summary?.totalComments ?? "—", icon: CircleAlert, className: "stat-gold" },
    { label: "Resolved", value: summary?.complaintsByStatus?.Resolved || 0, icon: BarChart3, className: "stat-lilac" }
  ];
  return <div className="admin-page"><div className="admin-welcome"><div><div className="eyebrow"><span className="eyebrow-dot" /> ADMIN WORKSPACE</div><h1>Good work starts<br /><em>with a clear view.</em></h1><p>Here's what's happening across the community today.</p></div><Link className="button button-dark" to="/departments"><Building2 size={16} /> Manage departments <ArrowRight size={15} /></Link></div><Feedback>{error}</Feedback>
    <div className="stats-grid">{cards.map(({ label, value, icon: Icon, className }) => <div className="stat-card panel" key={label}><span className={`stat-icon ${className}`}><Icon size={18} /></span><strong>{value}</strong><span>{label}</span></div>)}</div>
    <div className="admin-content-grid"><section className="admin-table-card panel"><div className="admin-table-head"><div><div className="eyebrow">THE NEIGHBORHOOD INBOX</div><h2>Recent reports</h2></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select></div>{complaints.length ? <div className="table-scroll"><table><thead><tr><th>Report</th><th>From</th><th>Status</th><th>Update</th></tr></thead><tbody>{complaints.map((item) => <tr key={item._id}><td><Link className="admin-report-title" to={`/complaints/${item._id}`}>{item.title}<small>{item.trackingId} · {item.category}</small></Link></td><td>{item.village}</td><td><StatusBadge status={item.status} /></td><td><select disabled={updating === item._id} value={item.status} onChange={(e) => updateStatus(item, e.target.value)} aria-label={`Update status for ${item.title}`}>{["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div> : <EmptyState title="No reports to review" text="New community reports will appear here." />}</section><aside className="admin-side-column"><div className="admin-status-card panel"><div className="eyebrow">STATUS BREAKDOWN</div><h3>Every step counts.</h3>{["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"].map((status) => <div className="status-breakdown-row" key={status}><span>{status}</span><div className="bar-track"><i style={{ width: `${summary?.totalComplaints ? Math.max(3, ((summary.complaintsByStatus?.[status] || 0) / summary.totalComplaints) * 100) : 0}%` }} /></div><strong>{summary?.complaintsByStatus?.[status] || 0}</strong></div>)}</div><div className="admin-shortcuts panel"><div className="eyebrow">QUICK LINKS</div><Link to="/departments"><Building2 size={17} /> Departments <ArrowRight size={15} /></Link><Link to="/"><ClipboardList size={17} /> Community board <ArrowRight size={15} /></Link><Link to="/notifications"><CircleAlert size={17} /> Notifications <ArrowRight size={15} /></Link></div></aside></div>
  </div>;
}

export function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [departmentsResponse, usersResponse] = await Promise.all([api.get("/departments"), api.get("/admin/users?role=officer&limit=100")]);
      setDepartments(departmentsResponse.data.departments || []);
      setOfficers(usersResponse.data.users || []);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }
  useEffect(() => { load(); }, []);

  async function createDepartment(event) {
    event.preventDefault();
    setError(""); setMessage("");
    try {
      await api.post("/departments", { name, description });
      setName(""); setDescription(""); setMessage("Department created successfully.");
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }

  async function assignOfficer(departmentId, userId) {
    if (!userId) return;
    setError(""); setMessage("");
    try {
      await api.put(`/departments/${departmentId}/officers/${userId}`);
      setMessage("Officer assigned to department.");
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
  }

  return <div className="simple-page departments-page"><div className="eyebrow">PEOPLE POWERING CHANGE</div><h1>Departments &amp; <em>officers.</em></h1><p className="page-lead">Organize the local teams that receive and act on community reports.</p><Feedback>{error}</Feedback><Feedback type="success">{message}</Feedback><div className="department-layout"><section className="department-list">{departments.length ? departments.map((department) => <div className="department-card panel" key={department._id}><span className="department-icon"><Building2 size={19} /></span><div className="department-info"><h3>{department.name}</h3><p>{department.description || "Community response team"}</p><label className="form-field"><span>Assign officer</span><select defaultValue="" onChange={(e) => assignOfficer(department._id, e.target.value)}><option value="" disabled>Choose an officer</option>{officers.map((officer) => <option key={officer._id} value={officer._id}>{officer.fullName} · {officer.email}</option>)}</select></label></div></div>) : <EmptyState title="No departments yet" text="Create a department to start assigning reports to the right people." />}</section><form className="create-department panel" onSubmit={createDepartment}><div className="eyebrow">ADD A TEAM</div><h2>Make room for<br /><em>good work.</em></h2><p>Set up a department to help organize who takes care of what.</p><label className="form-field"><span>Department name</span><input required maxLength="120" placeholder="e.g. Roads Department" value={name} onChange={(e) => setName(e.target.value)} /></label><label className="form-field"><span>What does this team do?</span><textarea rows="4" maxLength="1000" placeholder="A short description..." value={description} onChange={(e) => setDescription(e.target.value)} /></label><button className="button button-dark">Create department <ArrowRight size={15} /></button><small>Officers must already have an account. Their role is updated when assigned.</small></form></div></div>;
}

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (role) params.set("role", role);
    if (search.trim()) params.set("search", search.trim());
    api.get(`/admin/users?${params}`)
      .then(({ data }) => { if (active) setUsers(data.users || []); })
      .catch((e) => { if (active) setError(getErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, role]);
  async function changeRole(user, nextRole) {
    setUpdating(user._id); setError("");
    try {
      const { data } = await api.put(`/admin/users/${user._id}/role`, { role: nextRole });
      setUsers((current) => current.map((item) => item._id === user._id ? data.user : item));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setUpdating(""); }
  }
  return <div className="simple-page"><div className="eyebrow">THE PEOPLE BEHIND THE PROGRESS</div><h1>Community <em>members.</em></h1><p className="page-lead">A directory of the people using ResolveX to make their neighborhoods better.</p><Feedback>{error}</Feedback><div className="user-toolbar panel"><label className="search-field"><input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} /></label><select value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option><option value="community">Community</option><option value="officer">Officer</option><option value="admin">Admin</option></select></div><div className="user-table panel">{loading ? <div className="loading-state"><span className="spinner" />Loading members...</div> : users.length ? <div className="table-scroll"><table><thead><tr><th>Member</th><th>Email</th><th>Area</th><th>Role</th><th>Joined</th></tr></thead><tbody>{users.map((item) => <tr key={item._id}><td><span className="user-name-cell"><span className="avatar avatar-small">{item.fullName?.[0]?.toUpperCase()}</span>{item.fullName}</span></td><td>{item.email}</td><td>{item.village}, {item.district}</td><td>{item.role === "admin" ? <span className="role-pill">admin</span> : <select className="role-select" value={item.role} disabled={updating === item._id} onChange={(e) => changeRole(item, e.target.value)} aria-label={`Role for ${item.fullName}`}><option value="community">community</option><option value="officer">officer</option></select>}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No members found" text="Try another search or role filter." />}</div><p className="admin-role-note"><ShieldCheck size={14} /> For safety, administrator access can only be provisioned directly by an authorized database operator.</p></div>;
}

export function ModerationPage() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function load() {
    try { const { data } = await api.get("/reports"); setReports(data.reports || []); }
    catch (e) { setError(getErrorMessage(e)); }
  }
  useEffect(() => { load(); }, []);
  async function review(report, hideContent) {
    setBusy(report._id); setError("");
    try {
      await api.put(`/reports/${report._id}`, { status: "reviewed", hideContent });
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(""); }
  }
  async function dismiss(report) {
    setBusy(report._id); setError("");
    try { await api.put(`/reports/${report._id}`, { status: "dismissed" }); await load(); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(""); }
  }
  return <div className="simple-page"><div className="eyebrow">KEEPING THE COMMUNITY HELPFUL</div><h1>Content <em>reports.</em></h1><p className="page-lead">Review reports from community members and take appropriate action.</p><Feedback>{error}</Feedback><div className="moderation-list">{reports.length ? reports.map((report) => <article className="moderation-card panel" key={report._id}><div className="moderation-heading"><span className="report-flag"><CircleAlert size={17} /></span><div><span className="eyebrow">REPORTED BY {report.reporter?.fullName || "A member"}</span><small>{new Date(report.createdAt).toLocaleString()}</small></div><span className="moderation-status">{report.status}</span></div><p className="moderation-reason">“{report.reason}”</p>{report.complaint ? <Link className="moderation-target" to={`/complaints/${report.complaint._id}`}><b>Report:</b> {report.complaint.title} <small>{report.complaint.trackingId}</small></Link> : <div className="moderation-target"><b>Comment:</b> {report.comment?.text}</div>}<div className="moderation-actions"><button disabled={busy === report._id} className="button button-outline button-small" onClick={() => dismiss(report)}>Dismiss</button><button disabled={busy === report._id} className="button button-dark button-small" onClick={() => review(report, true)}>Review &amp; hide content</button></div></article>) : <EmptyState title="Nothing to review" text="New community content reports will appear here." />}</div></div>;
}

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [district, setDistrict] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    const params = new URLSearchParams();
    if (district.trim()) params.set("district", district.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    api.get(`/admin/reports/analytics?${params}`)
      .then(({ data: result }) => setData(result))
      .catch((e) => setError(getErrorMessage(e)));
  }, [district, from, to]);
  const maxCategory = Math.max(1, ...(data?.byCategory || []).map((item) => item.count));
  return <div className="simple-page"><div className="page-title-row"><div><div className="eyebrow">LEARNING FROM THE WORK</div><h1>Community <em>insights.</em></h1><p>Patterns that help us focus attention where it's most needed.</p></div><div className="analytics-filters"><label className="analytics-location"><MapPin size={14} /><input placeholder="Filter by district" value={district} onChange={(e) => setDistrict(e.target.value)} /></label><label className="date-filter"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="date-filter"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div></div><Feedback>{error}</Feedback><div className="analytics-grid">{[["Reports by category", data?.byCategory || [], maxCategory], ["Reports by neighborhood", data?.byVillage || [], Math.max(1, ...(data?.byVillage || []).map((item) => item.count))]].map(([title, rows, maximum]) => <section className="analytics-card panel" key={title}><div className="eyebrow">COMMUNITY SNAPSHOT</div><h3>{title}</h3>{rows.length ? rows.slice(0, 10).map((item) => <div className="analytics-row" key={item._id}><span>{item._id || "Not specified"}</span><div className="bar-track"><i style={{ width: `${Math.max(3, item.count / maximum * 100)}%` }} /></div><strong>{item.count}</strong></div>) : <p className="analytics-empty">There is not enough report data to show this yet.</p>}</section>)}</div><section className="analytics-card panel status-analytics"><div className="eyebrow">WHERE REPORTS STAND</div><h3>Progress, at a glance.</h3><div className="status-analytics-grid">{(data?.byStatus || []).map((item) => <div key={item._id}><StatusBadge status={item._id} /><strong>{item.count}</strong></div>)}</div></section><section className="analytics-card panel"><div className="eyebrow">NEIGHBORHOOD MOMENTUM</div><h3>Most supported reports</h3>{(data?.mostSupported || []).length ? data.mostSupported.slice(0, 5).map((item) => <Link className="analytics-top-report" key={item._id} to={`/complaints/${item._id}`}><span>{item.title}<small>{item.village} · {item.category}</small></span><strong>{item.supportCount} support</strong><ArrowRight size={14} /></Link>) : <p className="analytics-empty">Reports with community support will appear here.</p>}</section></div>;
}
