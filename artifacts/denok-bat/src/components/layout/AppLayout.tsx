import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useEffect } from "react";
import { useHealthCheck } from "@workspace/api-client-react";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { AlertCircle } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isDemoMode = useStore(s => s.isDemoMode);
  const setDemoMode = useStore(s => s.setDemoMode);
  const { t } = useTranslation();
  const healthQuery = useHealthCheck({
    query: {
      retry: false,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    },
  });

  useEffect(() => {
    if (healthQuery.isSuccess) {
      setDemoMode(false);
      return;
    }
    if (healthQuery.isError) {
      setDemoMode(true);
    }
  }, [healthQuery.isSuccess, healthQuery.isError, setDemoMode]);

  return (
    <div className="min-h-screen flex flex-col">
      {isDemoMode && (
        <div className="bg-secondary text-secondary-foreground px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {t('demo.banner')}
        </div>
      )}
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
