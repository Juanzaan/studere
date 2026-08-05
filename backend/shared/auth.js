/**
 * Authentication helper for Studere Azure Functions.
 *
 * All AI endpoints are protected with Clerk session tokens (Bearer) because
 * the Function App uses `authLevel: anonymous`. Without server-side token
 * verification, anyone could call GenerateStudySession / TranscribeAudio /
 * StudeChat / uploads and consume Azure OpenAI credits (cost-abuse vector).
 *
 * Mode:
 * - If CLERK_SECRET_KEY is set: every request MUST carry a valid Clerk
 *   session token ("Authorization: Bearer <token>") or it is rejected
 *   with 401.
 * - If CLERK_SECRET_KEY is NOT set (local development): requests are allowed
 *   in dev mode and a warning is logged. Remember to configure the key in the
 *   Azure Function App settings for production.
 */

const { createClerkClient, verifyToken } = require("@clerk/backend");

const secretKey = process.env.CLERK_SECRET_KEY || "";
const clerk = secretKey ? createClerkClient({ secretKey }) : null;

if (!clerk) {
  console.warn("[auth] CLERK_SECRET_KEY is not set — authentication is DISABLED (dev mode). Set it in the Azure Function App settings in production.");
}

/**
 * Extract and verify the Clerk session token from the request.
 *
 * @param {object} req - Azure Functions HTTP request object
 * @returns {Promise<{ok: boolean, userId?: string, status?: number, error?: string}>}
 */
async function authenticate(req) {
  if (!clerk) {
    return { ok: true, userId: null };
  }

  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required. Include 'Authorization: Bearer <session token>'.",
    };
  }

  try {
    // verifyToken validates the session JWT against the Clerk JWKS and
    // returns the session claims (userId is in `sub`).
    const claims = await verifyToken(token, { secretKey });
    return { ok: true, userId: claims.sub || claims.userId || null };
  } catch (err) {
    return { ok: false, status: 401, error: "Invalid or expired session token." };
  }
}

module.exports = { authenticate };
