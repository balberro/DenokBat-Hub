import { useTranslation } from "@/i18n/translations";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash2, Download } from "lucide-react";
import { useState } from "react";

const mockSocios = [
  { id: 1, numero: "S-0001", nombre: "María García López", dni: "12345678A", email: "maria@email.com", telefono: "622 111 222", alta: "2020-03-15", estado: "active" },
  { id: 2, numero: "S-0002", nombre: "José Martínez Ruiz", dni: "87654321B", email: "jose@email.com", telefono: "633 222 333", alta: "2019-06-01", estado: "active" },
  { id: 3, numero: "S-0003", nombre: "Ana Fernández Vega", dni: "11223344C", email: "ana@email.com", telefono: "644 333 444", alta: "2021-01-10", estado: "inactive" },
  { id: 4, numero: "S-0004", nombre: "Luis Sánchez Torres", dni: "44332211D", email: "luis@email.com", telefono: "655 444 555", alta: "2022-09-20", estado: "active" },
  { id: 5, numero: "S-0005", nombre: "Carmen Jiménez Osa", dni: "55443322E", email: "carmen@email.com", telefono: "666 555 666", alta: "2023-02-28", estado: "active" },
];

export default function GestionSocios() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const filtered = mockSocios.filter((s) =>
    s.nombre.toLowerCase().includes(search.toLowerCase()) ||
    s.numero.includes(search) ||
    s.dni.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t("menu.gestion_socios")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4" />{t("common.export")}</Button>
          <Button className="gap-2"><Plus className="w-4 h-4" />{t("socios.new")}</Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("common.search")}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("socios.member_number")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.name")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">DNI</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">{t("common.phone")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">{t("socios.join_date")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.status")}</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{s.numero}</td>
                <td className="px-4 py-3 font-medium text-foreground">{s.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.dni}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.telefono}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.alta}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.estado === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {s.estado === "active" ? t("common.open") : "Baja"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground mt-3">{filtered.length} {t("common.member")}s</p>
    </div>
  );
}
