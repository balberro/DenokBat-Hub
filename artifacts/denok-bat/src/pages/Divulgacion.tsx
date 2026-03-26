import { useTranslation } from "@/i18n/translations";
import { Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppNoticias } from "@/hooks/use-app-api";

export default function Divulgacion() {
  const { t, tb } = useTranslation();
  const { data, isLoading } = useAppNoticias();
  const noticias = data?.items ?? [];

  return (
    <div className="pb-20">
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold mb-4 text-foreground">{t("nav.news")}</h1>
          <p className="text-xl text-muted-foreground">Noticias, comunicados y artículos de la asociación</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {noticias.map((noticia) => (
              <article key={noticia.id} className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="h-48 bg-primary/10 flex items-center justify-center">
                  <span className="text-6xl">📰</span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  {noticia.categoria && (
                    <span className="inline-block px-3 py-1 bg-accent text-accent-foreground rounded-full text-xs font-bold mb-3">
                      {noticia.categoria}
                    </span>
                  )}
                  <h2 className="text-xl font-bold text-foreground mb-2 line-clamp-2">{tb(noticia, "titulo")}</h2>
                  {tb(noticia, "resumen") && (
                    <p className="text-muted-foreground text-sm line-clamp-3 flex-1">{tb(noticia, "resumen")}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(noticia.fecha).toLocaleDateString("es-ES")}
                    </span>
                    {noticia.autor && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {noticia.autor}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 rounded-xl w-full">
                    {t("common.read_more")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
