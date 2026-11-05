import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Activity, Bell, CircleUserRound, Compass, FilePlus2, LayoutDashboard,
  LogIn, LogOut, Map, Menu, MessageSquareText, Search, ShieldCheck, Users, Flag, BarChart3, X
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const primaryLinks = [
  { to: "/", label: "Community", icon: Compass, end: true },
  { to: "/map", label: "Explore map", icon: Map },
  { to: "/track", label: "Track an issue", icon: Activity }
];

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  async function logout() {
    await signOut();
    navigate("/");
  }

  const links = (
    <>
      <div className="nav-section-label">YOUR COMMUNITY</div>
      {primaryLinks.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
        </NavLink>
      ))}
      {user && <>
        <div className="nav-section-label nav-gap">YOUR SPACE</div>
        <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <FilePlus2 size={19} strokeWidth={1.8} /><span>Report an issue</span><span className="nav-plus">+</span>
        </NavLink>
        <NavLink to="/my-complaints" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <MessageSquareText size={19} strokeWidth={1.8} /><span>My reports</span>
        </NavLink>
        <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <Bell size={19} strokeWidth={1.8} /><span>Notifications</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <CircleUserRound size={19} strokeWidth={1.8} /><span>My profile</span>
        </NavLink>
      </>}
      {user && ["admin", "officer"].includes(user.role) && <>
        <div className="nav-section-label nav-gap">WORKSPACE</div>
        {user.role === "admin" && <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <LayoutDashboard size={19} strokeWidth={1.8} /><span>Admin dashboard</span>
        </NavLink>}
        {user.role === "admin" && <NavLink to="/departments" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <ShieldCheck size={19} strokeWidth={1.8} /><span>Departments</span>
        </NavLink>}
        {user.role === "admin" && <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <Users size={19} strokeWidth={1.8} /><span>Community members</span>
        </NavLink>}
        {user.role === "admin" && <NavLink to="/moderation" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <Flag size={19} strokeWidth={1.8} /><span>Content reports</span>
        </NavLink>}
        {user.role === "admin" && <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <BarChart3 size={19} strokeWidth={1.8} /><span>Analytics</span>
        </NavLink>}
        {user.role === "officer" && <NavLink to="/assigned" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
          <ShieldCheck size={19} strokeWidth={1.8} /><span>Assigned to me</span>
        </NavLink>}
      </>}
      <div className="sidebar-bottom">
        {user ? <button className="nav-link nav-button" onClick={logout}><LogOut size={19} /><span>Sign out</span></button> :
          <Link className="nav-link" to="/login" onClick={() => setMobileOpen(false)}><LogIn size={19} /><span>Sign in</span></Link>}
        <div className="sidebar-note"><span className="online-dot" />Small actions. Lasting change.</div>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button className="icon-button mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
        <Link to="/" className="brand"><span className="brand-mark">r<span>.</span></span><span>resolve<span className="brand-x">x</span></span></Link>
        <Link to="/track" className="icon-button" aria-label="Track a report"><Search size={20} /></Link>
      </header>
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)}><aside className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-top"><Brand /><button className="icon-button" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>{links}
      </aside></div>}
      <aside className="sidebar">
        <Brand />
        <div className="location-chip"><span className="location-pin">⌖</span><div><span className="tiny-label">YOUR NEIGHBORHOOD</span><strong>{user?.village || "Discover your area"}</strong></div></div>
        <nav className="side-nav">{links}</nav>
        <div className="sidebar-footer">A community project for a better tomorrow.<br /><span>© 2025 ResolveX</span></div>
      </aside>
      <main className="main-area">
        <div className="topbar">
          <div className="breadcrumb"><span>ResolveX</span><span className="crumb-slash">/</span><strong>Community-led change</strong></div>
          <div className="top-actions">
            <Link to="/track" className="top-search"><Search size={16} /><span>Track a report</span><kbd>⌘ K</kbd></Link>
            {user ? <Link className="avatar-link" to="/profile" title={user.fullName}>{user.profilePictureUrl ? <img src={user.profilePictureUrl} alt="" /> : <span>{user.fullName?.[0]?.toUpperCase()}</span>}</Link> :
              <Link className="button button-dark button-small" to="/login">Sign in <span>↗</span></Link>}
          </div>
        </div>
        <div className="page-content">{children}</div>
      </main>
      <nav className="mobile-bottom-nav">
        <NavLink to="/" end><Compass size={20} /><span>Home</span></NavLink>
        <NavLink to="/map"><Map size={20} /><span>Map</span></NavLink>
        <NavLink to="/report"><FilePlus2 size={20} /><span>Report</span></NavLink>
        <NavLink to={user ? "/profile" : "/login"}><CircleUserRound size={20} /><span>{user ? "Profile" : "Sign in"}</span></NavLink>
      </nav>
    </div>
  );
}

function Brand() {
  return <Link to="/" className="brand"><span className="brand-mark">r<span>.</span></span><span>resolve<span className="brand-x">x</span></span></Link>;
}
