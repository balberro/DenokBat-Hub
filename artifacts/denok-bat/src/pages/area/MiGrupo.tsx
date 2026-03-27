import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, Search } from "lucide-react";
import { useState } from "react";

const mockMiembros = [
  { id: 1, nombre: "María García López", dni: "12345678A", telefono: "622 111 222", email: "maria@email.com", genero: "F" },
  { id: 2, nombre: "José Martínez Ruiz", dni: "87654321B", telefono: "633 222 333", email: "jose@email.com", genero: "M" },
  { id: 3, nombre: "Ana Fernández Vega", dni: "11223344C", telefono: "644 333 444", email: "ana@email.com", genero: "F" },
  { id: 4, nombre: "Luis Sánchez Torres", dni: "44332211D", telefono: "655 444 555", email: "luis@email.com", genero: "M" },
  { id: 5, nombre: "Carmen Jiménez Osa", dni: "55443322E", telefono: "666 555 666", email: "carmen@email.com", genero: "F" },
];

export default function MiGrupo() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filtered = mockMiembros.filter((m) =>
    m.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t("grupo.title")}</h1>
        <span className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          {mockMiembros.length} {t("grupo.members")}
        </span>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{m.nombre}</p>
              <p className="text-sm text-muted-foreground">{m.dni} · {t("common.gender")}: {m.genero}</p>
              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{m.telefono}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{m.email}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">{t("grupo.member_data")}</Button>
              <Button variant="outline" size="sm">{t("common.edit")}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
