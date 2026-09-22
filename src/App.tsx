import { useRef, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Compass,
  LogIn,
  LogOut,
  Plus,
  ChevronDown,
  UserRound,
} from "lucide-react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider, useToast } from "./hooks/useToast";
import { Home } from "./pages/Home";
import { TripPage } from "./pages/TripPage";
import { SeedMelPage } from "./pages/SeedMelPage";
import { TripForm } from "./components/Forms";

import { demoMode, configured } from "./lib/firebase";
function Shell() {
  const { user, admin, loading, error, login, logout, toggleDemo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [create, setCreate] = useState(false);

  const location = useLocation();
  const inTrip = /^\/viagem\/[^/]+$/.test(location.pathname);
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Rumo, suas viagens">
            <Compass size={29} strokeWidth={1.7} />
            rumo<span>.</span>
          </Link>
          <div className="account">
            {admin && (
              <button
                className="ghost new-trip"
                aria-label={inTrip ? "Adicionar" : "Criar viagem"}
                onClick={() => {
                  if (inTrip) {
                    const next = new URLSearchParams(location.search);
                    next.set("action", "add");
                    navigate(`${location.pathname}?${next}`);
                  } else setCreate(true);
                }}
              >
                <Plus size={18} />
                <span>{inTrip ? "Adicionar" : "Viagem"}</span>
              </button>
            )}
            {!loading &&
              (demoMode ? (
                <button className="ghost" onClick={toggleDemo}>
                  {admin ? "Ver como visitante" : "Testar administração"}
                </button>
              ) : user ? (
                <details
                  className="context-menu account-menu"
                  ref={menu}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && menu.current) {
                      menu.current.open = false;
                      menu.current.querySelector("summary")?.focus();
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget))
                      e.currentTarget.open = false;
                  }}
                >
                  <summary>
                    <span className="avatar">
                      {user.displayName?.charAt(0) || <UserRound size={18} />}
                    </span>
                    <span className="user-name">
                      {user.displayName?.split(" ")[0] || "Minha conta"}
                    </span>
                    <ChevronDown size={15} />
                  </summary>
                  <div className="menu-popover">
                    <p>{user.email}</p>
                    <button
                      onClick={() =>
                        logout().catch(() => toast("Não foi possível sair."))
                      }
                    >
                      <LogOut size={17} />
                      Sair
                    </button>
                  </div>
                </details>
              ) : (
                <button
                  className="secondary"
                  disabled={!configured}
                  onClick={() =>
                    login().catch(() =>
                      toast(
                        "Não foi possível entrar. Confira os domínios autorizados e tente novamente.",
                      ),
                    )
                  }
                >
                  <LogIn size={17} />
                  <span>Entrar com Google</span>
                </button>
              ))}
          </div>
        </div>
      </header>
      {demoMode && (
        <div className="demo-banner">
          Demonstração · seus testes ficam neste navegador
        </div>
      )}
      {!demoMode && !configured && (
        <div className="setup-banner" role="alert">
          Configure o Firebase no arquivo .env para começar. Consulte o README.
        </div>
      )}
      {error && (
        <div className="setup-banner" role="alert">
          {error}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home onCreate={() => setCreate(true)} />} />
        <Route path="/viagem/:id" element={<TripPage />} />
        <Route path="/admin/seed-mel" element={<SeedMelPage />} />
        <Route
          path="*"
          element={
            <main className="empty-state">
              <h1>Página não encontrada</h1>
              <Link to="/">Voltar às viagens</Link>
            </main>
          }
        />
      </Routes>
      {create && admin && (
        <TripForm
          onClose={() => setCreate(false)}
          onSaved={(id) => {
            setCreate(false);
            navigate(`/viagem/${id}`);
          }}
        />
      )}
      <footer className="site-footer">
        <span>rumo.</span> Feito para viver o caminho.
      </footer>
    </>
  );
}
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
