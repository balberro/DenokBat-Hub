import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 bg-background">
      <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-8">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h1 className="text-5xl font-extrabold text-foreground mb-4">Página no encontrada</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-lg">
        Lo sentimos, la página que buscas no existe o ha sido movida.
      </p>
      <Link href="/">
        <Button size="lg" className="rounded-full px-8 text-lg">
          Volver al Inicio
        </Button>
      </Link>
    </div>
  );
}
