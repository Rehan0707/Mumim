export type DemoSession = {
  authenticated: boolean;
  accessToken?: string;
  email: string;
  phone?: string;
  role: "owner" | "manager";
  shopName: string;
  grantedAt: string;
};

const SESSION_KEY = "munim.demo_session.v1";

export function loadSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function saveSession(session: DemoSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAccessToken(): string | null {
  const session = loadSession();
  return session?.accessToken || null;
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
