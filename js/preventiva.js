// Manutenção preventiva: rotinas, vencimentos e registro de execução
import { h, norm, fmtDate, fmtMin, modal, confirmar, toast, hojeISO, addDias, diasAte } from './ui.js';
import { state, podeEditar, podeApagar, salvar, apagar, recarregar } from './data.js';
import { abrirFormulario } from './forms.js';
import { blocoAjuda } from './metodos.js';
import { linkComp, tituloPagina, botaoNovo, registrarDetalhe, abrirDetalhe } from './views.js';


const atualizar = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

export const proximaData = r => r.ultima_execucao ? addDias(r.ultima_execucao, Number(r.periodicidade_dias)) : r.inicio;
export function situacao(r) {
  if (r.ativa === false) return { cod: 'pausada', txt: 'Pausada', dias: null };
  const d = diasAte(proximaData(r));
  if (d === null) return { cod: 'ok', txt: 'Sem data', dias: null };
  if (d < 0) return { cod: 'atrasada', txt: `Atrasada ${-d} d`, dias: d };
  if (d === 0) return { cod: 'semana', txt: 'Vence hoje', dias: d };
  if (d <= 7) return { cod: 'semana', txt: `Vence em ${d} d`, dias: d };
  return { cod: 'ok', txt: `Em dia (${d} d)`, dias: d };
}
export const rotinasPendentes = () => state.t.rotinas.filter(r => ['atrasada', 'semana'].includes(situacao(r).cod)).sort((a, b) => proximaData(a).localeCompare(proximaData(b)));

export function registrarExecucao(r) {
  abrirFormulario('execucoes_rotina', {
    padroes: { rotina_id: r.id, executores: r.responsavel ? [r.responsavel] : [] },
    titulo: `Registrar execução: ${r.titulo}`,
    aoSalvar: async d => {
      await recarregar('rotinas');
      if (d.resultado === 'Com anomalia' && podeEditar() && await confirmar('Foi encontrada uma anomalia. Criar uma ação no plano de ação para corrigir?', 'Criar ação')) {
        abrirFormulario('acoes', {
          padroes: { titulo: `Corrigir anomalia: ${r.titulo}`, descricao: d.observacoes || '', componente: r.componente, tipo: 'Corretiva', prioridade: 'Alta' },
          aoSalvar: async a => { try { await salvar('execucoes_rotina', { ...d, acao_id: a.id }, false); } catch { /* a ação já foi criada */ } atualizar(); }
        });
      } else atualizar();
    }
  });
}

registrarDetalhe('rotinas', async r => {
  const sit = situacao(r);
  const exec = state.t.execucoes_rotina.filter(e => e.rotina_id === r.id).sort((a, b) => b.data_execucao.localeCompare(a.data_execucao));
  const dl = h('dl');
  const ln = (t, v) => { if (v) dl.append(h('dt', null, t), h('dd', null, v)); };
  ln('Componente', r.componente ? linkComp(r.componente) : null);
  ln('Item do checklist', r.item_checklist);
  ln('O que verificar', r.instrucoes ? h('span', { class: 'pre' }, r.instrucoes) : null);
  ln('Repete a cada', `${r.periodicidade_dias} dias`);
  ln('Próxima execução', fmtDate(proximaData(r)) + ' — ' + sit.txt);
  ln('Última execução', r.ultima_execucao ? fmtDate(r.ultima_execucao) : 'nunca executada');
  ln('Responsável', r.responsavel);
  ln('Tempo estimado', r.tempo_estimado_min ? fmtMin(r.tempo_estimado_min) : null);
  const hist = exec.length ? h('ul', { class: 'lista-simples' }, exec.slice(0, 12).map(e => h('li', null,
    h('strong', null, fmtDate(e.data_execucao)), h('span', { class: 'etq ' + (e.resultado === 'Conforme' ? 'ok' : 'pend') }, e.resultado),
    h('small', null, [(e.executores?.length ? e.executores.join(', ') : e.executor), e.observacoes].filter(Boolean).join(' • '))))) : h('p', { class: 'vazio' }, 'Nenhuma execução registrada.');
  const acoes = h('div', { class: 'acoes' });
  const corpo = h('div', { class: 'detalhe' }, dl, h('h3', null, 'Histórico de execuções'), hist, acoes);
  const m = modal('Rotina preventiva: ' + r.titulo, corpo, { wide: true });
  if (podeApagar()) acoes.append(h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
    if (!await confirmar('Apagar esta rotina e todo o histórico de execuções? Não dá para desfazer.')) return;
    try { await apagar('rotinas', r); m.close(); toast('Apagada.'); atualizar(); } catch (e) { toast(e.message, 'erro'); }
  } }, 'Apagar'));
  if (podeEditar()) acoes.append(
    h('button', { class: 'btn', type: 'button', onclick: () => { m.close(); abrirFormulario('rotinas', { linha: r, aoSalvar: atualizar }); } }, 'Editar'),
    h('button', { class: 'btn primario', type: 'button', onclick: () => { m.close(); registrarExecucao(r); } }, 'Registrar execução'));
});

function gerarDoChecklist() {
  const ja = new Set(state.t.rotinas.map(r => r.componente + '|' + (r.item_checklist || '')));
  const cand = state.t.componentes.filter(c => (c.checklist_verifica || '').trim() && !ja.has(c.codigo + '|' + (c.item_checklist || '')));
  const corpo = h('div');
  if (!cand.length) { corpo.append(h('p', null, 'Todos os itens de checklist cadastrados na árvore já viraram rotina (ou nenhum componente tem checklist preenchido).')); modal('Gerar rotinas', corpo); return; }
  const per = h('input', { type: 'number', class: 'campo', value: 30, min: 1, id: 'per_pad' });
  const caixas = cand.map(c => ({ c, el: h('input', { type: 'checkbox', checked: true }) }));
  corpo.append(
    h('p', null, 'Cada item de checklist da árvore vira uma rotina com repetição própria. A periodicidade real ainda não está definida: use um valor inicial e ajuste depois em cada rotina.'),
    h('label', { for: 'per_pad' }, 'Repetir a cada (dias)'), per,
    h('div', { class: 'lista-marcar' }, caixas.map(({ c, el }) => h('label', { class: 'multi-item' }, el, ' ', h('span', { class: 'cod' }, c.codigo.replace('EQ006-', '')), ' ', c.nome, c.item_checklist ? h('small', null, ' (item ' + c.item_checklist + ')') : null))));
  const ir = h('button', { class: 'btn primario', type: 'button' }, `Criar rotinas`);
  corpo.append(h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Cancelar'), ir));
  const m = modal('Gerar rotinas a partir do checklist', corpo, { wide: true });
  ir.addEventListener('click', async () => {
    const dias = Math.max(1, Number(per.value) || 30);
    const marcadas = caixas.filter(x => x.el.checked).map(x => x.c);
    if (!marcadas.length) return toast('Marque pelo menos um item.', 'erro');
    ir.disabled = true; ir.textContent = 'Criando…';
    try {
      for (const c of marcadas) await salvar('rotinas', { id: crypto.randomUUID(), titulo: `Checklist${c.item_checklist ? ' item ' + c.item_checklist : ''}: ${c.nome}`, componente: c.codigo, item_checklist: c.item_checklist || null, instrucoes: c.checklist_verifica, periodicidade_dias: dias, inicio: hojeISO(), ativa: true }, true);
      m.close(); toast(`${marcadas.length} rotinas criadas. Ajuste a periodicidade de cada uma.`); atualizar();
    } catch (e) { toast(e.message, 'erro'); ir.disabled = false; ir.textContent = 'Criar rotinas'; }
  });
}

export function viewPreventiva() {
  const rot = state.t.rotinas;
  const sits = rot.map(r => ({ r, s: situacao(r) }));
  const conta = c => sits.filter(x => x.s.cod === c).length;
  const filtro = { q: '', so: '' };
  const busca = h('input', { type: 'search', class: 'campo busca', placeholder: 'Buscar rotina...', 'aria-label': 'Buscar' });
  const sel = h('select', { class: 'campo', 'aria-label': 'Situação' }, h('option', { value: '' }, 'Todas as situações'),
    [['atrasada', 'Atrasadas'], ['semana', 'Vencem em 7 dias'], ['ok', 'Em dia'], ['pausada', 'Pausadas']].map(([v, t]) => h('option', { value: v }, t)));
  const corpo = h('div', { class: 'tabela-rolagem' });
  const desenhar = () => {
    const q = norm(busca.value).split(/\s+/).filter(Boolean);
    const itens = sits.filter(({ r, s }) => (!sel.value || s.cod === sel.value) && q.every(t => norm(r.titulo + ' ' + (state.porCodigo.get(r.componente)?.nome || '') + ' ' + (r.responsavel || '')).includes(t)))
      .sort((a, b) => (a.s.cod === 'pausada') - (b.s.cod === 'pausada') || proximaData(a.r).localeCompare(proximaData(b.r)));
    corpo.replaceChildren(!rot.length ? h('p', { class: 'vazio' }, 'Ainda não há rotinas. Use "+ Nova rotina" ou "Gerar a partir do checklist".')
      : !itens.length ? h('p', { class: 'vazio' }, 'Nenhuma rotina com este filtro.')
      : h('table', { class: 'tabela' }, h('thead', null, h('tr', null, ['Situação', 'Rotina', 'Componente', 'Próxima', 'A cada', 'Responsável', ''].map(t => h('th', null, t)))),
        h('tbody', null, itens.map(({ r, s }) => h('tr', { class: 'clicavel', tabindex: 0, onclick: e => { if (!e.target.closest('a,button')) abrirDet(r); }, onkeydown: e => { if (e.key === 'Enter') abrirDet(r); } },
          h('td', { 'data-rotulo': 'Situação' }, h('span', { class: 'etq sit-' + s.cod }, s.txt)),
          h('td', { 'data-rotulo': 'Rotina' }, r.titulo),
          h('td', { 'data-rotulo': 'Componente' }, r.componente ? linkComp(r.componente) : ''),
          h('td', { 'data-rotulo': 'Próxima' }, fmtDate(proximaData(r))),
          h('td', { 'data-rotulo': 'A cada' }, r.periodicidade_dias + ' d'),
          h('td', { 'data-rotulo': 'Responsável' }, r.responsavel || ''),
          h('td', { class: 'seta' }, podeEditar() && r.ativa !== false ? h('button', { class: 'btn pequeno', type: 'button', onclick: () => registrarExecucao(r) }, 'Registrar') : '›'))))));
  };
  const abrirDet = r => abrirDetalhe('rotinas', r);
  busca.addEventListener('input', desenhar); sel.addEventListener('change', desenhar);
  desenhar();
  const cartao = (n, t, alerta) => h('div', { class: 'cartao-num' + (alerta && n ? ' alerta-num' : '') }, h('strong', null, n), h('span', null, t));
  return h('div', null,
    tituloPagina('Manutenção preventiva', podeEditar() ? h('button', { class: 'btn', type: 'button', onclick: gerarDoChecklist }, 'Gerar a partir do checklist') : null, botaoNovo('Nova rotina', () => abrirFormulario('rotinas', { aoSalvar: atualizar }))),
    blocoAjuda('preventiva'),
    h('div', { class: 'grade-cartoes' }, cartao(conta('atrasada'), 'rotinas atrasadas', true), cartao(conta('semana'), 'vencem em 7 dias'), cartao(conta('ok'), 'em dia'), cartao(rot.length, 'rotinas no total')),
    h('div', { class: 'barra-filtros' }, busca, sel), corpo);
}
