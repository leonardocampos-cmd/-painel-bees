// Página de pedidos encerrados (entregues, cancelados ou não entregues), a partir de D.historico
const PAGINAS = {
  entregues: {
    situacao: "Entregue",
    tipos: ["Entrega completa", "Devolução parcial"],
    vazio: "Nenhum pedido entregue",
    resumo: ["Produtos mais vendidos", "valor faturado dos itens entregues"],
  },
  cancelados: {
    situacao: "Cancelado",
    tipos: ["Rejeitado no BEES", "Cancelado no Winthor", "Cancelado pelo robô"],
    vazio: "Nenhum pedido cancelado",
    resumo: ["Por que foram cancelados", "motivo informado no BEES"],
  },
  nao_entregues: {
    situacao: "Não entregue",
    tipos: ["Falha na entrega", "Devolvido após faturar"],
    vazio: "Nenhum pedido não entregue",
    resumo: ["Por que não foram entregues", "motivo informado no BEES ou da devolução"],
  },
};
const LIMITE = 200;

function paginaHistorico(chave) {
  const cfg = PAGINAS[chave];
  montarTopo(chave);
  const todos = historico().filter((p) => p.situacao === cfg.situacao);
  const entregues = chave === "entregues";

  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const anos = [...new Set(todos.map((p) => p.data?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const opcoes = (lista) => lista.map((v) => `<option>${esc(v)}</option>`).join("");
  $("#f-ano").innerHTML = `<option value="">Todos os anos</option>` + opcoes(anos);
  $("#f-ano").value = anos[0] || "";
  $("#f-mes").innerHTML = `<option value="">Todos os meses</option>` +
    MESES.map((m, i) => `<option value="${String(i + 1).padStart(2, "0")}">${m}</option>`).join("");
  const unicos = (campo) => [...new Set(todos.map((p) => p[campo]).filter(Boolean))].sort();
  $("#f-filial").insertAdjacentHTML("beforeend", opcoes(unicos("filial_nome")));
  $("#f-uf").insertAdjacentHTML("beforeend", opcoes(unicos("uf_nome")));
  $("#f-tipo").insertAdjacentHTML("beforeend", opcoes(cfg.tipos.filter((t) => todos.some((p) => p.tipo === t))));

  let ordem = { campo: "data", asc: false };
  let aberto = null;
  let mostrar = LIMITE;

  const textoBusca = (p) => (p._busca ??= [p.numero, p.cliente, p.cidade, p.motivo_nome, ...p.itens.map((i) => i.produto_nome)]
    .join(" ").toUpperCase());

  function filtrar() {
    const b = $("#f-busca").value.trim().toUpperCase();
    const ano = $("#f-ano").value, mes = $("#f-mes").value;
    const f = { filial_nome: $("#f-filial").value, uf_nome: $("#f-uf").value, tipo: $("#f-tipo").value };
    return todos.filter((p) =>
      (!ano || p.data?.slice(0, 4) === ano) && (!mes || p.data?.slice(5, 7) === mes) &&
      Object.entries(f).every(([k, v]) => !v || p[k] === v) && (!b || textoBusca(p).includes(b)));
  }

  function detalhe(p) {
    const itens = p.itens.length
      ? `<table class="itens"><thead><tr><th>Produto</th><th>Fornecedor</th><th class="n">Qtd pedida</th><th class="n">Qtd faturada</th>
        <th class="n">Qtd devolvida</th><th class="n">Valor</th></tr></thead><tbody>${p.itens.map((i) => `<tr>
        <td>${esc(i.produto_nome)}</td><td class="fraco">${esc(i.fornecedor_nome)}</td><td class="n">${int(i.qt_pedida)}</td>
        <td class="n">${int(i.qt_faturada)}</td><td class="n">${i.qt_devolvida ? int(i.qt_devolvida) : "—"}</td>
        <td class="n">${brl(i.valor)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="fraco">Pedido sem nota no Winthor, por isso sem itens registrados.</p>`;
    return `<tr class="detalhe"><td colspan="${colunas.length}">
      <dl class="det-grade">
        <div><dt>Situação</dt><dd>${esc(p.tipo)}</dd><dt>Motivo</dt><dd>${esc(p.motivo_nome) || "—"}</dd></div>
        <div><dt>Pedido feito em</dt><dd>${dataBR(p.data)}${p.hora != null ? `, ${p.hora}h` : ""}</dd>
          <dt>Faturado em</dt><dd>${dataBR(p.faturado_em)}</dd><dt>Pago em</dt><dd>${dataBR(p.pago_em)}</dd></div>
        <div><dt>Código do cliente no Winthor</dt><dd class="mono">${p.codcli ?? "—"}</dd><dt>Documento</dt><dd>${esc(p.tipo_doc_nome) || "—"}</dd>
          <dt>Valor devolvido</dt><dd>${p.devolvido ? brl(p.devolvido) : "—"}</dd></div>
      </dl>${itens}
    </td></tr>`;
  }

  const colunas = [
    ["numero", "Pedido"], ["filial_nome", "Filial"], ["uf_nome", "UF"], ["cliente", "Cliente"], ["cidade", "Cidade"],
    ["data", "Data do pedido"],
    ...(entregues ? [["faturado_em", "Faturado em"], ["pagamento_nome", "Pagamento"]] : [["tipo", "Situação"], ["motivo_nome", "Motivo"]]),
    ["valor", "Valor", true],
  ];
  const celula = (p, c) => {
    if (c === "numero") return `<td class="mono">${esc(p.numero)}</td>`;
    if (c === "filial_nome") return `<td>${p.filial_nome ? `<span class="tag ${p.filial_nome.toLowerCase()}">${p.filial_nome}</span>` : "—"}</td>`;
    if (c === "data" || c === "faturado_em") return `<td>${dataBR(p[c])}</td>`;
    if (c === "valor") return `<td class="n">${brl(p.valor)}${p.devolvido > 0 && entregues ? `<div class="fraco">devolvido ${brl(p.devolvido)}</div>` : ""}</td>`;
    if (c === "cliente") return `<td>${esc(p.cliente) || "—"}</td>`;
    return `<td class="fraco">${esc(p[c]) || "—"}</td>`;
  };

  function render() {
    const lista = filtrar();
    const { campo, asc } = ordem;
    lista.sort((a, b) => ((a[campo] ?? "") > (b[campo] ?? "") ? 1 : (a[campo] ?? "") < (b[campo] ?? "") ? -1 : 0) * (asc ? 1 : -1));

    const valor = lista.reduce((s, p) => s + (entregues ? p.liquido : p.valor || 0), 0);
    $("#kpis").innerHTML = [
      kpi("Pedidos", int(lista.length), "", true),
      kpi(entregues ? "Valor líquido" : "Valor dos pedidos", brl(valor), entregues ? "descontadas as devoluções" : ""),
      ...cfg.tipos.map((t) => {
        const g = lista.filter((p) => p.tipo === t);
        return kpi(t, int(g.length), `${brl(g.reduce((s, p) => s + (p.valor || 0), 0))}${lista.length ? `, ${Math.round((g.length / lista.length) * 100)}% dos pedidos` : ""}`);
      }),
    ].join("");

    const visiveis = lista.slice(0, mostrar);
    $("#t-pedidos").innerHTML = lista.length ? `<thead><tr>${colunas.map(([c, n, num]) =>
      `<th data-c="${c}" class="${num ? "n" : ""}">${n}${ordem.campo === c ? (ordem.asc ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead>
      <tbody>${visiveis.map((p) => `<tr class="clicavel${aberto === p.numero ? " aberto" : ""}" data-k="${esc(p.numero)}">
        ${colunas.map(([c]) => celula(p, c)).join("")}</tr>${aberto === p.numero ? detalhe(p) : ""}`).join("")}</tbody>`
      : `<tbody><tr><td class="vazio">${cfg.vazio}${todos.length ? " com esses filtros" : ""}.</td></tr></tbody>`;
    $("#mais").innerHTML = lista.length > visiveis.length
      ? `Mostrando ${int(visiveis.length)} de ${int(lista.length)} pedidos <button class="botao" id="b-mais">Mostrar mais</button>`
      : "";

    // Resumo: produtos (entregues) ou motivos (cancelados e não entregues)
    const grupos = {};
    if (entregues) {
      for (const p of lista) for (const i of p.itens) {
        const g = (grupos[i.produto_nome || "Sem nome"] ??= { nome: i.produto_nome || "Sem nome", valor: 0, pedidos: 0 });
        g.valor += (i.valor || 0); g.pedidos++;
      }
    } else {
      for (const p of lista) {
        const nome = p.motivo_nome || "Sem motivo informado";
        const g = (grupos[nome] ??= { nome, valor: 0, pedidos: 0 });
        g.valor += p.valor || 0; g.pedidos++;
      }
    }
    const top = Object.values(grupos).sort((a, b) => entregues ? b.valor - a.valor : b.pedidos - a.pedidos).slice(0, 20);
    $("#r-1").innerHTML = entregues
      ? barras(top, (x) => x.nome, (x) => x.valor, (v) => brl(v, true), (x) => `${int(x.pedidos)} pedidos`)
      : barras(top, (x) => x.nome, (x) => x.pedidos, int, (x) => brl(x.valor, true));
    const cidades = {};
    for (const p of lista) if (p.cidade) (cidades[p.cidade] ??= { nome: p.cidade, pedidos: 0, valor: 0 }), cidades[p.cidade].pedidos++, cidades[p.cidade].valor += p.valor || 0;
    $("#r-2").innerHTML = barras(Object.values(cidades).sort((a, b) => b.pedidos - a.pedidos).slice(0, 15),
      (x) => x.nome, (x) => x.pedidos, int, (x) => brl(x.valor, true));
    return lista;
  }

  $("#t-pedidos").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-c]");
    if (th) {
      ordem = { campo: th.dataset.c, asc: ordem.campo === th.dataset.c ? !ordem.asc : true };
      return render();
    }
    const tr = e.target.closest("tr.clicavel");
    if (tr) { aberto = aberto === tr.dataset.k ? null : tr.dataset.k; render(); }
  });
  $("#mais").addEventListener("click", (e) => { if (e.target.id === "b-mais") { mostrar += LIMITE * 5; render(); } });
  document.querySelectorAll(".filtros input, .filtros select").forEach((el) => el.addEventListener("input", () => { mostrar = LIMITE; render(); }));
  document.querySelectorAll(".abas button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".abas button").forEach((x) => x.classList.toggle("ativo", x === b));
    $("#aba-pedidos").hidden = b.dataset.aba !== "pedidos";
    $("#aba-resumo").hidden = b.dataset.aba !== "resumo";
  }));
  $("#aba-resumo").querySelector("h2").innerHTML = `${cfg.resumo[0]} <small>${cfg.resumo[1]}, nos filtros escolhidos</small>`;

  $("#b-csv").addEventListener("click", () => {
    const cab = ["Pedido", "Filial", "UF", "Situação", "Motivo", "Cliente", "Código Winthor", "Tipo de documento", "Cidade",
      "Data do pedido", "Faturado em", "Pago em", "Pagamento", "Valor", "Devolvido", "Produto", "Fornecedor", "Qtd pedida",
      "Qtd faturada", "Qtd devolvida", "Valor item"];
    const linhas = render().flatMap((p) => {
      const base = [p.numero, p.filial_nome, p.uf_nome, p.tipo, p.motivo_nome, p.cliente, p.codcli ?? "", p.tipo_doc_nome, p.cidade,
        dCSV(p.data), dCSV(p.faturado_em), dCSV(p.pago_em), p.pagamento_nome, numCSV(p.valor), numCSV(p.devolvido)];
      return p.itens.length
        ? p.itens.map((i) => [...base, i.produto_nome, i.fornecedor_nome, numCSV(i.qt_pedida), numCSV(i.qt_faturada),
          numCSV(i.qt_devolvida), numCSV(i.valor)])
        : [base];
    });
    baixarCSV(`pedidos_${chave}`, cab, linhas);
  });

  render();
}
