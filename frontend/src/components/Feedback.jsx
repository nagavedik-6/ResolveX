import { CheckCircle2, CircleAlert, X } from "lucide-react";

export default function Feedback({ type = "error", children, onClose }) {
  if (!children) return null;
  const Icon = type === "success" ? CheckCircle2 : CircleAlert;
  return <div className={`feedback feedback-${type}`} role="status"><Icon size={18} /><span>{children}</span>{onClose && <button onClick={onClose} aria-label="Dismiss"><X size={16} /></button>}</div>;
}
