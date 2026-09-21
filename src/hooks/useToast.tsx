import { createContext, useContext, useState, type ReactNode } from "react";
const Context = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(Context);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  return (
    <Context.Provider value={setMessage}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Fechar mensagem">
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
