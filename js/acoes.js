// Plano de ação: quadro (kanban) e lista por prazo
import { h, norm, fmtDate, modal, toast, hojeISO, diasAte } from './ui.js';
import { STATUS_ACAO, PRIORIDADES } from './schema.js';
import { state, podeEditar, salvar, opcoesDe } from './data.js';
import { abrirFormulario } from './forms.js';
import { blocoAjuda } from './metodos.js';
import { linkComp, tituloPagina, botaoNovo, abrirDetalhe } from './views.js';

const KANBAN = ['A fazer', 'Em andamento', 'Aguardando peça', 'Concluída'];
export const aberta = a => a.status !== 'Concluída' && a.status !== 'Cancelada';
export const atrasada = a => aberta(a) && a.prazo && diasAte(a.prazo) < 0;
const ordemPrio = p => PRIORIDADES.indexOf(p);
export const gutDe = a => (a.gut_g && a.gut_u && a.gut_t) ? a.gut_g * a.gut_u * a.gut_t : null;
const porUrgencia = (a, b) => (gutDe(b) ?? -1) - (gutDe(a) ?? -1) || (a.prazo || '9999').localeCompare(b.prazo || '9999') || ordemPrio(a.prioridade) - ordemPrio(b.prioridade);
const atualizar = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

export async function moverAcao(a, status, depois = atualizar) {
  if (a.status === status) return;
  const gravar = async resultado => {
    const nova = { ...a, status, concluida_em: status === 'Concluída' ? hojeISO() : null };
    if (resultado) nova.resultado = resultado;
    try { await salvar('acoes', nova, false); toast(status === 'Concluída' ? 'Ação concluída.' : 'Situação alterada.'); depois(); }
    catch (e) { toast(e.message, 'erro'); }
  };
  if (status !== 'Concluída') return gravar();
  const campo = h('textarea', { class: 'campo', rows: 3, placeholder: 'Opcional: o que foi feito e se resolveu.' }, a.resultado || '');
  const m = modal('Concluir ação', h('div', null, h('p', null, h('strong', null, a.titulo)), h('label', null, 'Resultado'), campo,
    h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn primario', type: 'button', onclick: () => { m.close(); gravar(campo.value.trim()); } }, 'Concluir'))));
  campo.focus();
}

function cartao(a, depois) {
  const dias = diasAte(a.prazo);
  const idx = KANBAN.indexOf(a.status);
  const mover = (d, rot) => h('button', { class: 'btn-icone pequeno', type: 'button', 'aria-label': rot, title: rot, onclick: e => { e.stopPropagation(); moverAcao(a, KANBAN[idx + d], depois); } }, d < 0 ? '‹' : '›');
  const prazoTxt = a.prazo ? (aberta(a) ? (dias < 0 ? `atrasada ${-dias} d (${fmtDate(a.prazo)})` : dias === 0 ? 'vence hoje' : `prazo ${fmtDate(a.prazo)}`) : `prazo ${fmtDate(a.prazo)}`) : 'sem prazo';
  const el = h('article', { class: 'cartao-acao prio-' + norm(a.prioridade) + (atrasada(a) ? ' atrasada' : ''), tabindex: 0, draggable: podeEditar() ? 'true' : null,
    onclick: e => { if (!e.target.closest('a,button')) abrirDetalhe('acoes', a); },
    onkeydown: e => { if (e.key === 'Enter' && e.target === el) abrirDetalhe('acoes', a); },
    ondragstart: e => { e.dataTransfer.setData('text/plain', a.id); el.classList.add('arrastando'); }, ondragend: () => el.classList.remove('arrastando') },
  h('div', { class: 'ca-topo' }, h('span', { class: 'etq prio' }, a.prioridade), h('span', { class: 'etq' }, a.tipo), gutDe(a) ? h('span', { class: 'etq gut', title: `GUT: gravidade ${a.gut_g} × urgência ${a.gut_u} × tendência ${a.gut_t}` }, 'GUT ' + gutDe(a)) : null),
  h('div', { class: 'ca-titulo' }, a.titulo),
  a.componente ? h('div', { class: 'ca-linha' }, linkComp(a.componente)) : null,
  h('div', { class: 'ca-rodape' },
    h('small', { class: atrasada(a) ? 'txt-atraso' : '' }, prazoTxt + (a.responsavel ? ' • ' + a.responsavel : '')),
    podeEditar() && idx >= 0 ? h('span', { class: 'ca-mover' }, idx > 0 ? mover(-1, 'Voltar etapa') : null, idx < KANBAN.length - 1 ? mover(1, 'Avançar etapa') : null) : null));
  return el;
}

export function viewAcoes(sub) {
  const todas = () => state.t.acoes;
  const f = { resp: '', prio: '', tipo: '', q: '', canc: false };
  const modoLista = sub === 'lista';
  const abas = h('div', { class: 'abas' }, h('a', { href: '#/acoes', class: !modoLista ? 'ativa' : '' }, 'Quadro'), h('a', { href: '#/acoes/lista', class: modoLista ? 'ativa' : '' }, 'Lista por prazo'));
  const resumo = h('div', { class: 'grade-cartoes' });
  const corpo = h('div');
  const pessoas = [...new Set([...opcoesDe('pessoas'), ...todas().map(a => a.responsavel).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt'));
  const selResp = h('select', { class: 'campo', 'aria-label': 'Responsável' }, h('option', { value: '' }, 'Todos os responsáveis'), pessoas.map(p => h('option', { value: p }, p)));
  const selPrio = h('select', { class: 'campo', 'aria-label': 'Prioridade' }, h('option', { value: '' }, 'Todas as prioridades'), PRIORIDADES.map(p => h('option', { value: p }, p)));
  const selTipo = h('select', { class: 'campo', 'aria-label': 'Tipo' }, h('option', { value: '' }, 'Todos os tipos'), opcoesDe('tipos_acao').map(p => h('option', { value: p }, p)));
  const busca = h('input', { type: 'search', class: 'campo busca', placeholder: 'Buscar ação...', 'aria-label': 'Buscar' });
  const canc = h('label', { class: 'check-linha' }, h('input', { type: 'checkbox', onchange: e => { f.canc = e.target.checked; desenhar(); } }), ' mostrar canceladas');

  const filtradas = () => todas().filter(a => {
    if (a.status === 'Cancelada' && !f.canc) return false;
    if (f.resp && a.responsavel !== f.resp) return false;
    if (f.prio && a.prioridade !== f.prio) return false;
    if (f.tipo && a.tipo !== f.tipo) return false;
    if (f.q && !f.q.split(/\s+/).every(t => norm([a.titulo, a.descricao, a.responsavel, state.porCodigo.get(a.componente)?.nome].join(' ')).includes(t))) return false;
    return true;
  });

  const desenhar = () => {
    const ab = todas().filter(aberta);
    const concl30 = todas().filter(a => a.status === 'Concluída' && a.concluida_em && diasAte(a.concluida_em) >= -30).length;
    resumo.replaceChildren(
      ...[[ab.length, 'ações abertas'], [ab.filter(atrasada).length, 'atrasadas'], [ab.filter(a => a.prioridade === 'Alta').length, 'de prioridade alta'], [concl30, 'concluídas nos últimos 30 dias']]
        .map(([n, r], i) => h('div', { class: 'cartao-num' + (i === 1 && n ? ' alerta-num' : '') }, h('strong', null, n), h('span', null, r))));
    const lista = filtradas();
    corpo.replaceChildren();
    if (!todas().length) { corpo.append(h('p', { class: 'vazio' }, 'Ainda não há ações. Use "+ Nova ação" ou crie a partir de uma ocorrência, análise ou rotina.')); return; }
    if (!modoLista) {
      corpo.append(h('div', { class: 'quadro' }, KANBAN.map(st => {
        const itens = lista.filter(a => a.status === st).sort(porUrgencia);
        const col = h('section', { class: 'coluna', 'data-status': st },
          h('h2', null, st, h('span', { class: 'contagem-sec' }, itens.length)),
          h('div', { class: 'coluna-corpo' }, itens.length ? itens.map(a => cartao(a, desenhar)) : h('p', { class: 'vazio' }, '—')));
        if (podeEditar()) {
          col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('alvo'); });
          col.addEventListener('dragleave', () => col.classList.remove('alvo'));
          col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('alvo'); const a = todas().find(x => x.id === e.dataTransfer.getData('text/plain')); if (a) moverAcao(a, st, desenhar); });
        }
        return col;
      })));
      const canceladas = lista.filter(a => a.status === 'Cancelada');
      if (canceladas.length) corpo.append(h('section', { class: 'painel' }, h('h2', null, 'Canceladas'), h('div', { class: 'grade-acoes' }, canceladas.map(a => cartao(a, desenhar)))));
    } else {
      const grupos = [
        ['Atrasadas', a => aberta(a) && a.prazo && diasAte(a.prazo) < 0, 'atraso'],
        ['Esta semana (próximos 7 dias)', a => aberta(a) && a.prazo && diasAte(a.prazo) >= 0 && diasAte(a.prazo) <= 7],
        ['Mais para frente', a => aberta(a) && a.prazo && diasAte(a.prazo) > 7],
        ['Sem prazo definido', a => aberta(a) && !a.prazo],
        ['Concluídas', a => a.status === 'Concluída'],
        ['Canceladas', a => a.status === 'Cancelada']];
      for (const [titulo, teste, cls] of grupos) {
        const itens = lista.filter(teste).sort(titulo === 'Concluídas' ? (a, b) => (b.concluida_em || '').localeCompare(a.concluida_em || '') : porUrgencia);
        if (!itens.length) continue;
        const grade = h('div', { class: 'grade-acoes' }, itens.map(a => cartao(a, desenhar)));
        corpo.append(['Concluídas', 'Canceladas'].includes(titulo)
          ? h('details', { class: 'painel' }, h('summary', null, h('strong', null, titulo), h('span', { class: 'contagem-sec' }, itens.length)), grade)
          : h('section', { class: 'painel ' + (cls || '') }, h('h2', null, titulo, h('span', { class: 'contagem-sec' }, itens.length)), grade));
      }
      if (!corpo.children.length) corpo.append(h('p', { class: 'vazio' }, 'Nenhuma ação com este filtro.'));
    }
  };
  selResp.addEventListener('change', () => { f.resp = selResp.value; desenhar(); });
  selPrio.addEventListener('change', () => { f.prio = selPrio.value; desenhar(); });
  selTipo.addEventListener('change', () => { f.tipo = selTipo.value; desenhar(); });
  busca.addEventListener('input', () => { f.q = norm(busca.value).trim(); desenhar(); });
  desenhar();
  return h('div', null, tituloPagina('Plano de ação', botaoNovo('Nova ação', () => abrirFormulario('acoes', { aoSalvar: atualizar }))),
    abas, blocoAjuda('gut'), resumo, h('div', { class: 'barra-filtros' }, busca, selResp, selPrio, selTipo, canc), corpo);
}
