# Plantilla de importación de socios

Archivo de plantilla:

- `templates/socios_import_template.csv`
- `templates/socios_import_template.xlsx`

## Formato recomendado

- Edita en Excel o LibreOffice.
- Al terminar, exporta como `CSV UTF-8`.
- Mantiene exactamente los nombres de columnas.

## Columnas

- `numero_socio`: texto identificador (recomendado unico).
- `nombre`: obligatorio.
- `apellidos`: opcional.
- `dni`: recomendado unico.
- `genero`: opcional, valores sugeridos `M` o `F`.
- `email`: opcional, formato email.
- `telefono`: opcional.
- `direccion`: opcional (linea de calle).
- `poblacion`: recomendado para asignación de zonas de delegados.
- `provincia`: recomendado para segmentacion geográfica.
- `fecha_nacimiento`: formato `YYYY-MM-DD`.
- `fecha_fallecimiento`: formato `YYYY-MM-DD` (opcional).
- `fecha_alta`: formato `YYYY-MM-DD`.
- `estado`: `solicitante`, `activo` o `baja`.
- `tipologia`: `fundadora`, `directiva`, `delegada`, `honorifica`, `numeraria` o `colaboradora`.
- `grupo_id`: opcional, numérico.
- `avatar_url`: opcional (URL publica de imagen).

## Reglas de negocio

- Si `tipologia = honorifica`, no se debe generar cuota anual.
- Para zonificación por delegados, completar siempre `poblacion` y `provincia`.
- Si informas `fecha_nacimiento`, el sistema puede reclasificar a `honorifica` automáticamente cuando corresponda (>= 85 anos).

## Cabecera esperada

```text
numero_socio,nombre,apellidos,dni,genero,email,telefono,direccion,poblacion,provincia,fecha_nacimiento,fecha_fallecimiento,fecha_alta,estado,tipologia,grupo_id,avatar_url
```

## Checklist antes de importar

- No hay columnas extra ni faltantes.
- Fechas en `YYYY-MM-DD`.
- `estado` y `tipologia` usan solo valores permitidos.
- Sin duplicados de `numero_socio` (y preferiblemente `dni`).
- Prueba primero con 10-20 filas.

## Corrección masiva de género

Para normalizar el género real cuando existen valores ambiguos:

- Plantilla: `templates/socios_genero_correccion_template.csv`
- Columnas:
  - `numero_socio`
  - `genero_normalizado` (solo `H`, `F` o `N`)

Ejecutar validación sin cambios:

```bash
pnpm --filter @workspace/api-server import:genero -- --dry-run ../../templates/socios_genero_correccion_template.csv
```

Aplicar cambios:

```bash
pnpm --filter @workspace/api-server import:genero -- ../../templates/socios_genero_correccion_template.csv
```
