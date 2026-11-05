import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Feedback from "../components/Feedback";
import { getErrorMessage } from "../api";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const signedIn = await signIn(values);
      navigate(signedIn.role === "admin" ? "/admin" : "/");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <AuthFrame eyebrow="WELCOME BACK" title={<>Good to have<br /><em>you here.</em></>} description="Sign in to stay connected with what your community is working on.">
    <Feedback>{error}</Feedback>
    <form className="form-stack" onSubmit={submit}>
      <Field label="Email address"><input type="email" autoComplete="email" required placeholder="you@example.com" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></Field>
      <Field label="Password"><div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Enter your password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field>
      <button className="button button-dark form-submit" disabled={busy}>{busy ? "Signing you in..." : "Sign in"} <ArrowRight size={17} /></button>
    </form>
    <div className="auth-bottom">New to ResolveX? <Link to="/register">Create an account</Link></div>
  </AuthFrame>;
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ fullName: "", email: "", password: "", village: "", district: "", state: "", mobileNumber: "", profilePictureUrl: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(values);
      navigate("/");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <AuthFrame eyebrow="A BETTER PLACE STARTS HERE" title={<>Let's make good<br /><em>things happen.</em></>} description="Join neighbors who care about the little things that make a place feel like home.">
    <Feedback>{error}</Feedback>
    <form className="form-stack register-form" onSubmit={submit}>
      <Field label="Your name"><input required minLength="2" maxLength="100" autoComplete="name" placeholder="How should we call you?" value={values.fullName} onChange={(e) => setValues({ ...values, fullName: e.target.value })} /></Field>
      <Field label="Email address"><input type="email" required autoComplete="email" placeholder="you@example.com" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></Field>
      <Field label="Password"><input type="password" required minLength="10" autoComplete="new-password" placeholder="At least 10 characters" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} /></Field>
      <div className="form-two-col"><Field label="Village / town"><input required placeholder="Your neighborhood" value={values.village} onChange={(e) => setValues({ ...values, village: e.target.value })} /></Field><Field label="District"><input required placeholder="District" value={values.district} onChange={(e) => setValues({ ...values, district: e.target.value })} /></Field></div>
      <div className="form-two-col"><Field label="State"><input required placeholder="State" value={values.state} onChange={(e) => setValues({ ...values, state: e.target.value })} /></Field><Field label="Mobile (optional)"><input type="tel" placeholder="Phone number" value={values.mobileNumber} onChange={(e) => setValues({ ...values, mobileNumber: e.target.value })} /></Field></div>
      <Field label="Profile photo URL (optional)"><input type="url" placeholder="https://example.com/photo.jpg" value={values.profilePictureUrl} onChange={(e) => setValues({ ...values, profilePictureUrl: e.target.value })} /></Field>
      <button className="button button-dark form-submit" disabled={busy}>{busy ? "Creating account..." : "Create your account"} <ArrowRight size={17} /></button>
    </form>
    <div className="auth-bottom">Already part of the neighborhood? <Link to="/login">Sign in</Link></div>
  </AuthFrame>;
}

function AuthFrame({ eyebrow, title, description, children }) {
  return <div className="auth-page"><section className="auth-visual"><Link to="/" className="brand auth-brand"><span className="brand-mark">r<span>.</span></span><span>resolve<span className="brand-x">x</span></span></Link><div className="auth-art"><div className="auth-art-sun" /><div className="auth-art-hill one" /><div className="auth-art-hill two" /><div className="auth-art-house"><div /><span /></div><div className="auth-art-note">A little more progress,<br /><em>together.</em><span>✳</span></div></div><div className="auth-quote"><span>“</span><p>A place gets better when the people in it believe it can.</p><small>THE RESOLVEX COMMUNITY</small></div></section><section className="auth-form-side"><Link className="back-home" to="/"><ArrowLeft size={15} /> Back to community</Link><div className="auth-form-wrap"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="auth-description">{description}</p>{children}<div className="auth-privacy"><MapPin size={14} /> Your neighborhood information stays private.</div></div><span className="auth-legal">By continuing, you agree to be kind and keep this community helpful.</span></section></div>;
}

function Field({ label, children }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}
