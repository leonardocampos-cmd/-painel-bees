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
      <a class="marca" href="index.html" aria-label="Painel de pedidos Rigarr no BEES"><img class="logo-rigarr" src="logo_rigarr.png" alt="Grupo Rigarr"><img class="logo-bees" src="logo_bees.svg" alt="BEES One"><span>Painel de pedidos</span></a>
      <nav class="nav">
        <a href="index.html" class="${ativo === "dash" ? "ativo" : ""}">Visão geral</a>
        <a href="preparar.html" class="${ativo === "preparar" ? "ativo" : ""}">A preparar</a>
        <a href="entregar.html" class="${ativo === "entregar" ? "ativo" : ""}">A entregar</a>
        <a href="entregues.html" class="${ativo === "entregues" ? "ativo" : ""}">Entregues</a>
        <a href="cancelados.html" class="${ativo === "cancelados" ? "ativo" : ""}">Cancelados</a>
        <a href="nao_entregues.html" class="${ativo === "nao_entregues" ? "ativo" : ""}">Não entregues</a>
        <a href="clientes.html" class="${ativo === "clientes" ? "ativo" : ""}">Clientes</a>
        <a href="produtos.html" class="${ativo === "produtos" ? "ativo" : ""}">Produtos</a>
        <a href="sem_preco.html" class="${ativo === "sem_preco" ? "ativo" : ""}">Sem preço</a>
        <a href="mercado.html" class="${ativo === "mercado" ? "ativo" : ""}">Mercado</a>
      </nav>
      <div class="gerado">${gerado ? `Dados de ${gerado.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Sem dados"}</div>
      <button class="tema" id="btn-todos" title="Baixar um arquivo com todos os pedidos e a situação de cada um">Baixar tudo</button>
      <button class="tema" id="btn-tema">Tema</button>
    </div></header>`);
  $("#btn-todos").onclick = baixarTodosPedidos;
  $("#btn-tema").onclick = () => {
    const escuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = escuro ? "light" : "dark";
    try { localStorage.setItem("tema", document.documentElement.dataset.theme); } catch {}
    location.reload();
  };
}

// Gera e baixa um CSV que abre direto no Excel (separador ; e acentos preservados)
function baixarCSV(nome, cabecalho, linhas) {
  const csv = [cabecalho, ...linhas].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })),
    download: `${nome}_${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
}
const dCSV = (iso) => (iso ? dataBR(iso) : "");
const numCSV = (v) => (v == null ? "" : String(Math.round(v * 100) / 100).replace(".", ","));

// --- Histórico (Winthor + BEES), um objeto por pedido, com a situação de cada um ---
// posicao: F = faturado no Winthor; E = entregue no BEES sem nota; C = cancelado no Winthor;
// R = rejeitado ou falha na entrega no BEES; X = cancelado pelo robô (CPF/CNPJ irregular); demais = em aberto
let _historico = null;
function historico() {
  if (_historico) return _historico;
  const H = D.historico || {};
  const L = H.listas || {};
  const aObj = (campos) => (linha) => Object.fromEntries(campos.map((c, i) => [c, linha[i]]));
  const pedidos = (H.pedidos || []).map(aObj(H.campos || []));
  for (const p of pedidos) {
    p.filial_nome = L.filial?.[p.filial] ?? "";
    p.uf_nome = L.uf?.[p.uf] ?? "";
    p.motivo_nome = L.motivo?.[p.motivo] ?? "";
    p.pagamento_nome = L.pagamento?.[p.pagamento] ?? "";
    p.tipo_doc_nome = L.tipo_doc?.[p.tipo_doc] ?? "";
    p.status_nome = L.status_bees?.[p.status_bees] ?? "";
    p.itens = [];
    const devTotal = p.posicao === "F" && p.devolvido > 0 && p.devolvido >= p.valor - 0.05;
    if (p.posicao === "F" && devTotal) [p.situacao, p.tipo] = ["Não entregue", "Devolvido após faturar"];
    else if (p.posicao === "F" && p.devolvido > 0) [p.situacao, p.tipo] = ["Entregue", "Devolução parcial"];
    else if (p.posicao === "F" || p.posicao === "E") [p.situacao, p.tipo] = ["Entregue", "Entrega completa"];
    else if (p.posicao === "C") [p.situacao, p.tipo] = ["Cancelado", "Cancelado no Winthor"];
    else if (p.posicao === "X") [p.situacao, p.tipo] = ["Cancelado", "Cancelado pelo robô"];
    else if (p.posicao === "R" && p.status_nome === "FAILED_DELIVERY") [p.situacao, p.tipo] = ["Não entregue", "Falha na entrega"];
    else if (p.posicao === "R") [p.situacao, p.tipo] = ["Cancelado", "Rejeitado no BEES"];
    else [p.situacao, p.tipo] = ["Em aberto", "Em aberto"];
    p.liquido = p.situacao === "Entregue" ? p.valor - (p.devolvido || 0) : 0;
  }
  for (const it of (H.itens || []).map(aObj(H.campos_itens || []))) {
    it.produto_nome = L.produto?.[it.produto] ?? "";
    it.fornecedor_nome = L.fornecedor?.[it.fornecedor] ?? "";
    it.secao_nome = L.secao?.[it.secao] ?? "";
    pedidos[it.pedido]?.itens.push(it);
  }
  return (_historico = pedidos);
}

// Arquivo único: histórico completo mais os pedidos em andamento (a preparar e a entregar), sem repetir pedido
function baixarTodosPedidos() {
  const btn = $("#btn-todos");
  btn.textContent = "Gerando…";
  setTimeout(() => {
    const linhas = new Map();
    for (const p of historico()) {
      linhas.set(p.numero, [p.numero, p.filial_nome, p.uf_nome, p.situacao, p.tipo, p.motivo_nome, p.cliente, p.tipo_doc_nome, "",
        p.cidade, dCSV(p.data), "", dCSV(p.faturado_em), dCSV(p.pago_em), p.pagamento_nome, numCSV(p.valor),
        numCSV(p.devolvido), p.itens.length || ""]);
    }
    const emAndamento = (p, situacao, detalhe) => [p.numero, p.filial, p.uf, situacao, detalhe, "", p.cliente,
      String(p.documento || "").split(":")[0], String(p.documento || "").replace(/^\D+/, ""), p.cidade, dCSV(p.data_pedido),
      dCSV(p.data_entrega), "", "", p.pagamento, numCSV(p.total), "", p.itens?.length || ""];
    for (const p of D.a_entregar?.lista || []) linhas.set(p.numero, emAndamento(p, "A entregar", p.acao || ""));
    for (const p of D.preparar || []) linhas.set(p.numero, emAndamento(p, "A preparar", ""));
    const ordem = [...linhas.values()].sort((a, b) => (b[10].split("/").reverse().join("") > a[10].split("/").reverse().join("") ? 1 : -1));
    baixarCSV("todos_os_pedidos", ["Pedido", "Filial", "UF", "Situação", "Detalhe", "Motivo", "Cliente", "Tipo de documento",
      "Documento", "Cidade", "Data do pedido", "Data de entrega", "Faturado em", "Pago em", "Pagamento", "Valor", "Devolvido",
      "Itens"], ordem);
    btn.textContent = "Baixar tudo";
  }, 30);
}

// --- Arquivo de importação de pedidos no Winthor (modelo SP_ARQUIVO_SP.xlsx) ---
// Linhas montadas pelo arquivo_winthor.py; um .xlsx por estado (cada um é importado no Winthor do seu estado).
// As regras (cliente bloqueado ou sem cadastro, item sem estoque, < R$ 250 sem esses itens) vêm do arquivo_winthor.py.
function carregarScript(global, src) {
  if (window[global]) return Promise.resolve();
  return new Promise((ok, erro) =>
    document.head.appendChild(Object.assign(document.createElement("script"), { src, onload: ok, onerror: erro })));
}
const carregarSheetJS = () => carregarScript("XLSX", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
const carregarJSZip = () => carregarScript("JSZip", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");

async function baixarArquivoWinthor(lista, botao) {
  const AW = D.arquivo_winthor || {};
  const porUF = {}, fora = {};
  let itensRetirados = 0;
  for (const p of lista) {
    const ped = (AW.pedidos || {})[`${p.filial}|${p.numero}`];
    const motivo = !ped ? "sem dados do Winthor" : ped.fora || (!ped.linhas.length ? "sem itens" : "");
    if (motivo) { fora[motivo] = (fora[motivo] || 0) + 1; continue; }
    itensRetirados += ped.itens_retirados || 0;
    (porUF[ped.uf] ??= []).push(...ped.linhas);
  }
  const ufs = Object.keys(porUF);
  const aviso = [...Object.entries(fora).map(([m, n]) => `${n} ${m.toLowerCase()}`),
    itensRetirados && `${itensRetirados} itens sem estoque retirados`].filter(Boolean).join(", ");
  if (!ufs.length) { botao.textContent = `Nenhum pedido para o arquivo${aviso ? ` (${aviso})` : ""}`; return; }
  const texto = botao.textContent;
  botao.textContent = "Gerando…";
  try {
    await carregarSheetJS();
    const dia = new Date().toISOString().slice(0, 10);
    const planilha = (uf) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([AW.colunas, ...porUF[uf]]), "Sheet1");
      return wb;
    };
    if (ufs.length === 1) {
      XLSX.writeFile(planilha(ufs[0]), `${ufs[0]}_ARQUIVO_${ufs[0]}_${dia}.xlsx`);
    } else {
      // O navegador bloqueia vários downloads seguidos: vários estados vão num .zip, um .xlsx por estado
      await carregarJSZip();
      const zip = new JSZip();
      for (const uf of ufs.sort())
        zip.file(`${uf}_ARQUIVO_${uf}_${dia}.xlsx`, XLSX.write(planilha(uf), { bookType: "xlsx", type: "array" }));
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(await zip.generateAsync({ type: "blob" })), download: `ARQUIVOS_WINTHOR_${dia}.zip`,
      });
      a.click();
    }
    botao.textContent = `Baixado: ${ufs.join(", ")}${aviso ? ` · ${aviso}` : ""}`;
    botao.title = aviso;
  } catch (e) {
    botao.textContent = "Erro ao gerar o arquivo";
  }
  setTimeout(() => { botao.textContent = texto; }, 10000);
}
