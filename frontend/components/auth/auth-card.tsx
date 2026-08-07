"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import {
  Field,
  Panel,
  PanelWrap,
  PasswordField,
  StatusMessage,
  SubmitButton,
  authStyles as styles,
} from "./auth-fields";
import { authErrorMessage } from "./auth-errors";

type Mode = "signup" | "login";
type Step = "form" | "verify" | "resetRequest" | "resetCode";
type Msg = { kind: "ok" | "err"; text: string } | null;

const AFTER_SIGN_UP = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/dashboard";
const AFTER_SIGN_IN = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/dashboard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Clerk's promises can hang indefinitely rather than reject: clerk-js waits for
 * a captcha token before it even sends the request, so an ad blocker or a
 * network that filters Cloudflare leaves the user staring at a spinner with no
 * message and no way to retry. Race every call against a deadline so a stuck
 * request surfaces as an actionable error instead.
 */
const CLERK_TIMEOUT_MS = 25_000;

class ClerkTimeoutError extends Error {
  constructor() {
    super("clerk request timed out");
    this.name = "ClerkTimeoutError";
  }
}

const TIMEOUT_MESSAGE =
  "El servicio de autenticación no respondió. Si usás un bloqueador de anuncios o una VPN, desactivalo para este sitio y probá de nuevo.";

function withTimeout<T>(promise: Promise<T>, ms = CLERK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ClerkTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function AuthCard({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("form");
  const [msg, setMsg] = useState<Msg>(null);
  // Which action is in flight. A single boolean put the spinner on the email
  // submit button even when the user had clicked "Continuar con Google".
  const [busyAction, setBusyAction] = useState<"form" | "google" | null>(null);
  const busy = busyAction !== null;
  const [invalid, setInvalid] = useState<string | null>(null);

  // form state
  const [name, setName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPass, setSuPass] = useState("");
  const [liEmail, setLiEmail] = useState("");
  const [liPass, setLiPass] = useState("");
  const [code, setCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPass, setNewPass] = useState("");

  const tabSignupRef = useRef<HTMLButtonElement>(null);
  const tabLoginRef = useRef<HTMLButtonElement>(null);

  const ready = signUpLoaded && signInLoaded;

  // Clear the transient invalid ring the way the prototype did.
  useEffect(() => {
    if (!invalid) return;
    const t = setTimeout(() => setInvalid(null), 800);
    return () => clearTimeout(t);
  }, [invalid]);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setStep("form");
    setMsg(null);
    setInvalid(null);
  }, []);

  const fail = useCallback((text: string, field?: string) => {
    setMsg({ kind: "err", text });
    if (field) setInvalid(field);
    setBusyAction(null);
  }, []);

  // A stuck request and a rejected one both land here; only the wording differs.
  const failWith = useCallback(
    (err: unknown, field?: string) => {
      if (err instanceof ClerkTimeoutError) return fail(TIMEOUT_MESSAGE);
      fail(authErrorMessage(err), field);
    },
    [fail],
  );

  /* ── Sign up ────────────────────────────────────────────────────────── */

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready || !signUp) return;
    setMsg(null);

    const email = suEmail.trim();
    if (!email) return fail("Necesitamos un email para crear la cuenta.", "suEmail");
    if (!EMAIL_RE.test(email)) return fail("Ese email no se ve válido. Probá de nuevo.", "suEmail");
    if (!suPass) return fail("Elegí una contraseña (mínimo 8 caracteres).", "suPass");
    if (suPass.length < 8) return fail("La contraseña es corta: usá al menos 8 caracteres.", "suPass");
    if (suPass.toLowerCase() === email.toLowerCase())
      return fail("La contraseña no puede ser igual al email.", "suPass");

    setBusyAction("form");
    try {
      const first = name.trim().split(" ")[0] || undefined;
      const res = await withTimeout(
        signUp.create({
          emailAddress: email,
          password: suPass,
          ...(first ? { firstName: first } : {}),
        }),
      );

      if (res.status === "complete") {
        await setSignUpActive({ session: res.createdSessionId });
        router.push(AFTER_SIGN_UP);
        return;
      }

      await withTimeout(
        signUp.prepareEmailAddressVerification({ strategy: "email_code" }),
      );
      setStep("verify");
      setMsg({ kind: "ok", text: `Te mandamos un código a ${email}.` });
    } catch (err) {
      failWith(err);
      return;
    }
    setBusyAction(null);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready || !signUp) return;
    if (code.trim().length < 6) return fail("Ingresá el código de 6 dígitos.", "code");

    setBusyAction("form");
    try {
      const res = await withTimeout(
        signUp.attemptEmailAddressVerification({ code: code.trim() }),
      );
      if (res.status === "complete") {
        await setSignUpActive({ session: res.createdSessionId });
        router.push(AFTER_SIGN_UP);
        return;
      }
      fail("No pudimos completar el registro. Probá de nuevo.");
    } catch (err) {
      failWith(err, "code");
    }
  }

  async function resendCode() {
    if (busy || !ready || !signUp) return;
    setBusyAction("form");
    try {
      await withTimeout(
        signUp.prepareEmailAddressVerification({ strategy: "email_code" }),
      );
      setMsg({ kind: "ok", text: "Listo, te mandamos otro código." });
    } catch (err) {
      failWith(err);
      return;
    }
    setBusyAction(null);
  }

  /* ── Sign in ────────────────────────────────────────────────────────── */

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready || !signIn) return;
    setMsg(null);

    const email = liEmail.trim();
    if (!email && !liPass) return fail("Ingresá tu email y contraseña para entrar.", "liEmail");
    if (!email) return fail("Falta el email.", "liEmail");
    if (!EMAIL_RE.test(email)) return fail("Ese email no se ve válido.", "liEmail");
    if (!liPass) return fail("Falta la contraseña.", "liPass");

    setBusyAction("form");
    try {
      const res = await withTimeout(
        signIn.create({ identifier: email, password: liPass }),
      );
      if (res.status === "complete") {
        await setSignInActive({ session: res.createdSessionId });
        router.push(AFTER_SIGN_IN);
        return;
      }
      fail("Necesitamos un paso más para entrar. Revisá tu email.");
    } catch (err) {
      failWith(err, "liPass");
    }
  }

  /* ── Password reset ─────────────────────────────────────────────────── */

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready || !signIn) return;
    const email = resetEmail.trim();
    if (!EMAIL_RE.test(email)) return fail("Ese email no se ve válido.", "resetEmail");

    setBusyAction("form");
    try {
      await withTimeout(
        signIn.create({ strategy: "reset_password_email_code", identifier: email }),
      );
      setStep("resetCode");
      setMsg({ kind: "ok", text: `Te mandamos un código a ${email}.` });
    } catch (err) {
      failWith(err, "resetEmail");
      return;
    }
    setBusyAction(null);
  }

  async function handleResetConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready || !signIn) return;
    if (code.trim().length < 6) return fail("Ingresá el código de 6 dígitos.", "code");
    if (newPass.length < 8) return fail("La contraseña nueva necesita al menos 8 caracteres.", "newPass");

    setBusyAction("form");
    try {
      const res = await withTimeout(
        signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code: code.trim(),
          password: newPass,
        }),
      );
      if (res.status === "complete") {
        await setSignInActive({ session: res.createdSessionId });
        router.push(AFTER_SIGN_IN);
        return;
      }
      fail("No pudimos cambiar la contraseña. Probá de nuevo.");
    } catch (err) {
      failWith(err, "code");
    }
  }

  /* ── Google OAuth ───────────────────────────────────────────────────── */

  async function handleGoogle() {
    if (busy || !ready) return;
    setBusyAction("google");
    try {
      const resource = mode === "signup" ? signUp : signIn;
      if (!resource) throw new Error("clerk not ready");
      await withTimeout(
        resource.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: mode === "signup" ? AFTER_SIGN_UP : AFTER_SIGN_IN,
        }),
      );
    } catch (err) {
      failWith(err);
    }
  }

  /* ── Tab keyboard handling (proper roving, unlike the prototype) ────── */

  function onTabKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next: Mode = mode === "signup" ? "login" : "signup";
    switchMode(next);
    (next === "signup" ? tabSignupRef : tabLoginRef).current?.focus();
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  const showTabs = step === "form";
  const activeKey = `${mode}:${step}`;

  return (
    <>
      {showTabs && (
        <div className={styles.tabs} role="tablist" aria-label="Crear cuenta o iniciar sesión">
          <button
            ref={tabSignupRef}
            type="button"
            role="tab"
            id="tab-signup"
            aria-selected={mode === "signup"}
            aria-controls="panel-signup"
            tabIndex={mode === "signup" ? 0 : -1}
            className={`${styles.tab} ${mode === "signup" ? styles.tabActive : ""}`}
            onClick={() => switchMode("signup")}
            onKeyDown={onTabKeyDown}
          >
            Crear cuenta
          </button>
          <button
            ref={tabLoginRef}
            type="button"
            role="tab"
            id="tab-login"
            aria-selected={mode === "login"}
            aria-controls="panel-login"
            tabIndex={mode === "login" ? 0 : -1}
            className={`${styles.tab} ${mode === "login" ? styles.tabActive : ""}`}
            onClick={() => switchMode("login")}
            onKeyDown={onTabKeyDown}
          >
            Iniciar sesión
          </button>
        </div>
      )}

      {msg && <StatusMessage kind={msg.kind} text={msg.text} />}

      <PanelWrap activeKey={activeKey}>
        {/* ── SIGN UP ── */}
        <Panel
          active={step === "form" && mode === "signup"}
          id="panel-signup"
          labelledBy="tab-signup"
        >
          <form onSubmit={handleSignUp} noValidate>
            <Field
              id="suName"
              label="Nombre"
              type="text"
              autoComplete="name"
              placeholder="Cómo te decimos"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              id="suEmail"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vos@universidad.edu"
              invalid={invalid === "suEmail"}
              value={suEmail}
              onChange={(e) => setSuEmail(e.target.value)}
            />
            <PasswordField
              id="suPass"
              label="Contraseña"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              invalid={invalid === "suPass"}
              value={suPass}
              onChange={(e) => setSuPass(e.target.value)}
            />
            {/* Clerk bot protection mounts here in custom flows. */}
            <div id="clerk-captcha" />
            <SubmitButton loading={busyAction === "form"} disabled={!ready || busy}>
              Empezar trial de 7 días →
            </SubmitButton>
            <p className={styles.trialNote}>Sin tarjeta para empezar · cancelás cuando quieras</p>
          </form>

          <div className={styles.divider}>o</div>
          <div className={styles.oauth}>
            <SubmitButton
              variant="ghost"
              type="button"
              onClick={handleGoogle}
              loading={busyAction === "google"}
              disabled={!ready || busy}
            >
              Continuar con Google
            </SubmitButton>
          </div>
          {/* No /legal route exists yet, so this stays plain text rather than
              shipping a link that 404s behind auth.protect(). */}
          <p className={styles.hint}>
            Al crear la cuenta aceptás los términos y la política de privacidad.
          </p>
        </Panel>

        {/* ── LOG IN ── */}
        <Panel
          active={step === "form" && mode === "login"}
          id="panel-login"
          labelledBy="tab-login"
        >
          <form onSubmit={handleSignIn} noValidate>
            <Field
              id="liEmail"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vos@universidad.edu"
              invalid={invalid === "liEmail"}
              value={liEmail}
              onChange={(e) => setLiEmail(e.target.value)}
            />
            <PasswordField
              id="liPass"
              label="Contraseña"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              invalid={invalid === "liPass"}
              value={liPass}
              onChange={(e) => setLiPass(e.target.value)}
            />
            <SubmitButton loading={busyAction === "form"} disabled={!ready || busy}>
              Entrar a Studere →
            </SubmitButton>
          </form>

          <div className={styles.divider}>o</div>
          <div className={styles.oauth}>
            <SubmitButton
              variant="ghost"
              type="button"
              onClick={handleGoogle}
              loading={busyAction === "google"}
              disabled={!ready || busy}
            >
              Continuar con Google
            </SubmitButton>
          </div>
          <p className={styles.hint}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setResetEmail(liEmail);
                setStep("resetRequest");
                setMsg(null);
              }}
            >
              ¿Olvidaste la contraseña?
            </button>
          </p>
        </Panel>

        {/* ── VERIFY EMAIL CODE ── */}
        <Panel active={step === "verify"} id="panel-verify">
          <h2 className={styles.stepTitle}>Confirmá tu email</h2>
          <p className={styles.stepCopy}>
            Pegá el código de 6 dígitos que te mandamos. Si no llega, revisá spam.
          </p>
          <form onSubmit={handleVerify} noValidate>
            <Field
              id="code"
              label="Código"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={styles.codeInput}
              invalid={invalid === "code"}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <SubmitButton loading={busy}>Confirmar y entrar →</SubmitButton>
          </form>
          <p className={styles.hint}>
            <button type="button" className={styles.linkButton} onClick={resendCode}>
              Reenviar código
            </button>
          </p>
          <p className={styles.hint}>
            <button
              type="button"
              className={styles.stepBack}
              onClick={() => {
                setStep("form");
                setCode("");
                setMsg(null);
              }}
            >
              ← Volver
            </button>
          </p>
        </Panel>

        {/* ── RESET: ask for email ── */}
        <Panel active={step === "resetRequest"} id="panel-reset-request">
          <h2 className={styles.stepTitle}>Recuperar contraseña</h2>
          <p className={styles.stepCopy}>
            Poné tu email y te mandamos un código para elegir una nueva.
          </p>
          <form onSubmit={handleResetRequest} noValidate>
            <Field
              id="resetEmail"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vos@universidad.edu"
              invalid={invalid === "resetEmail"}
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <SubmitButton loading={busy}>Mandame el código →</SubmitButton>
          </form>
          <p className={styles.hint}>
            <button
              type="button"
              className={styles.stepBack}
              onClick={() => {
                setStep("form");
                setMsg(null);
              }}
            >
              ← Volver
            </button>
          </p>
        </Panel>

        {/* ── RESET: code + new password ── */}
        <Panel active={step === "resetCode"} id="panel-reset-code">
          <h2 className={styles.stepTitle}>Nueva contraseña</h2>
          <p className={styles.stepCopy}>Ingresá el código que te llegó y elegí una contraseña nueva.</p>
          <form onSubmit={handleResetConfirm} noValidate>
            <Field
              id="resetCode"
              label="Código"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={styles.codeInput}
              invalid={invalid === "code"}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <PasswordField
              id="newPass"
              label="Contraseña nueva"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              invalid={invalid === "newPass"}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
            <SubmitButton loading={busy}>Guardar y entrar →</SubmitButton>
          </form>
          <p className={styles.hint}>
            <button
              type="button"
              className={styles.stepBack}
              onClick={() => {
                setStep("form");
                setCode("");
                setNewPass("");
                setMsg(null);
              }}
            >
              ← Volver
            </button>
          </p>
        </Panel>
      </PanelWrap>
    </>
  );
}
