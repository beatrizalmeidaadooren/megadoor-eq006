// Análise de causas: Pareto, indicadores, análises (P-M, hipóteses, 5 porquês, cinco medidas), FMEA e defeitos ocultos
import { h, norm, fmtDate, fmtMin, modal, confirmar, toast, hojeISO, diasAte } from './ui.js';
import { MEDIDAS_TPM } from './schema.js';
import { state, podeEditar, podeApagar, salvar, apagar, nivelComponente, opcoesDe, adicionarOpcao, removerOpcao } from './data.js';
import { abrirFormulario, miniaturas } from './forms.js';
import { mtbfComIntervalo, laplace, crowAmsaa, probFalha } from './estatistica.js';
import { lerOperacao, horasObservadas, calcularCriticidade, periodoSugerido } from './critcalc.js';
import { blocoAjuda, ajudaFechada } from './metodos.js';
import { linkComp, tituloPagina, botaoNovo, registrarDetalhe, abrirDetalhe } from './views.js';

const atualizar = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const ABAS = [['pareto', 'Pareto'], ['indicadores', 'Indicadores'], ['analises', 'Análises'], ['fmea', 'FMEA'], ['criticidade', 'Criticidade'], ['ocultos', 'Defeitos ocultos']];

export function viewCausas(sub = 'pareto') {
  const abas = h('div', { class: 'abas' }, ABAS.map(([k, t]) => h('a', { href: '#/causas/' + k, class: k === sub ? 'ativa' : '' }, t)));
  const corpo = { pareto, indicadores, analises, fmea, criticidade, ocultos }[sub] || pareto;
  return h('div', null, abas, corpo());
}

const falhasDe = () => state.t.ocorrencias.filter(o => o.tipo === 'Falha');
const dentro = (o, dias) => !dias || (o.data_hora && diasAte(o.data_hora.slice(0, 10)) >= -dias);

// ---------- Pareto ----------
function pareto() {
  const f = { por: 'componente', medida: 'qtd', dias: 0 };
  const selPor = h('select', { class: 'campo', 'aria-label': 'Agrupar por' }, [['componente', 'Agrupar por componente'], ['modo', 'Agrupar por modo de falha'], ['causa', 'Agrupar por causa'], ['perda', 'Agrupar por tipo de perda']].map(([v, t]) => h('option', { value: v }, t)));
  const selMed = h('select', { class: 'campo', 'aria-label': 'Medir' }, [['qtd', 'Medir em número de falhas'], ['min', 'Medir em minutos parados']].map(([v, t]) => h('option', { value: v }, t)));
  const selDias = h('select', { class: 'campo', 'aria-label': 'Período' }, [[0, 'Todo o histórico'], [90, 'Últimos 90 dias'], [365, 'Últimos 12 meses']].map(([v, t]) => h('option', { value: v }, t)));
  const quadro = h('section', { class: 'painel' });
  const chave = o => f.por === 'componente' ? (state.porCodigo.get(nivelComponente(o.componente))?.nome || o.componente)
    : f.por === 'modo' ? (o.modo_falha || 'Não informado') : f.por === 'causa' ? (o.causa || 'Não informada') : (o.perda || 'Não classificada');
  const desenhar = () => {
    const lista = falhasDe().filter(o => dentro(o, f.dias));
    const mapa = new Map();
    for (const o of lista) mapa.set(chave(o), (mapa.get(chave(o)) || 0) + (f.medida === 'qtd' ? 1 : (o.parada_min || 0)));
    let linhas = [...mapa.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    quadro.replaceChildren();
    if (!linhas.length) { quadro.append(h('p', { class: 'vazio' }, f.medida === 'min' ? 'Nenhuma falha com tempo de parada informado neste período.' : 'Nenhuma falha registrada neste período.')); return; }
    if (linhas.length > 10) { const resto = linhas.slice(9).reduce((s, [, v]) => s + v, 0); linhas = [...linhas.slice(0, 9), ['Outros', resto]]; }
    const total = linhas.reduce((s, [, v]) => s + v, 0), max = linhas[0][1];
    let acum = 0, passou = false;
    const un = f.medida === 'qtd' ? v => `${v}` : fmtMin;
    quadro.append(h('p', { class: 'dica' }, `${lista.length} falhas no período. Barras em vermelho: o grupo que, somado, explica cerca de 80% do total. É onde vale agir primeiro.`),
      h('div', { class: 'pareto' }, linhas.map(([nome, v]) => {
        const antes = acum; acum += v; const pc = Math.round(acum / total * 100);
        const vital = !passou; if (acum / total >= 0.8) passou = true;
        void antes;
        return h('div', { class: 'p-linha' }, h('div', { class: 'p-nome', title: nome }, nome),
          h('div', { class: 'p-barra-caixa' }, h('div', { class: 'p-barra' + (vital ? ' vital' : ''), style: `width:${Math.max(2, v / max * 100)}%` })),
          h('div', { class: 'p-valor' }, un(v)), h('div', { class: 'p-acum' }, pc + '%'));
      })),
      h('div', { class: 'p-legenda' }, h('span', null, 'Valor'), h('span', null, 'Acumulado')));
  };
  selPor.addEventListener('change', () => { f.por = selPor.value; desenhar(); });
  selMed.addEventListener('change', () => { f.medida = selMed.value; desenhar(); });
  selDias.addEventListener('change', () => { f.dias = Number(selDias.value); desenhar(); });
  desenhar();
  return h('div', null, tituloPagina('Pareto das falhas'), blocoAjuda('pareto', 'perdas'), h('div', { class: 'barra-filtros' }, selPor, selMed, selDias), quadro);
}

// ---------- Indicadores (MTBF e MTTR) ----------
function indicadores() {
  const falhas = falhasDe().sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  const media = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const intervalos = lista => lista.slice(1).map((o, i) => (new Date(o.data_hora) - new Date(lista[i].data_hora)) / 86400000);
  const comParada = falhas.filter(o => o.parada_min > 0);
  const mttr = media(comParada.map(o => o.parada_min));
  const mtbf = media(intervalos(falhas));
  const porComp = new Map();
  for (const o of falhas) { const c = nivelComponente(o.componente); (porComp.get(c) || porComp.set(c, []).get(c)).push(o); }
  const linhas = [...porComp.entries()].map(([cod, l]) => {
    const par = l.filter(o => o.parada_min > 0).map(o => o.parada_min);
    return { cod, n: l.length, parada: par.reduce((s, x) => s + x, 0), mttr: media(par), mtbf: media(intervalos(l)), ultima: l[l.length - 1].data_hora.slice(0, 10) };
  }).sort((a, b) => b.n - a.n || b.parada - a.parada);
  const dias = v => v === null ? '—' : `${v.toFixed(v < 10 ? 1 : 0).replace('.', ',')} dias`;
  const cart = (v, t) => h('div', { class: 'cartao-num' }, h('strong', null, v), h('span', null, t));
  return h('div', null, tituloPagina('Indicadores de confiabilidade'), blocoAjuda('mtbf', 'confiabilidade', 'outros'),
    h('div', { class: 'grade-cartoes' }, cart(falhas.length, 'falhas registradas'), cart(fmtMin(falhas.reduce((s, o) => s + (o.parada_min || 0), 0)) || '0', 'de máquina parada'), cart(mttr === null ? '—' : fmtMin(Math.round(mttr)), 'tempo médio de reparo (MTTR)'), cart(dias(mtbf), 'tempo médio entre falhas (MTBF)')),
    h('section', { class: 'painel' }, h('h2', null, 'Por componente'),
      linhas.length ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' }, h('thead', null, h('tr', null, ['Componente', 'Falhas', 'Parado', 'MTTR', 'MTBF', 'Última falha'].map(t => h('th', null, t)))),
        h('tbody', null, linhas.map(l => h('tr', null, h('td', { 'data-rotulo': 'Componente' }, linkComp(l.cod)), h('td', { 'data-rotulo': 'Falhas' }, l.n), h('td', { 'data-rotulo': 'Parado' }, l.parada ? fmtMin(l.parada) : '—'),
          h('td', { 'data-rotulo': 'MTTR' }, l.mttr === null ? '—' : fmtMin(Math.round(l.mttr))), h('td', { 'data-rotulo': 'MTBF' }, dias(l.mtbf)), h('td', { 'data-rotulo': 'Última falha' }, fmtDate(l.ultima))))))) : h('p', { class: 'vazio' }, 'Ainda não há falhas registradas.'),
      h('p', { class: 'dica' }, 'MTTR = tempo médio parado por falha (o fim menos o início de cada ocorrência). MTBF = tempo médio entre o início de uma falha e o da seguinte; precisa de pelo menos duas falhas no mesmo componente. MTBF subindo e MTTR caindo indicam melhora.')),
    confiabilidade(falhas),
    outros(falhas, mtbf, mttr));
}

// ---------- outros indicadores, calculados com o que já está registrado ----------
function outros(falhas, mtbf, mttr) {
  const dMed = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const dias = v => v === null ? '—' : `${v.toFixed(v < 10 ? 1 : 0).replace('.', ',')} dias`;
  const painel = (t, dica, ...c) => h('section', { class: 'painel' }, h('h2', null, t), ...c, h('p', { class: 'dica' }, dica));
  const tab = (cab, linhas) => h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela compacta' }, h('thead', null, h('tr', null, cab.map(t => h('th', null, t)))), h('tbody', null, linhas.map(l => h('tr', null, l.map((c, i) => h('td', { 'data-rotulo': cab[i] }, c)))))));
  const vazio = t => h('p', { class: 'vazio' }, t);

  // disponibilidade estimada
  const disp = (mtbf !== null && mttr !== null) ? mtbf / (mtbf + mttr / 1440) : null;

  // recorrência: mesma falha no mesmo componente em até 90 dias
  const rec = []; const porComp = new Map();
  for (const o of falhas) { const k = nivelComponente(o.componente) + '|' + (o.modo_falha || ''); (porComp.get(k) || porComp.set(k, []).get(k)).push(o); }
  for (const [k, l] of porComp) for (let i = 1; i < l.length; i++) if ((new Date(l[i].data_hora) - new Date(l[i - 1].data_hora)) / 86400000 <= 90 && l[i].modo_falha) rec.push({ cod: k.split('|')[0], modo: l[i].modo_falha });
  const recPor = new Map(); for (const r of rec) { const k = r.cod + '|' + r.modo; recPor.set(k, (recPor.get(k) || 0) + 1); }

  // vida útil entre trocas
  const trocas = new Map(); for (const o of state.t.ocorrencias.filter(o => o.tipo === 'Troca')) (trocas.get(o.componente) || trocas.set(o.componente, []).get(o.componente)).push(o);
  const vida = [...trocas.entries()].map(([cod, l]) => { l.sort((a, b) => a.data_hora.localeCompare(b.data_hora)); const iv = l.slice(1).map((o, i) => (new Date(o.data_hora) - new Date(l[i].data_hora)) / 86400000); return { cod, n: l.length, media: dMed(iv), ultima: l[l.length - 1].data_hora.slice(0, 10) }; }).sort((a, b) => (a.media ?? 1e9) - (b.media ?? 1e9));

  // preventiva
  const exec = state.t.execucoes_rotina, ativas = state.t.rotinas.filter(r => r.ativa !== false);
  const emDia = ativas.filter(r => { const d = diasAte(r.ultima_execucao ? new Date(new Date(r.ultima_execucao + 'T12:00:00').getTime() + r.periodicidade_dias * 86400000).toISOString().slice(0, 10) : r.inicio); return d >= 0; }).length;
  const conf = exec.filter(e => e.resultado === 'Conforme').length;

  // ações
  const acs = state.t.acoes, conc = acs.filter(a => a.status === 'Concluída' && a.concluida_em);
  const tempoFecha = dMed(conc.map(a => (new Date(a.concluida_em + 'T12:00:00') - new Date(a.criado_em.slice(0, 10) + 'T12:00:00')) / 86400000).filter(x => x >= 0));
  const noPrazo = conc.filter(a => a.prazo);

  // estoque e prazo de entrega
  const critico = state.t.compras.filter(c => c.estoque_min != null && c.estoque_qtd != null && c.estoque_qtd <= c.estoque_min);
  const forn = new Map(); for (const c of state.t.compras.filter(c => c.data_pedido && c.data_recebimento)) { const d = (new Date(c.data_recebimento) - new Date(c.data_pedido)) / 86400000; if (d >= 0) (forn.get(c.fornecedor || 'Não informado') || forn.set(c.fornecedor || 'Não informado', []).get(c.fornecedor || 'Não informado')).push(d); }

  return h('div', null,
    painel('Disponibilidade estimada', 'MTBF ÷ (MTBF + MTTR), sobre o tempo corrido. Serve para comparar períodos. Fica mais fiel quando soubermos as horas de operação por dia.', h('div', { class: 'cartao-num' }, h('strong', null, disp === null ? '—' : (disp * 100).toFixed(2).replace('.', ',') + '%'), h('span', null, disp === null ? 'precisa de duas falhas com tempo parado' : 'da máquina disponível'))),
    painel('Recorrência de falhas', 'Falhas do mesmo componente e do mesmo modo de falha repetidas em até 90 dias. Se aparecer aqui, a causa raiz ainda não foi eliminada: abra uma análise.',
      falhas.length ? h('p', null, h('strong', null, `${rec.length} de ${falhas.length}`), ` falhas foram repetições (${falhas.length ? Math.round(rec.length / falhas.length * 100) : 0}%).`) : null,
      recPor.size ? tab(['Componente', 'Modo de falha', 'Repetições'], [...recPor.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => { const [c, m] = k.split('|'); return [linkComp(c), m, n]; })) : vazio('Nenhuma repetição encontrada.')),
    painel('Vida útil entre trocas', 'Tempo médio entre duas ocorrências do tipo Troca do mesmo componente. Mostra quais peças duram menos. Precisa de duas trocas registradas.',
      vida.length ? tab(['Componente', 'Trocas', 'Vida média', 'Última troca'], vida.map(v => [linkComp(v.cod), v.n, dias(v.media), fmtDate(v.ultima)])) : vazio('Nenhuma troca registrada.')),
    painel('Preventiva e ações', 'Rotinas em dia: as que ainda não venceram. Conformidade: execuções sem anomalia. Tempo de fechamento: da criação até a conclusão da ação.',
      h('div', { class: 'grade-cartoes' },
        h('div', { class: 'cartao-num' }, h('strong', null, ativas.length ? Math.round(emDia / ativas.length * 100) + '%' : '—'), h('span', null, 'rotinas em dia')),
        h('div', { class: 'cartao-num' }, h('strong', null, exec.length ? Math.round(conf / exec.length * 100) + '%' : '—'), h('span', null, 'execuções conformes')),
        h('div', { class: 'cartao-num' }, h('strong', null, tempoFecha === null ? '—' : dias(tempoFecha)), h('span', null, 'tempo médio para fechar ação')),
        h('div', { class: 'cartao-num' }, h('strong', null, noPrazo.length ? Math.round(noPrazo.filter(a => a.concluida_em <= a.prazo).length / noPrazo.length * 100) + '%' : '—'), h('span', null, 'ações concluídas no prazo')))),
    painel('Compras e estoque', 'Estoque crítico: itens com quantidade igual ou menor que o mínimo informado. Prazo de entrega: do pedido ao recebimento, por fornecedor.',
      critico.length ? h('div', null, h('strong', null, 'Estoque crítico'), tab(['Peça', 'Componente', 'Estoque', 'Mínimo'], critico.map(c => [c.peca, linkComp(c.componente), c.estoque_qtd, c.estoque_min]))) : vazio('Nenhum item abaixo do estoque mínimo.'),
      forn.size ? h('div', null, h('strong', null, 'Prazo médio de entrega'), tab(['Fornecedor', 'Pedidos', 'Prazo médio'], [...forn.entries()].map(([f, l]) => [f, l.length, dias(dMed(l))]))) : null));
}

// ---------- Análises ----------
function analises() {
  const lista = [...state.t.analises].sort((a, b) => (a.status === 'Aberta' ? 0 : 1) - (b.status === 'Aberta' ? 0 : 1) || (b.criado_em || '').localeCompare(a.criado_em || ''));
  return h('div', null, tituloPagina('Análises de causa raiz', botaoNovo('Nova análise', () => abrirFormulario('analises', { aoSalvar: d => { atualizar(); abrirDetalhe('analises', state.t.analises.find(a => a.id === d.id) || d); } }))),
    h('p', { class: 'dica' }, 'Cada análise reúne os fatos, a física do problema (método P-M), as hipóteses por categoria (6M), os cinco porquês, a verificação das cinco medidas do TPM e as ações.'),
    blocoAjuda('natureza', 'cincoporques', 'pm', 'hipoteses', 'cincomedidas'),
    lista.length ? h('div', { class: 'grade-acoes' }, lista.map(a => {
      const hip = state.t.hipoteses.filter(x => x.analise_id === a.id);
      return h('article', { class: 'cartao-acao', tabindex: 0, onclick: e => { if (!e.target.closest('a')) abrirDetalhe('analises', a); }, onkeydown: e => { if (e.key === 'Enter') abrirDetalhe('analises', a); } },
        h('div', { class: 'ca-topo' }, h('span', { class: 'etq ' + (a.status === 'Concluída' ? 'ok' : 'pend') }, a.status), a.natureza ? h('span', { class: 'etq' }, a.natureza.split(' ')[0]) : null),
        h('div', { class: 'ca-titulo' }, a.titulo), a.componente ? h('div', { class: 'ca-linha' }, linkComp(a.componente)) : null,
        a.causa_raiz ? h('div', { class: 'ca-linha' }, h('b', null, 'Causa raiz: '), a.causa_raiz) : h('div', { class: 'ca-linha vazio' }, 'Causa raiz ainda não definida'),
        h('small', null, `${hip.length} hipóteses (${hip.filter(x => x.resultado === 'Confirmada').length} confirmadas)${a.responsavel ? ' • ' + a.responsavel : ''}`));
    })) : h('p', { class: 'vazio' }, 'Ainda não há análises. Comece pela falha do motor da caixa da fechadura.'));
}

const COR_RES = { 'A verificar': 'pend', Confirmada: 'conf', Descartada: 'desc' };

registrarDetalhe('analises', async a => {
  const hips = () => state.t.hipoteses.filter(x => x.analise_id === a.id);
  const raiz = h('div', { class: 'detalhe analise' });
  const m = modal('Análise: ' + a.titulo, raiz, { wide: true });
  const recarregar = () => { const novo = state.t.analises.find(x => x.id === a.id); if (!novo) return m.close(); Object.assign(a, novo); montar(); };
  const sec = (t, ...c) => h('section', { class: 'sec-analise' }, h('h3', null, t), ...c);
  const campoTxt = (t, v) => v ? h('div', { class: 'par' }, h('b', null, t + ': '), h('span', { class: 'pre' }, v)) : null;

  const montar = async () => {
    raiz.replaceChildren();
    const cab = h('div', { class: 'ca-topo' }, h('span', { class: 'etq ' + (a.status === 'Concluída' ? 'ok' : 'pend') }, a.status), a.natureza ? h('span', { class: 'etq' }, a.natureza) : null, a.tipo_perda ? h('span', { class: 'etq' }, a.tipo_perda) : null);
    const info = h('div', null, a.componente ? h('div', null, 'Componente: ', linkComp(a.componente)) : null, a.data_analise ? h('div', null, 'Data: ' + fmtDate(a.data_analise)) : null, a.responsavel ? h('div', null, 'Responsável: ' + a.responsavel) : null);
    raiz.append(cab, info);

    if (a.natureza?.startsWith('Esp')) raiz.append(h('p', { class: 'dica-metodo' }, 'Falha esporádica: em geral a causa é uma mudança de condição. A solução costuma ser restaurar a condição normal.'));
    if (a.natureza?.startsWith('Cr')) raiz.append(h('p', { class: 'dica-metodo' }, 'Falha crônica: costuma ter várias causas combinadas e resiste a conserto rápido. Liste todas as condições e fatores, sem descartar nenhum por palpite.'));

    const fatos = [campoTxt('O que aconteceu', a.fatos), campoTxt('Comparação com equipamento semelhante', a.comparacao), campoTxt('Princípio físico', a.principio_fisico), campoTxt('Condições necessárias para o problema', a.condicoes)].filter(Boolean);
    raiz.append(sec('Fatos e física do problema (P-M)', ajudaFechada('pm'), ...(fatos.length ? fatos : [h('p', { class: 'vazio' }, 'Ainda não preenchido. Use Editar.')])));

    // hipóteses por categoria (diagrama de causa e efeito)
    const hs = hips();
    const cats = [...new Set([...opcoesDe('categorias_6m'), ...hs.map(x => x.categoria).filter(Boolean)])];
    raiz.append(sec(`Hipóteses de causa (${hs.filter(x => x.resultado === 'Confirmada').length} confirmadas, ${hs.filter(x => x.resultado === 'Descartada').length} descartadas, ${hs.filter(x => x.resultado === 'A verificar').length} a verificar)`,
      ajudaFechada('hipoteses'),
      h('div', { class: 'ishikawa' }, cats.map(c => {
        const itens = hs.filter(x => x.categoria === c);
        return h('div', { class: 'ish-col' }, h('h4', null, c), itens.length ? itens.map(x => h('button', { type: 'button', class: 'hip ' + COR_RES[x.resultado], title: x.resultado, onclick: () => podeEditar() ? abrirFormulario('hipoteses', { linha: x, aoSalvar: () => { atualizar(); recarregar(); } }) : null }, h('small', null, x.resultado), x.hipotese)) : h('span', { class: 'vazio' }, '—'));
      })),
      podeEditar() ? h('button', { class: 'btn pequeno', type: 'button', onclick: () => abrirFormulario('hipoteses', { padroes: { analise_id: a.id }, aoSalvar: recarregar }) }, '+ Hipótese') : null,
      h('small', { class: 'dica' }, 'Verde = confirmada, cinza riscada = descartada, amarela = a verificar. Quando a causa não está clara, o TPM recomenda não apostar em uma só: elimine todos os fatores suspeitos.')));

    // cinco porquês
    const pq = [a.porque1, a.porque2, a.porque3, a.porque4, a.porque5].filter(Boolean);
    raiz.append(sec('Cinco porquês', ajudaFechada('cincoporques'), pq.length ? h('ol', { class: 'cascata' }, pq.map((t, i) => h('li', null, h('small', null, `${i + 1}º porquê`), t))) : h('p', { class: 'vazio' }, 'Ainda não preenchido.')));

    // conclusão
    raiz.append(sec('Causa raiz', a.causa_raiz ? h('div', { class: 'causa-raiz' }, a.causa_raiz) : h('p', { class: 'vazio' }, 'Ainda não definida.'), a.categoria ? h('div', null, 'Categoria: ' + a.categoria) : null, campoTxt('Evidências', a.evidencias)));

    // cinco medidas
    const chk = a.checklist_tpm || {};
    const salvarChk = async (n, patch) => {
      const novo = { ...chk, [n]: { ...(chk[n] || {}), ...patch } };
      try { await salvar('analises', { ...a, checklist_tpm: novo }, false); Object.assign(a, state.t.analises.find(x => x.id === a.id)); await montar(); } catch (e) { toast(e.message, 'erro'); }
    };
    raiz.append(sec('Cinco medidas para zero quebras (TPM)', ajudaFechada('cincomedidas'), h('p', { class: 'dica' }, 'Verifique se cada medida está em ordem para este componente. Uma falha que volta quase sempre tem mais de uma medida descuidada.'),
      MEDIDAS_TPM.map(md => {
        const st = chk[md.n]?.s || '';
        const nota = h('input', { type: 'text', class: 'campo', placeholder: 'Anotação: o que foi verificado', value: chk[md.n]?.n || '', disabled: !podeEditar() });
        if (podeEditar()) nota.addEventListener('change', () => salvarChk(md.n, { n: nota.value.trim() }));
        return h('div', { class: 'medida' }, h('div', { class: 'med-topo' }, h('strong', null, `${md.n}. ${md.t}`),
          h('span', { class: 'seg' }, ['Em ordem', 'Pendente', 'Não se aplica'].map(o => h('button', { type: 'button', class: 'seg-b' + (st === o ? ' on ' + norm(o).replace(/\s/g, '-') : ''), disabled: !podeEditar(), onclick: () => salvarChk(md.n, { s: st === o ? '' : o }) }, o)))),
          h('small', null, md.d), h('small', { class: 'ex' }, 'Pergunte: ' + md.ex), nota);
      })));

    // ações
    const acs = state.t.acoes.filter(x => x.analise_id === a.id);
    raiz.append(sec('Ações desta análise', acs.length ? h('ul', { class: 'lista-simples' }, acs.map(x => h('li', null, h('a', { href: '#', onclick: e => { e.preventDefault(); m.close(); abrirDetalhe('acoes', x); } }, x.titulo), h('span', { class: 'etq' }, x.status)))) : h('p', { class: 'vazio' }, 'Nenhuma ação criada ainda.'),
      podeEditar() ? h('button', { class: 'btn pequeno', type: 'button', onclick: () => abrirFormulario('acoes', { padroes: { titulo: a.causa_raiz ? 'Eliminar: ' + a.causa_raiz.slice(0, 90) : 'Ação da análise: ' + a.titulo, componente: a.componente, analise_id: a.id, ocorrencia_id: a.ocorrencia_id, tipo: 'Corretiva' }, aoSalvar: () => { atualizar(); recarregar(); } }) }, '+ Criar ação a partir desta análise') : null));

    if (a.anexos?.length) raiz.append(sec('Fotos e anexos', await miniaturas(a.anexos)));
    const acoes = h('div', { class: 'acoes' });
    if (podeApagar()) acoes.append(h('button', { class: 'btn perigo', type: 'button', onclick: async () => { if (!await confirmar('Apagar esta análise e suas hipóteses?')) return; try { await apagar('analises', a); m.close(); toast('Apagada.'); atualizar(); } catch (e) { toast(e.message, 'erro'); } } }, 'Apagar'));
    if (podeEditar()) acoes.append(h('button', { class: 'btn primario', type: 'button', onclick: () => { m.close(); abrirFormulario('analises', { linha: a, aoSalvar: () => { atualizar(); abrirDetalhe('analises', state.t.analises.find(x => x.id === a.id)); } }); } }, 'Editar análise'));
    raiz.append(acoes);
  };
  montar();
});

// ---------- FMEA ----------
export const nprDe = r => (r.severidade && r.probabilidade && r.deteccao) ? r.severidade * r.probabilidade * r.deteccao : null;
const nivelNpr = n => n === null ? 'sem' : n >= 300 ? 'alto' : n >= 100 ? 'medio' : 'baixo';

function fmea() {
  const linhas = state.t.fmea.map(r => ({ r, npr: nprDe(r), ref: r.npr_referencia })).sort((a, b) => ((b.npr ?? b.ref ?? -1) - (a.npr ?? a.ref ?? -1)));
  return h('div', null, tituloPagina('FMEA: modos de falha e efeitos', botaoNovo('Nova linha', () => abrirFormulario('fmea', { aoSalvar: atualizar }))), blocoAjuda('fmea'),
    h('p', { class: 'dica' }, 'Para cada modo de falha, dê notas de 1 a 10 para Severidade (S), Ocorrência (O) e Detecção (D). NPR = S × O × D. Quanto maior, mais urgente. Linhas com NPR de referência ainda não têm S, O e D: preencha para confirmar. Faixas de cor (sugestão para ajustar com a equipe): vermelho a partir de 300, âmbar de 100 a 299, verde abaixo de 100.'),
    linhas.length ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' }, h('thead', null, h('tr', null, ['NPR', 'Componente', 'Modo de falha', 'S', 'O', 'D', 'Ação', ''].map(t => h('th', null, t)))),
      h('tbody', null, linhas.map(({ r, npr, ref }) => h('tr', { class: 'clicavel', tabindex: 0, onclick: e => { if (!e.target.closest('a')) abrirDetalhe('fmea', r); }, onkeydown: e => { if (e.key === 'Enter') abrirDetalhe('fmea', r); } },
        h('td', { 'data-rotulo': 'NPR' }, npr !== null ? h('span', { class: 'npr ' + nivelNpr(npr) }, npr) : ref ? h('span', { class: 'npr ' + nivelNpr(ref) + ' ref', title: 'NPR de referência: falta preencher S, O e D' }, ref + '*') : '—'),
        h('td', { 'data-rotulo': 'Componente' }, linkComp(r.componente)), h('td', { 'data-rotulo': 'Modo de falha' }, r.modo_falha),
        h('td', { 'data-rotulo': 'S' }, r.severidade ?? '—'), h('td', { 'data-rotulo': 'O' }, r.probabilidade ?? '—'), h('td', { 'data-rotulo': 'D' }, r.deteccao ?? '—'),
        h('td', { 'data-rotulo': 'Ação' }, r.acao_id ? (state.t.acoes.find(a => a.id === r.acao_id)?.status || 'vinculada') : (r.acao_recomendada || '')), h('td', { class: 'seta' }, '›')))))) : h('p', { class: 'vazio' }, 'Ainda não há linhas de FMEA.'),
    h('p', { class: 'dica' }, '* NPR de referência, de um relatório anterior.'));
}

registrarDetalhe('fmea', async r => {
  const npr = nprDe(r);
  const dl = h('dl');
  const ln = (t, v) => { if (v !== null && v !== undefined && v !== '') dl.append(h('dt', null, t), h('dd', null, v)); };
  ln('Componente', linkComp(r.componente)); ln('Função', r.funcao); ln('Modo de falha', r.modo_falha); ln('Efeito', r.efeito); ln('Causa provável', r.causa); ln('Controle atual', r.controle_atual);
  ln('Severidade (S)', r.severidade); ln('Ocorrência (O)', r.probabilidade); ln('Detecção (D)', r.deteccao);
  ln('NPR', npr !== null ? npr : r.npr_referencia ? `${r.npr_referencia} (referência, falta S, O e D)` : null);
  ln('Ação recomendada', r.acao_recomendada); ln('Fonte', r.fonte);
  const ac = r.acao_id ? state.t.acoes.find(a => a.id === r.acao_id) : null;
  if (ac) ln('Ação vinculada', `${ac.titulo} (${ac.status})`);
  const acoes = h('div', { class: 'acoes' });
  const m = modal('FMEA', h('div', { class: 'detalhe' }, dl, acoes), { wide: true });
  if (podeApagar()) acoes.append(h('button', { class: 'btn perigo', type: 'button', onclick: async () => { if (!await confirmar('Apagar esta linha da FMEA?')) return; try { await apagar('fmea', r); m.close(); atualizar(); } catch (e) { toast(e.message, 'erro'); } } }, 'Apagar'));
  if (podeEditar()) {
    if (!ac) acoes.append(h('button', { class: 'btn', type: 'button', onclick: () => { m.close(); abrirFormulario('acoes', { padroes: { titulo: `Reduzir risco: ${r.modo_falha}`, descricao: r.acao_recomendada || '', componente: r.componente, tipo: 'Preventiva' }, aoSalvar: async a => { try { await salvar('fmea', { ...r, acao_id: a.id }, false); } catch (e) { toast(e.message, 'erro'); } atualizar(); } }); } }, 'Criar ação'));
    acoes.append(h('button', { class: 'btn primario', type: 'button', onclick: () => { m.close(); abrirFormulario('fmea', { linha: r, aoSalvar: atualizar }); } }, 'Editar'));
  }
});

// ---------- Defeitos ocultos ----------
function ocultos() {
  const lista = [...state.t.anomalias].sort((a, b) => (a.status === 'Aberta' ? 0 : 1) - (b.status === 'Aberta' ? 0 : 1) || b.encontrado_em.localeCompare(a.encontrado_em));
  const abertas = lista.filter(a => a.status === 'Aberta');
  const conta = (campo) => { const m = new Map(); for (const a of lista) m.set(a[campo] || 'Não informado', (m.get(a[campo] || 'Não informado') || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const quadro = (titulo, itens) => h('section', { class: 'painel' }, h('h2', null, titulo), itens.length ? h('ul', { class: 'lista-simples' }, itens.slice(0, 6).map(([k, v]) => h('li', null, k, h('span', { class: 'numeros' }, v)))) : h('p', { class: 'vazio' }, '—'));
  return h('div', null, tituloPagina('Defeitos ocultos', botaoNovo('Registrar defeito', () => abrirFormulario('anomalias', { aoSalvar: atualizar }))),
    blocoAjuda('ocultos'),
    h('div', { class: 'grade-cartoes' }, h('div', { class: 'cartao-num' }, h('strong', null, lista.length), h('span', null, 'defeitos registrados')), h('div', { class: 'cartao-num' + (abertas.length ? ' alerta-num' : '') }, h('strong', null, abertas.length), h('span', null, 'ainda abertos')), h('div', { class: 'cartao-num' }, h('strong', null, lista.filter(a => a.gravidade === 'Significativo').length), h('span', null, 'significativos'))),
    lista.length ? h('div', { class: 'duas-colunas' }, quadro('Por tipo de defeito', conta('tipo_defeito')), quadro('Por que estavam ocultos', conta('por_que_oculto'))) : null,
    lista.length ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' }, h('thead', null, h('tr', null, ['Situação', 'Onde', 'O que foi encontrado', 'Tipo', 'Gravidade', 'Data', ''].map(t => h('th', null, t)))),
      h('tbody', null, lista.map(a => h('tr', { class: 'clicavel', tabindex: 0, onclick: e => { if (!e.target.closest('a')) abrirDetalhe('anomalias', a); }, onkeydown: e => { if (e.key === 'Enter') abrirDetalhe('anomalias', a); } },
        h('td', { 'data-rotulo': 'Situação' }, h('span', { class: 'etq ' + (a.status === 'Corrigida' ? 'ok' : 'pend') }, a.status)), h('td', { 'data-rotulo': 'Onde' }, linkComp(a.componente)),
        h('td', { 'data-rotulo': 'O que foi encontrado' }, a.descricao), h('td', { 'data-rotulo': 'Tipo' }, a.tipo_defeito || ''), h('td', { 'data-rotulo': 'Gravidade' }, a.gravidade || ''), h('td', { 'data-rotulo': 'Data' }, fmtDate(a.encontrado_em)), h('td', { class: 'seta' }, '›')))))) : h('p', { class: 'vazio' }, 'Nenhum defeito oculto registrado ainda. Na próxima limpeza ou inspeção do motor, registre tudo o que encontrar.'));
}

// ---------- confiabilidade de sistema reparável ----------
const CHAVE_OPER = 'parametro_operacao';
function confiabilidade(falhas) {
  const cfg = lerOperacao();
  const ok = cfg.hd > 0 && cfg.ds > 0;
  const hPorDia = ok ? cfg.hd * cfg.ds / 7 : null;
  const primeiro = state.t.ocorrencias.map(o => o.data_hora?.slice(0, 10)).filter(Boolean).sort()[0] || '';
  const inicio = cfg.inicio || primeiro;
  const campoH = h('input', { type: 'number', class: 'campo', min: 1, max: 24, step: '0.5', value: ok ? cfg.hd : '', placeholder: 'ex.: 16', 'aria-label': 'Horas por dia' });
  const campoD = h('input', { type: 'number', class: 'campo', min: 1, max: 7, step: '1', value: ok ? cfg.ds : '', placeholder: 'ex.: 5', 'aria-label': 'Dias por semana' });
  const campoI = h('input', { type: 'date', class: 'campo', value: cfg.inicio, 'aria-label': 'Início do histórico' });
  const gravar = async () => {
    const a = Number(campoH.value), b = Number(campoD.value);
    if (!(a > 0 && a <= 24 && b >= 1 && b <= 7)) return toast('Informe horas por dia (1 a 24) e dias por semana (1 a 7).', 'erro');
    const antigo = state.t.opcoes.find(o => o.lista === CHAVE_OPER)?.valor;
    try { if (antigo) await removerOpcao(CHAVE_OPER, antigo); await adicionarOpcao(CHAVE_OPER, `${a}|${b}|${campoI.value || ''}`); toast('Salvo.'); atualizar(); } catch (e) { toast(e.message, 'erro'); }
  };
  const form = h('div', { class: 'linha-oper' }, h('label', null, 'Horas de operação por dia', campoH), h('label', null, 'Dias por semana', campoD),
    h('label', null, 'Início do histórico', campoI), podeEditar() ? h('button', { class: 'btn primario pequeno', type: 'button', onclick: gravar }, 'Salvar') : null);

  const grupos = new Map([['__todas', falhas]]);
  for (const o of falhas) { const c = nivelComponente(o.componente); (grupos.get(c) || grupos.set(c, []).get(c)).push(o); }
  const linhas = ok && inicio ? [...grupos.entries()].map(([cod, l]) => {
    const { tempos, T, r } = horasObservadas(l, inicio, hPorDia);
    if (!r) return null;
    const mt = mtbfComIntervalo(r, T, 0.9), lap = laplace(tempos, T), ca = crowAmsaa(tempos, T, 0.9);
    return { cod, r, T, mt, lap, ca };
  }).filter(Boolean).sort((a, b) => (a.cod === '__todas' ? -1 : b.cod === '__todas' ? 1 : a.mt.pontual - b.mt.pontual)) : [];

  const fh = v => v === null || v === undefined ? '—' : v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');
  const sig = l => l.lap && Math.abs(l.lap.U) > 1.645;
  const tend = l => !l.lap ? 'poucos dados (precisa de 3 falhas)' : l.lap.U > 1.645 ? `piorando (U = ${l.lap.U.toFixed(1)})` : l.lap.U < -1.645 ? `melhorando (U = ${l.lap.U.toFixed(1)})` : `sem tendência clara (U = ${l.lap.U.toFixed(1)})`;
  const chance = (l, t) => {            // chance de rodar t horas sem falhar
    if (sig(l) && l.ca) return { txt: Math.round((1 - probFalha(l.ca.esperadas(t))) * 100) + '%', modelo: 'modelo com tendência' };
    const { pontual, inf, sup } = l.mt;
    return { txt: `${Math.round(Math.exp(-t / pontual) * 100)}% (${Math.round(Math.exp(-t / inf) * 100)} a ${Math.round(Math.exp(-t / sup) * 100)}%)`, modelo: 'taxa constante' };
  };
  const tabela = linhas.length ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela compacta' },
    h('thead', null, h('tr', null, ['Item', 'Falhas', 'Horas observadas', 'MTBF em horas (90%)', 'Tendência', 'Rodar 40 h sem falhar', 'Rodar 160 h sem falhar'].map(t => h('th', null, t)))),
    h('tbody', null, linhas.map(l => { const c40 = chance(l, 40), c160 = chance(l, 160);
      return h('tr', null, h('td', { 'data-rotulo': 'Item' }, l.cod === '__todas' ? h('strong', null, 'Máquina toda') : linkComp(l.cod)), h('td', { 'data-rotulo': 'Falhas' }, l.r), h('td', { 'data-rotulo': 'Horas observadas' }, Math.round(l.T)),
        h('td', { 'data-rotulo': 'MTBF em horas (90%)' }, `${fh(l.mt.pontual)} (${fh(l.mt.inf)} a ${fh(l.mt.sup)})`),
        h('td', { 'data-rotulo': 'Tendência' }, tend(l) + (l.ca ? ` • β ${l.ca.beta.toFixed(2).replace('.', ',')} (${l.ca.inf.toFixed(1).replace('.', ',')} a ${l.ca.sup.toFixed(1).replace('.', ',')})` : '')),
        h('td', { 'data-rotulo': 'Rodar 40 h sem falhar', title: c40.modelo }, c40.txt), h('td', { 'data-rotulo': 'Rodar 160 h sem falhar', title: c160.modelo }, c160.txt)); })))) : null;

  return h('section', { class: 'painel' }, h('h2', null, 'Confiabilidade (sistema reparável)'),
    h('p', { class: 'dica' }, 'Como a máquina é consertada e volta a funcionar, usamos métodos próprios para itens reparáveis. As horas de operação são contadas do início do histórico até hoje, descontando o tempo parado. O MTBF é o total de horas dividido pelo número de falhas, com intervalo de 90% de confiança (exato, por qui-quadrado): quanto menos falhas, mais largo o intervalo. Isso evita tirar conclusões firmes de poucos dados.'),
    form,
    !ok ? h('p', { class: 'vazio' }, 'Informe as horas de operação para calcular.')
      : !inicio ? h('p', { class: 'vazio' }, 'Ainda não há registros para definir o início do histórico.')
      : [!cfg.inicio ? h('p', { class: 'dica-metodo' }, `Início do histórico assumido: ${fmtDate(inicio)} (primeiro registro). Informe a data real a partir da qual todas as falhas foram anotadas; contar desde antes distorce o resultado.`) : null,
        tabela || h('p', { class: 'vazio' }, 'Nenhuma falha registrada depois do início do histórico.')],
    h('p', { class: 'dica' }, 'Tendência (teste de Laplace): U acima de 1,65 indica falhas cada vez mais frequentes (desgaste ou deterioração: vale a troca preventiva por idade); abaixo de −1,65, falhas cada vez menos frequentes (as melhorias estão funcionando); no meio, não há evidência de mudança. β é o expoente do modelo de Crow-AMSAA: acima de 1, a taxa de falhas está subindo. Com tendência comprovada, a chance de rodar sem falhar usa esse modelo; sem tendência, usa taxa constante, com a faixa do intervalo de confiança. Precisa de pelo menos 3 falhas para tendência.'));
}

// ---------- Criticidade e estratégia de manutenção ----------
function criticidade() {
  const f = { classe: '', canal: '', q: '' };
  const comps = state.t.componentes.filter(c => c.nivel === 'Componente');
  const dados = comps.map(c => ({ c, k: calcularCriticidade(c.codigo) }));
  const ordemClasse = { A: 0, B: 1, C: 2, '': 3 };
  const selClasse = h('select', { class: 'campo', 'aria-label': 'Classe' }, [['', 'Todas as classes'], ['A', 'Classe A'], ['B', 'Classe B'], ['C', 'Classe C'], ['sem', 'Sem avaliação']].map(([v, t]) => h('option', { value: v }, t)));
  const selCanal = h('select', { class: 'campo', 'aria-label': 'Canal' }, h('option', { value: '' }, 'Todos os canais'), [...new Set(comps.map(c => c.canal).filter(Boolean))].map(c => h('option', { value: c }, c)));
  const busca = h('input', { type: 'search', class: 'campo busca', placeholder: 'Buscar componente...', 'aria-label': 'Buscar' });
  const corpo = h('div', { class: 'tabela-rolagem' }); const resumo = h('div', { class: 'grade-cartoes' });
  const desenhar = () => {
    const q = norm(busca.value).split(/\s+/).filter(Boolean);
    const lista = dados.filter(({ c, k }) => (!f.classe || (f.classe === 'sem' ? !k.avaliado : k.classe === f.classe)) && (!f.canal || c.canal === f.canal) && q.every(t => norm(c.codigo + ' ' + c.nome).includes(t)))
      .sort((a, b) => ordemClasse[a.k.classe] - ordemClasse[b.k.classe] || (b.k.score || 0) - (a.k.score || 0) || b.k.f12 - a.k.f12 || a.c.codigo.localeCompare(b.c.codigo, 'pt', { numeric: true }));
    const n = cl => dados.filter(x => x.k.classe === cl).length;
    resumo.replaceChildren(...[[n('A'), 'classe A (críticos)'], [n('B'), 'classe B'], [n('C'), 'classe C'], [dados.filter(x => !x.k.avaliado).length, 'sem avaliação']].map(([v, t], i) => h('div', { class: 'cartao-num' + (i === 0 && v ? ' alerta-num' : '') }, h('strong', null, v), h('span', null, t))));
    corpo.replaceChildren(!lista.length ? h('p', { class: 'vazio' }, 'Nenhum componente com este filtro.') : h('table', { class: 'tabela' },
      h('thead', null, h('tr', null, ['Classe', 'Componente', 'Consequência', 'Falhas (12 m)', 'Pontos', 'Estratégia recomendada', 'Adotada', ''].map(t => h('th', null, t)))),
      h('tbody', null, lista.map(({ c, k }) => h('tr', { class: 'clicavel', tabindex: 0, title: k.motivos.join(' '), onclick: e => { if (!e.target.closest('a,button')) editar(c, k); }, onkeydown: e => { if (e.key === 'Enter') editar(c, k); } },
        h('td', { 'data-rotulo': 'Classe' }, k.classe ? h('span', { class: 'classe c-' + k.classe }, k.classe) : h('span', { class: 'etq pend' }, 'avaliar')),
        h('td', { 'data-rotulo': 'Componente' }, linkComp(c.codigo)),
        h('td', { 'data-rotulo': 'Consequência' }, k.avaliado ? `${k.cons} de 5` : '—'), h('td', { 'data-rotulo': 'Falhas (12 m)' }, `${k.f12} (nota ${k.freq})`), h('td', { 'data-rotulo': 'Pontos' }, k.avaliado ? k.score : '—'),
        h('td', { 'data-rotulo': 'Estratégia recomendada' }, k.recomendada || '—'), h('td', { 'data-rotulo': 'Adotada' }, k.av?.estrategia || ''),
        h('td', { class: 'seta' }, podeEditar() && k.avaliado && k.classe !== 'C' ? h('button', { class: 'btn pequeno', type: 'button', onclick: () => abrirFormulario('rotinas', { padroes: { titulo: `${k.recomendada}: ${c.nome}`, componente: c.codigo, periodicidade_dias: periodoSugerido(k.classe), instrucoes: k.motivos.join('\n') }, aoSalvar: () => toast('Rotina criada em Preventiva.') }) }, 'Criar rotina') : '›'))))));
  };
  const editar = (c, k) => podeEditar() ? abrirFormulario('criticidade', { linha: k.av, padroes: { componente: c.codigo }, aoSalvar: atualizar }) : null;
  selClasse.addEventListener('change', () => { f.classe = selClasse.value; desenhar(); }); selCanal.addEventListener('change', () => { f.canal = selCanal.value; desenhar(); }); busca.addEventListener('input', desenhar);
  desenhar();
  return h('div', null, tituloPagina('Criticidade e estratégia de manutenção'), blocoAjuda('criticidade', 'estrategias'),
    h('section', { class: 'painel aviso-tpm' }, h('h2', null, 'Resumo do cálculo'),
      h('p', null, 'Consequência (1 a 5) = a maior nota entre segurança, produção e qualidade, mais 1 se não há peça reserva e a reposição é demorada. Frequência (1 a 5) = falhas dos últimos 12 meses (0 falhas = 1; 1 = 2; 2 = 3; 3 ou 4 = 4; 5 ou mais = 5). Pontos = consequência × frequência. Classe A: 15 ou mais, ou risco grave de segurança. B: 8 a 14, ou consequência 4 ou mais. C: abaixo disso.'),
      h('p', null, 'Estratégia: A = preditiva (medir a condição) e peça reserva; B = preventiva por tempo; C = corretiva planejada com limpeza, lubrificação e aperto feitos pelo operador. Se o teste de tendência mostrar desgaste, entra também a troca ou revisão por idade. É uma recomendação inicial, a decisão final é da equipe: escolha a estratégia adotada na avaliação. Clique numa linha para avaliar.')),
    resumo, h('div', { class: 'barra-filtros' }, busca, selClasse, selCanal), corpo);
}
