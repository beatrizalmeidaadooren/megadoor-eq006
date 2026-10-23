// Telas do aplicativo
import { h, norm, fmtDate, fmtDateTime, fmtMin, fmtMoney, modal, confirmar, toast, baixar, csv } from './ui.js';
import { TABELAS, COLUNAS, CANAIS } from './schema.js';
import {
  state, demo, podeEditar, podeApagar, filhosDe, caminho, descendentes, nivelComponente, apagar,
  backupCompleto, NOMES, demoReiniciar
} from './data.js';
import { abrirFormulario, miniaturas } from './forms.js';
import { desenharMapa, alcance } from './diagram.js';

const irPara = hash => { location.hash = hash; };
const linkComp = cod => {
  const c = state.porCodigo.get(cod);
  return h('a', { href: '#/c/' + encodeURIComponent(cod), class: 'link-comp', title: cod },
    h('span', { class: 'cod' }, (cod || '').replace('EQ006-', '')), ' ', c?.nome || '');
};
const emblemaCanal = canal => {
  if (!canal) return null;
  const n = canal.startsWith('Canal 1') ? 'c1' : canal.startsWith('Canal 2') ? 'c2' : 'cc';
  return h('span', { class: 'emblema ' + n }, canal.startsWith('Canal 1') ? 'Canal 1' : canal.startsWith('Canal 2') ? 'Canal 2' : 'Comum');
};
const tituloPagina = (titulo, ...acoes) => h('div', { class: 'topo-pagina' }, h('h1', null, titulo), h('div', { class: 'acoes-topo' }, ...acoes));
const botaoNovo = (rotulo, fn) => podeEditar() ? h('button', { class: 'btn primario', type: 'button', onclick: fn }, '+ ' + rotulo) : null;

// ---------- cálculos ----------
function contagemFalhas() {
  // falhas por código, somando as dos subitens nos ancestrais
  const total = new Map(), parada = new Map(), proprias = new Map();
  for (const o of state.t.ocorrencias) {
    if (o.tipo !== 'Falha') continue;
    proprias.set(o.componente, (proprias.get(o.componente) || 0) + 1);
    for (const c of caminho(o.componente)) {
      total.set(c.codigo, (total.get(c.codigo) || 0) + 1);
      parada.set(c.codigo, (parada.get(c.codigo) || 0) + (o.parada_min || 0));
    }
  }
  return { total, parada, proprias };
}

function proximoCodigo(pai) {
  const p = state.porCodigo.get(pai);
  if (!p) return 'EQ006-';
  const sep = p.nivel === 'Conjunto' ? '-' : '.';
  const nums = filhosDe(pai).map(f => parseInt(f.codigo.slice(pai.length + 1), 10)).filter(n => !isNaN(n));
  const prox = (nums.length ? Math.max(...nums) : 0) + 1;
  return pai + sep + String(prox).padStart(2, '0');
}
function novoSubitem(pai) {
  const p = pai ? state.porCodigo.get(pai) : null;
  const ordens = state.t.componentes.map(c => c.ordem || 0);
  const padroes = p
    ? { pai, codigo: proximoCodigo(pai), nivel: p.nivel === 'Conjunto' ? 'Componente' : 'Peça ou subitem', canal: p.canal, conjunto: p.conjunto, status: 'Rascunho', detalhar: 'Depois', ordem: Math.max(0, ...ordens) + 1 }
    : { pai: null, codigo: 'EQ006-', nivel: 'Conjunto', status: 'Rascunho', ordem: Math.max(0, ...ordens) + 1 };
  abrirFormulario('componentes', {
    padroes, titulo: p ? `Novo item dentro de ${p.nome}` : 'Novo conjunto',
    aoSalvar: d => irPara('#/c/' + encodeURIComponent(d.codigo))
  });
}

// ---------- célula de tabela ----------
function celula(tabela, campo, linha) {
  const v = linha[campo];
  if (['componente', 'origem', 'destino'].includes(campo)) return linkComp(v);
  if (campo === 'data_hora') return fmtDateTime(v);
  if (/^data_|vigencia/.test(campo)) return fmtDate(v);
  if (campo === 'parada_min') return fmtMin(v);
  if (campo === 'valor') return fmtMoney(v);
  if (campo === 'tipo' && tabela === 'ocorrencias') return h('span', { class: 'etq tipo-' + norm(v) }, v);
  if (campo === 'situacao') return h('span', { class: 'etq ' + (v === 'Confirmada' ? 'ok' : 'pend') }, v);
  return v ?? '';
}
const rotuloCampo = (tabela, k) => TABELAS[tabela].campos.find(c => c.k === k)?.rotulo || k;

// ---------- detalhe (leitura) ----------
export async function abrirDetalhe(tabela, linha) {
  const def = TABELAS[tabela];
  const corpo = h('div', { class: 'detalhe' });
  const dl = h('dl');
  for (const c of def.campos) {
    if (c.t === 'files') continue;
    let v = linha[c.k];
    if (v === null || v === undefined || v === '') continue;
    let conteudo;
    if (c.t === 'comp') conteudo = linkComp(v);
    else if (c.t === 'datetime') conteudo = fmtDateTime(v);
    else if (c.t === 'date') conteudo = fmtDate(v);
    else if (c.k === 'parada_min') conteudo = fmtMin(v);
    else if (c.k === 'valor') conteudo = fmtMoney(v);
    else if (c.t === 'ocorrencia') { const o = state.t.ocorrencias.find(x => x.id === v); conteudo = o ? `${fmtDateTime(o.data_hora)} • ${o.tipo} • ${state.porCodigo.get(o.componente)?.nome || ''}` : v; }
    else conteudo = String(v);
    dl.append(h('dt', null, c.rotulo), h('dd', null, conteudo));
  }
  corpo.append(dl);
  if (linha.anexos?.length) corpo.append(h('h3', null, 'Fotos e anexos'), await miniaturas(linha.anexos));
  const m = modal(def.rotulo, corpo, { wide: true });
  const acoes = h('div', { class: 'acoes' });
  if (podeApagar()) acoes.append(h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
    if (!await confirmar('Apagar este registro? Não dá para desfazer.')) return;
    try { await apagar(tabela, linha); m.close(); toast('Apagado.'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
    catch (e) { toast(e.message, 'erro'); }
  } }, 'Apagar'));
  if (podeEditar()) acoes.append(h('button', { class: 'btn primario', type: 'button', onclick: () => {
    m.close(); abrirFormulario(tabela, { linha, aoSalvar: () => window.dispatchEvent(new HashChangeEvent('hashchange')) });
  } }, 'Editar'));
  corpo.append(acoes);
}

// ---------- listas genéricas ----------
export function viewLista(tabela) {
  const def = TABELAS[tabela];
  const cols = COLUNAS[tabela];
  const busca = h('input', { type: 'search', class: 'campo busca', placeholder: 'Buscar...', 'aria-label': 'Buscar' });
  let filtroTipo = h('select', { class: 'campo', 'aria-label': 'Filtrar por tipo' }, h('option', { value: '' }, 'Todos os tipos'), TABELAS.ocorrencias.campos.find(c => c.k === 'tipo').opcoes.map(o => h('option', { value: o }, o)));
  const corpo = h('div', { class: 'tabela-rolagem' });
  const contagem = h('span', { class: 'contagem' });
  const ordenar = {
    ocorrencias: (a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''),
    compras: (a, b) => (b.data_pedido || b.criado_em || '').localeCompare(a.data_pedido || a.criado_em || ''),
    parametros: (a, b) => (b.data_alteracao || b.criado_em || '').localeCompare(a.data_alteracao || a.criado_em || ''),
    usinagem: (a, b) => (a.operacao || '').localeCompare(b.operacao || '', 'pt'),
    ligacoes: (a, b) => (a.origem + a.destino).localeCompare(b.origem + b.destino, 'pt', { numeric: true })
  }[tabela];

  const desenhar = () => {
    const q = norm(busca.value).split(/\s+/).filter(Boolean);
    const linhas = state.t[tabela].filter(r => {
      if (tabela === 'ocorrencias' && filtroTipo.value && r.tipo !== filtroTipo.value) return false;
      const txt = norm(Object.values(r).map(v => typeof v === 'object' ? '' : v).join(' ') + ' ' + (state.porCodigo.get(r.componente || r.origem)?.nome || '') + ' ' + (state.porCodigo.get(r.destino)?.nome || ''));
      return q.every(t => txt.includes(t));
    }).sort(ordenar);
    contagem.textContent = `${linhas.length} de ${state.t[tabela].length}`;
    corpo.innerHTML = '';
    if (!linhas.length) { corpo.append(h('p', { class: 'vazio' }, state.t[tabela].length ? 'Nenhum registro com este filtro.' : `Ainda não há ${def.plural.toLowerCase()} cadastrados.`)); return; }
    corpo.append(h('table', { class: 'tabela' },
      h('thead', null, h('tr', null, cols.map(c => h('th', null, rotuloCampo(tabela, c))), h('th', null, ''))),
      h('tbody', null, linhas.map(r => h('tr', { tabindex: 0, class: 'clicavel', onclick: e => { if (e.target.closest('a')) return; abrirDetalhe(tabela, r); },
        onkeydown: e => { if (e.key === 'Enter') abrirDetalhe(tabela, r); } },
      cols.map(c => h('td', { 'data-rotulo': rotuloCampo(tabela, c) }, celula(tabela, c, r))),
      h('td', { class: 'seta' }, r.anexos?.length ? h('span', { title: 'Tem anexos' }, '📎') : '›'))))));
  };
  busca.addEventListener('input', desenhar); filtroTipo.addEventListener('change', desenhar);
  desenhar();
  return h('div', null,
    tituloPagina(def.plural, botaoNovo(def.rotulo.toLowerCase(), () => abrirFormulario(tabela, { aoSalvar: desenhar }))),
    h('div', { class: 'barra-filtros' }, busca, tabela === 'ocorrencias' ? filtroTipo : null, contagem),
    corpo);
}

// ---------- início ----------
export function viewInicio() {
  const { total, parada } = contagemFalhas();
  const falhas = state.t.ocorrencias.filter(o => o.tipo === 'Falha');
  const minParada = falhas.reduce((s, o) => s + (o.parada_min || 0), 0);
  const aConfirmar = state.t.ligacoes.filter(l => l.situacao !== 'Confirmada').length;

  const rank = [...total.entries()].filter(([cod]) => state.porCodigo.get(cod)?.nivel === 'Componente')
    .sort((a, b) => b[1] - a[1] || (parada.get(b[0]) || 0) - (parada.get(a[0]) || 0)).slice(0, 6);

  const motores = state.t.componentes.filter(c => c.nivel === 'Componente' && /^(motor|eletromandril)/i.test(c.nome));
  const fichaOk = c => !!(c.modelo && c.n_serie && c.especificacao);
  const ultimas = [...state.t.ocorrencias].sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || '')).slice(0, 6);

  const cartao = (valor, rotulo, href) => h('a', { class: 'cartao-num', href }, h('strong', null, valor), h('span', null, rotulo));

  return h('div', null,
    tituloPagina('Início', botaoNovo('Registrar ocorrência', () => abrirFormulario('ocorrencias', { aoSalvar: () => irPara('#/') }))),
    h('div', { class: 'grade-cartoes' },
      cartao(state.t.componentes.length, 'itens na árvore', '#/arvore'),
      cartao(falhas.length, 'falhas registradas', '#/ocorrencias'),
      cartao(minParada ? fmtMin(minParada) : '0', 'de máquina parada por falhas', '#/ocorrencias'),
      cartao(aConfirmar, 'ligações a confirmar', '#/ligacoes')),
    h('div', { class: 'duas-colunas' },
      h('section', { class: 'painel' }, h('h2', null, 'Quem mais falha'),
        rank.length ? h('ol', { class: 'ranking' }, rank.map(([cod, n]) => h('li', null, linkComp(cod),
          h('span', { class: 'numeros' }, `${n} ${n === 1 ? 'falha' : 'falhas'}`, parada.get(cod) ? ` • ${fmtMin(parada.get(cod))} parado` : '')))) :
          h('p', { class: 'vazio' }, 'Ainda não há falhas registradas. Comece pelo motor da caixa da fechadura: abra-o na árvore e registre as falhas passadas de que a equipe se lembra.'),
        h('small', { class: 'dica' }, 'Soma as falhas do componente e de suas peças.')),
      h('section', { class: 'painel' }, h('h2', null, 'Últimas ocorrências'),
        ultimas.length ? h('ul', { class: 'lista-simples' }, ultimas.map(o => h('li', null,
          h('span', { class: 'etq tipo-' + norm(o.tipo) }, o.tipo), ' ', linkComp(o.componente),
          h('small', null, fmtDateTime(o.data_hora) + (o.modo_falha ? ' • ' + o.modo_falha : ''))))) : h('p', { class: 'vazio' }, 'Nada registrado ainda.'))),
    h('section', { class: 'painel' }, h('h2', null, `Fichas dos motores (${motores.filter(fichaOk).length} de ${motores.length} completas)`),
      h('p', { class: 'dica' }, 'Uma ficha completa tem modelo, número de série e especificação. Clique para preencher.'),
      h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' },
        h('thead', null, h('tr', null, ['Motor', 'Canal', 'Modelo', 'Nº de série', 'Especificação'].map(t => h('th', null, t)))),
        h('tbody', null, motores.map(c => h('tr', null,
          h('td', { 'data-rotulo': 'Motor' }, linkComp(c.codigo)), h('td', { 'data-rotulo': 'Canal' }, emblemaCanal(c.canal)),
          ...['modelo', 'n_serie', 'especificacao'].map(k => h('td', { 'data-rotulo': rotuloCampo('componentes', k) }, c[k] ? '✓' : h('span', { class: 'falta' }, 'falta'))))))))));
}

// ---------- árvore ----------
export function viewArvore() {
  const { total } = contagemFalhas();
  const busca = h('input', { type: 'search', class: 'campo busca', placeholder: 'Buscar por nome, código, modelo...', 'aria-label': 'Buscar na árvore' });
  const canal = h('select', { class: 'campo', 'aria-label': 'Filtrar por canal' }, h('option', { value: '' }, 'Todos os canais'), CANAIS.map(c => h('option', { value: c }, c)));
  const soNiveis = h('select', { class: 'campo', 'aria-label': 'Filtro de detalhamento' },
    h('option', { value: '' }, 'Tudo'), h('option', { value: 'Agora' }, 'Detalhar agora'), h('option', { value: 'critico' }, 'Só críticos'));
  const raiz = h('div', { class: 'arvore' });
  let abrirTodos = false;

  const desenhar = () => {
    const q = norm(busca.value).split(/\s+/).filter(Boolean);
    const filtrando = q.length || canal.value || soNiveis.value;
    const casa = c => {
      if (canal.value && c.canal !== canal.value) return false;
      if (soNiveis.value === 'Agora' && c.detalhar !== 'Agora') return false;
      if (soNiveis.value === 'critico' && c.critico !== 'Sim') return false;
      const txt = norm([c.codigo, c.nome, c.modelo, c.fabricante, c.especificacao].join(' '));
      return q.every(t => txt.includes(t));
    };
    const visiveis = new Set();
    if (filtrando) for (const c of state.t.componentes) if (casa(c)) for (const a of caminho(c.codigo)) visiveis.add(a.codigo);
    const no = c => {
      if (filtrando && !visiveis.has(c.codigo)) return null;
      const filhos = filhosDe(c.codigo).map(no).filter(Boolean);
      const n = total.get(c.codigo);
      const linha = h('div', { class: 'no-arvore nivel-' + c.nivel.charAt(0).toLowerCase() },
        h('a', { href: '#/c/' + encodeURIComponent(c.codigo), class: 'no-link' },
          h('span', { class: 'cod' }, c.codigo.replace('EQ006-', '')), ' ', h('span', { class: 'no-nome' }, c.nome)),
        emblemaCanal(c.canal && c.nivel !== 'Peça ou subitem' ? c.canal : null),
        c.critico === 'Sim' ? h('span', { class: 'etq crit' }, 'crítico') : null,
        c.detalhar === 'Agora' ? h('span', { class: 'etq agora' }, 'detalhar agora') : null,
        n ? h('span', { class: 'etq falhas', title: 'Falhas registradas (inclui as peças)' }, `${n} ${n === 1 ? 'falha' : 'falhas'}`) : null);
      if (!filhos.length) return h('div', { class: 'folha' }, linha);
      return h('details', { open: filtrando || abrirTodos || c.nivel === 'Conjunto' && false }, h('summary', null, linha), h('div', { class: 'filhos' }, filhos));
    };
    raiz.innerHTML = '';
    const topo = filhosDe(null).map(no).filter(Boolean);
    if (!topo.length) raiz.append(h('p', { class: 'vazio' }, 'Nada encontrado.'));
    topo.forEach(n => raiz.append(n));
  };
  [busca, canal, soNiveis].forEach(e => e.addEventListener('input', desenhar));
  desenhar();
  const alternar = h('button', { class: 'btn', type: 'button', onclick: () => {
    abrirTodos = !abrirTodos; raiz.querySelectorAll('details').forEach(d => d.open = abrirTodos);
    alternar.textContent = abrirTodos ? 'Recolher tudo' : 'Abrir tudo';
  } }, 'Abrir tudo');
  return h('div', null,
    tituloPagina('Árvore de componentes', botaoNovo('Conjunto', () => novoSubitem(null))),
    h('div', { class: 'barra-filtros' }, busca, canal, soNiveis, alternar),
    raiz);
}

// ---------- ficha do componente ----------
export function viewComponente(cod) {
  const c = state.porCodigo.get(cod);
  if (!c) return h('div', null, tituloPagina('Componente não encontrado'), h('p', null, `Não existe o código ${cod}.`), h('a', { href: '#/arvore', class: 'btn' }, 'Voltar à árvore'));
  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  const cam = caminho(cod);
  const todos = [cod, ...descendentes(cod)];
  const doGrupo = lista => lista.filter(r => todos.includes(r.componente));
  const rotuloOrigem = r => r.componente !== cod ? h('small', { class: 'origem' }, 'em ', linkComp(r.componente)) : null;

  const ficha = h('dl', { class: 'ficha' });
  const ln = (rot, val) => { if (val) ficha.append(h('dt', null, rot), h('dd', null, val)); };
  ln('Código', cod); ln('Nível', c.nivel); ln('Canal', emblemaCanal(c.canal)); ln('Quantidade', c.qtd);
  ln('Fabricante', c.fabricante); ln('Modelo', c.modelo); ln('Nº de série', c.n_serie);
  ln('Especificação', c.especificacao ? h('span', { class: 'pre' }, c.especificacao) : null);
  ln('Crítico?', c.critico); ln('Detalhar', c.detalhar); ln('Status', c.status);
  const falta = c.falta_saber ? h('div', { class: 'aviso-falta' }, h('strong', null, 'O que ainda falta saber: '), c.falta_saber) : null;
  const checklist = c.checklist_verifica ? h('details', { class: 'checklist' }, h('summary', null, `Checklist atual (item ${c.item_checklist || '—'})`), h('p', null, c.checklist_verifica)) : null;

  const secao = (titulo, n, ...conteudo) => h('section', { class: 'painel' }, h('h2', null, titulo, n !== null ? h('span', { class: 'contagem-sec' }, n) : null), ...conteudo);

  // peças e subitens
  const filhos = filhosDe(cod);
  const secFilhos = secao('Dentro deste item', filhos.length,
    filhos.length ? h('ul', { class: 'lista-simples' }, filhos.map(f => h('li', null, linkComp(f.codigo), f.modelo ? h('small', null, f.modelo) : null))) : h('p', { class: 'vazio' }, 'Nenhum subitem.'),
    podeEditar() ? h('button', { class: 'btn pequeno', type: 'button', onclick: () => novoSubitem(cod) }, '+ Adicionar subitem') : null);

  // linha do tempo
  const oc = doGrupo(state.t.ocorrencias).sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''));
  const secOc = secao('Histórico de ocorrências', oc.length,
    oc.length ? h('ul', { class: 'linha-tempo' }, oc.map(o => h('li', { class: 'ev tipo-' + norm(o.tipo), tabindex: 0, onclick: e => { if (!e.target.closest('a')) abrirDetalhe('ocorrencias', o); }, onkeydown: e => { if (e.key === 'Enter') abrirDetalhe('ocorrencias', o); } },
      h('div', { class: 'ev-topo' }, h('span', { class: 'etq tipo-' + norm(o.tipo) }, o.tipo), h('time', null, fmtDateTime(o.data_hora)), rotuloOrigem(o), o.anexos?.length ? '📎' : null),
      [o.modo_falha && h('div', null, h('b', null, 'Modo de falha: '), o.modo_falha), o.causa && h('div', null, h('b', null, 'Causa: '), o.causa),
        o.sintoma_previo && h('div', null, h('b', null, 'Sintoma prévio: '), o.sintoma_previo), o.acao && h('div', null, h('b', null, 'Ação: '), o.acao),
        (o.parada_min || o.executor) && h('small', null, [o.parada_min ? `Parado ${fmtMin(o.parada_min)}` : '', o.executor ? `Executor: ${o.executor}` : ''].filter(Boolean).join(' • '))])))
      : h('p', { class: 'vazio' }, 'Nenhuma ocorrência registrada.'),
    botaoNovo('Registrar ocorrência', () => abrirFormulario('ocorrencias', { padroes: { componente: cod }, aoSalvar: refresh })));

  const mini = (tabela, linhas, colunas, rotuloBotao) => secao(TABELAS[tabela].plural, linhas.length,
    linhas.length ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela compacta' },
      h('thead', null, h('tr', null, colunas.map(k => h('th', null, rotuloCampo(tabela, k))))),
      h('tbody', null, linhas.map(r => h('tr', { class: 'clicavel', tabindex: 0, onclick: () => abrirDetalhe(tabela, r), onkeydown: e => { if (e.key === 'Enter') abrirDetalhe(tabela, r); } },
        colunas.map(k => h('td', { 'data-rotulo': rotuloCampo(tabela, k) }, k === 'componente' ? (r.componente === cod ? '—' : linkComp(r.componente)) : celula(tabela, k, r))))))))
      : h('p', { class: 'vazio' }, 'Nada registrado.'),
    botaoNovo(rotuloBotao, () => abrirFormulario(tabela, { padroes: { componente: cod }, aoSalvar: refresh })));

  const secCompras = mini('compras', doGrupo(state.t.compras).sort((a, b) => (b.data_pedido || '').localeCompare(a.data_pedido || '')), ['data_pedido', 'componente', 'peca', 'fornecedor', 'valor'], 'Registrar compra');
  const secParams = mini('parametros', doGrupo(state.t.parametros).sort((a, b) => (b.data_alteracao || '').localeCompare(a.data_alteracao || '')), ['data_alteracao', 'componente', 'parametro', 'valor_atual', 'valor_anterior'], 'Registrar parâmetro');

  // ligações
  const ligs = state.t.ligacoes;
  const recebe = ligs.filter(l => l.destino === cod), alimenta = ligs.filter(l => l.origem === cod);
  const abaixo = alcance(ligs, cod, 'abaixo'), acima = alcance(ligs, cod, 'acima');
  const raizes = [...acima].filter(a => !ligs.some(l => l.destino === a));
  const compartilham = new Set();
  for (const r of raizes) for (const d of alcance(ligs, r, 'abaixo')) if (d !== cod && !acima.has(d) && !abaixo.has(d)) compartilham.add(d);
  const itemLig = (l, sentido) => h('li', null, linkComp(sentido === 'de' ? l.origem : l.destino), h('small', null, `${l.tipo} • fio ${l.n_fio || '?'}${l.situacao !== 'Confirmada' ? ' • a confirmar' : ''}`),
    podeEditar() ? h('button', { class: 'btn-icone pequeno', type: 'button', 'aria-label': 'Editar ligação', onclick: () => abrirFormulario('ligacoes', { linha: l, aoSalvar: refresh }) }, '✎') : null);
  const secLig = secao('Ligações', recebe.length + alimenta.length,
    h('div', { class: 'duas-colunas pequenas' },
      h('div', null, h('h3', null, 'Recebe de'), recebe.length ? h('ul', { class: 'lista-simples' }, recebe.map(l => itemLig(l, 'de'))) : h('p', { class: 'vazio' }, '—')),
      h('div', null, h('h3', null, 'Alimenta ou envia para'), alimenta.length ? h('ul', { class: 'lista-simples' }, alimenta.map(l => itemLig(l, 'para'))) : h('p', { class: 'vazio' }, '—'))),
    abaixo.size ? h('p', { class: 'impacto' }, h('b', null, 'Se este item parar, deixam de funcionar: '), [...abaixo].map(x => state.porCodigo.get(x)?.nome || x).join('; ') + '.') : null,
    compartilham.size ? h('p', { class: 'impacto' }, h('b', null, 'Compartilham a mesma fonte de alimentação: '), [...compartilham].map(x => state.porCodigo.get(x)?.nome || x).join('; ') + '.') : null,
    h('div', { class: 'acoes-linha' },
      botaoNovo('Nova ligação', () => abrirFormulario('ligacoes', { padroes: { origem: cod }, aoSalvar: refresh })),
      (recebe.length || alimenta.length) ? h('a', { class: 'btn pequeno', href: '#/ligacoes/mapa/' + encodeURIComponent(cod) }, 'Ver no mapa') : null));

  const acoes = h('div', { class: 'acoes-topo' },
    podeEditar() ? h('button', { class: 'btn', type: 'button', onclick: () => abrirFormulario('componentes', { linha: c, aoSalvar: refresh }) }, 'Editar ficha') : null,
    podeApagar() ? h('button', { class: 'btn perigo-suave', type: 'button', onclick: async () => {
      if (!await confirmar(`Apagar "${c.nome}"? Só é possível se não houver subitens, registros ou ligações.`)) return;
      try { await apagar('componentes', c); toast('Apagado.'); irPara(c.pai ? '#/c/' + encodeURIComponent(c.pai) : '#/arvore'); } catch (e) { toast(e.message, 'erro'); }
    } }, 'Apagar') : null);

  return h('div', { class: 'pagina-comp' },
    h('nav', { class: 'migalhas', 'aria-label': 'Caminho' }, h('a', { href: '#/arvore' }, 'Árvore'), cam.map(x => [' › ', x.codigo === cod ? h('strong', null, x.nome) : h('a', { href: '#/c/' + encodeURIComponent(x.codigo) }, x.nome)])),
    h('div', { class: 'topo-pagina' }, h('h1', null, c.nome), acoes),
    h('section', { class: 'painel' }, ficha, falta, checklist),
    secOc, secFilhos, secLig, secCompras, secParams);
}

// ---------- ligações: tabela e mapa ----------
export function viewLigacoes(sub, arg) {
  const modoMapa = sub === 'mapa';
  const abas = h('div', { class: 'abas' },
    h('a', { href: '#/ligacoes', class: !modoMapa ? 'ativa' : '' }, 'Tabela'),
    h('a', { href: '#/ligacoes/mapa', class: modoMapa ? 'ativa' : '' }, 'Mapa'));
  if (!modoMapa) { const v = viewLista('ligacoes'); v.prepend(abas); return v; }

  let sel = arg ? decodeURIComponent(arg) : null;
  const tipoSel = h('select', { class: 'campo', 'aria-label': 'Tipo de ligação' }, h('option', { value: '' }, 'Todos os tipos'), TABELAS.ligacoes.campos.find(c => c.k === 'tipo').opcoes.map(t => h('option', { value: t, selected: t === 'Potência' }, t)));
  const quadro = h('div'), info = h('div', { class: 'painel info-mapa' });
  const desenhar = () => {
    let ligs = state.t.ligacoes.filter(l => !tipoSel.value || l.tipo === tipoSel.value);
    // foco: só o que se liga ao item escolhido (acima e abaixo)
    quadro.innerHTML = '';
    if (sel) {
      const conj = new Set([sel, ...alcance(ligs, sel, 'abaixo'), ...alcance(ligs, sel, 'acima')]);
      ligs = ligs.filter(l => conj.has(l.origem) && conj.has(l.destino));
    }
    quadro.append(desenharMapa(ligs, { selecionado: sel, aoClicar: c => { sel = (sel === c) ? null : c; history.replaceState(null, '', '#/ligacoes/mapa' + (sel ? '/' + encodeURIComponent(sel) : '')); desenhar(); } }));
    info.innerHTML = '';
    if (sel) {
      const todas = state.t.ligacoes.filter(l => !tipoSel.value || l.tipo === tipoSel.value);
      const ab = alcance(todas, sel, 'abaixo');
      info.append(h('h3', null, state.porCodigo.get(sel)?.nome || sel),
        ab.size ? h('p', null, h('b', null, 'Se parar, deixam de funcionar: '), [...ab].map(x => state.porCodigo.get(x)?.nome || x).join('; ') + '.') : h('p', null, 'Não alimenta nenhum outro item cadastrado.'),
        h('div', { class: 'acoes-linha' }, h('a', { class: 'btn pequeno', href: '#/c/' + encodeURIComponent(sel) }, 'Abrir ficha'), h('button', { class: 'btn pequeno', type: 'button', onclick: () => { sel = null; history.replaceState(null, '', '#/ligacoes/mapa'); desenhar(); } }, 'Mostrar tudo')));
    } else info.append(h('p', { class: 'dica' }, 'Clique em uma caixa para ver o que ela alimenta e de onde recebe. Linha tracejada = ligação ainda a confirmar. Cor da linha: laranja = canal 1, azul = canal 2, cinza = comum. Os números sobre as linhas são os números dos fios.'));
  };
  tipoSel.addEventListener('change', desenhar);
  desenhar();
  return h('div', null, abas, tituloPagina('Mapa de ligações', botaoNovo('Ligação', () => abrirFormulario('ligacoes', { aoSalvar: desenhar }))),
    h('div', { class: 'barra-filtros' }, tipoSel), info, quadro);
}

// ---------- backup ----------
export function viewBackup() {
  const stamp = new Date().toISOString().slice(0, 10);
  const linhas = NOMES.map(n => h('tr', null, h('td', null, n === 'componentes' ? 'Componentes (árvore)' : TABELAS[n].plural), h('td', null, state.t[n].length),
    h('td', null, h('button', { class: 'btn pequeno', type: 'button', onclick: () => {
      const cols = n === 'componentes' ? TABELAS[n].campos.map(c => c.k).concat(['pai']) : ['id', ...TABELAS[n].campos.map(c => c.k)];
      baixar(`megadoor_${n}_${stamp}.csv`, csv(state.t[n], [...new Set(cols)]), 'text/csv;charset=utf-8');
    } }, 'Baixar planilha (CSV)'))));
  return h('div', null, tituloPagina('Backup e exportação'),
    h('section', { class: 'painel' },
      h('p', null, 'Baixe uma cópia de tudo com frequência (por exemplo, toda sexta-feira). O plano gratuito do banco de dados não inclui backups automáticos nem restauração.'),
      h('button', { class: 'btn primario', type: 'button', onclick: () => baixar(`megadoor_backup_${stamp}.json`, JSON.stringify(backupCompleto(), null, 1), 'application/json') }, 'Baixar backup completo (JSON)'),
      h('p', { class: 'dica' }, 'As fotos e anexos ficam guardados à parte; este arquivo traz os dados e os nomes dos anexos, não as imagens.')),
    h('section', { class: 'painel' }, h('h2', null, 'Planilhas por assunto'), h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' }, h('thead', null, h('tr', null, h('th', null, 'Assunto'), h('th', null, 'Registros'), h('th', null, ''))), h('tbody', null, linhas)))),
    demo ? h('section', { class: 'painel' }, h('h2', null, 'Modo demonstração'), h('p', null, 'Os dados deste modo ficam só neste navegador e as fotos não são guardadas.'),
      h('button', { class: 'btn perigo-suave', type: 'button', onclick: async () => { if (await confirmar('Voltar os dados de demonstração ao início?', 'Reiniciar')) demoReiniciar(); } }, 'Reiniciar demonstração')) : null);
}
