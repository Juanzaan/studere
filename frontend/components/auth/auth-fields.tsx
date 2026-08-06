"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type ButtonHTMLAttributes,
} from "react";
import styles from "./auth.module.css";

/* ── Text field ───────────────────────────────────────────────────────── */

type FieldProps = {
  id: string;
  label: string;
  invalid?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

export function Field({ id, label, invalid, className, ...rest }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={[invalid ? styles.inputInvalid : "", className ?? ""]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    </div>
  );
}

/* ── Password field with show/hide ────────────────────────────────────── */

export function PasswordField({ id, label, invalid, ...rest }: FieldProps) {
  const [shown, setShown] = useState(false);

  return (
    <div className={`${styles.field} ${styles.fieldPass}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={shown ? "text" : "password"}
        className={invalid ? styles.inputInvalid : undefined}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <button
        type="button"
        className={styles.togglePass}
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {shown ? "Ocultar" : "Ver"}
      </button>
    </div>
  );
}

/* ── Submit button with inline spinner ────────────────────────────────── */

export function SubmitButton({
  loading,
  children,
  variant = "primary",
  ...rest
}: {
  loading?: boolean;
  children: ReactNode;
  variant?: "primary" | "ghost";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const kind = variant === "primary" ? styles.btnPrimary : styles.btnGhost;
  return (
    <button
      className={`${styles.btn} ${kind} ${loading ? styles.btnLoading : ""}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      <span className={styles.btnLabel}>{children}</span>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
    </button>
  );
}

/* ── Status message ───────────────────────────────────────────────────── */

export function StatusMessage({ kind, text }: { kind: "ok" | "err"; text: string }) {
  return (
    <div
      className={`${styles.msg} ${kind === "ok" ? styles.msgOk : styles.msgErr}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}

/* ── Height-animating panel wrapper ───────────────────────────────────────
   Fixes the prototype's two worst layout bugs: the wrapper used to collapse
   to 116px mid-switch and then snap 107-141px. Here the active panel is
   always in flow, and the wrapper animates between measured heights.        */

export function PanelWrap({
  activeKey,
  children,
}: {
  activeKey: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-panel-active="true"]`);
    if (active) setHeight(active.offsetHeight);
  }, [activeKey, children]);

  // Keep the wrapper honest when content reflows (validation messages,
  // font swap, viewport resize) rather than trusting the first measurement.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const active = el.querySelector<HTMLElement>(`[data-panel-active="true"]`);
    if (!active) return;
    const ro = new ResizeObserver(() => setHeight(active.offsetHeight));
    ro.observe(active);
    return () => ro.disconnect();
  }, [activeKey, children]);

  return (
    <div ref={ref} className={styles.panelWrap} style={{ height }}>
      {children}
    </div>
  );
}

export function Panel({
  active,
  id,
  labelledBy,
  children,
}: {
  active: boolean;
  id: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role={labelledBy ? "tabpanel" : undefined}
      aria-labelledby={labelledBy}
      data-panel-active={active}
      className={`${styles.panel} ${active ? styles.panelActive : styles.panelInactive}`}
      // inert would be ideal but is not in this React version's JSX types
      aria-hidden={!active || undefined}
    >
      {children}
    </div>
  );
}

export { styles as authStyles };
