import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import { Phone, Mail, Search } from "lucide-react";

const API = "/api";

type SocioRow = {
  id: number;
  nombre: string | null;
  apellidos: string | null;
  poblacion: string | null;
  email: string | null;
  telefono: string | null;
  dni: string | null;
  genero: string | null;
  estado: string | null;
  grupo_id: number | null;
};

type GrupoRow = {
  id: number;
  nombre: string;
  nombre_eu: string | null;
  poblaciones: string[];
};

export default function MiGrupo() {
  const { t, lang } = useTranslation();
  const token = useStore((s) => s.token);
  const tt = (es: string, eu: string) => (lang === "eu" ? eu : es);

  const [search, setSearch] = useState("");
  const [grupos, setGrupos] = useState<GrupoRow[]>([]);
  const [socios, setSocios] = useState<SocioRow[]>([]);
  const [razon, setRazon] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`${API}/socios/mi-grupo`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(String(d?.error ?? `HTTP ${r.status}`));
        }
        if (cancelled) return;
        setGrupos(Array.isArray(d?.grupos) ? d.grupos : []);
        setSocios(Array.isArray(d?.socios) ? d.socios : []);
        setRazon(typeof d?.razon === "string" ? d.razon : null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : tt("Error", "Errorea"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, lang]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return socios;
    return socios.filter((s) => {
      const nombre = `${s.apellidos ?? ""} ${s.nombre ?? ""}`.toLowerCase();
      return (
        nombre.includes(q) ||
        (s.dni ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.telefono ?? "").toLowerCase().includes(q) ||
        (s.poblacion ?? "").toLowerCase().includes(q)
      );
    });
  }, [socios, search]);

  const sociosPorPoblacion = useMemo(() => {
    const map: Record<string, SocioRow[]> = {};
    for (const s of filtered) {
      const key = (s.poblacion ?? "").trim() || tt("Sin población", "Herririk gabe");
      (map[key] ||= []).push(s);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [filtered, lang]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("grupo.title")}</h1>
          {grupos.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {grupos
                .map((g) => (lang === "eu" ? g.nombre_eu || g.nombre : g.nombre))
                .join(" · ")}
            </p>
          )}
        </div>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {socios.length} {t("grupo.members")}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{tt("Cargando…", "Kargatzen…")}</p>
      ) : grupos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-6 space-y-2">
          {razon === "usuario_sin_socio" ? (
            <>
              <p className="text-sm text-foreground font-medium">
                {tt(
                  "Tu usuario web no está vinculado a una ficha de socio.",
                  "Zure web erabiltzailea ez dago bazkide fitxa bati lotuta.",
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {tt(
                  'Pide a un administrador que te vincule en "Gestión de socios → Vincular usuarios". Si tu email coincide con el de la ficha de socio, prueba a recargar para autocompletar el vínculo.',
                  '"Bazkideen kudeaketa → Erabiltzaileak lotu" atalean lotu zaitzala eskatu administratzaileari. Zure emaila bazkide fitxako emailarekin bat badator, saiatu birkargatzen lotura osatzeko.',
                )}
              </p>
            </>
          ) : razon === "no_es_delegado" ? (
            <p className="text-sm text-muted-foreground">
              {tt(
                "Tu ficha de socio existe pero no estás asignado como delegado/a de ningún grupo. Si crees que es un error, contacta con la directiva.",
                "Zure bazkide fitxa badago, baina ez zaude inongo taldeko ordezkari gisa esleituta. Errore bat dela uste baduzu, jarri harremanetan zuzendaritzarekin.",
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {tt(
                "No estás asignado como delegado/a de ningún grupo. Si crees que es un error, contacta con la directiva.",
                "Ez zaude inongo taldeko ordezkari gisa esleituta. Errore bat dela uste baduzu, jarri harremanetan zuzendaritzarekin.",
              )}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          {socios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tt("Aún no hay socios en tu grupo.", "Oraindik ez dago bazkiderik zure taldean.")}
            </p>
          ) : sociosPorPoblacion.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tt("Ningún socio coincide con la búsqueda.", "Bilaketarekin bat datorren bazkiderik ez.")}
            </p>
          ) : (
            <div className="space-y-6">
              {sociosPorPoblacion.map(([poblacion, lista]) => (
                <div key={poblacion} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                    <p className="font-semibold text-foreground">{poblacion}</p>
                    <span className="text-xs text-muted-foreground">
                      {lista.length} {t("grupo.members")}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {lista.map((s) => (
                      <li key={s.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {`${s.apellidos ?? ""} ${s.nombre ?? ""}`.trim() || `#${s.id}`}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            {s.dni ? <span>{s.dni}</span> : null}
                            {s.telefono ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {s.telefono}
                              </span>
                            ) : null}
                            {s.email ? (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {s.email}
                              </span>
                            ) : null}
                            {s.estado ? (
                              <span className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground/70">
                                {s.estado}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
