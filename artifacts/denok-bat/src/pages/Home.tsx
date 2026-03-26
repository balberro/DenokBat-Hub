import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Calendar, Heart, Users, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useAppEventos, useAppNoticias } from "@/hooks/use-app-api";
import { format } from "date-fns";

export default function Home() {
  const { t, tb } = useTranslation();
  const { data: eventosData } = useAppEventos();
  const { data: noticiasData } = useAppNoticias();

  const eventos = eventosData?.items?.slice(0, 3) || [];
  const noticias = noticiasData?.items?.slice(0, 3) || [];

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-seniors.png`}
            alt="Seniors enjoying life" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-accent text-accent-foreground font-semibold tracking-wide text-sm">
            Asociación de Jubilados del País Vasco
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 leading-tight text-balance mx-auto max-w-4xl">
            {t('home.hero_title')}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance">
            {t('home.hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/actividades">
              <Button size="lg" className="w-full sm:w-auto text-lg rounded-full px-8">
                {t('nav.activities')}
              </Button>
            </Link>
            <Link href="/quienes-somos">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg rounded-full px-8 bg-white/50 backdrop-blur">
                {t('nav.about')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: 'nav.activities', color: 'bg-primary/10 text-primary', href: '/actividades' },
            { icon: Calendar, title: 'nav.events', color: 'bg-secondary/20 text-secondary-foreground', href: '/eventos' },
            { icon: Heart, title: 'nav.services', color: 'bg-blue-100 text-blue-600', href: '/servicios' },
          ].map((item, i) => (
            <Link key={i} href={item.href}>
              <div className="glass-panel p-8 rounded-3xl text-center group hover:-translate-y-2 transition-all duration-300 cursor-pointer">
                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">{t(item.title)}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-24 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-4xl font-bold">{t('home.upcoming_events')}</h2>
            <Link href="/eventos" className="text-primary font-semibold hover:underline hidden sm:flex items-center gap-1">
              {t('common.see_all')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {eventos.map((evento) => (
              <div key={evento.id} className="bg-background rounded-3xl border border-border overflow-hidden hover:shadow-lg transition-all">
                {/* landscape photo of event */}
                <img src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=400&fit=crop" alt="Event" className="w-full h-48 object-cover" />
                <div className="p-6">
                  <div className="text-secondary font-bold mb-2">
                    {format(new Date(evento.fechaInicio), 'dd MMM, yyyy')}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tb(evento, 'nombre')}</h3>
                  <p className="text-muted-foreground mb-4 line-clamp-2">{tb(evento, 'descripcion')}</p>
                  <Button variant="outline" className="w-full">{t('common.read_more')}</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link href="/eventos">
              <Button variant="outline" className="w-full">{t('common.see_all')}</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
