# Tablero "Hito Fuck It" — Bolder

Tablero de la apertura del 1 de noviembre de 2026. La base de datos es un Google
Sheet; la página es un solo archivo HTML sin dependencias, pensado para GitHub Pages.

```
Google Sheet  ──►  Apps Script (/exec)  ──►  index.html (GitHub Pages)
  la verdad         API JSON: GET lee,          lee siempre
  del tablero       POST escribe con clave      escribe solo con #edit=CLAVE
```

**Estado:** la página tiene dos pestañas (**Producto SaaS** y **Operación
continua**) sobre el mismo Sheet, y cada compromiso tiene un avance
(**Por empezar · En curso · Listo**). La URL `/exec` ya viene configurada dentro de
`index.html`.

## Actualizar desde la versión anterior (una sola vez)

1. **Script.** Abre el Sheet → Extensiones → Apps Script, pega `Codigo.gs`
   completo. Si cambiaste `EDIT_KEY` en el script que ya tienes, conserva tu
   clave en la línea de `EDIT_KEY`.
2. **Prepara la hoja.** En el editor, elige la función `prepararHoja` en el menú
   superior y pulsa **Ejecutar** (acepta los permisos). Agrega la columna `L
   avance`, renombra el título de la columna D a `prioridad`, deja todo lo que ya
   existe en *Por empezar* y pone listas desplegables en carril, columna,
   prioridad y avance.
3. **Reimplementa el script.** Implementar → Gestionar implementaciones → ✎ →
   Versión: **Nueva versión** → Implementar. (No uses "Nueva implementación": cambia la URL.)
4. **Sube `index.html`** al repo (reemplaza el anterior) y refresca con Ctrl/Cmd+Shift+R.

Haz el 3 antes que el 4. Si subes la página primero, funciona igual, pero el
avance no se guarda hasta que el script esté actualizado.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página completa. Es lo único que necesita GitHub Pages. |
| `Codigo.gs` | El script que ya está pegado en el Apps Script del Sheet. Va al repo para tenerlo versionado. |
| `parts/` + `build.js` + `datos.csv` | Las piezas (CSS, markup, JS), el script que arma `index.html` y una copia del Sheet. Opcional: solo si quieres editar el diseño cómodo. |
| `README.md` | Esto. |

---

## Paso a paso en GitHub

### Opción A — sin terminal (desde el navegador)

**1. Crear el repositorio**

En <https://github.com/new>:

- **Repository name:** `tablero-hito` (o el nombre que prefieras)
- **Public** o **Private**: cualquiera sirve. Aunque sea privado, la página
  publicada queda accesible por link — lo que cambia es que el código no se ve.
- Marca **Add a README file** para que el repo nazca con una rama `main`.
- **Create repository**

**2. Subir los archivos**

En el repo: **Add file → Upload files**. Arrastra `index.html`, `Codigo.gs` y
`README.md`. Abajo, en el mensaje del commit, escribe algo como
`Tablero del hito, primera versión` y dale a **Commit changes**.

**3. Activar GitHub Pages**

**Settings** (pestaña del repo) → **Pages** (menú izquierdo) → en *Build and
deployment*:

- **Source:** Deploy from a branch
- **Branch:** `main` — carpeta `/ (root)`
- **Save**

Espera uno o dos minutos. La misma página de Pages te va a mostrar arriba:
*"Your site is live at …"* con la URL.

**4. Probar**

| Link | Qué hace |
|---|---|
| `https://<usuario>.github.io/tablero-hito/` | Solo lectura. Este es el que se comparte. |
| `https://<usuario>.github.io/tablero-hito/#edit=bldr-1nov-k7m2` | Modo edición. |

Abre el de edición, mueve un chip de columna y refresca el Sheet: la fila tiene
que haber cambiado de `Antes` a `Después`. Si eso funciona, está todo conectado.

**5. Para actualizar la página después**

En el repo, abre `index.html` → ✎ (Edit) → cambia → **Commit changes**. Pages
vuelve a publicar solo, en un par de minutos. Ojo: esto es para cambios en la
*página*. Los cambios en el *tablero* van al Sheet y no tocan el repo.

### Opción B — desde la terminal

```bash
# dentro de la carpeta que contiene index.html, Codigo.gs y README.md
git init
git add .
git commit -m "Tablero del hito, primera versión"
git branch -M main
git remote add origin git@github.com:<usuario>/tablero-hito.git
git push -u origin main
```

Después, **Settings → Pages → Deploy from a branch → main / (root) → Save**.

Para actualizar más adelante:

```bash
git add index.html
git commit -m "Ajustes de la página"
git push
```

### Si quieres que cuelgue de un dominio de Bolder

En **Settings → Pages → Custom domain** pones, por ejemplo,
`tablero.onbolder.com`, y en tu DNS creas un registro `CNAME` de `tablero`
apuntando a `<usuario>.github.io`. GitHub emite el certificado solo; marca
**Enforce HTTPS** cuando se habilite.

---

## Cómo se usa el tablero

- **Pestañas.** *Producto SaaS* muestra Marketing / Web y Producto; *Operación
  continua* muestra Customer Happiness, Sales / BizDev, Finanzas / Admin y
  Projects. Es la misma base: cambiar el carril de un compromiso lo cambia de
  pestaña. Cada pestaña muestra cuántos críticos le quedan abiertos, y arriba
  está el total y el avance de los críticos de antes del 1 nov. Un link a una
  pestaña: `…/#tab=ops` (y con edición: `…/#tab=ops&edit=CLAVE`).
- **Avance.** El círculo a la izquierda de cada compromiso: vacío = *Por
  empezar*, medio = *En curso* (azul), check = *Listo* (verde). En modo edición, un
  clic lo cambia. Un crítico en *Listo* pierde la marca ember y deja de contar
  como abierto.
- **Arrastrar** un chip de una columna a la otra, o los botones **◀ ▶**.
- **✎** abre el compromiso: nombre, carril, columna, prioridad, avance,
  participantes, líder, semana, dependencia y subtareas. Ahí mismo está eliminar.
- **+ Compromiso** o **+ agregar aquí** crean uno nuevo (en la pestaña que estás viendo).
- Todo eso solo aparece con el link `#edit=`. Sin la clave, la página es de lectura.
- El Sheet también se puede editar directo, sin pasar por la página.

## Diseño

La página sigue el design language de Bolder (`DESIGN.md`): superficie única
oscura sobre `--ink #1B1A17`, paneles en `--ink-soft`, wells en `#141311`.
Ember (`#E8421D`) marca lo crítico y la fecha; indigo (`#4F46E5`) marca la acción
primaria y el foco de los campos. Display en Montaga 400 con `-0.03em`, cuerpo en
IBM Plex Sans, metadatos y badges en JetBrains Mono. Las tres fuentes se cargan
desde Google Fonts; si no hay red, caen a Georgia / system-ui / monospace.

Los estilos están en `parts/style.css` y se compilan dentro de `index.html`.
Para cambiar algo visual, edita ahí y corre `node build.js`.

El verde de *Listo* parte del `valid #3D7A4E` del manual, aclarado a `#7DBE93`
para que se lea sobre fondo oscuro (ese tono no está en `DESIGN.md`). El azul de
*En curso* es el `indigo-soft`/`indigo-washed`. Además del color, cada estado
tiene su propia forma (círculo vacío, medio, check), así que no depende solo de él.

**Para rearmar la página:** exporta el Sheet (Archivo → Descargar → CSV), guárdalo
como `datos.csv` en esta carpeta y corre `node build.js`. Eso también refresca la
copia de respaldo que se ve si el Sheet no responde.

## La clave de edición

La clave `bldr-1nov-k7m2` está en dos lugares y **tiene que ser la misma en ambos**:

- `Codigo.gs`, en la constante `EDIT_KEY`
- el link de edición, después de `#edit=`

Para cambiarla: la editas en `Codigo.gs`, vuelves a implementar
(*Implementar → Gestionar implementaciones → ✎ → Versión: nueva*) y repartes el
link nuevo.

**Qué protege y qué no.** La clave evita que alguien que abra el link público
modifique el tablero. No es seguridad real: la URL del script está en el código
de la página, así que alguien que lea el HTML y sepa lo que busca puede escribir
en el Sheet igual. Para un tablero interno de planificación alcanza; no pongas
ahí nada confidencial.

## La estructura del Sheet

Una fila por compromiso.

| Columna | Valores | Notas |
|---|---|---|
| `id` | texto único | No lo cambies: es lo que identifica la fila. |
| `carril` | Marketing / Web · Producto · Customer Happiness · Sales / BizDev · Finanzas / Admin · Projects | |
| `columna` | Antes · Después | "Antes" = antes del 1 de noviembre. |
| `estado` (se titula `prioridad`) | Crítico · Deseable · Fuera del hito | Ver más abajo: el título cambió, la columna no. |
| `titulo` | texto | Lo que se ve en el chip. |
| `lider` | Tomás · Diego · Manu · Caro · Alexis | Círculo relleno, aparece primero. |
| `participantes` | nombres separados por coma | |
| `semana` | texto libre | Ej. `1–2`, `6`. |
| `dependencia` | texto libre | Ej. `Depende de: pricing público`. |
| `subtareas` | una por línea | Dentro de la celda, Alt+Enter para saltar de línea. |
| `orden` | número | Posición dentro de su columna. |
| `avance` | Por empezar · En curso · Listo | Columna L. Vacío cuenta como *Por empezar*. |

La página tolera faltas de ortografía y acentos en `carril`, `columna`, `prioridad`
y `avance`. Si un valor no coincide con nada, cae en Marketing / Web · Después ·
Deseable · Por empezar. "Hecho" y "Completo" también se leen como *Listo*.

La columna D se llama `prioridad` en el Sheet, pero la página y el script siguen
leyéndola por posición, así que renombrarla no rompe nada.

## Cosas que conviene saber

- **La página refresca sola** cada 60 segundos y al volver a la pestaña. El botón
  *Actualizar* fuerza la lectura.
- **Si el Sheet no responde** (12 s), la página muestra la última copia que vio ese
  navegador, y si nunca vio ninguna, la copia incluida en el archivo
  (`FALLBACK_ROWS`), indicando de qué fecha es. Mientras carga por primera vez
  muestra "Leyendo el Sheet…" en vez de datos viejos.
- **Dos personas editando a la vez**: el script toma un lock, así que no se pisan.
  Pero gana el último que escribe: si los dos mueven el mismo chip al mismo
  tiempo, queda el segundo.
- **Si cambias `Codigo.gs`**, hay que volver a implementar para que el cambio
  tenga efecto. Guardar no basta.
- **La copia incluida en `index.html`** es la del 1 de octubre y no tiene
  avance (todo *Por empezar*). Solo se ve si el Sheet falla.
- **Editar el Sheet a mano:** una página abierta con edición puede pisar un cambio
  que hagas en la misma fila al mismo tiempo; las celdas que la página no toca
  (como `avance`, si viene de una versión antigua en caché) se conservan.
