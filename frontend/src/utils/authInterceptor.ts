// @ts-nocheck
import { urlbackend } from "../config.js";
import { supabase } from "./supabaseClient";

// Public routes where a 401 should NOT bounce the user to /login (avoids loops
// and lets public pages handle their own auth-less state).
const PUBLIC_EXACT = ["/", "/login", "/signup", "/reset-password", "/auth/callback", "/notfound", "/oldlanding", "/altlanding", "/altlanding3"];
const PUBLIC_PREFIXES = ["/v/"]; // public presentation viewer

function isPublicPath(path) {
  return PUBLIC_EXACT.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

let redirecting = false;

async function forceLogin() {
  if (redirecting) return;
  redirecting = true;
  try {
    localStorage.removeItem("token");
    // Clear the expired Supabase session too, so getAuthToken() stops handing
    // back the stale access_token on the next page.
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
  } finally {
    const path = window.location.pathname;
    if (!isPublicPath(path)) {
      window.location.href = "/login";
    } else {
      redirecting = false;
    }
  }
}

// Wrap window.fetch ONCE so any 401 from our backend logs the user out and
// sends them back to the login page — without touching the 69 call sites.
let installed = false;

export function installAuthInterceptor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Keep localStorage["token"] in sync with the live Supabase session. The 50+
  // call sites read this key directly; a Supabase access_token only lives 1h
  // and is refreshed internally, so without this the stored token goes stale
  // and every save silently 401s. onAuthStateChange fires on SIGNED_IN,
  // TOKEN_REFRESHED and INITIAL_SESSION — refreshing the stored token each time.
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      // When a password login is in progress it deliberately calls signOut() to
      // drop any leftover Google session. Don't let that SIGNED_OUT wipe the
      // freshly-stored backend token.
      if (event === "SIGNED_OUT" && (window as any).__suppressSupabaseSignout) return;
      if (session?.access_token) {
        localStorage.setItem("token", session.access_token);
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("token");
      }
    });
    // Also sync once on startup in case the listener missed the initial session.
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.access_token) {
        localStorage.setItem("token", data.session.access_token);
      }
    }).catch(() => { /* ignore */ });
  } catch { /* ignore */ }

  const originalFetch = window.fetch.bind(window);

  const urlOf = (input) =>
    typeof input === "string" ? input :
    input instanceof URL ? input.href :
    (input?.url || "");

  // Swap the Bearer token in a request's headers with a fresh one.
  function withToken(input, init, token) {
    const headers = new Headers((init && init.headers) || (input instanceof Request ? input.headers : undefined));
    headers.set("Authorization", `Bearer ${token}`);
    return [input instanceof Request ? new Request(input, { headers }) : input,
            input instanceof Request ? init : { ...init, headers }];
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let res = await originalFetch(input, init);

    try {
      const url = urlOf(input);
      const isBackend = url && url.startsWith(urlbackend);

      // A 401 from our backend usually means the stored access_token expired
      // while Supabase rotated it. Try to refresh the session and retry ONCE
      // before giving up — so saves don't silently fail and the user isn't
      // bounced to login for a token that can be renewed.
      if (res.status === 401 && isBackend) {
        const { data } = await supabase.auth.getSession();
        let token = data?.session?.access_token || null;
        if (!token) {
          const refreshed = await supabase.auth.refreshSession();
          token = refreshed?.data?.session?.access_token || null;
        }
        if (token) {
          localStorage.setItem("token", token);
          const [retryInput, retryInit] = withToken(input, init, token);
          res = await originalFetch(retryInput, retryInit);
        }
        // Still unauthorized after a real refresh attempt → session is dead.
        if (res.status === 401) forceLogin();
      }
    } catch {
      // never let interceptor bookkeeping break a real request
    }

    return res;
  };
}

export default installAuthInterceptor;
