import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { Compass, LogIn, LogOut } from "lucide-react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider, useToast } from "./hooks/useToast";
import { Home } from "./pages/Home";
import { TripPage } from "./pages/TripPage";
import { demoMode, configured } from "./lib/firebase";
function Shell() {
  const { user, admin, loading, error, login, logout, toggleDemo } = useAuth();
  const toast = useToast();
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          <span>
            <Compass size={24} />
          </span>
          rumo<span className="brand-dot">.</span>
        </Link>
        <span className="brand-caption">menos pressa, mais descobertas</span>
        <div className="account">
          {!loading && (
            <>
              {demoMode ? (
                <button className="secondary" onClick={toggleDemo}>
                  {admin ? "Ver como visitante" : "Testar administração"}
                </button>
              ) : user ? (
                <>
                  <span>
                    {admin ? "Administrador" : "Visitante"} ·{" "}
                    {user.displayName?.split(" ")[0]}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Sair"
                    onClick={() =>
                      logout().catch(() => toast("Não foi possível sair."))
                    }
                  >
                    <LogOut size={18} />
                  </button>
                </>
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
                  Entrar com Google
                </button>
              )}
            </>
          )}
        </div>
      </header>
      {demoMode && (
        <div className="demo-banner">
          Demonstração local · dados fictícios salvos apenas neste navegador
        </div>
      )}
      {!demoMode && !configured && (
        <div className="setup-banner" role="alert">
          Configure as variáveis do Firebase no arquivo .env. Para experimentar
          sem uma conta, use VITE_DEMO_MODE=true. Consulte o README.
        </div>
      )}
      {error && (
        <div className="setup-banner" role="alert">
          {error}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/viagem/:id" element={<TripPage />} />
        <Route
          path="*"
          element={
            <main className="empty">
              <h1>Página não encontrada</h1>
              <Link to="/">Voltar às viagens</Link>
            </main>
          }
        />
      </Routes>
      <footer>
        rumo. <span>O melhor da viagem é viver.</span>
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
