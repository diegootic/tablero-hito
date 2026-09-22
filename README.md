# Tablero "Hito Fuck It" — Bolder

Tablero de la apertura del 1 de noviembre de 2026. La base de datos es un Google
Sheet; la página es un solo archivo HTML sin dependencias, pensado para GitHub Pages.

```
Google Sheet  ──►  Apps Script (/exec)  ──►  index.html (GitHub Pages)
  la verdad         API JSON: GET lee,          lee siempre
  del tablero       POST escribe con clave      escribe solo con #edit=CLAVE
```

**Estado:** el Sheet está creado con las 30 filas y el Apps Script ya está
publicado. La URL `/exec` ya viene configurada dentro de `index.html`.
Falta solamente subirlo a GitHub.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página completa. Es lo único que se sube a GitHub. |
| `Codigo.gs` | El script que ya está pegado en el Apps Script del Sheet. Se guarda en el repo para tenerlo versionado. |
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

- **Arrastrar** un chip de una columna a la otra, o los botones **◀ ▶**.
- **✎** abre el compromiso: nombre, carril, columna, estado, participantes,
  líder, semana, dependencia y subtareas. Ahí mismo está eliminar.
- **+ Compromiso** o **+ agregar aquí** crean uno nuevo.
- Todo eso solo aparece con el link `#edit=`. Sin la clave, la página es de lectura.
- El botón **Abrir el Sheet** lleva a la planilla, que también se puede editar
  directo.

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
| `estado` | Crítico · Deseable · Fuera del hito | |
| `titulo` | texto | Lo que se ve en el chip. |
| `lider` | Tomás · Diego · Manu · Caro · Alexis | Círculo relleno, aparece primero. |
| `participantes` | nombres separados por coma | |
| `semana` | texto libre | Ej. `1–2`, `6`. |
| `dependencia` | texto libre | Ej. `Depende de: pricing público`. |
| `subtareas` | una por línea | Dentro de la celda, Alt+Enter para saltar de línea. |
| `orden` | número | Posición dentro de su columna. |

La página tolera faltas de ortografía y acentos en `carril`, `columna` y `estado`.
Si un valor no coincide con nada, cae en Marketing / Web · Después · Deseable.

## Cosas que conviene saber

- **La página refresca sola** cada 60 segundos y al volver a la pestaña. El botón
  *Actualizar* fuerza la lectura.
- **Si el Sheet no responde**, la página muestra la última copia que vio ese
  navegador, y si nunca vio ninguna, la copia incluida en el archivo
  (`FALLBACK_ROWS`). Nunca aparece en blanco.
- **Dos personas editando a la vez**: el script toma un lock, así que no se pisan.
  Pero gana el último que escribe: si los dos mueven el mismo chip al mismo
  tiempo, queda el segundo.
- **Si cambias `Codigo.gs`**, hay que volver a implementar para que el cambio
  tenga efecto. Guardar no basta.
- **La copia incluida en `index.html`** quedó congelada en el estado del 22 de
  septiembre. Solo se ve si el Sheet falla.
