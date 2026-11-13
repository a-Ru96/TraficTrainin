"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { levelOf, todayStr } from "@/lib/util";

export interface User { id: number; email: string; nickname: string }
interface Local { xp: number; streak: number; lastDay: string; known: Record<string, boolean>; best: Record<string, number> }
interface Snap { user: User; xp: number; streak: number; known: Record<string, boolean> }

const KEY = "levha-lab:v1";
const EMPTY: Local = { xp: 0, streak: 0, lastDay: "", known: {}, best: {} };

interface Ctx {
  ready: boolean;
  user: User | null;
  dbOn: boolean;
  xp: number;
  streak: number;
  level: number;
  levelInto: number;
  known: Record<string, boolean>;
  best: Record<string, number>;
  pops: { id: number; n: number }[];
  addXp: (n: number) => void;
  markCard: (id: string, known: boolean) => void;
  submitResult: (mode: string, score: number, total: number, xp: number) => void;
  setBest: (mode: string, v: number) => void;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, nickname: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<string | null>;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("AppProvider eksik");
  return c;
};

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Local>(EMPTY);
  const [user, setUser] = useState<User | null>(null);
  const [dbOn, setDbOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [pops, setPops] = useState<{ id: number; n: number }[]>([]);
  const popId = useRef(0);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const stateRef = useRef(state);
  stateRef.current = state;

  const applySnap = useCallback((s: Snap) => {
    setUser(s.user);
    setState((p) => ({ ...p, xp: s.xp, streak: s.streak, known: s.known }));
  }, []);

  // Initial load: localStorage + server session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {}
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setDbOn(!!d.db);
        if (d.snapshot) applySnap(d.snapshot);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [applySnap]);

  // Keep guest progress in the browser
  useEffect(() => {
    if (!ready || user) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state, ready, user]);

  const pushServer = useCallback(async (payload: Record<string, unknown>) => {
    try {
      const { ok, data } = await post("/api/progress", payload);
      if (ok && data.user) applySnap(data as Snap);
    } catch {}
  }, [applySnap]);

  const showPop = (n: number) => {
    const id = ++popId.current;
    setPops((p) => [...p, { id, n }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1300);
  };

  const bumpStreak = (p: Local): Local => {
    const t = todayStr();
    if (p.lastDay === t) return p;
    const y = new Date(Date.now() - 86400000).toLocaleDateString("sv");
    return { ...p, lastDay: t, streak: p.lastDay === y ? p.streak + 1 : 1 };
  };

  const addXp = useCallback((n: number) => {
    if (n <= 0) return;
    showPop(n);
    if (userRef.current) {
      setState((p) => ({ ...p, xp: p.xp + n }));
      pushServer({ xp: n });
    } else {
      setState((p) => bumpStreak({ ...p, xp: p.xp + n }));
    }
  }, [pushServer]);

  const markCard = useCallback((id: string, known: boolean) => {
    setState((p) => ({ ...p, known: { ...p.known, [id]: known } }));
    if (userRef.current) pushServer({ known: { [id]: known } });
  }, [pushServer]);

  const submitResult = useCallback((mode: string, score: number, total: number, xp: number) => {
    if (xp > 0) showPop(xp);
    if (userRef.current) {
      setState((p) => ({ ...p, xp: p.xp + xp }));
      pushServer({ xp, result: { mode, score, total } });
    } else {
      setState((p) => bumpStreak({ ...p, xp: p.xp + xp }));
    }
  }, [pushServer]);

  const setBest = useCallback((mode: string, v: number) => {
    setState((p) => (p.best[mode] && p.best[mode] <= v ? p : { ...p, best: { ...p.best, [mode]: v } }));
  }, []);

  const finishAuth = useCallback(async (snap: Snap) => {
    // Move guest progress into the account
    const local = stateRef.current;
    const hasLocal = local.xp > 0 || Object.keys(local.known).length > 0;
    if (hasLocal) {
      const { ok, data } = await post("/api/progress", { merge: true, xp: local.xp, known: local.known });
      if (ok && data.user) snap = data as Snap;
      try { localStorage.removeItem(KEY); } catch {}
    }
    applySnap(snap);
  }, [applySnap]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { ok, data } = await post("/api/auth/login", { email, password });
      if (!ok) return (data.error as string) || "Could not log in.";
      await finishAuth(data as Snap);
      return null;
    } catch { return "Connection error."; }
  }, [finishAuth]);

  const register = useCallback(async (email: string, nickname: string, password: string) => {
    try {
      const { ok, data } = await post("/api/auth/register", { email, nickname, password });
      if (!ok) return (data.error as string) || "Could not sign up.";
      await finishAuth(data as Snap);
      return null;
    } catch { return "Connection error."; }
  }, [finishAuth]);

  const logout = useCallback(async () => {
    try { await post("/api/auth/logout", {}); } catch {}
    try { localStorage.removeItem(KEY); } catch {}
    setUser(null);
    setState(EMPTY);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    try {
      const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return (data.error as string) || "Could not delete the account.";
      try { localStorage.removeItem(KEY); } catch {}
      setUser(null);
      setState(EMPTY);
      return null;
    } catch { return "Connection error."; }
  }, []);

  const { level, into } = levelOf(state.xp);
  const value: Ctx = {
    ready, user, dbOn, xp: state.xp, streak: state.streak, level, levelInto: into,
    known: state.known, best: state.best, pops,
    addXp, markCard, submitResult, setBest, login, register, logout, deleteAccount,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
