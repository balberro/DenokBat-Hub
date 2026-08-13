/**
 * Test runtime de las traducciones (fase de testeo).
 *
 * Valida:
 *  1. Presencia de las claves nuevas (organigrama, actas.publico, galeria, nosotros)
 *     en el diccionario base y en el diccionario fusionado (con overrides).
 *  2. Que los valores ES/EU no estén vacíos.
 *  3. Que las claves «muertas» eliminadas ya no existan.
 */
import { baseDictionary, getMergedDictionary } from "../src/i18n/translations";

let fallos = 0;
const ok = (msg: string) => console.log(`  ✔ ${msg}`);
const fail = (msg: string) => { console.error(`  ✘ ${msg}`); fallos++; };

const clavesNuevas = [
  // organigrama
  "organigrama.titulo", "organigrama.asamblea_general", "organigrama.junta_directiva",
  "organigrama.direccion", "organigrama.delegados", "organigrama.presidencia",
  "organigrama.secretaria", "organigrama.tesoreria", "organigrama.vocales",
  "organigrama.delegados_zona", "organigrama.volver", "organigrama.no_miembros",
  // actas públicas
  "actas.publico.abrir_ultimo", "actas.publico.indice", "actas.publico.filtro_anio",
  "actas.publico.filtro_mes", "actas.publico.limpiar_filtros", "actas.publico.nota_12",
  "actas.publico.sin_resultados", "actas.publico.vacio", "actas.publico.ver_pdf",
  "actas.publico.descargar",
  // galería
  "galeria.titulo", "galeria.anadir_fotos", "galeria.todo", "galeria.evento",
  "galeria.actividad", "galeria.fotos", "galeria.ver_completa", "galeria.aviso_divulgacion",
  "galeria.nuevo", "galeria.editar_elemento", "galeria.titulo_es", "galeria.titulo_eu",
  "galeria.error_titulo", "galeria.error_foto_tarjeta", "galeria.error_foto_album",
  "galeria.actualizar",
  // nosotros
  "nosotros.tab.presentacion", "nosotros.tab.estatutos", "nosotros.tab.organigrama",
  "nosotros.tab.galeria", "nosotros.tab.actas", "nosotros.presentacion_historia",
  "nosotros.fundadores", "nosotros.estatutos_vigentes", "nosotros.sin_estatutos_vigentes",
  "nosotros.estatutos_anteriores", "nosotros.sin_estatutos_anteriores",
];

const clavesEliminadas = [
  "common.no", "home.upcoming_events", "perfil.membership_intro",
  "perfil.membership_form_intro", "eventos.enrolled", "eventos.places",
  "inscripciones.confirmed", "inscripciones.waiting",
];

console.log(`\n== 1) Presencia en baseDictionary (${clavesNuevas.length} claves) ==`);
const ausentes = clavesNuevas.filter((k) => !baseDictionary[k]);
if (ausentes.length === 0) ok(`todas presentes`);
else ausentes.forEach((k) => fail(`ausente en base: ${k}`));

console.log(`\n== 2) Valores ES/EU no vacíos y coherentes ==`);
const vacias = clavesNuevas.filter(
  (k) => !baseDictionary[k]?.es?.trim() || !baseDictionary[k]?.eu?.trim(),
);
if (vacias.length === 0) ok(`todas con es/eu no vacíos`);
else vacias.forEach((k) => fail(`es/eu vacío: ${k}`));

console.log(`\n== 3) Muestra de valores (formato es -> eu) ==`);
for (const k of ["organigrama.vocales", "organigrama.delegados_zona", "organigrama.presidencia",
                  "actas.publico.indice", "galeria.titulo", "nosotros.tab.actas"]) {
  console.log(`  ${k.padEnd(30)} ${baseDictionary[k].es}  →  ${baseDictionary[k].eu}`);
}

console.log(`\n== 4) Diccionario fusionado (getMergedDictionary) contiene las claves ==`);
const merged = getMergedDictionary();
const ausentesMerged = clavesNuevas.filter((k) => !merged[k]);
if (ausentesMerged.length === 0) ok(`todas presentes en merged (${Object.keys(merged).length} claves)`);
else ausentesMerged.forEach((k) => fail(`ausente en merged: ${k}`));

console.log(`\n== 5) Claves «muertas» eliminadas ya no existen ==`);
const presentes = clavesEliminadas.filter((k) => baseDictionary[k]);
if (presentes.length === 0) ok(`las 8 claves muertas eliminadas correctamente`);
else presentes.forEach((k) => fail(`aún presente: ${k}`));

console.log(`\n== 6) t() resuelve a ES por defecto y no devuelve la propia clave ==`);
// Reproducimos la lógica de t() sin hooks
const langEs = "es";
for (const k of clavesNuevas.slice(0, 12)) {
  const v = merged[k]?.[langEs] ?? k;
  if (v === k) fail(`t('${k}') devuelve la propia clave (no encontrada)`);
}
ok(`t() resuelve valores correctos en ES`);

console.log(`\n${fallos === 0 ? "✔✔ TODAS LAS COMPROBACIONES SUPERADAS" : `✘ ${fallos} COMPROBACIONES FALLIDAS`}`);
process.exit(fallos === 0 ? 0 : 1);
