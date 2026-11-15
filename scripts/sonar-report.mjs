#!/usr/bin/env node
/**
 * Genera un reporte HTML con los resultados de SonarQube de uno o más proyectos.
 *
 * Uso (desde la raíz de orm-lab):
 *   node --env-file=.env.sonar scripts/sonar-report.mjs                 # los tres proyectos
 *   node --env-file=.env.sonar scripts/sonar-report.mjs orm-lab-prisma  # uno o varios
 *
 * Variables de entorno (en .env.sonar):
 *   SONAR_HOST_URL  URL del servidor (por defecto http://localhost:9000)
 *   SONAR_TOKEN     token de USUARIO (squ_...), con permiso para ver los proyectos
 *
 * Salida: reports/sonar-report.html (+ reports/sonar-report.json con los datos crudos)
 * Código de salida: 1 si algún proyecto no pasa el Quality Gate (útil en CI).
 *
 * Solo usa la Web API pública de SonarQube y fetch nativo de Node: no requiere dependencias.
 */
import { mkdir, writeFile } from "node:fs/promises";

const HOST = (process.env.SONAR_HOST_URL ?? "http://localhost:9000").replace(/\/$/, "");
const TOKEN = process.env.SONAR_TOKEN;
const PROJECTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["orm-lab-typeorm", "orm-lab-prisma", "orm-lab-drizzle"];

if (!TOKEN || TOKEN.startsWith("<")) {
  console.error("Falta SONAR_TOKEN. Copia .env.sonar.example como .env.sonar y pega tu token de usuario.");
  process.exit(2);
}

// ---------------------------------------------------------------- Web API

async function api(path, params = {}) {
  const url = new URL(path, HOST);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) {
    const error = new Error(`${res.status} ${res.statusText} en ${url.pathname}: ${await res.text()}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/** Lee varias métricas; si alguna no existe en esta versión de SonarQube, devuelve {}. */
async function measures(component, metricKeys) {
  try {
    const data = await api("/api/measures/component", { component, metricKeys: metricKeys.join(",") });
    return Object.fromEntries(data.component.measures.map((m) => [m.metric, m.value]));
  } catch (e) {
    if (e.status === 404) return {};
    throw e;
  }
}

/** Recorre todas las páginas de un endpoint paginado (máx. 10.000 resultados). */
async function paginate(path, params, listKey) {
  const items = [];
  for (let p = 1; ; p++) {
    const data = await api(path, { ...params, ps: 500, p });
    items.push(...data[listKey]);
    const total = data.paging?.total ?? data.total ?? items.length;
    if (items.length >= total || data[listKey].length === 0 || items.length >= 10000) break;
  }
  return items;
}

/**
 * Las versiones recientes de SonarQube esperan el parámetro `project`;
 * las anteriores, `projectKey`. Se prueba el nuevo y, si responde 400, el antiguo.
 */
async function hotspotsDe(key) {
  try {
    return await paginate("/api/hotspots/search", { project: key }, "hotspots");
  } catch (e) {
    if (e.status !== 400) throw e;
    return paginate("/api/hotspots/search", { projectKey: key }, "hotspots");
  }
}

// ---------------------------------------------------------------- Datos

const RATING = { "1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E" };

async function collect(key) {
  const [gate, base, mqr, legacy, issues, hotspots] = await Promise.all([
    api("/api/qualitygates/project_status", { projectKey: key }),
    measures(key, ["ncloc", "coverage", "duplicated_lines_density", "security_hotspots"]),
    // Modo MQR (por defecto en versiones recientes) y modo estándar: se usa el que exista
    measures(key, [
      "software_quality_security_rating",
      "software_quality_reliability_rating",
      "software_quality_maintainability_rating",
    ]),
    measures(key, ["security_rating", "reliability_rating", "sqale_rating"]),
    paginate("/api/issues/search", { components: key, resolved: "false" }, "issues"),
    hotspotsDe(key),
  ]);

  const ratings = {
    seguridad: RATING[mqr.software_quality_security_rating ?? legacy.security_rating] ?? "–",
    confiabilidad: RATING[mqr.software_quality_reliability_rating ?? legacy.reliability_rating] ?? "–",
    mantenibilidad: RATING[mqr.software_quality_maintainability_rating ?? legacy.sqale_rating] ?? "–",
  };

  // Cada issue se clasifica por "calidad de software" (MQR) o, si no existe, por tipo (estándar)
  const porCalidad = { SECURITY: 0, RELIABILITY: 0, MAINTAINABILITY: 0 };
  const TIPO_A_CALIDAD = { VULNERABILITY: "SECURITY", BUG: "RELIABILITY", CODE_SMELL: "MAINTAINABILITY" };
  for (const issue of issues) {
    const calidades = issue.impacts?.length
      ? issue.impacts.map((i) => i.softwareQuality)
      : [TIPO_A_CALIDAD[issue.type]].filter(Boolean);
    for (const c of calidades) porCalidad[c] = (porCalidad[c] ?? 0) + 1;
  }

  return {
    key,
    gate: gate.projectStatus,
    lineas: base.ncloc ?? "–",
    cobertura: base.coverage != null ? `${base.coverage}%` : "–",
    duplicacion: base.duplicated_lines_density != null ? `${base.duplicated_lines_density}%` : "–",
    ratings,
    porCalidad,
    issues,
    hotspots,
  };
}

// ---------------------------------------------------------------- HTML

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const archivo = (component) => component.split(":").slice(1).join(":");

const severidad = (issue) =>
  issue.impacts?.length
    ? issue.impacts.map((i) => `${i.softwareQuality.toLowerCase()} · ${i.severity.toLowerCase()}`).join(", ")
    : `${(issue.type ?? "").toLowerCase()} · ${(issue.severity ?? "").toLowerCase()}`;

const COMPARADOR = { GT: ">", LT: "<" };

function seccion(p) {
  const ok = p.gate.status === "OK";
  const condiciones = (p.gate.conditions ?? [])
    .map(
      (c) => `<tr class="${c.status === "OK" ? "" : "fail"}"><td>${esc(c.metricKey)}</td><td>${esc(c.actualValue ?? "–")}</td>
        <td>${COMPARADOR[c.comparator] ?? esc(c.comparator)} ${esc(c.errorThreshold)}</td><td>${esc(c.status)}</td></tr>`
    )
    .join("");

  const filasIssues = p.issues
    .map(
      (i) => `<tr><td>${esc(severidad(i))}</td><td><code>${esc(archivo(i.component))}${i.line ? `:${i.line}` : ""}</code></td>
        <td>${esc(i.message)}</td><td><a href="${HOST}/project/issues?id=${encodeURIComponent(p.key)}&open=${encodeURIComponent(i.key)}">${esc(i.rule)}</a></td></tr>`
    )
    .join("");

  const filasHotspots = p.hotspots
    .map(
      (h) => `<tr><td>${esc(h.vulnerabilityProbability)}</td><td><code>${esc(archivo(h.component))}${h.line ? `:${h.line}` : ""}</code></td>
        <td>${esc(h.message)}</td><td>${esc(h.status)}</td></tr>`
    )
    .join("");

  return `
  <section>
    <h2>${esc(p.key)} <span class="badge ${ok ? "ok" : "ko"}">Quality Gate: ${ok ? "APROBADO" : p.gate.status === "ERROR" ? "NO APROBADO" : esc(p.gate.status)}</span></h2>
    <div class="cards">
      <div><b>${esc(p.lineas)}</b><span>líneas de código</span></div>
      <div><b>${esc(p.cobertura)}</b><span>cobertura</span></div>
      <div><b>${esc(p.duplicacion)}</b><span>duplicación</span></div>
      <div><b class="r-${p.ratings.seguridad}">${p.ratings.seguridad}</b><span>seguridad · ${p.porCalidad.SECURITY} issues</span></div>
      <div><b class="r-${p.ratings.confiabilidad}">${p.ratings.confiabilidad}</b><span>confiabilidad · ${p.porCalidad.RELIABILITY} issues</span></div>
      <div><b class="r-${p.ratings.mantenibilidad}">${p.ratings.mantenibilidad}</b><span>mantenibilidad · ${p.porCalidad.MAINTAINABILITY} issues</span></div>
      <div><b>${p.hotspots.length}</b><span>security hotspots</span></div>
    </div>
    ${condiciones ? `<h3>Condiciones del Quality Gate</h3><table><tr><th>Métrica</th><th>Valor</th><th>Umbral de error</th><th>Estado</th></tr>${condiciones}</table>` : ""}
    <h3>Issues abiertos (${p.issues.length})</h3>
    ${filasIssues ? `<table><tr><th>Impacto</th><th>Ubicación</th><th>Mensaje</th><th>Regla</th></tr>${filasIssues}</table>` : "<p>Sin issues abiertos 🎉</p>"}
    <h3>Security hotspots (${p.hotspots.length})</h3>
    ${filasHotspots ? `<table><tr><th>Probabilidad</th><th>Ubicación</th><th>Mensaje</th><th>Estado</th></tr>${filasHotspots}</table>` : "<p>Sin hotspots por revisar.</p>"}
  </section>`;
}

function html(proyectos) {
  const fecha = new Date().toLocaleString("es-CL");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte SonarQube · ORM Lab</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem auto; max-width: 1100px; padding: 0 1rem; color: #1f2328; }
  h1 { margin-bottom: .25rem } .meta { color: #656d76; margin-top: 0 }
  section { border-top: 1px solid #d0d7de; padding-top: 1rem; margin-top: 2rem }
  .badge { font-size: .8rem; padding: .2rem .6rem; border-radius: 1rem; vertical-align: middle; color: #fff }
  .ok { background: #1a7f37 } .ko { background: #cf222e }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .75rem; margin: 1rem 0 }
  .cards div { border: 1px solid #d0d7de; border-radius: .5rem; padding: .75rem; display: flex; flex-direction: column }
  .cards b { font-size: 1.5rem } .cards span { color: #656d76; font-size: .85rem }
  .r-A { color: #1a7f37 } .r-B { color: #4d8f00 } .r-C { color: #bf8700 } .r-D { color: #d1590f } .r-E { color: #cf222e }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; margin-bottom: 1rem }
  th, td { border: 1px solid #d0d7de; padding: .4rem .6rem; text-align: left; vertical-align: top }
  th { background: #f6f8fa } tr.fail td { background: #ffebe9 }
  code { font-size: .85rem }
</style></head>
<body>
  <h1>Reporte de calidad · ORM Lab</h1>
  <p class="meta">Generado el ${esc(fecha)} desde <a href="${HOST}">${esc(HOST)}</a></p>
  ${proyectos.map(seccion).join("")}
</body></html>`;
}

// ---------------------------------------------------------------- Main

const proyectos = [];
const omitidos = [];
for (const key of PROJECTS) {
  try {
    proyectos.push(await collect(key));
  } catch (e) {
    if (e.status === 404) {
      // El proyecto aún no existe en SonarQube: se omite y se sigue con los demás
      omitidos.push(key);
      console.warn(`⚠ ${key} no existe en SonarQube. Ejecuta \`npm run sonar\` en ese proyecto. Se omite del reporte.`);
      continue;
    }
    console.error(`No se pudo leer ${key}: ${e.message}`);
    if (e.status === 401 || e.status === 403) {
      console.error("Revisa SONAR_TOKEN en .env.sonar: debe ser un User Token vigente.");
    }
    process.exit(2);
  }
}

if (proyectos.length === 0) {
  console.error("Ningún proyecto tiene análisis en SonarQube todavía. Ejecuta `npm run sonar` en al menos uno.");
  process.exit(2);
}

await mkdir("reports", { recursive: true });
await writeFile("reports/sonar-report.html", html(proyectos));
await writeFile("reports/sonar-report.json", JSON.stringify(proyectos, null, 2));

console.table(
  proyectos.map((p) => ({
    proyecto: p.key,
    "quality gate": p.gate.status,
    cobertura: p.cobertura,
    duplicación: p.duplicacion,
    seguridad: p.ratings.seguridad,
    confiabilidad: p.ratings.confiabilidad,
    mantenibilidad: p.ratings.mantenibilidad,
    issues: p.issues.length,
    hotspots: p.hotspots.length,
  }))
);
console.log("Reporte generado: reports/sonar-report.html");
if (omitidos.length) console.log(`Proyectos omitidos (sin análisis): ${omitidos.join(", ")}`);

process.exitCode = proyectos.every((p) => p.gate.status === "OK") ? 0 : 1;
