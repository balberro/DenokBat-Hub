import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAppActividades, useAppEventos } from "@/hooks/use-app-api";
import { format } from "date-fns";

type UpcomingCard = {
  id: string;
  tipo: "evento" | "actividad";
  titulo: string;
  descripcion: string;
  fecha: Date | null;
  estado: string;
  href: string;
};

export default function Home() {
  const { t, tb, lang } = useTranslation();
  const [carouselStart, setCarouselStart] = useState(0);
  const [heroTitle, setHeroTitle] = useState<string>("");
  const [heroSubtitle, setHeroSubtitle] = useState<string>("");
  const [heroSubtitleEu, setHeroSubtitleEu] = useState<string>("");
  const defaultHeroImage = "/uploads/galeria/evento-2026-03-28-dia-de-denok-bat/foto-1776156698765-698ebcc7-5d38-4d26-a714-d8e3c3dd4018.jpg";
  const [heroImage, setHeroImage] = useState<string>(defaultHeroImage);
  const { data: eventosData } = useAppEventos();
  const { data: actividadesData } = useAppActividades();

  useEffect(() => {
    let active = true;
    const loadPublicConfig = async () => {
      try {
        const r = await fetch("/api/config/public");
        const d = await r.json();
        if (!active || !r.ok) return;
        const title = String(d?.["home.hero_title"] ?? "").trim();
        const subtitle = String(d?.["home.hero_subtitle"] ?? "").trim();
        const subtitleEu = String(d?.["home.hero_subtitle_eu"] ?? "").trim();
        const image = String(d?.["home.hero_image"] ?? "").trim();
        if (title) setHeroTitle(title);
        if (subtitle) setHeroSubtitle(subtitle);
        if (subtitleEu) setHeroSubtitleEu(subtitleEu);
        if (image) setHeroImage(image);
      } catch {
        // keep defaults from i18n/static
      }
    };
    loadPublicConfig();
    return () => { active = false; };
  }, []);

  const upcoming = useMemo<UpcomingCard[]>(() => {
    const now = new Date();
    const eventoItems: UpcomingCard[] = (eventosData?.items ?? [])
      .map((e: any) => {
        const fecha = e?.fechaInicio ? new Date(String(e.fechaInicio)) : null;
        return {
          id: `evento-${e.id}`,
          tipo: "evento" as const,
          titulo: tb(e, "nombre"),
          descripcion: tb(e, "descripcion") || "",
          fecha,
          estado: String(e?.estado ?? ""),
          href: "/eventos",
        };
      })
      .filter((e) => {
        if (e.fecha && e.fecha >= now) return true;
        return ["proxima", "prevista", "publicado"].includes(e.estado.toLowerCase());
      });

    const actividadItems: UpcomingCard[] = (actividadesData?.items ?? [])
      .map((a: any) => ({
        id: `actividad-${a.id}`,
        tipo: "actividad" as const,
        titulo: tb(a, "nombre"),
        descripcion: tb(a, "descripcion") || "",
        fecha: null,
        estado: String(a?.estado ?? ""),
        href: "/actividades",
      }))
      .filter((a) => ["disponible", "proxima", "prevista"].includes(a.estado.toLowerCase()));

    return [...eventoItems, ...actividadItems].sort((a, b) => {
      const at = a.fecha ? a.fecha.getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.fecha ? b.fecha.getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
  }, [actividadesData?.items, eventosData?.items, tb]);

  const visibleCards = upcoming.slice(carouselStart, carouselStart + 3);
  const canPrev = carouselStart > 0;
  const canNext = carouselStart + 3 < upcoming.length;

  return (
    <div className="pb-20">
      <section className="relative pt-16 min-h-[52vh] md:min-h-[58vh] bg-primary overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[80%]">
          <img
            src={heroImage || defaultHeroImage}
            alt="Portada Denok Bat"
            onError={() => setHeroImage(defaultHeroImage)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[52vh] md:min-h-[58vh] flex items-center justify-center text-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
              {heroTitle || t('home.hero_title')}
            </h1>
            <h3 className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto">
              {lang === "eu"
                ? (heroSubtitleEu || heroSubtitle || t('home.hero_subtitle'))
                : (heroSubtitle || t('home.hero_subtitle'))}
            </h3>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap lg:grid lg:grid-cols-[280px_1fr] lg:items-center gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {t("home.upcoming_events_activities")}
            </h2>
            {upcoming.length > 3 && (
              <p className="text-sm text-muted-foreground">
                {carouselStart + 1} – {Math.min(carouselStart + 3, upcoming.length)} / {upcoming.length}
              </p>
            )}
          </div>

          {upcoming.length > 3 ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-full bg-white"
                disabled={!canPrev}
                onClick={() => setCarouselStart((p) => Math.max(0, p - 1))}
                aria-label={t("common.previous")}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>

              <div className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-6">
                {visibleCards.map((item) => (
                  <Link key={item.id} href={item.href}>
                    <div className="bg-white rounded-2xl border border-border p-5 h-full hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.tipo === "evento"
                            ? (item.fecha ? format(item.fecha, "dd/MM/yyyy") : "Próximo")
                            : (t("nav.activities"))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.tipo === "evento" ? t("nav.events") : t("nav.activities")}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2">{item.titulo}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">{item.descripcion || "-"}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-full bg-white"
                disabled={!canNext}
                onClick={() => setCarouselStart((p) => Math.min(Math.max(0, upcoming.length - 3), p + 1))}
                aria-label={t("common.next")}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visibleCards.map((item) => (
                <Link key={item.id} href={item.href}>
                  <div className="bg-white rounded-2xl border border-border p-5 h-full hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.tipo === "evento"
                          ? (item.fecha ? format(item.fecha, "dd/MM/yyyy") : "Próximo")
                          : (t("nav.activities"))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.tipo === "evento" ? t("nav.events") : t("nav.activities")}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground line-clamp-2 mb-2">{item.titulo}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{item.descripcion || "-"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
