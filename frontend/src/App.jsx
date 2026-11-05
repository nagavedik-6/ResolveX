import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import ReportPage from "./pages/ReportPage";
import { MapPage, TrackPage } from "./pages/ExplorePages";
import { AssignedPage, ComplaintDetailPage, MyReportsPage, NotificationsPage, ProfilePage } from "./pages/CommunityPages";
import { AdminPage, AnalyticsPage, DepartmentsPage, ModerationPage, UsersPage } from "./pages/AdminPages";

function LoadingPage() {
  return <div className="app-loading"><span className="spinner" />Getting ResolveX ready...</div>;
}

function RoleRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function SiteLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <LoadingPage />;
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/" element={<SiteLayout><Home /></SiteLayout>} />
    <Route path="/map" element={<SiteLayout><MapPage /></SiteLayout>} />
    <Route path="/track" element={<SiteLayout><TrackPage /></SiteLayout>} />
    <Route path="/report" element={<SiteLayout><ReportPage /></SiteLayout>} />
    <Route path="/complaints/:id" element={<SiteLayout><ComplaintDetailPage /></SiteLayout>} />
    <Route path="/my-complaints" element={<SiteLayout><RoleRoute><MyReportsPage /></RoleRoute></SiteLayout>} />
    <Route path="/notifications" element={<SiteLayout><RoleRoute><NotificationsPage /></RoleRoute></SiteLayout>} />
    <Route path="/profile" element={<SiteLayout><RoleRoute><ProfilePage /></RoleRoute></SiteLayout>} />
    <Route path="/admin" element={<SiteLayout><RoleRoute role="admin"><AdminPage /></RoleRoute></SiteLayout>} />
    <Route path="/departments" element={<SiteLayout><RoleRoute role="admin"><DepartmentsPage /></RoleRoute></SiteLayout>} />
    <Route path="/users" element={<SiteLayout><RoleRoute role="admin"><UsersPage /></RoleRoute></SiteLayout>} />
    <Route path="/moderation" element={<SiteLayout><RoleRoute role="admin"><ModerationPage /></RoleRoute></SiteLayout>} />
    <Route path="/analytics" element={<SiteLayout><RoleRoute role="admin"><AnalyticsPage /></RoleRoute></SiteLayout>} />
    <Route path="/assigned" element={<SiteLayout><RoleRoute role="officer"><AssignedPage /></RoleRoute></SiteLayout>} />
    <Route path="*" element={<SiteLayout><div className="centered-state"><h2>That page wandered off.</h2><p>Let's get you back to the community.</p><a className="button button-dark" href="/">Back home</a></div></SiteLayout>} />
  </Routes>;
}
