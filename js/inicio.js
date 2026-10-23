// Tela inicial: o que precisa de atenção hoje
import { h, norm, fmtDate, fmtDateTime, fmtMin } from './ui.js';
import { state, podeEditar } from './data.js';
import { abrirFormulario } from './forms.js';
import { linkComp, emblemaCanal, tituloPagina, botaoNovo, contagemFalhas, rotuloCampo, abrirDetalhe } from './views.js';
import { aberta, atrasada } from './acoes.js';
import { situacao, proximaData, rotinasPendentes } from './preventiva.js';

export function viewInicio() {
  const { total, parada } = contagemFalhas();
  const falhas = state.t.ocorrencias.filter(o => o.tipo === 'Falha');
  const minParada = falhas.reduce((s, o) => s + (o.parada_min || 0), 0);
  const abertas = state.t.acoes.filter(aberta);
  const atras = abertas.filter(atrasada);
  const rotPend = rotinasPendentes();
  const rotAtras = rotPend.filter(r => situacao(r).cod === 'atrasada');
  const ocultosAbertos = state.t.anomalias.filter(a => a.status === 'Aberta');
  const rank = [...total.entries()].filter(([cod]) => state.porCodigo.get(cod)?.nivel === 'Componente')
    .sort((a, b) => b[1] - a[1] || (parada.get(b[0]) || 0) - (parada.get(a[0]) || 0)).slice(0, 6);
  const motores = state.t.componentes.filter(c => c.nivel === 'Componente' && /^(motor|eletromandril)/i.test(c.nome));
  const fichaOk = c => !!(c.modelo && c.n_serie && c.especificacao);
  const ultimas = [...state.t.ocorrencias].sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || '')).slice(0, 6);
  const cartao = (valor, rotulo, href, alerta) => h('a', { class: 'cartao-num' + (alerta ? ' alerta-num' : ''), href }, h('strong', null, valor), h('span', null, rotulo));

  const atencao = [];
  for (const a of atras.sort((x, y) => x.prazo.localeCompare(y.prazo)).slice(0, 5)) atencao.push(h('li', { class: 'clicavel-li', onclick: e => { if (!e.target.closest('a')) abrirDetalhe('acoes', a); } }, h('span', { class: 'etq sit-atrasada' }, 'Ação atrasada'), ' ', a.titulo, h('small', null, 'prazo ' + fmtDate(a.prazo) + (a.responsavel ? ' • ' + a.responsavel : ''))));
  for (const r of rotPend.slice(0, 5)) { const s = situacao(r); atencao.push(h('li', { class: 'clicavel-li', onclick: e => { if (!e.target.closest('a')) abrirDetalhe('rotinas', r); } }, h('span', { class: 'etq sit-' + s.cod }, 'Rotina: ' + s.txt.toLowerCase()), ' ', r.titulo, h('small', null, 'próxima ' + fmtDate(proximaData(r))))); }
  for (const a of ocultosAbertos.filter(x => x.gravidade === 'Significativo').slice(0, 3)) atencao.push(h('li', { class: 'clicavel-li', onclick: () => abrirDetalhe('anomalias', a) }, h('span', { class: 'etq sit-atrasada' }, 'Defeito oculto'), ' ', a.descricao));

  return h('div', null,
    tituloPagina('Início', botaoNovo('Registrar ocorrência', () => abrirFormulario('ocorrencias', { aoSalvar: () => window.dispatchEvent(new HashChangeEvent('hashchange')) }))),
    h('div', { class: 'grade-cartoes' },
      cartao(abertas.length, `ações abertas${atras.length ? ` (${atras.length} atrasadas)` : ''}`, '#/acoes', atras.length > 0),
      cartao(rotPend.length, rotAtras.length ? `rotinas a vencer (${rotAtras.length} atrasadas)` : 'rotinas a vencer em 7 dias', '#/preventiva', rotAtras.length > 0),
      cartao(falhas.length, 'falhas registradas', '#/ocorrencias'),
      cartao(minParada ? fmtMin(minParada) : '0', 'de máquina parada por falhas', '#/causas/indicadores')),
    h('section', { class: 'painel' }, h('h2', null, 'Precisa de atenção'),
      atencao.length ? h('ul', { class: 'lista-simples' }, atencao) : h('p', { class: 'vazio' }, state.t.acoes.length || state.t.rotinas.length ? 'Nada atrasado ou vencendo. Bom trabalho.' : 'Ainda não há ações nem rotinas cadastradas. Comece pelo Plano de ação.')),
    h('div', { class: 'duas-colunas' },
      h('section', { class: 'painel' }, h('h2', null, 'Quem mais falha'),
        rank.length ? h('ol', { class: 'ranking' }, rank.map(([cod, n]) => h('li', null, linkComp(cod),
          h('span', { class: 'numeros' }, `${n} ${n === 1 ? 'falha' : 'falhas'}`, parada.get(cod) ? ` • ${fmtMin(parada.get(cod))} parado` : '')))) :
          h('p', { class: 'vazio' }, 'Ainda não há falhas registradas. Comece pelo motor da caixa da fechadura: abra-o na árvore e registre as falhas passadas de que a equipe se lembra.'),
        h('small', { class: 'dica' }, 'Soma as falhas do componente e de suas peças. Veja o Pareto em Causas.')),
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
