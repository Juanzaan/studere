import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

/**
 * Clerk surfaces English error strings. The UI is es-AR, so map the codes we
 * can actually hit to Spanish and fall back to Clerk's own longMessage for
 * anything unmapped (better a correct English message than a wrong Spanish one).
 */
const MESSAGES: Record<string, string> = {
  form_identifier_exists: "Ese email ya tiene una cuenta. Probá iniciar sesión.",
  form_identifier_not_found: "No encontramos una cuenta con ese email.",
  form_password_incorrect: "Email o contraseña incorrectos.",
  form_password_pwned:
    "Esa contraseña apareció en una filtración conocida. Elegí otra.",
  form_password_length_too_short: "La contraseña es corta: usá al menos 8 caracteres.",
  form_password_not_strong_enough: "Esa contraseña es débil. Agregá números o símbolos.",
  form_param_format_invalid: "Ese email no se ve válido. Probá de nuevo.",
  form_param_nil: "Faltan datos para continuar.",
  form_code_incorrect: "Ese código no es correcto. Revisalo y probá de nuevo.",
  verification_expired: "El código venció. Pedí uno nuevo.",
  verification_failed: "No pudimos verificar el código. Pedí uno nuevo.",
  too_many_requests: "Demasiados intentos. Esperá un momento y probá otra vez.",
  session_exists: "Ya tenés una sesión abierta.",
  captcha_invalid: "No pudimos verificar que seas humano. Recargá la página.",
  form_identifier_not_allowed: "Ese email no está habilitado para registrarse.",
};

const FALLBACK = "Algo salió mal. Probá de nuevo en un momento.";

/** Turn an unknown thrown value into a message safe to show the user. */
export function authErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors?.[0];
    if (!first) return FALLBACK;
    return MESSAGES[first.code] ?? first.longMessage ?? first.message ?? FALLBACK;
  }
  return FALLBACK;
}
