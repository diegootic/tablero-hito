/* Arma index.html a partir de las piezas en parts/ */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const CSV = path.join(ROOT, "datos.csv");

/* Lector de CSV mínimo (comillas, saltos de línea dentro de celdas, BOM). */
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

if (!fs.existsSync(CSV)) {
  console.error("Falta datos.csv. En el Sheet: Archivo > Descargar > Valores separados por comas (.csv) y guárdalo aquí con ese nombre.");
  process.exit(1);
}
const table = parseCSV(fs.readFileSync(CSV, "utf8"));
const head = table[0].map(h => h.trim().toLowerCase());
const col = n => head.indexOf(n);
const iEstado = col("prioridad") > -1 ? col("prioridad") : col("estado");
const need = { id: col("id"), carril: col("carril"), columna: col("columna"), estado: iEstado, titulo: col("titulo") };
for (const k in need) if (need[k] < 0) { console.error("datos.csv no tiene la columna", k); process.exit(1); }
const get = (r, name, idx) => ((idx != null ? idx : col(name)) > -1 ? (r[idx != null ? idx : col(name)] || "") : "");

const rows = table.slice(1).filter(r => (r[need.id] || "").trim()).map(r => ({
  id: r[need.id].trim(),
  carril: get(r, "carril"), columna: get(r, "columna"), estado: get(r, "", iEstado),
  titulo: get(r, "titulo"), lider: get(r, "lider"), participantes: get(r, "participantes"),
  semana: get(r, "semana"), dependencia: get(r, "dependencia"), subtareas: get(r, "subtareas"),
  orden: Number(get(r, "orden")) || 0,
  avance: get(r, "avance") || "Por empezar"
}));

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const hoy = new Date();
const BUILD = hoy.getDate() + " de " + MESES[hoy.getMonth()] + " de " + hoy.getFullYear();

const css = fs.readFileSync(path.join(ROOT, "parts", "style.css"), "utf8");
const markup = fs.readFileSync(path.join(ROOT, "parts", "markup.html"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "parts", "app.js"), "utf8");

const out = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Hito Fuck It — Bolder</title>
<meta name="description" content="Tablero de la apertura de Bolder: 1 de noviembre de 2026.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Montaga&display=swap">
<style>
html, body { margin: 0; }
img, svg { max-width: 100%; }
[hidden] { display: none !important; }
${css}</style>
</head>
<body>
${markup}
<script>
/* Copia incluida en el archivo: lo que se muestra si el Sheet no responde. */
var BUILD_DATE = ${JSON.stringify(BUILD)};
var FALLBACK_ROWS = ${JSON.stringify(rows, null, 1)};
<\/script>
<script>
${app}<\/script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, "index.html"), out);
console.log("index.html:", (out.length / 1024).toFixed(0) + "KB ·", rows.length, "filas de respaldo ·", BUILD);
