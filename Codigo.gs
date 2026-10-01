/**
 * Tablero "Hito Fuck It" — API sobre Google Sheets
 * ------------------------------------------------
 * Este script expone la hoja como una pequeña API JSON para la página
 * publicada en GitHub Pages.
 *
 *   GET   -> devuelve todas las filas
 *   POST  -> escribe filas (crear / actualizar / borrar), solo con la clave
 *
 * Cómo publicarlo:
 *   1. Abre el Sheet > Extensiones > Apps Script
 *   2. Pega este archivo completo (reemplaza lo que haya)
 *   3. Implementar > Nueva implementación > tipo "Aplicación web"
 *        Ejecutar como:        Yo (diego@bootic.net)
 *        Quién tiene acceso:   Cualquier persona
 *   4. Copia la URL que termina en /exec y pégala en index.html (API_URL)
 *
 * La primera vez con avance: ejecuta prepararHoja() una sola vez (ver abajo).
 *
 * Si cambias este archivo después, hay que volver a implementar
 * (Implementar > Gestionar implementaciones > editar > Versión: nueva).
 */

var SHEET_ID = '10VH2UuwUHCYK1T38HehHmhEWGzsZjsdIrX0EVdRylfk';

/** Clave del modo edición. Debe ser igual a la del link #edit=... */
var EDIT_KEY = 'bldr-1nov-k7m2';

var HEADERS = ['id', 'carril', 'columna', 'estado', 'titulo', 'lider',
               'participantes', 'semana', 'dependencia', 'subtareas', 'orden',
               'avance'];

var VALORES = {
  carril: ['Marketing / Web', 'Producto', 'Customer Happiness',
           'Sales / BizDev', 'Finanzas / Admin', 'Projects'],
  columna: ['Antes', 'Después'],
  estado: ['Crítico', 'Deseable', 'Fuera del hito'],
  avance: ['Por empezar', 'En curso', 'Listo']
};

function hoja_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
}

function asegurarColumnas_(sh) {
  var falta = HEADERS.length - sh.getMaxColumns();
  if (falta > 0) sh.insertColumnsAfter(sh.getMaxColumns(), falta);
}

function salida_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function leerFilas_() {
  var sh = hoja_();
  var valores = sh.getDataRange().getValues();
  var filas = [];
  for (var i = 1; i < valores.length; i++) {
    var r = valores[i];
    if (!String(r[0]).trim()) continue;
    filas.push({
      id: String(r[0]).trim(),
      carril: String(r[1]).trim(),
      columna: String(r[2]).trim(),
      estado: String(r[3]).trim(),
      titulo: String(r[4]).trim(),
      lider: String(r[5]).trim(),
      participantes: String(r[6]).trim(),
      semana: String(r[7]).trim(),
      dependencia: String(r[8]).trim(),
      subtareas: String(r[9]),
      orden: Number(r[10]) || 0,
      avance: r[11] == null ? '' : String(r[11]).trim()
    });
  }
  return filas;
}

function doGet() {
  return salida_({ ok: true, rows: leerFilas_(), ts: new Date().getTime() });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return salida_({ ok: false, error: 'json_invalido' });
  }

  if (!body || body.key !== EDIT_KEY) {
    return salida_({ ok: false, error: 'clave_invalida' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return salida_({ ok: false, error: 'ocupado' });
  }

  try {
    var sh = hoja_();
    var ultima = Math.max(sh.getLastRow(), 1);
    var ids = sh.getRange(1, 1, ultima, 1).getValues().map(function (r) {
      return String(r[0]).trim();
    });

    var writes = body.writes || [];
    for (var i = 0; i < writes.length; i++) {
      var w = writes[i];
      var id = String(w.id || '').trim();
      if (!id) continue;
      var idx = ids.indexOf(id);

      if (w.op === 'delete') {
        if (idx > 0) {
          sh.deleteRow(idx + 1);
          ids.splice(idx, 1);
        }
        continue;
      }

      var data = w.data || {};

      if (idx > 0) {
        // Actualizar: lo que la página no manda se conserva tal como está en la hoja
        // (así una página en caché sin "avance" no borra esa columna).
        asegurarColumnas_(sh);
        var actual = sh.getRange(idx + 1, 1, 1, HEADERS.length).getValues()[0];
        var fila = HEADERS.map(function (h, k) {
          return data[h] != null ? data[h] : (actual[k] == null ? '' : actual[k]);
        });
        sh.getRange(idx + 1, 1, 1, HEADERS.length).setValues([fila]);
      } else {
        asegurarColumnas_(sh);
        var nueva = HEADERS.map(function (h) {
          return data[h] != null ? data[h] : '';
        });
        sh.appendRow(nueva);
        ids.push(id);
      }
    }

    SpreadsheetApp.flush();
    return salida_({ ok: true, rows: leerFilas_() });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ejecutar UNA vez a mano (menú superior: elegir "prepararHoja" > Ejecutar).
 * Deja la hoja lista para el avance:
 *   - agrega la columna L "avance"
 *   - renombra D1 de "estado" a "prioridad" (solo el título; la página no se entera)
 *   - pone listas desplegables en carril, columna, prioridad y avance
 *   - las filas que ya existen quedan en "Por empezar"
 * No borra ni cambia ningún dato existente, salvo rellenar avance vacío.
 */
function prepararHoja() {
  var sh = hoja_();
  asegurarColumnas_(sh);
  sh.getRange(1, 12).setValue('avance');
  if (String(sh.getRange(1, 4).getValue()).trim() === 'estado') {
    sh.getRange(1, 4).setValue('prioridad');
  }
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');

  var hasta = 1000;
  var cols = { 2: 'carril', 3: 'columna', 4: 'estado', 12: 'avance' };
  Object.keys(cols).forEach(function (c) {
    var regla = SpreadsheetApp.newDataValidation()
      .requireValueInList(VALORES[cols[c]], true)
      .setAllowInvalid(false)
      .build();
    sh.getRange(2, Number(c), hasta - 1, 1).setDataValidation(regla);
  });

  var ultima = sh.getLastRow();
  if (ultima >= 2) {
    var rango = sh.getRange(2, 12, ultima - 1, 1);
    var v = rango.getValues().map(function (r) {
      return [String(r[0]).trim() || 'Por empezar'];
    });
    rango.setValues(v);
  }
  SpreadsheetApp.flush();
}
