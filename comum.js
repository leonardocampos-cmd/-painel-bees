// Utilitários compartilhados pelas páginas do painel
const D = window.DADOS || {};

try {
  const salvo = localStorage.getItem("tema");
  if (salvo) document.documentElement.dataset.theme = salvo;
} catch {}

const brl = (v, curto = false) => {
  if (v == null || isNaN(v)) return "—";
  if (curto && Math.abs(v) >= 1000) {
    const [div, suf] = Math.abs(v) >= 1e6 ? [1e6, " mi"] : [1e3, " mil"];
    return "R$ " + (v / div).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + suf;
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const int = (v) => (v ?? 0).toLocaleString("pt-BR");
const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const mesBR = (ym) => {
  const [a, m] = ym.split("-");
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][+m - 1] + "/" + a.slice(2);
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel) => document.querySelector(sel);
const css = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

function diasAte(iso) {
  if (!iso) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + "T00:00:00") - hoje) / 864e5);
}

// Etiqueta da data de entrega: atrasado / hoje / amanhã
function tagEntrega(iso) {
  const d = diasAte(iso);
  if (d == null) return "—";
  if (d < 0) return `<span class="tag hoje">${dataBR(iso)}, atrasado</span>`;
  if (d === 0) return `<span class="tag hoje">${dataBR(iso)}, hoje</span>`;
  if (d === 1) return `<span class="tag amanha">${dataBR(iso)}, amanhã</span>`;
  return dataBR(iso);
}

function linkTel(t) {
  const n = String(t || "").replace(/\D/g, "");
  return n ? `<a href="https://wa.me/${n}" target="_blank" rel="noopener">${esc(t)}</a>` : "—";
}

function variacao(atual, anterior) {
  if (!anterior) return "";
  const p = ((atual - anterior) / anterior) * 100;
  const cls = p >= 0 ? "sobe" : "desce";
  return `<b class="${cls}">${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toFixed(0)}%</b> vs. 30 dias anteriores`;
}

function kpi(rotulo, valor, detalhe = "", destaque = false) {
  return `<div class="card kpi${destaque ? " destaque" : ""}"><div class="rot">${rotulo}</div>
    <div class="val">${valor}</div><div class="det">${detalhe}</div></div>`;
}

function barras(lista, rotulo, valor, fmt = int, detalhe = null) {
  if (!lista?.length) return `<div class="vazio">Sem dados</div>`;
  const max = Math.max(...lista.map(valor)) || 1;
  return `<div class="barras">${lista.map((x) => `
    <div class="barra"><div class="linha"><span class="nome" title="${esc(rotulo(x))}">${esc(rotulo(x))}</span>
      <span class="num">${fmt(valor(x))}${detalhe ? `<span class="fraco">, ${detalhe(x)}</span>` : ""}</span></div>
      <div class="trilho"><span style="width:${(valor(x) / max) * 100}%"></span></div></div>`).join("")}</div>`;
}

// Cabeçalho com navegação, data da geração e troca de tema
function montarTopo(ativo) {
  const gerado = D.gerado_em ? new Date(D.gerado_em) : null;
  document.body.insertAdjacentHTML("afterbegin", `
    <header class="topo"><div class="topo-in">
      <div class="marca"><i></i>Painel BEES<span>Rigarr e Castas</span></div>
      <nav class="nav">
        <a href="index.html" class="${ativo === "dash" ? "ativo" : ""}">Visão geral</a>
        <a href="preparar.html" class="${ativo === "preparar" ? "ativo" : ""}">A preparar</a>
        <a href="entregar.html" class="${ativo === "entregar" ? "ativo" : ""}">A entregar</a>
      </nav>
      <div class="gerado">${gerado ? `Dados de ${gerado.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Sem dados"}</div>
      <button class="tema" id="btn-tema">Tema</button>
    </div></header>`);
  $("#btn-tema").onclick = () => {
    const escuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = escuro ? "light" : "dark";
    try { localStorage.setItem("tema", document.documentElement.dataset.theme); } catch {}
    location.reload();
  };
}
