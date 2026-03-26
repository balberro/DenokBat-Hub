import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { useStore } from "@/store/use-store";
import { useTranslation } from "@/i18n/translations";
import { AlertCircle } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isDemoMode = useStore(s => s.isDemoMode);
  const { t } = useTranslation();

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
