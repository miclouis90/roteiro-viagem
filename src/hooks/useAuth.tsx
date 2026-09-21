import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, demoMode } from "../lib/firebase";
interface Session {
  user: User | null;
  admin: boolean;
  loading: boolean;
  error: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  demoAdmin: boolean;
  toggleDemo: () => void;
}
const Context = createContext<Session>(null!);
export const useAuth = () => useContext(Context);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(!demoMode && !!auth);
  const [error, setError] = useState("");
  const [demoAdmin, setDemoAdmin] = useState(false);
  useEffect(() => {
    if (!auth) return;
    let stopAdmin = () => {};
    const stop = onAuthStateChanged(auth, (u) => {
      stopAdmin();
      setUser(u);
      setAdmin(false);
      setError("");
      if (u?.email && u.emailVerified && db) {
        setLoading(true);
        stopAdmin = onSnapshot(
          doc(db, "admins", u.email.toLowerCase()),
          (s) => {
            setAdmin(s.exists() && s.data().enabled === true);
            setLoading(false);
          },
          () => {
            setLoading(false);
            setError("Não foi possível verificar a permissão administrativa.");
          },
        );
      } else setLoading(false);
    });
    return () => {
      stop();
      stopAdmin();
    };
  }, []);
  return (
    <Context.Provider
      value={{
        user,
        admin: demoMode ? demoAdmin : admin,
        loading,
        error,
        demoAdmin,
        toggleDemo: () => setDemoAdmin((v) => !v),
        login: async () => {
          if (!auth) throw new Error("Configure o Firebase para entrar.");
          await signInWithPopup(auth, new GoogleAuthProvider());
        },
        logout: async () => {
          if (auth) await signOut(auth);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
