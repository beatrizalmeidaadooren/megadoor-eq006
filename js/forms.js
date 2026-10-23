// Formulários gerados a partir de schema.js
import { h, norm, modal, toast, toLocalInput, uuid, reduzirImagem, fmtDateTime } from './ui.js';
import { TABELAS, LISTAS } from './schema.js';
import { state, caminho, salvar, enviarArquivo, urlArquivo, apagarArquivo, podeApagar, podeEditar, opcoesDe } from './data.js';
import { abrirEditorLista } from './listas.js';

export const hoje = () => toLocalInput().slice(0, 10);
const minutosEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

// rótulo de um registro quando ele aparece num menu de "relacionado a"
export const ROTULO_REF = {
  ocorrencias: o => `${fmtDateTime(o.data_hora)} • ${o.tipo} • ${state.porCodigo.get(o.componente)?.nome || o.componente}`,
  analises: a => a.titulo, hipoteses: a => a.hipotese, rotinas: r => r.titulo, acoes: a => a.titulo
};
const ORDEM_REF = { ocorrencias: (a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''), analises: (a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''), rotinas: (a, b) => a.titulo.localeCompare(b.titulo, 'pt'), acoes: (a, b) => (b.criado_em || '').localeCompare(a.criado_em || '') };

// ---------- menus (lista editável; um valor ou vários) ----------
function campoMenu(campo, valorInicial, novo, id) {
  const multi = !!campo.multi;
  let sel = multi ? new Set(Array.isArray(valorInicial) ? valorInicial : []) : (valorInicial ?? (novo ? campo.padrao : '') ?? '');
  const raiz = h('div', { class: 'menu-campo' });
  const opcoesAtuais = () => {
    const o = opcoesDe(campo.lista);
    const extras = multi ? [...sel].filter(v => !o.includes(v)) : (sel && !o.includes(sel) ? [sel] : []);
    return [...o, ...extras];
  };
  const desenhar = () => {
    raiz.innerHTML = '';
    const ops = opcoesAtuais();
    if (!multi) {
      const s = h('select', { id, class: 'campo' }, campo.req ? null : h('option', { value: '' }, '—'),
        ops.map(o => h('option', { value: o, selected: o === sel }, o)));
      s.addEventListener('change', () => { sel = s.value; });
      if (campo.req && !sel && ops.length) sel = ops[0];
      raiz.append(s); raiz._foco = s;
    } else {
      const resumo = () => sel.size ? [...sel].join(', ') : 'Selecione…';
      const sum = h('summary', { id, class: 'campo' }, resumo());
      const det = h('details', { class: 'multi' }, sum,
        h('div', { class: 'multi-lista' }, ops.length ? ops.map(o => h('label', { class: 'multi-item' },
          h('input', { type: 'checkbox', checked: sel.has(o), onchange: e => { e.target.checked ? sel.add(o) : sel.delete(o); sum.textContent = resumo(); } }), ' ', o))
          : h('p', { class: 'vazio' }, 'Nenhum nome cadastrado ainda. Use "editar lista" para cadastrar.')));
      document.addEventListener('click', function fechar(e) { if (!det.isConnected) return document.removeEventListener('click', fechar); if (!det.contains(e.target)) det.open = false; });
      raiz.append(det); raiz._foco = sum;
    }
  };
  desenhar();
  return { el: raiz, get: () => multi ? [...sel] : sel, recarregar: desenhar };
}

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
    if (a.type === 'link') {
      const ok = /^https?:\/\//i.test(a.url || '');
      item.append(h('a', { href: ok ? a.url : '#', target: '_blank', rel: 'noopener noreferrer', title: a.url }, h('span', { class: 'arq' }, 'Link externo'), h('small', null, a.name)));
      if (aoRemover) item.append(h('button', { type: 'button', class: 'btn-icone pequeno', 'aria-label': 'Remover link', onclick: () => { aoRemover(a); item.remove(); } }, '×'));
      box.append(item); continue;
    }
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
  const novosLinks = [];
  const previa = h('div');
  const entrada = h('input', { type: 'file', multiple: true, accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv', class: 'arquivo-input' });
  const desenhar = async () => {
    previa.innerHTML = '';
    previa.append(await miniaturas([...existentes, ...novosLinks], { aoRemover: a => { if (a.type === 'link') { const i = novosLinks.indexOf(a); if (i >= 0) novosLinks.splice(i, 1); else existentes = existentes.filter(x => x !== a); return; } existentes = existentes.filter(x => x.path !== a.path); removidos.push(a); } }));
    if (novos.length) previa.append(h('p', { class: 'dica' }, `${novos.length} arquivo(s) novo(s) para enviar ao salvar: ${novos.map(f => f.name).join(', ')}`));
  };
  entrada.addEventListener('change', () => {
    for (const arq of entrada.files) {
      if (!arq.type.startsWith('image/') && arq.size > 5 * 1024 * 1024) { toast(`"${arq.name}" tem mais de 5 MB. Guarde-o no OneDrive ou Drive e use "Colar link".`, 'erro'); continue; }
      novos.push(arq);
    }
    entrada.value = ''; desenhar();
  });
  desenhar();
  const camera = h('label', { class: 'btn pequeno' }, 'Tirar foto ou escolher arquivo', entrada);
  const link = h('button', { class: 'btn pequeno', type: 'button', onclick: () => {
    const nome = h('input', { type: 'text', class: 'campo', placeholder: 'Nome do arquivo (ex.: Manual do motor)', maxlength: 100 });
    const url = h('input', { type: 'url', class: 'campo', placeholder: 'https://...' });
    const erro = h('p', { class: 'erro-form', hidden: true });
    const mm = modal('Colar link de arquivo', h('div', null, h('p', { class: 'dica' }, 'Use para arquivos grandes ou que já estão no OneDrive, SharePoint ou Google Drive. O arquivo continua lá; aqui fica só o atalho.'),
      h('label', null, 'Nome'), nome, h('label', null, 'Endereço (link)'), url, erro,
      h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => mm.close() }, 'Cancelar'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => {
          if (!/^https?:\/\/\S+$/i.test(url.value.trim())) { erro.textContent = 'Cole um link que comece com https://'; erro.hidden = false; return; }
          novosLinks.push({ type: 'link', url: url.value.trim(), name: nome.value.trim() || 'Link' }); mm.close(); desenhar();
        } }, 'Adicionar'))));
    nome.focus();
  } }, 'Colar link');
  return {
    el: h('div', null, h('div', { class: 'acoes-linha' }, camera, link), previa),
    async get(id) {
      const enviados = [];
      for (const f of novos) enviados.push(await enviarArquivo(pasta, id, await reduzirImagem(f)));
      for (const r of removidos) { try { await apagarArquivo(r.path); } catch { /* ignora */ } }
      return [...existentes, ...novosLinks, ...enviados];
    }
  };
}

// ---------- ajustes de cada cadastro antes de salvar ----------
const PREPARAR = {
  ocorrencias: d => { d.executor = (d.executores || []).join(', ') || null; },
  execucoes_rotina: d => { d.executor = (d.executores || []).join(', ') || null; },
  anomalias: d => { d.corrigida_em = d.status === 'Corrigida' ? (d.corrigida_em || hoje()) : null; },
  acoes: d => { d.concluida_em = d.status === 'Concluída' ? (d.concluida_em || hoje()) : null; }
};

// ---------- formulário principal ----------
export function abrirFormulario(tabela, { linha = null, padroes = {}, aoSalvar = () => {}, titulo = null } = {}) {
  const def = TABELAS[tabela];
  const novo = !linha;
  const base = { ...padroes, ...(linha || {}) };
  if (tabela === 'ocorrencias' && !base.executores?.length && base.executor) base.executores = [base.executor];
  if (tabela === 'execucoes_rotina' && !base.executores?.length && base.executor) base.executores = [base.executor];
  const ctrl = {};
  const form = h('form', { class: 'formulario', novalidate: true });

  for (const campo of def.campos) {
    let v = base[campo.k];
    if (novo && v === undefined && campo.padrao !== undefined) v = campo.padrao === 'hoje' ? hoje() : campo.padrao;
    let el, id = `f_${tabela}_${campo.k}`;
    if (campo.t === 'titulo') { form.append(h('h3', { class: 'secao-form' }, campo.rotulo)); continue; }
    if (campo.t === 'text' || campo.t === 'number' || campo.t === 'date') {
      const attrs = { id, class: 'campo', type: campo.t === 'number' ? 'number' : campo.t === 'date' ? 'date' : 'text', value: v ?? '' };
      if (campo.t === 'number') { attrs.step = campo.passo || 'any'; attrs.inputmode = 'decimal'; }
      if (campo.k === 'codigo' && !novo) attrs.readOnly = true;
      el = h('input', attrs); ctrl[campo.k] = { el, get: () => el.value.trim() };
    } else if (campo.t === 'textarea') {
      el = h('textarea', { id, class: 'campo', rows: 3 }, v ?? ''); ctrl[campo.k] = { el, get: () => el.value.trim() };
    } else if (campo.t === 'datetime') {
      el = h('input', { id, class: 'campo', type: 'datetime-local', value: v || campo.k === 'data_hora' && novo ? toLocalInput(v) : '' });
      ctrl[campo.k] = { el, get: () => el.value ? new Date(el.value).toISOString() : '' };
    } else if (campo.t === 'select') {
      const opcoes = [...campo.opcoes];
      if (v !== undefined && v !== null && v !== '' && !opcoes.includes(String(v))) opcoes.push(String(v));
      const atual = String(v ?? '');
      el = h('select', { id, class: 'campo' },
        campo.semVazio ? null : h('option', { value: '' }, '—'),
        opcoes.map(o => h('option', { value: o, selected: o === atual }, o)));
      ctrl[campo.k] = { el, get: () => el.value };
    } else if (campo.t === 'menu') {
      const m = campoMenu(campo, v, novo, id);
      el = m.el; ctrl[campo.k] = { el, get: m.get, menu: m };
    } else if (campo.t === 'bool') {
      el = h('input', { id, type: 'checkbox', class: 'caixa', checked: v !== false && v !== null && v !== undefined ? !!v : false });
      ctrl[campo.k] = { el, get: () => el.checked };
    } else if (campo.t === 'comp') {
      const sel = seletorComponente({ valor: v || '' });
      el = sel.el; ctrl[campo.k] = { el, get: sel.get };
    } else if (campo.t === 'ref') {
      const regs = [...state.t[campo.ref]].sort(ORDEM_REF[campo.ref]).slice(0, 300);
      el = h('select', { id, class: 'campo' }, h('option', { value: '' }, '—'),
        regs.map(o => h('option', { value: o.id, selected: o.id === v }, ROTULO_REF[campo.ref](o))));
      ctrl[campo.k] = { el, get: () => el.value };
    } else if (campo.t === 'files') {
      const cf = campoArquivos(v, tabela); el = cf.el; ctrl[campo.k] = { el, arquivos: cf };
    }
    const editarLista = campo.t === 'menu' && podeEditar()
      ? h('button', { type: 'button', class: 'link-editar', onclick: () => abrirEditorLista(campo.lista, () => ctrl[campo.k].menu.recarregar()) }, 'editar lista') : null;
    form.append(h('div', { class: 'linha-campo' + (['textarea', 'comp', 'files'].includes(campo.t) || (campo.t === 'menu' && campo.multi) ? ' cheia' : '') + (campo.t === 'bool' ? ' linha-bool' : '') },
      h('label', { for: id }, campo.rotulo, campo.req ? h('span', { class: 'obrig', 'aria-hidden': 'true' }, ' *') : null, editarLista),
      el, campo.dica ? h('small', { class: 'dica' }, campo.dica) : null));
  }

  // ocorrência: o tempo parado sai do início e do fim (pode ser ajustado à mão)
  if (tabela === 'ocorrencias') {
    const ini = ctrl.data_hora.el, fim = ctrl.data_hora_fim.el, par = ctrl.parada_min.el;
    let manual = !!(linha && linha.parada_min != null && linha.data_hora_fim && minutosEntre(linha.data_hora, linha.data_hora_fim) !== linha.parada_min);
    par.addEventListener('input', () => { manual = true; });
    const recalcular = () => {
      if (manual || !ini.value || !fim.value) return;
      const min = minutosEntre(ini.value, fim.value);
      par.value = min >= 0 ? String(min) : '';
    };
    ini.addEventListener('input', recalcular); fim.addEventListener('input', recalcular);
  }

  const aviso = h('p', { class: 'erro-form', role: 'alert', hidden: true });
  const botaoSalvar = h('button', { class: 'btn primario', type: 'submit' }, 'Salvar');
  const acoes = h('div', { class: 'acoes' },
    h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Cancelar'), botaoSalvar);
  form.append(aviso, acoes);
  const erro = (msg, campo) => { aviso.textContent = msg; aviso.hidden = false; (campo ? ctrl[campo].el._foco || ctrl[campo].el : null)?.focus?.(); };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    aviso.hidden = true;
    const dados = { ...base };
    const chave = def.chave;
    if (novo && chave === 'id') dados.id = uuid();
    for (const campo of def.campos) {
      if (campo.t === 'files' || campo.t === 'titulo') continue;
      let v = ctrl[campo.k].get();
      if ((campo.t === 'number' || campo.num) && !Array.isArray(v)) v = v === '' || v === null ? null : Number(v);
      const vazio = v === '' || v === null || (Array.isArray(v) && !v.length);
      if (campo.req && vazio) return erro(`Preencha: ${campo.rotulo}.`, campo.k);
      dados[campo.k] = Array.isArray(v) ? v : (v === '' ? null : v);
    }
    if (tabela === 'ligacoes' && dados.origem === dados.destino) return erro('Origem e destino não podem ser o mesmo componente.');
    if (tabela === 'componentes' && novo && state.porCodigo.has(dados.codigo)) return erro('Já existe um componente com este código.');
    if (tabela === 'ocorrencias' && dados.data_hora_fim && new Date(dados.data_hora_fim) < new Date(dados.data_hora)) return erro('O fim não pode ser antes do início.', 'data_hora_fim');
    PREPARAR[tabela]?.(dados);
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
