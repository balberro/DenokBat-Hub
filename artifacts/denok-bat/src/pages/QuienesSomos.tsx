import { useTranslation } from "@/i18n/translations";
import { Users, Heart, Star, Clock } from "lucide-react";

export default function QuienesSomos() {
  const { t } = useTranslation();

  const equipo = [
    { nombre: "María Etxebarria", cargo: "Presidenta", cargoEu: "Presidentea" },
    { nombre: "Jose Aguirre", cargo: "Vicepresidente", cargoEu: "Presidenteordea" },
    { nombre: "Ana Goikoetxea", cargo: "Secretaria", cargoEu: "Idazkaria" },
    { nombre: "Luis Zabala", cargo: "Tesorero", cargoEu: "Diruzaina" },
  ];

  const hitos = [
    { year: "1985", texto: "Fundación de Denok Bat", textoEu: "Denok Bat-en sorrera" },
    { year: "1992", texto: "Primera sede propia", textoEu: "Lehen egoitza propioa" },
    { year: "2005", texto: "500 socios activos", textoEu: "500 bazkide aktibo" },
    { year: "2015", texto: "Ampliación de servicios digitales", textoEu: "Zerbitzu digitalen hedapena" },
    { year: "2024", texto: "Más de 1.200 socios", textoEu: "1.200 bazkide baino gehiago" },
  ];

  return (
    <div className="pb-20">
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold mb-6 text-foreground">
            {t("nav.about")}
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Denok Bat es una asociación de jubilados y jubiladas del País Vasco comprometida con el bienestar, la vida activa y la participación social de las personas mayores.
          </p>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Users, title: "Comunidad", titleEu: "Komunitatea", desc: "Una gran familia de más de 1.200 socios unidos por la experiencia y el entusiasmo de vivir.", descEu: "1.200 bazkidetik gorako familia handi bat, esperientziak eta bizitzeko gogoak batua." },
            { icon: Heart, title: "Bienestar", titleEu: "Ongizatea", desc: "Actividades, servicios y programas diseñados para promover la salud física y mental.", descEu: "Osasun fisiko eta mentala sustatzeko diseinatutako jarduerak, zerbitzuak eta programak." },
            { icon: Star, title: "Participación", titleEu: "Parte-hartzea", desc: "Fomentamos la implicación activa de todos los socios en la vida de la asociación.", descEu: "Bazkide guztien elkarteko bizitzan inplikazio aktiboa sustatzen dugu." },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-3xl p-8 border border-border shadow-sm text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <item.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            Nuestra historia
          </h2>
          <div className="relative border-l-4 border-primary/30 pl-8 space-y-8">
            {hitos.map((hito, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-11 w-6 h-6 bg-primary rounded-full border-4 border-background" />
                <span className="text-sm font-bold text-secondary">{hito.year}</span>
                <p className="text-lg font-semibold text-foreground">{hito.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Junta Directiva</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {equipo.map((miembro, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-border text-center shadow-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-primary">{miembro.nombre[0]}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground">{miembro.nombre}</h3>
              <p className="text-sm text-muted-foreground">{miembro.cargo}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
