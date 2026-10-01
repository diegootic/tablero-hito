(function () {
  "use strict";

  /* ============================================================
     CONFIGURACIÓN — lo único que hay que tocar
     ============================================================ */

  // URL de la aplicación web de Apps Script (termina en /exec).
  // Mientras esté vacía, la página muestra la copia incluida en el archivo.
  var API_URL = "https://script.google.com/macros/s/AKfycbwVnh3nrOV_9DTj3s7m_RTitcUQBhzmUr4BqOAavf7V3-AtGOR3H65QzirBNGfT8lMQbQ/exec";

  /* ============================================================ */

  var LANES = [
    { id: "mkt",   name: "Marketing / Web",     sheet: "Marketing / Web" },
    { id: "prod",  name: "Producto",            sheet: "Producto" },
    { id: "chp",   name: "Customer Happiness",  sheet: "Customer Happiness" },
    { id: "sales", name: "Sales / BizDev",      sheet: "Sales / BizDev" },
    { id: "fin",   name: "Finanzas / Admin",    sheet: "Finanzas / Admin" },
    { id: "proj",  name: "Projects",            sheet: "Projects" }
  ];
  // Dos pestañas, una sola base de datos: cada carril pertenece a una pestaña.
  var TABS = [
    { id: "saas", name: "Producto SaaS", lanes: ["mkt", "prod"],
      note: "Lo que se construye y se publica para abrir: la web, el pricing, la documentación y el producto." },
    { id: "ops",  name: "Operación continua", lanes: ["chp", "sales", "fin", "proj"],
      note: "Lo que tiene que funcionar alrededor del producto: soporte, ventas, finanzas y proyectos con clientes." }
  ];
  var AVANCE = { todo: "Por empezar", doing: "En curso", done: "Listo" };
  var AV_NEXT = { todo: "doing", doing: "done", done: "todo" };
  var PEOPLE = { T: "Tomás", D: "Diego", M: "Manu", C: "Caro", A: "Alexis" };
  var PORDER = ["T", "D", "M", "C", "A"];
  var KINDS = { crit: "Crítico", want: "Deseable", out: "Fuera del hito" };
  var COLS = { before: "Antes", later: "Después" };

  var BUILD = typeof BUILD_DATE === "string" ? BUILD_DATE : "";
  var LS_CACHE = "bolder-hito-cache";
  var DEFAULT_TAB = "saas";
  var FETCH_TIMEOUT = 12000;

  var state = [];
  var loaded = false;
  var tab = DEFAULT_TAB;
  var expanded = {};
  var filter = null;
  var canEdit = false;
  var editKey = "";
  var board = document.getElementById("board");

  /* ---------- normalización ---------- */
  function plain(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }
  function laneFromSheet(v) {
    var p = plain(v);
    for (var i = 0; i < LANES.length; i++) if (plain(LANES[i].sheet) === p) return LANES[i].id;
    if (p.indexOf("market") > -1 || p.indexOf("web") > -1) return "mkt";
    if (p.indexOf("produc") > -1) return "prod";
    if (p.indexOf("happi") > -1 || p.indexOf("soporte") > -1) return "chp";
    if (p.indexOf("sales") > -1 || p.indexOf("bizdev") > -1 || p.indexOf("venta") > -1) return "sales";
    if (p.indexOf("finan") > -1 || p.indexOf("admin") > -1) return "fin";
    if (p.indexOf("project") > -1 || p.indexOf("proyecto") > -1) return "proj";
    return "mkt";
  }
  function avanceFromSheet(v) {
    var p = plain(v);
    if (p.indexOf("listo") > -1 || p.indexOf("hecho") > -1 || p.indexOf("complet") > -1) return "done";
    if (p.indexOf("curso") > -1 || p.indexOf("desarrollo") > -1 || p.indexOf("progreso") > -1) return "doing";
    return "todo";
  }
  function tabOfLane(laneId) {
    for (var i = 0; i < TABS.length; i++) if (TABS[i].lanes.indexOf(laneId) > -1) return TABS[i];
    return TABS[0];
  }
  function colFromSheet(v) { return plain(v).indexOf("antes") === 0 ? "before" : "later"; }
  function kindFromSheet(v) {
    var p = plain(v);
    if (p.indexOf("critic") > -1) return "crit";
    if (p.indexOf("fuera") > -1) return "out";
    return "want";
  }
  function initialFromName(v) {
    var p = plain(v);
    if (!p) return "";
    for (var k in PEOPLE) if (plain(PEOPLE[k]) === p) return k;
    for (var k2 in PEOPLE) if (plain(PEOPLE[k2]).indexOf(p) === 0 || p.indexOf(plain(PEOPLE[k2])) === 0) return k2;
    return "";
  }
  function peopleFromSheet(v) {
    return String(v || "").split(/[,;]/).map(initialFromName).filter(Boolean);
  }

  function rowToChip(r) {
    return {
      id: String(r.id || "").trim(),
      lane: laneFromSheet(r.carril),
      col: colFromSheet(r.columna),
      kind: kindFromSheet(r.estado),
      av: avanceFromSheet(r.avance),
      title: String(r.titulo || "").trim(),
      lead: initialFromName(r.lider),
      people: peopleFromSheet(r.participantes),
      week: String(r.semana || "").trim(),
      dep: String(r.dependencia || "").trim(),
      sub: String(r.subtareas || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
      order: Number(r.orden) || 0
    };
  }
  function chipToRow(c) {
    var lane = LANES.filter(function (l) { return l.id === c.lane; })[0];
    return {
      id: c.id,
      carril: lane ? lane.sheet : c.lane,
      columna: COLS[c.col] || "Antes",
      estado: KINDS[c.kind] || "Deseable",
      avance: AVANCE[c.av] || AVANCE.todo,
      titulo: c.title,
      lider: PEOPLE[c.lead] || "",
      participantes: (c.people || []).map(function (p) { return PEOPLE[p] || p; }).join(", "),
      semana: c.week || "",
      dependencia: c.dep || "",
      subtareas: (c.sub || []).join("\n"),
      orden: c.order || 0
    };
  }

  /* ---------- transporte ---------- */
  function cacheSave() {
    try { localStorage.setItem(LS_CACHE, JSON.stringify({ ts: Date.now(), rows: state.map(chipToRow) })); } catch (e) {}
  }
  function cacheLoad() {
    try {
      var raw = localStorage.getItem(LS_CACHE);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (o && o.rows && o.rows.length) return o;
    } catch (e) {}
    return null;
  }

  function adoptRows(rows) {
    var next = [];
    for (var i = 0; i < rows.length; i++) {
      var c = rowToChip(rows[i]);
      if (c.id && c.title) next.push(c);
    }
    if (next.length) state = next;
  }

  function fetchRows(silent) {
    if (!API_URL) { setSync(false, "Sin Sheet configurado · copia incluida en el archivo"); return Promise.resolve(); }
    if (!silent) setSync(false, "Leyendo el Sheet…");
    var timeout = new Promise(function (_, reject) { setTimeout(function () { reject(new Error("timeout")); }, FETCH_TIMEOUT); });
    var req = fetch(API_URL + "?t=" + Date.now(), { method: "GET" }).then(function (r) { return r.json(); });
    return Promise.race([req, timeout])
      .then(function (d) {
        if (!d || !d.ok || !d.rows) throw new Error("respuesta inesperada");
        adoptRows(d.rows);
        loaded = true;
        cacheSave();
        render();
        setSync(true, "Sheet · actualizado " + hhmm());
      })
      .catch(function () {
        if (!state.length) {
          // Nunca vimos el Sheet en este navegador: se muestra la copia del archivo, avisando de su fecha.
          adoptRows(FALLBACK_ROWS);
          render();
          setSync(false, "Sin conexión al Sheet · mostrando la copia del archivo" + (BUILD ? " (" + BUILD + ")" : ""));
        } else {
          setSync(false, "Sin conexión al Sheet · mostrando la última copia");
        }
      });
  }

  var pending = [];
  var flushing = false;
  function queueWrite(op, chip) {
    if (!canEdit) return;
    pending = pending.filter(function (w) { return w.id !== chip.id; });
    pending.push(op === "delete" ? { op: "delete", id: chip.id } : { op: "set", id: chip.id, data: chipToRow(chip) });
    scheduleFlush();
  }
  var flushTimer = null;
  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 600);
  }
  function flush() {
    if (flushing || !pending.length) return;
    if (!API_URL) { setSync(false, "Sin Sheet configurado · los cambios no se guardan"); return; }
    flushing = true;
    var batch = pending;
    pending = [];
    setSync(true, "Guardando…");
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ key: editKey, writes: batch })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        flushing = false;
        if (!d || !d.ok) {
          setSync(false, d && d.error === "clave_invalida" ? "Clave de edición inválida · no se guardó" : "No se pudo guardar en el Sheet");
          return;
        }
        if (d.rows) { adoptRows(d.rows); cacheSave(); if (!overlay) render(); }
        setSync(true, "Guardado en el Sheet · " + hhmm());
        if (pending.length) scheduleFlush();
      })
      .catch(function () {
        flushing = false;
        setSync(false, "No se pudo guardar · revisa la conexión");
      });
  }

  function hhmm() {
    var d = new Date();
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function setSync(live, msg) {
    document.getElementById("syncdot").classList.toggle("live", !!live);
    document.getElementById("syncmsg").textContent = msg;
  }

  /* ---------- helpers de estado ---------- */
  function byId(id) {
    for (var i = 0; i < state.length; i++) if (state[i].id === id) return state[i];
    return null;
  }
  function inCol(lane, col) {
    return state.filter(function (c) { return c.lane === lane && c.col === col; })
                .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function newId() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function removeChip(id) {
    var chip = byId(id);
    if (!chip) return;
    state = state.filter(function (c) { return c.id !== id; });
    queueWrite("delete", chip);
    cacheSave();
    render();
  }

  /* ---------- render ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function chipNode(chip) {
    var node = el("div", "chip" + (chip.kind === "crit" ? " crit" : "") + (chip.kind === "out" ? " out" : "") + " av-" + chip.av);
    node.dataset.id = chip.id;
    if (canEdit) node.draggable = true;

    var head = el("div", "chip-head");

    if (canEdit) {
      var grip = el("span", "grip", "⠿");
      grip.setAttribute("aria-hidden", "true");
      head.appendChild(grip);
    }

    head.appendChild(markNode(chip));

    var open = el("button", "chip-open");
    open.type = "button";
    open.setAttribute("aria-expanded", expanded[chip.id] ? "true" : "false");

    var t = el("span", "chip-title");
    t.appendChild(document.createTextNode(chip.title));
    t.appendChild(el("span", "badge" + (chip.kind === "crit" ? " crit" : chip.kind === "out" ? " out" : ""), KINDS[chip.kind] || "Deseable"));
    open.appendChild(t);

    var ppl = el("div", "people");
    var list = [];
    if (chip.lead) list.push(chip.lead);
    (chip.people || []).forEach(function (p) { if (p !== chip.lead) list.push(p); });
    list.forEach(function (p, i) {
      var w = el("i", "who" + (i === 0 && chip.lead ? " lead" : ""), p);
      w.title = (PEOPLE[p] || p) + (i === 0 && chip.lead ? " · líder" : "");
      ppl.appendChild(w);
    });
    open.appendChild(ppl);
    head.appendChild(open);

    if (canEdit) {
      var tools = el("div", "chip-tools");
      var move = el("button", "tool", chip.col === "before" ? "▶" : "◀");
      move.type = "button";
      move.title = chip.col === "before" ? "Mover a después de la apertura" : "Mover a antes del 1/11";
      move.addEventListener("click", function (e) {
        e.stopPropagation();
        moveChip(chip.id, chip.lane, chip.col === "before" ? "later" : "before", null);
      });
      var edit = el("button", "tool", "✎");
      edit.type = "button";
      edit.title = "Editar compromiso";
      edit.addEventListener("click", function (e) { e.stopPropagation(); openSheet(chip.id); });
      tools.appendChild(move);
      tools.appendChild(edit);
      head.appendChild(tools);
    }

    node.appendChild(head);
    if (expanded[chip.id]) node.appendChild(detailNode(chip));

    open.addEventListener("click", function () {
      expanded[chip.id] = !expanded[chip.id];
      render();
    });

    if (canEdit) {
      node.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", chip.id);
        e.dataTransfer.effectAllowed = "move";
        node.classList.add("dragging");
      });
      node.addEventListener("dragend", function () { node.classList.remove("dragging"); clearDropHints(); });
      node.addEventListener("dragover", function (e) {
        e.preventDefault(); e.stopPropagation();
        clearDropHints(); node.classList.add("dropbefore");
      });
      node.addEventListener("drop", function (e) {
        e.preventDefault(); e.stopPropagation();
        var id = e.dataTransfer.getData("text/plain");
        clearDropHints();
        if (id && id !== chip.id) moveChip(id, chip.lane, chip.col, chip.id);
      });
    }

    return node;
  }

  function markSvg(av) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("aria-hidden", "true");
    function node(name, attrs) {
      var n = document.createElementNS(ns, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      svg.appendChild(n);
    }
    if (av === "done") {
      node("circle", { cx: 10, cy: 10, r: 9, fill: "currentColor" });
      node("path", { d: "M5.8 10.4l2.9 2.9 5.5-6", fill: "none", stroke: "#1B1A17", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
    } else if (av === "doing") {
      node("circle", { cx: 10, cy: 10, r: 8.25, fill: "none", stroke: "currentColor", "stroke-width": 1.5 });
      node("path", { d: "M10 4a6 6 0 0 1 0 12z", fill: "currentColor" });
    } else {
      node("circle", { cx: 10, cy: 10, r: 8.25, fill: "none", stroke: "currentColor", "stroke-width": 1.5 });
    }
    return svg;
  }

  function markNode(chip) {
    var label = AVANCE[chip.av] || AVANCE.todo;
    if (!canEdit) {
      var s = el("span", "mark av-" + chip.av);
      s.title = label;
      s.setAttribute("role", "img");
      s.setAttribute("aria-label", label);
      s.appendChild(markSvg(chip.av));
      return s;
    }
    var b = el("button", "mark av-" + chip.av);
    b.type = "button";
    b.title = label + " · clic para pasar a " + AVANCE[AV_NEXT[chip.av]];
    b.setAttribute("aria-label", "Avance: " + label + ". Clic para pasar a " + AVANCE[AV_NEXT[chip.av]]);
    b.appendChild(markSvg(chip.av));
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      chip.av = AV_NEXT[chip.av];
      queueWrite("set", chip);
      cacheSave();
      render();
    });
    b.addEventListener("dragstart", function (e) { e.preventDefault(); e.stopPropagation(); });
    return b;
  }

  function detailNode(chip) {
    var d = el("div", "detail");
    if (chip.sub && chip.sub.length) {
      var ul = el("ul");
      chip.sub.forEach(function (s) {
        var li = el("li");
        var m = /^([^—]{2,12})\s—\s(.*)$/.exec(s);
        if (m) {
          li.appendChild(el("b", null, m[1].trim()));
          li.appendChild(document.createTextNode(" — " + m[2]));
        } else { li.textContent = s; }
        ul.appendChild(li);
      });
      d.appendChild(ul);
    } else {
      d.appendChild(el("p", "empty", "Sin desglose todavía."));
    }
    if (chip.week || chip.dep) {
      var f = el("div", "facts");
      if (chip.week) {
        var s1 = el("span");
        s1.appendChild(el("b", null, "Semana"));
        s1.appendChild(document.createTextNode(" " + chip.week));
        f.appendChild(s1);
      }
      if (chip.dep) f.appendChild(el("span", null, chip.dep));
      d.appendChild(f);
    }
    return d;
  }

  function clearDropHints() {
    Array.prototype.forEach.call(document.querySelectorAll(".dropbefore"), function (n) { n.classList.remove("dropbefore"); });
    Array.prototype.forEach.call(document.querySelectorAll(".col.dragover"), function (n) { n.classList.remove("dragover"); });
  }

  function colNode(lane, col) {
    var c = el("div", "col " + (col === "before" ? "before" : "later"));
    c.dataset.lane = lane;
    c.dataset.col = col;
    inCol(lane, col).forEach(function (chip) { c.appendChild(chipNode(chip)); });

    if (canEdit) {
      var add = el("button", "addhere", "+ agregar aquí");
      add.type = "button";
      add.addEventListener("click", function () { openSheet(null, lane, col); });
      c.appendChild(add);

      c.addEventListener("dragover", function (e) { e.preventDefault(); c.classList.add("dragover"); });
      c.addEventListener("dragleave", function () { c.classList.remove("dragover"); });
      c.addEventListener("drop", function (e) {
        e.preventDefault();
        var id = e.dataTransfer.getData("text/plain");
        clearDropHints();
        if (id) moveChip(id, lane, col, null);
      });
    }
    return c;
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function openCrit(laneIds) {
    return state.filter(function (c) {
      return c.kind === "crit" && c.col === "before" && c.av !== "done" && (!laneIds || laneIds.indexOf(c.lane) > -1);
    }).length;
  }

  function writeHash() {
    var parts = [];
    if (tab !== DEFAULT_TAB) parts.push("tab=" + tab);
    if (canEdit) parts.push("edit=" + encodeURIComponent(editKey));
    var h = parts.length ? "#" + parts.join("&") : "";
    try { history.replaceState(null, "", location.pathname + location.search + h); } catch (e) {}
  }
  function readTabFromHash() {
    var m2 = /(?:^|[#&])tab=([^&]+)/.exec(location.hash || "");
    var id = m2 ? decodeURIComponent(m2[1]) : DEFAULT_TAB;
    for (var i = 0; i < TABS.length; i++) if (TABS[i].id === id) return id;
    return DEFAULT_TAB;
  }
  function setTab(id) {
    if (id === tab) return;
    tab = id;
    writeHash();
    render();
  }
  function activeTab() {
    for (var i = 0; i < TABS.length; i++) if (TABS[i].id === tab) return TABS[i];
    return TABS[0];
  }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("on");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("on"); }, 4200);
  }

  function renderTabs() {
    var box = document.getElementById("tabs");
    box.innerHTML = "";
    TABS.forEach(function (t) {
      var b = el("button", "tab");
      b.type = "button";
      b.id = "tab-" + t.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(t.id === tab));
      b.setAttribute("aria-controls", "board");
      b.tabIndex = t.id === tab ? 0 : -1;
      b.appendChild(el("span", "tab-name", t.name));
      var open = openCrit(t.lanes);
      var cnt = el("span", "cnt" + (open === 0 ? " zero" : ""), open === 0 ? "sin críticos abiertos" : open + (open === 1 ? " crítico abierto" : " críticos abiertos"));
      b.appendChild(cnt);
      b.addEventListener("click", function () { setTab(t.id); });
      b.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var i = TABS.indexOf(t) + (e.key === "ArrowRight" ? 1 : -1);
        var nx = TABS[(i + TABS.length) % TABS.length];
        setTab(nx.id);
        var nb = document.getElementById("tab-" + nx.id);
        if (nb) nb.focus();
      });
      box.appendChild(b);
    });
    document.getElementById("tabnote").textContent = activeTab().note;
    board.setAttribute("role", "tabpanel");
    board.setAttribute("aria-labelledby", "tab-" + tab);
  }

  function render() {
    board.innerHTML = "";
    renderTabs();

    if (!state.length) {
      board.appendChild(el("p", "loading", "Leyendo el Sheet…"));
      return;
    }

    var head = el("div", "colhead");
    head.appendChild(el("div"));
    var h1 = el("div");
    h1.appendChild(el("h2", null, "Antes del 1 de noviembre"));
    h1.appendChild(el("span", "sub", "Lo que hay que dejar listo"));
    head.appendChild(h1);
    var h2 = el("div", "later deadline-col");
    h2.appendChild(el("h2", null, "Después de la apertura"));
    h2.appendChild(el("span", "sub", "Postergable sin costo"));
    head.appendChild(h2);
    board.appendChild(head);

    activeTab().lanes.forEach(function (laneId, i) {
      var lane = LANES.filter(function (l) { return l.id === laneId; })[0];
      var row = el("div", "lane");
      var name = el("div", "lane-name");
      name.appendChild(el("span", "n", pad2(i + 1)));
      name.appendChild(el("span", "nm", lane.name));
      row.appendChild(name);
      row.appendChild(colNode(lane.id, "before"));
      row.appendChild(colNode(lane.id, "later"));
      board.appendChild(row);
    });

    applyFilter();

    var crit = state.filter(function (c) { return c.kind === "crit" && c.col === "before"; });
    var done = crit.filter(function (c) { return c.av === "done"; }).length;
    document.getElementById("critcount").textContent = String(crit.length - done);
    document.getElementById("progtxt").textContent = done + " de " + crit.length + " críticos listos";
    document.getElementById("progbar").style.width = (crit.length ? Math.round(done * 100 / crit.length) : 0) + "%";
  }

  function applyFilter() {
    Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (n) {
      var chip = byId(n.dataset.id);
      if (!chip) return;
      var has = !filter || chip.lead === filter || (chip.people || []).indexOf(filter) > -1;
      n.classList.toggle("dim", !has);
    });
  }

  function moveChip(id, lane, col, beforeId) {
    var chip = byId(id);
    if (!chip) return;
    var target = inCol(lane, col).filter(function (c) { return c.id !== id; });
    var newOrder;
    if (beforeId) {
      var idx = -1;
      for (var i = 0; i < target.length; i++) if (target[i].id === beforeId) { idx = i; break; }
      if (idx === 0) newOrder = (target[0].order || 1) - 1;
      else if (idx > 0) newOrder = ((target[idx - 1].order || 0) + (target[idx].order || 0)) / 2;
      else newOrder = target.length ? (target[target.length - 1].order || 0) + 1 : 1;
    } else {
      newOrder = target.length ? (target[target.length - 1].order || 0) + 1 : 1;
    }
    if (chip.lane === lane && chip.col === col && chip.order === newOrder) return;
    chip.lane = lane; chip.col = col; chip.order = newOrder;
    queueWrite("set", chip);
    cacheSave();
    render();
  }

  /* ---------- editor ---------- */
  var overlay = null;
  function closeSheet() {
    if (overlay) { overlay.remove(); overlay = null; }
    document.removeEventListener("keydown", escClose);
  }
  function escClose(e) { if (e.key === "Escape") closeSheet(); }

  function openSheet(id, laneDefault, colDefault) {
    if (!canEdit) return;
    closeSheet();
    var isNew = !id;
    var chip = isNew
      ? { id: newId(), lane: laneDefault || activeTab().lanes[0], col: colDefault || "before", kind: "crit", av: "todo",
          title: "", lead: "D", people: [], week: "", dep: "", sub: [], order: 0 }
      : clone(byId(id));
    if (!chip) return;

    overlay = el("div", "overlay");
    var sheet = el("div", "sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.appendChild(el("h2", null, isNew ? "Nuevo compromiso" : "Editar compromiso"));

    function field(labelText, control, id2) {
      var f = el("div", "field");
      var l = el("label", null, labelText);
      l.setAttribute("for", id2);
      f.appendChild(l); f.appendChild(control);
      return f;
    }

    var title = el("input");
    title.type = "text"; title.id = "f-title"; title.value = chip.title;
    title.placeholder = "Ej.: Pricing público";
    sheet.appendChild(field("Nombre del compromiso", title, "f-title"));

    var two = el("div", "two");
    var laneSel = el("select"); laneSel.id = "f-lane";
    TABS.forEach(function (t) {
      var g = el("optgroup"); g.label = t.name;
      t.lanes.forEach(function (id3) {
        var l = LANES.filter(function (x) { return x.id === id3; })[0];
        var o = el("option", null, l.name); o.value = l.id;
        if (l.id === chip.lane) o.selected = true;
        g.appendChild(o);
      });
      laneSel.appendChild(g);
    });
    var colSel = el("select"); colSel.id = "f-col";
    [["before", "Antes del 1 nov"], ["later", "Después de la apertura"]].forEach(function (p) {
      var o = el("option", null, p[1]); o.value = p[0];
      if (p[0] === chip.col) o.selected = true;
      colSel.appendChild(o);
    });
    two.appendChild(field("Carril", laneSel, "f-lane"));
    two.appendChild(field("Columna", colSel, "f-col"));
    sheet.appendChild(two);

    var two2 = el("div", "two");
    var kindSel = el("select"); kindSel.id = "f-kind";
    [["crit", "Crítico"], ["want", "Deseable"], ["out", "Fuera del hito"]].forEach(function (p) {
      var o = el("option", null, p[1]); o.value = p[0];
      if (p[0] === chip.kind) o.selected = true;
      kindSel.appendChild(o);
    });
    var avSel = el("select"); avSel.id = "f-av";
    ["todo", "doing", "done"].forEach(function (k) {
      var o = el("option", null, AVANCE[k]); o.value = k;
      if (k === chip.av) o.selected = true;
      avSel.appendChild(o);
    });
    var week = el("input"); week.type = "text"; week.id = "f-week";
    week.value = chip.week || ""; week.placeholder = "1–2";
    two2.appendChild(field("Prioridad", kindSel, "f-kind"));
    two2.appendChild(field("Avance", avSel, "f-av"));
    sheet.appendChild(two2);
    sheet.appendChild(field("Semana", week, "f-week"));

    var pf = el("div", "field");
    pf.appendChild(el("span", "grouplabel", "Quiénes intervienen · líder"));
    var ptable = el("div", "ptable");
    PORDER.forEach(function (p) {
      var row = el("div", "prow");
      var l1 = el("label");
      var cb = el("input"); cb.type = "checkbox"; cb.value = p; cb.className = "p-check";
      cb.checked = chip.lead === p || (chip.people || []).indexOf(p) > -1;
      l1.appendChild(cb); l1.appendChild(document.createTextNode(PEOPLE[p]));
      var l2 = el("label", "leadlab");
      var rb = el("input"); rb.type = "radio"; rb.name = "lead"; rb.value = p; rb.className = "p-lead";
      rb.checked = chip.lead === p;
      l2.appendChild(rb); l2.appendChild(document.createTextNode("líder"));
      rb.addEventListener("change", function () { if (rb.checked) cb.checked = true; });
      cb.addEventListener("change", function () { if (!cb.checked && rb.checked) rb.checked = false; });
      row.appendChild(l1); row.appendChild(l2);
      ptable.appendChild(row);
    });
    pf.appendChild(ptable);
    pf.appendChild(el("span", "hint", "El líder aparece con el círculo relleno, primero en el chip."));
    sheet.appendChild(pf);

    var dep = el("input"); dep.type = "text"; dep.id = "f-dep"; dep.value = chip.dep || "";
    dep.placeholder = "Depende de: pricing público";
    sheet.appendChild(field("Dependencia o nota", dep, "f-dep"));

    var sub = el("textarea"); sub.id = "f-sub";
    sub.value = (chip.sub || []).join("\n");
    sub.placeholder = "Una subtarea por línea.\nManu — revisar el pricing\nTomás — publicar la página";
    sheet.appendChild(field("Subtareas (una por línea)", sub, "f-sub"));

    var actions = el("div", "sheet-actions");
    var save = el("button", "btn btn-indigo", isNew ? "Crear" : "Guardar");
    save.type = "button";
    save.addEventListener("click", function () {
      var t = title.value.trim();
      if (!t) { title.focus(); return; }
      chip.title = t;
      chip.lane = laneSel.value;
      chip.col = colSel.value;
      chip.kind = kindSel.value;
      chip.av = avSel.value;
      chip.week = week.value.trim();
      chip.dep = dep.value.trim();
      chip.sub = sub.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      var checked = [];
      Array.prototype.forEach.call(sheet.querySelectorAll(".p-check"), function (c) { if (c.checked) checked.push(c.value); });
      var leadEl = sheet.querySelector(".p-lead:checked");
      chip.lead = leadEl ? leadEl.value : (checked[0] || "");
      chip.people = checked.filter(function (p) { return p !== chip.lead; });
      if (isNew || !chip.order) {
        var sib = inCol(chip.lane, chip.col).filter(function (c) { return c.id !== chip.id; });
        chip.order = sib.length ? (sib[sib.length - 1].order || 0) + 1 : 1;
      }
      var existing = byId(chip.id);
      if (existing) {
        Object.keys(chip).forEach(function (k) { existing[k] = chip[k]; });
        queueWrite("set", existing);
      } else {
        state.push(chip);
        queueWrite("set", chip);
      }
      cacheSave();
      closeSheet();
      render();
      var dest = tabOfLane(chip.lane);
      if (dest.id !== tab) toast("«" + chip.title + "» quedó en la pestaña " + dest.name + ".");
    });
    actions.appendChild(save);

    var cancel = el("button", "btn btn-ghost", "Cancelar");
    cancel.type = "button";
    cancel.addEventListener("click", closeSheet);
    actions.appendChild(cancel);
    actions.appendChild(el("div", "spacer"));

    if (!isNew) {
      var del = el("button", "btn btn-danger", "Eliminar");
      del.type = "button";
      del.addEventListener("click", function () {
        del.textContent = "¿Seguro? Toca de nuevo";
        del.onclick = function () { closeSheet(); removeChip(chip.id); };
      });
      actions.appendChild(del);
    }

    sheet.appendChild(actions);
    overlay.appendChild(sheet);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeSheet(); });
    document.body.appendChild(overlay);
    document.addEventListener("keydown", escClose);
    title.focus();
  }

  /* ---------- arranque ---------- */
  var m = /(?:^|[#&])edit=([^&]+)/.exec(location.hash || "");
  if (m) { editKey = decodeURIComponent(m[1]); canEdit = true; }
  tab = readTabFromHash();
  window.addEventListener("hashchange", function () {
    var t = readTabFromHash();
    if (t !== tab) { tab = t; render(); }
  });

  if (canEdit) {
    Array.prototype.forEach.call(document.querySelectorAll(".editonly"), function (n) { n.hidden = false; });
    document.getElementById("usoBody").innerHTML =
      "<p>Arrastra un chip de una columna a la otra, o usa <b>◀ ▶</b> para moverlo. <b>✎</b> abre el compromiso para editar nombre, prioridad, avance, participantes y líder. <b>+ Compromiso</b> crea uno nuevo en la pestaña que estás viendo.</p>" +
      "<p>El círculo a la izquierda de cada compromiso es su avance: un clic lo pasa de <b>Por empezar</b> a <b>En curso</b> y a <b>Listo</b>.</p>" +
      "<p>Todo lo que cambies se guarda en el Sheet. Quien abra el link sin clave ve el tablero, pero no puede editarlo.</p>";
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-mark]"), function (n) {
    n.insertBefore(markSvg(n.dataset.mark), n.firstChild);
  });

  document.getElementById("addBtn").addEventListener("click", function () { openSheet(null, activeTab().lanes[0], "before"); });
  document.getElementById("refreshBtn").addEventListener("click", function () { fetchRows(false); });

  var allBtn = document.getElementById("toggleAll");
  allBtn.addEventListener("click", function () {
    var next = allBtn.getAttribute("aria-pressed") !== "true";
    allBtn.setAttribute("aria-pressed", String(next));
    allBtn.textContent = next ? "Contraer todo" : "Expandir todo";
    expanded = {};
    if (next) state.forEach(function (c) { expanded[c.id] = true; });
    render();
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-p]"), function (b) {
    b.addEventListener("click", function () {
      filter = filter === b.dataset.p ? null : b.dataset.p;
      Array.prototype.forEach.call(document.querySelectorAll("[data-p]"), function (o) {
        o.setAttribute("aria-pressed", String(o.dataset.p === filter));
      });
      applyFilter();
    });
  });

  var target = new Date(2026, 10, 1);
  var now = new Date();
  var days = Math.round((target - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (days > 0) document.getElementById("left").textContent = days + " días";

  // Primero la caché de este navegador (si existe), después el Sheet.
  // La copia incluida en el archivo solo se usa si el Sheet no responde y no hay caché:
  // así nunca se ve por un instante un estado viejo.
  var cached = cacheLoad();
  if (cached) adoptRows(cached.rows);
  writeHash();
  render();
  fetchRows(false);

  setInterval(function () { if (!overlay && !pending.length) fetchRows(true); }, 60000);
  window.addEventListener("focus", function () { if (!overlay && !pending.length) fetchRows(true); });
})();
