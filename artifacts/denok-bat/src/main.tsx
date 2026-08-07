import { createRoot } from "react-dom/client";
import App from "./App";
import { installAuthInterceptor } from "./lib/auth-interceptor";
import "./index.css";

// Intercepta respuestas 401 de la API para cerrar sesión automáticamente
// (ver lib/auth-interceptor.ts). Debe instalarse antes de renderizar.
installAuthInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
