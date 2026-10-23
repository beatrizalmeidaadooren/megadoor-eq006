// Formulários gerados a partir de schema.js
import { h, norm, modal, toast, toLocalInput, uuid, reduzirImagem, fmtDateTime } from './ui.js';
import { TABELAS, MODOS_FALHA_SUGERIDOS, CAUSAS_SUGERIDAS } from './schema.js';
import { state, caminho, salvar, enviarArquivo, urlArquivo, apagarArquivo, podeApagar } from './data.js';

let contadorLista = 0;

function valoresUnicos(tabela, campo, extra = []) {
  const s = new Set(extra);
  for (const r of state.t[tabela]) if (r[campo]) s.add(r[campo]);
  return [...s].sort((a, b) => a.localeCompare(b, 'pt'));
}

const LISTAS = {
  modos: () => valoresUnicos('ocorrencias', 'modo_falha', MODOS_FALHA_SUGERIDOS),
  causas: () => valoresUnicos('ocorrencias', 'causa', CAUSAS_SUGERIDAS),
  pessoas: () => [...new Set([
    ...valoresUnicos('ocorrencias', 'executor'), ...valoresUnicos('parametros', 'responsavel'),
    ...valoresUnicos('compras', 'aprovado_por'), ...valoresUnicos('usinagem', 'responsavel')])].sort((a, b) => a.localeCompare(b, 'pt')),
  fornecedores: () => valoresUnicos('compras', 'fornecedor'),
  fabricantes: () => valoresUnicos('componentes', 'fabricante'),
  operacoes: () => valoresUnicos('usinagem', 'operacao', ['Caixa da fechadura', 'Chapa-testa', 'Pré-furo da fechadura', 'Fresagem da dobradiça', 'Pré-furo da dobradiça'])
};

// ---------- seletor de componente (busca por código ou nome) ----------
export function seletorComponente({ valor = '', aoMudar = () => {}, ph = 'Digite parte do nome ou do código' } = {}) {
  let atual = valor;
  const entrada = h('input', { type: 'text', class: 'campo', placeholder: ph, autocomplete: 'off', 'aria-label': 'Buscar componente' });
  const lista = h('div', { class: 'sugestoes', hidden: true, role: 'listbox' });
  const etiqueta = h('div', { class: 'comp-escolhido' });
  const raiz = h('div', { class: 'seletor' }, entrada, lista, etiqueta);

  const rotuloDe = cod => { const c = state.porCodigo.get(cod); return c ? `${c.codigo} — ${c.nome}` : cod; };
  const mostrar = () => {
    etiqueta.innerHTML = '';
    if (atual) {
      const caminhoTxt = caminho(atual).map(c => c.nome).join(' › ');
      etiqueta.append(h('strong', null, rotuloDe(atual)), h('small', null, caminhoTxt));
      entrada.value = '';
      entrada.placeholder = 'Trocar componente...';
    }
  };
  const filtrar = () => {
    const q = norm(entrada.value).trim();
    lista.innerHTML = '';
    if (!q) { lista.hidden = true; return; }
    const termos = q.split(/\s+/);
    const achados = state.t.componentes.filter(c => {
      const txt = norm(c.codigo + ' ' + c.nome + ' ' + (c.modelo || '') + ' ' + (c.fabricante || ''));
      return termos.every(t => txt.includes(t));
    }).slice(0, 12);
    if (!achados.length) lista.append(h('div', { class: 'sug-vazia' }, 'Nada encontrado'));
    for (const c of achados) {
      lista.append(h('button', {
        type: 'button', class: 'sug', role: 'option',
        onmousedown: e => e.preventDefault(),
        onclick: () => { atual = c.codigo; lista.hidden = true; mostrar(); aoMudar(atual); }
      }, h('span', { class: 'cod' }, c.codigo), ' ', c.nome,
      h('small', null, caminho(c.codigo).slice(0, -1).map(x => x.nome).join(' › '))));
    }
    lista.hidden = false;
  };
  entrada.addEventListener('input', filtrar);
  entrada.addEventListener('focus', filtrar);
  entrada.addEventListener('blur', () => setTimeout(() => { lista.hidden = true; }, 150));
  mostrar();
  return { el: raiz, get: () => atual, set: v => { atual = v; mostrar(); } };
}

// ---------- anexos ----------
export async function miniaturas(lista, { aoRemover } = {}) {
  const box = h('div', { class: 'anexos' });
  for (const a of lista || []) {
    const item = h('div', { class: 'anexo' });
    const ehImg = (a.type || '').startsWith('image/');
    const link = h('a', { href: '#', target: '_blank', rel: 'noopener', title: a.name }, ehImg ? h('span', { class: 'carregando' }, '…') : h('span', { class: 'arq' }, 'PDF / arquivo'), h('small', null, a.name));
    item.append(link);
    if (aoRemover) item.append(h('button', { type: 'button', class: 'btn-icone pequeno', 'aria-label': 'Remover anexo', onclick: () => { aoRemover(a); item.remove(); } }, '×'));
    box.append(item);
    urlArquivo(a.path).then(u => {
      if (!u) { link.querySelector('span').textContent = 'indisponível'; return; }
      link.href = u;
      if (ehImg) { const img = h('img', { src: u, alt: a.name, loading: 'lazy' }); link.replaceChild(img, link.querySelector('span')); }
    });
  }
  return box;
}

function campoArquivos(valor, pasta) {
  let existentes = [...(valor || [])];
  const novos = [];
  const removidos = [];
  const previa = h('div');
  const entrada = h('input', { type: 'file', multiple: true, accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv', class: 'arquivo-input' });
  const desenhar = async () => {
    previa.innerHTML = '';
    previa.append(await miniaturas(existentes, { aoRemover: a => { existentes = existentes.filter(x => x.path !== a.path); removidos.push(a); } }));
    if (novos.length) previa.append(h('p', { class: 'dica' }, `${novos.length} arquivo(s) novo(s) para enviar ao salvar: ${novos.map(f => f.name).join(', ')}`));
  };
  entrada.addEventListener('change', () => { novos.push(...entrada.files); entrada.value = ''; desenhar(); });
  desenhar();
  const camera = h('label', { class: 'btn pequeno' }, 'Tirar foto ou escolher arquivo', entrada);
  return {
    el: h('div', null, camera, previa),
    async get(id) {
      const enviados = [];
      for (const f of novos) enviados.push(await enviarArquivo(pasta, id, await reduzirImagem(f)));
      for (const r of removidos) { try { await apagarArquivo(r.path); } catch { /* ignora */ } }
      return [...existentes, ...enviados];
    }
  };
}

// ---------- formulário principal ----------
export function abrirFormulario(tabela, { linha = null, padroes = {}, aoSalvar = () => {}, titulo = null } = {}) {
  const def = TABELAS[tabela];
  const novo = !linha;
  const base = { ...padroes, ...(linha || {}) };
  const ctrl = {};
  const datalists = {};
  const form = h('form', { class: 'formulario', novalidate: true });

  for (const campo of def.campos) {
    const v = base[campo.k];
    let el, id = `f_${tabela}_${campo.k}`;
    if (campo.t === 'text' || campo.t === 'number' || campo.t === 'date') {
      const attrs = { id, class: 'campo', type: campo.t === 'number' ? 'number' : campo.t === 'date' ? 'date' : 'text', value: v ?? '' };
      if (campo.t === 'number') { attrs.step = campo.passo || 'any'; attrs.inputmode = 'decimal'; }
      if (campo.k === 'codigo' && !novo) attrs.readOnly = true;
      if (campo.lista) {
        const nome = 'dl' + (++contadorLista);
        attrs.list = nome;
        datalists[nome] = h('datalist', { id: nome }, LISTAS[campo.lista]().map(o => h('option', { value: o })));
      }
      el = h('input', attrs); ctrl[campo.k] = { el, get: () => el.value.trim() };
    } else if (campo.t === 'textarea') {
      el = h('textarea', { id, class: 'campo', rows: 3 }, v ?? ''); ctrl[campo.k] = { el, get: () => el.value.trim() };
    } else if (campo.t === 'datetime') {
      el = h('input', { id, class: 'campo', type: 'datetime-local', value: toLocalInput(v) });
      ctrl[campo.k] = { el, get: () => el.value ? new Date(el.value).toISOString() : '' };
    } else if (campo.t === 'select') {
      const opcoes = [...campo.opcoes];
      if (v && !opcoes.includes(v)) opcoes.push(v);
      const atual = v ?? (novo ? campo.padrao : undefined) ?? '';
      el = h('select', { id, class: 'campo' },
        campo.semVazio ? null : h('option', { value: '' }, '—'),
        opcoes.map(o => h('option', { value: o, selected: o === atual }, o)));
      ctrl[campo.k] = { el, get: () => el.value };
    } else if (campo.t === 'comp') {
      const sel = seletorComponente({ valor: v || '' });
      el = sel.el; ctrl[campo.k] = { el, get: sel.get };
    } else if (campo.t === 'ocorrencia') {
      const ocs = [...state.t.ocorrencias].sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || '')).slice(0, 200);
      el = h('select', { id, class: 'campo' }, h('option', { value: '' }, '—'),
        ocs.map(o => h('option', { value: o.id, selected: o.id === v }, `${fmtDateTime(o.data_hora)} • ${o.tipo} • ${state.porCodigo.get(o.componente)?.nome || o.componente}`)));
      ctrl[campo.k] = { el, get: () => el.value };
    } else if (campo.t === 'files') {
      const pasta = tabela;
      const cf = campoArquivos(v, pasta); el = cf.el; ctrl[campo.k] = { el, arquivos: cf };
    }
    form.append(h('div', { class: 'linha-campo' + (campo.t === 'textarea' || campo.t === 'comp' || campo.t === 'files' ? ' cheia' : '') },
      h('label', { for: id }, campo.rotulo, campo.req ? h('span', { class: 'obrig', 'aria-hidden': 'true' }, ' *') : null),
      el, campo.dica ? h('small', { class: 'dica' }, campo.dica) : null));
  }
  Object.values(datalists).forEach(d => form.append(d));

  const aviso = h('p', { class: 'erro-form', role: 'alert', hidden: true });
  const botaoSalvar = h('button', { class: 'btn primario', type: 'submit' }, 'Salvar');
  const acoes = h('div', { class: 'acoes' },
    h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Cancelar'), botaoSalvar);
  form.append(aviso, acoes);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    aviso.hidden = true;
    const dados = { ...base };
    const chave = def.chave;
    if (novo && chave === 'id') dados.id = uuid();
    for (const campo of def.campos) {
      if (campo.t === 'files') continue;
      let v = ctrl[campo.k].get();
      if (campo.t === 'number') v = v === '' ? null : Number(v);
      if (campo.req && (v === '' || v === null)) { aviso.textContent = `Preencha: ${campo.rotulo}.`; aviso.hidden = false; ctrl[campo.k].el.querySelector?.('input')?.focus(); ctrl[campo.k].el.focus?.(); return; }
      dados[campo.k] = v === '' ? null : v;
    }
    if (tabela === 'ligacoes' && dados.origem === dados.destino) { aviso.textContent = 'Origem e destino não podem ser o mesmo componente.'; aviso.hidden = false; return; }
    if (tabela === 'componentes' && novo && state.porCodigo.has(dados.codigo)) { aviso.textContent = 'Já existe um componente com este código.'; aviso.hidden = false; return; }
    botaoSalvar.disabled = true; botaoSalvar.textContent = 'Salvando…';
    try {
      const campoArq = def.campos.find(c => c.t === 'files');
      if (campoArq) dados[campoArq.k] = await ctrl[campoArq.k].arquivos.get(dados[chave] || dados.id);
      await salvar(tabela, dados, novo);
      m.close(); toast('Salvo.');
      aoSalvar(dados);
    } catch (err) {
      aviso.textContent = err.message; aviso.hidden = false;
      botaoSalvar.disabled = false; botaoSalvar.textContent = 'Salvar';
    }
  });

  const m = modal(titulo || (novo ? `Novo: ${def.rotulo.toLowerCase()}` : `Editar: ${def.rotulo.toLowerCase()}`), form, { wide: true });
  setTimeout(() => form.querySelector('input:not([readonly]), textarea, select')?.focus(), 50);
  return m;
}

export { podeApagar };
