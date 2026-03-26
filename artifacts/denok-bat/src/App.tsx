import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppLayout } from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Activities from "@/pages/Activities";
import Services from "@/pages/Services";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import QuienesSomos from "@/pages/QuienesSomos";
import Eventos from "@/pages/Eventos";
import Divulgacion from "@/pages/Divulgacion";
import Contacto from "@/pages/Contacto";
import Sugerencias from "@/pages/Sugerencias";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quienes-somos" component={QuienesSomos} />
      <Route path="/actividades" component={Activities} />
      <Route path="/eventos" component={Eventos} />
      <Route path="/divulgacion" component={Divulgacion} />
      <Route path="/servicios" component={Services} />
      <Route path="/sugerencias" component={Sugerencias} />
      <Route path="/contacto" component={Contacto} />
      <Route path="/login" component={Login} />
      <Route path="/panel" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppLayout>
            <Router />
          </AppLayout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
