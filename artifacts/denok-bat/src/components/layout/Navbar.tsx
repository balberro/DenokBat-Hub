import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/i18n/translations";
import { useStore } from "@/store/use-store";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { t, lang, setLang } = useTranslation();
  const user = useStore((s) => s.user);

  const allNavLinks = [
    { href: "/", label: 'nav.home' },
    { href: "/quienes-somos", label: 'nav.about' },
    { href: "/actividades", label: 'nav.active_aging' },
    { href: "/eventos", label: 'nav.events' },
    { href: "/divulgacion", label: 'nav.news' },
    { href: "/servicios", label: 'nav.services' },
    { href: "/contacto", label: 'nav.contact' },
  ];

  const navLinks = allNavLinks.filter((link) => link.href !== location);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-lg border-b border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt="Denok Bat Logo" 
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <span className="hidden font-display font-bold text-2xl text-foreground tracking-tight">Denok Bat</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className="px-4 py-2 rounded-xl text-[17px] font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t(link.label)}
              </Link>
            ))}
          </div>

          {/* Actions — Desktop */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex bg-muted rounded-xl p-1">
              <button 
                onClick={() => setLang('es')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all min-h-0 ${lang === 'es' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                ES
              </button>
              <button 
                onClick={() => setLang('eu')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all min-h-0 ${lang === 'eu' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                EU
              </button>
            </div>
            
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Link href="/login">
                <Button className="rounded-xl">
                  {t('nav.login')}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-4">
            <div className="flex bg-muted rounded-lg p-1">
              <button 
                onClick={() => setLang('es')}
                className={`px-2 py-1 rounded text-xs font-bold min-h-0 ${lang === 'es' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                ES
              </button>
              <button 
                onClick={() => setLang('eu')}
                className={`px-2 py-1 rounded text-xs font-bold min-h-0 ${lang === 'eu' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                EU
              </button>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl bg-muted text-foreground"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-border absolute w-full shadow-xl">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-4 rounded-xl text-lg font-medium text-muted-foreground hover:bg-muted"
              >
                {t(link.label)}
              </Link>
            ))}
            {user ? (
              <UserMenu user={user} mobile onClose={() => setIsOpen(false)} />
            ) : (
              <div className="pt-4 mt-4 border-t border-border">
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button className="w-full justify-center">
                    {t('nav.login')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
