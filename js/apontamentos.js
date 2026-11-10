// Ligação com o sistema de apontamentos da Megadoor (outro banco: o do coletor).
// Todo apontamento que diz o conjunto e o item (ou que é quebra de máquina) vira uma
// ocorrência no componente certo da árvore. O nome escrito no apontamento é ligado ao
// componente por um "vínculo" (tabela vinculos_apontamento): você vincula uma vez e os
// próximos apontamentos com o mesmo conjunto e item já vão direto.
import { h, norm, fmtDateTime, fmtMin, toast, uuid } from './ui.js';
import { state, cliente, recarregar, podeEditar, caminho } from './data.js';
import { linkComp, tituloPagina } from './views.js';

const AP_URL = 'https://bdohqikuaoxlhjwexlqd.supabase.co';
const AP_CHAVE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkb2hxaWt1YW94bGhqd2V4bHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTEzMzUsImV4cCI6MjEwODc2NzMzNX0.TNJ7zQwTDi1XddJ6MHQ7qA1WzTHfbR26RpIQqnAnbyM';
let ap = null;
function apCliente() {
  if (!ap && window.supabase) ap = window.supabase.createClient(AP_URL, AP_CHAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'sb-apontamentos-megadoor' } });
  return ap;
}
export async function apSessao() { const c = apCliente(); if (!c) return null; const { data } = await c.auth.getSession(); return data.session || null; }
async function apEntrar(email, senha) {
  const { error } = await apCliente().auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos (use os do sistema de apontamentos).' : error.message);
}
async function apSair() { await apCliente().auth.signOut(); }

// lê uma tabela inteira (de 1000 em 1000)
async function tudo(tabela, colunas, filtro) {
  let out = [], de = 0;
  for (;;) {
    let q = apCliente().from(tabela).select(colunas);
    if (filtro) q = filtro(q);
    const { data, error } = await q.range(de, de + 999);
    if (error) throw new Error(tabela + ': ' + error.message);
    out = out.concat(data); if (data.length < 1000) break; de += 1000;
  }
  return out;
}

const txt = v => { const t = String(v ?? '').replace(/\s+/g, ' ').trim(); return /^[-.?\s]*$/.test(t) ? '' : t; };
const chaveNome = v => norm(txt(v)).replace(/[^a-z0-9]+/g, ' ').trim();
export const chaveVinculo = (conj, item) => chaveNome(conj) + '|' + chaveNome(item);
const PERDA = { 'quebra ou falha do equipamento': 'Quebra ou falha de equipamento', 'setup e ajuste': 'Setup e ajustes', 'ociosidade e pequenas paradas': 'Pequenas paradas e ociosidade',
  'velocidade reduzida': 'Velocidade reduzida', 'defeitos no processo': 'Defeitos e retrabalho', 'defeitos de partida': 'Perdas no início da produção' };
const ehQuebra = sub => norm(sub) === 'quebra de maquina';
// "2026-10-17 19:29:45" (hora local da fábrica, UTC−3) -> Date
const dataLocal = s => new Date(String(s).replace(' ', 'T').slice(0, 19) + '-03:00');

// ---------- lê os apontamentos que devem virar ocorrência ----------
export async function lerEventos() {
  const [classif, ajustes, divisoes, cfg, comConj] = await Promise.all([
    tudo('classificacao', 'nreg,programada,subgrupo,seis_perdas'),
    tudo('ajustes', 'nreg,conjunto,item,problema,solucao,obs'),
    tudo('divisoes', '*').catch(() => []),
    apCliente().from('configuracao').select('valor').eq('chave', 'padronizacao').maybeSingle().then(r => (r.data && r.data.valor) || {}).catch(() => ({})),
    tudo('coletor', 'nreg', q => q.or('conjunto.not.is.null,item.not.is.null'))
  ]);
  const cl = new Map(classif.map(c => [c.nreg, c])), aj = new Map(ajustes.map(a => [a.nreg, a]));
  const pad = (nivel, v) => { const m = cfg[nivel]; const k = norm(txt(v)).replace(/[^a-z0-9]+/g, ' ').trim(); return m && m[k] ? m[k] : txt(v); };
  const div = new Map(); divisoes.forEach(p => { if (!div.has(p.nreg)) div.set(p.nreg, []); div.get(p.nreg).push(p); });
  // candidatos: quem tem conjunto/item (no coletor ou no seu ajuste), quebra de máquina e apontamentos divididos
  const nregs = new Set([...comConj.map(x => x.nreg), ...ajustes.filter(a => a.conjunto || a.item).map(a => a.nreg),
    ...classif.filter(c => ehQuebra(c.subgrupo)).map(c => c.nreg), ...div.keys()]);
  const lista = [...nregs];
  const col = [];
  for (let i = 0; i < lista.length; i += 200) {
    const { data, error } = await apCliente().from('coletor').select('nreg,data_hora,hora_anterior,t_ciclo_s,idturno,menuid,conjunto,item,problema,solucao,observacao').in('nreg', lista.slice(i, i + 200));
    if (error) throw new Error('coletor: ' + error.message);
    col.push(...data);
  }
  const eventos = [];
  for (const l of col) {
    if (l.menuid === 99999 || String(l.hora_anterior || '').startsWith('06:00:00') || !(l.t_ciclo_s > 0)) continue;   // registros de sistema / reinício
    const c = cl.get(l.nreg), a = aj.get(l.nreg) || {};
    if (c && c.programada && norm(c.programada) !== 'nao programada') continue;   // parada externa: não é do equipamento
    const fim = dataLocal(l.data_hora), ini = new Date(fim.getTime() - l.t_ciclo_s * 1000);
    const partes = div.get(l.nreg) && div.get(l.nreg).length > 1 ? div.get(l.nreg).sort((x, y) => x.parte - y.parte) : [null];
    let t0 = ini;
    for (const p of partes) {
      const seg = p ? p.segundos : l.t_ciclo_s;
      const sub = p ? p.subgrupo : c && c.subgrupo, seis = p ? p.seis_perdas : c && c.seis_perdas;
      const prog = p ? p.programada : c && c.programada;
      if (p && prog && norm(prog) !== 'nao programada') { t0 = new Date(t0.getTime() + seg * 1000); continue; }
      const v = k => p ? (p[k] != null ? p[k] : (a[k] != null ? a[k] : l[k])) : (a[k] != null ? a[k] : l[k]);
      const conj = pad('conjunto', v('conjunto')), item = pad('item', v('item'));
      const tf = new Date(t0.getTime() + seg * 1000);
      if ((conj && item) || ehQuebra(sub)) eventos.push({
        id: String(l.nreg) + (p ? '-' + p.parte : ''), nreg: l.nreg, parte: p ? p.parte : null, turno: l.idturno,
        inicio: t0, fim: tf, segundos: seg, conjunto: conj, item, problema: pad('problema', v('problema')), solucao: pad('solucao', v('solucao')),
        obs: txt(l.observacao), minhaObs: txt(p ? p.obs : a.obs), subgrupo: sub || null, seis: seis || null,
        chave: conj && item ? chaveVinculo(conj, item) : 'nreg:' + l.nreg + (p ? '-' + p.parte : '')
      });
      t0 = tf;
    }
  }
  return eventos.sort((x, y) => y.inicio - x.inicio);
}

// ---------- cria / atualiza as ocorrências ----------
function linhaOcorrencia(e, comp) {
  const tipo = ehQuebra(e.subgrupo) ? 'Falha' : norm(e.subgrupo) === 'troca de broca' ? 'Troca' : 'Outro';
  const obs = [`Do apontamento nº ${e.nreg}${e.parte ? ' (parte ' + e.parte + ')' : ''} · turno ${['', 'A', 'B', 'C'][e.turno] || e.turno || '—'}${e.subgrupo ? ' · ' + e.subgrupo : ''}`,
    (e.conjunto || e.item) ? `Escrito no apontamento: ${[e.conjunto, e.item].filter(Boolean).join(' › ')}` : null,
    e.problema ? 'Problema: ' + e.problema : null, e.obs ? 'Operador: ' + e.obs : null, e.minhaObs ? 'Obs.: ' + e.minhaObs : null].filter(Boolean).join('\n');
  return {
    componente: comp, tipo, data_hora: e.inicio.toISOString(), data_hora_fim: e.fim.toISOString(),
    parada_min: Math.max(1, Math.round(e.segundos / 60)), perda: PERDA[norm(e.seis)] || (tipo === 'Falha' ? 'Quebra ou falha de equipamento' : null),
    acao: e.solucao || null, observacoes: obs, origem: 'apontamento', origem_id: e.id,
    apontamento: { nreg: e.nreg, parte: e.parte, conjunto: e.conjunto, item: e.item, problema: e.problema, solucao: e.solucao, subgrupo: e.subgrupo, seis_perdas: e.seis, segundos: e.segundos }
  };
}

export async function sincronizar() {
  const eventos = await lerEventos();
  const vinc = new Map(state.t.vinculos_apontamento.map(v => [v.chave, v]));
  const existentes = new Map(state.t.ocorrencias.filter(o => o.origem === 'apontamento').map(o => [o.origem_id, o]));
  const novas = [], mudar = [], pendentes = [], ids = new Set();
  for (const e of eventos) {
    const v = vinc.get(e.chave);
    if (v && v.ignorar) continue;
    if (!v || !v.componente || !state.porCodigo.has(v.componente)) { pendentes.push(e); continue; }
    ids.add(e.id);
    const nova = linhaOcorrencia(e, v.componente), ant = existentes.get(e.id);
    if (!ant) novas.push({ id: uuid(), ...nova });
    else {
      // não apaga o que você completou no arquivo vivo (causa, modo de falha, executores, anexos, ação e observações editadas)
      const atual = { componente: nova.componente, data_hora: nova.data_hora, data_hora_fim: nova.data_hora_fim, parada_min: nova.parada_min, perda: ant.perda || nova.perda, apontamento: nova.apontamento };
      const difere = ant.componente !== atual.componente || new Date(ant.data_hora).getTime() !== new Date(atual.data_hora).getTime() || ant.parada_min !== atual.parada_min || JSON.stringify(ant.apontamento) !== JSON.stringify(atual.apontamento);
      if (difere) mudar.push({ id: ant.id, ...atual });
    }
  }
  const sb = cliente();
  if (podeEditar() && sb) {
    for (let i = 0; i < novas.length; i += 200) { const { error } = await sb.from('ocorrencias').insert(novas.slice(i, i + 200)); if (error) throw new Error('Ao criar ocorrências: ' + error.message); }
    for (const m of mudar) { const { id, ...resto } = m; const { error } = await sb.from('ocorrencias').update(resto).eq('id', id); if (error) throw new Error('Ao atualizar ocorrência: ' + error.message); }
    if (novas.length || mudar.length) await recarregar('ocorrencias');
  }
  const orfas = [...existentes.values()].filter(o => !ids.has(o.origem_id));
  return { eventos: eventos.length, novas: novas.length, atualizadas: mudar.length, pendentes, orfas };
}

// sugere o componente pelo texto (palavras em comum com o nome e o caminho na árvore)
const PARADA = new Set(['de', 'da', 'do', 'das', 'dos', 'que', 'faz', 'a', 'o', 'e', 'na', 'no', 'em', 'para', 'com', 'lado', 'esquerdo', 'direito']);
const palavras = s => chaveNome(s).split(' ').filter(w => w && !PARADA.has(w)).map(w => w.length > 4 ? w.replace(/(es|s)$/, '') : w);
function sugerir(e) {
  const alvo = new Set(palavras(e.item + ' ' + e.problema)), conj = new Set(palavras(e.conjunto));
  let melhor = null, nota = 0;
  for (const c of state.t.componentes) {
    const nome = new Set(palavras(c.nome)), cam = new Set(palavras(caminho(c.codigo).map(x => x.nome).join(' ') + ' ' + (c.canal || '')));
    let n = 0; alvo.forEach(w => { if (nome.has(w)) n += 2; else if (cam.has(w)) n += 0.5; }); conj.forEach(w => { if (cam.has(w)) n += 0.7; });
    if (c.nivel === 'Peça ou subitem') n -= 0.6;   // prefere o componente; a peça você escolhe quando souber
    if (n > nota) { nota = n; melhor = c.codigo; }
  }
  return nota >= 2 ? melhor : null;
}
function seletorComponente(selecionado) {
  const ord = [...state.t.componentes].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt', { numeric: true }));
  const nivelTab = c => c.nivel === 'Conjunto' ? '' : c.nivel === 'Componente' ? '  ' : '    ';
  return h('select', { class: 'campo', style: 'min-width:16rem;max-width:100%' }, h('option', { value: '' }, '— escolha o componente —'),
    ord.map(c => h('option', { value: c.codigo, selected: c.codigo === selecionado }, nivelTab(c) + c.codigo.replace('EQ006-', '') + ' · ' + c.nome)));
}

// ---------- tela ----------
let ultimo = null;
export function viewApontamentos() {
  const raiz = h('div', null, tituloPagina('Apontamentos da Megadoor'));
  const corpo = h('div');
  raiz.append(h('p', { class: 'dica' }, 'Todo apontamento do sistema de apontamentos que diz o conjunto e o item, ou que foi classificado como quebra de máquina, vira uma ocorrência no componente da árvore. ',
    'Quando o nome escrito no apontamento não bate com a árvore, ele aparece aqui em "A vincular": diga a qual componente se refere e os próximos com o mesmo nome já vão direto.'), corpo);
  montar(corpo);
  return raiz;
}
async function montar(corpo) {
  corpo.replaceChildren(h('p', null, 'Verificando a conexão com o sistema de apontamentos…'));
  const sess = await apSessao().catch(() => null);
  if (!sess) return corpo.replaceChildren(formLogin(corpo));
  const btn = h('button', { class: 'btn primario', type: 'button' }, 'Trazer apontamentos agora');
  const sair = h('button', { class: 'btn pequeno', type: 'button', onclick: async () => { await apSair(); montar(corpo); } }, 'Desconectar');
  const res = h('div');
  corpo.replaceChildren(h('section', { class: 'painel' }, h('div', { class: 'acoes-linha', style: 'display:flex;gap:.6rem;align-items:center;flex-wrap:wrap' }, btn,
    h('small', { class: 'dica' }, 'Conectado ao sistema de apontamentos como ' + sess.user.email), sair)), res);
  const rodar = async () => {
    btn.disabled = true; btn.textContent = 'Trazendo…';
    try { ultimo = await sincronizar(); desenhar(res, corpo); if (ultimo.novas || ultimo.atualizadas) toast(`${ultimo.novas} ocorrência(s) nova(s), ${ultimo.atualizadas} atualizada(s).`); }
    catch (e) { res.replaceChildren(h('p', { class: 'erro-form' }, e.message)); }
    finally { btn.disabled = false; btn.textContent = 'Trazer apontamentos agora'; }
  };
  btn.onclick = rodar;
  if (ultimo) desenhar(res, corpo); else rodar();
}
function formLogin(corpo) {
  const email = h('input', { type: 'email', class: 'campo', autocomplete: 'off' }), senha = h('input', { type: 'password', class: 'campo', autocomplete: 'off' });
  const erro = h('p', { class: 'erro-form', hidden: true }), b = h('button', { class: 'btn primario', type: 'submit' }, 'Conectar');
  return h('form', { class: 'painel', style: 'max-width:28rem', onsubmit: async ev => {
    ev.preventDefault(); erro.hidden = true; b.disabled = true;
    try { await apEntrar(email.value.trim(), senha.value); montar(corpo); } catch (e) { erro.textContent = e.message; erro.hidden = false; b.disabled = false; }
  } }, h('h2', null, 'Conectar ao sistema de apontamentos'),
    h('p', { class: 'dica' }, 'Use o e-mail e a senha do sistema de apontamentos (é outro login). Fica lembrado neste navegador.'),
    h('label', null, 'E-mail'), email, h('label', null, 'Senha'), senha, erro, b);
}
function desenhar(res, corpo) {
  const r = ultimo; if (!r) return;
  const sb = cliente();
  const vinculadas = state.t.ocorrencias.filter(o => o.origem === 'apontamento');
  const horas = vinculadas.reduce((a, o) => a + (o.parada_min || 0), 0);
  // pendentes agrupados pelo nome escrito (ou um a um, para quebra sem conjunto/item)
  const grupos = new Map();
  for (const e of r.pendentes) { if (!grupos.has(e.chave)) grupos.set(e.chave, { chave: e.chave, ev: [], seg: 0 }); const g = grupos.get(e.chave); g.ev.push(e); g.seg += e.segundos; }
  const lista = [...grupos.values()].sort((a, b) => b.seg - a.seg);
  const salvarVinc = async (g, comp, ignorar) => {
    const e = g.ev[0];
    const linha = { chave: g.chave, conjunto: e.conjunto || null, item: e.item || null, componente: comp || null, ignorar: !!ignorar, atualizado_em: new Date().toISOString() };
    const { error } = await sb.from('vinculos_apontamento').upsert(linha, { onConflict: 'chave' });
    if (error) throw new Error(error.message);
    await recarregar('vinculos_apontamento');
    ultimo = await sincronizar(); desenhar(res, corpo);
    toast(ignorar ? 'Ignorado.' : 'Vinculado.');
  };
  const secPend = h('section', { class: 'painel' }, h('h2', null, 'A vincular ', h('span', { class: 'contagem-sec' }, lista.length)),
    lista.length ? h('div', { class: 'tabela-rolagem' }, h('table', { class: 'tabela' },
      h('thead', null, h('tr', null, ['Escrito no apontamento', 'Vezes', 'Tempo parado', 'Último', 'É qual componente?', ''].map(t => h('th', null, t)))),
      h('tbody', null, lista.map(g => {
        const e = g.ev[0], sel = seletorComponente(sugerir(e));
        const ok = h('button', { class: 'btn pequeno primario', type: 'button', disabled: !podeEditar(), onclick: async () => { if (!sel.value) return toast('Escolha o componente.', 'erro'); ok.disabled = true; try { await salvarVinc(g, sel.value, false); } catch (er) { toast(er.message, 'erro'); ok.disabled = false; } } }, 'Vincular');
        const ign = h('button', { class: 'btn pequeno', type: 'button', disabled: !podeEditar(), title: 'Não é de nenhum componente (teste, erro de digitação...)', onclick: async () => { try { await salvarVinc(g, null, true); } catch (er) { toast(er.message, 'erro'); } } }, 'Ignorar');
        const nome = e.conjunto || e.item ? h('span', null, h('b', null, [e.conjunto, e.item].filter(Boolean).join(' › '))) :
          h('span', null, h('b', null, `Quebra sem conjunto/item · apontamento nº ${e.nreg}`), e.problema || e.obs ? h('small', { style: 'display:block' }, [e.problema, e.obs].filter(Boolean).join(' · ')) : null);
        return h('tr', null, h('td', null, nome, sel.value ? h('small', { style: 'display:block;color:var(--suave)' }, 'sugestão escolhida pelo texto: confira') : null),
          h('td', null, g.ev.length + 'x'), h('td', null, fmtMin(Math.round(g.seg / 60))), h('td', null, fmtDateTime(e.inicio)),
          h('td', null, sel), h('td', { style: 'white-space:nowrap' }, ok, ' ', ign));
      }))))
      : h('p', { class: 'vazio' }, 'Tudo vinculado.'));
  const vincs = [...state.t.vinculos_apontamento].sort((a, b) => (a.conjunto || '').localeCompare(b.conjunto || '') || (a.item || '').localeCompare(b.item || ''));
  const secVinc = h('section', { class: 'painel' }, h('h2', null, 'Vínculos já feitos ', h('span', { class: 'contagem-sec' }, vincs.length)),
    vincs.length ? h('ul', { class: 'lista-simples' }, vincs.map(v => h('li', null,
      h('b', null, v.conjunto || v.item ? [v.conjunto, v.item].filter(Boolean).join(' › ') : v.chave.replace('nreg:', 'apontamento nº ')), ' → ',
      v.ignorar ? h('span', { class: 'etq' }, 'ignorado') : v.componente ? linkComp(v.componente) : h('span', { class: 'etq pend' }, 'componente apagado'),
      podeEditar() ? h('button', { class: 'btn-icone pequeno', type: 'button', title: 'Desfazer o vínculo (volta para "A vincular")', onclick: async () => {
        const { error } = await sb.from('vinculos_apontamento').delete().eq('chave', v.chave); if (error) return toast(error.message, 'erro');
        await recarregar('vinculos_apontamento'); ultimo = await sincronizar(); desenhar(res, corpo); toast('Vínculo desfeito.');
      } }, '✕') : null)))
      : h('p', { class: 'vazio' }, 'Nenhum vínculo ainda.'));
  const secOrf = r.orfas.length ? h('section', { class: 'painel' }, h('h2', null, 'Ocorrências que não batem mais com o apontamento ', h('span', { class: 'contagem-sec' }, r.orfas.length)),
    h('p', { class: 'dica' }, 'O apontamento mudou (foi reclassificado, desvinculado ou deixou de ser do equipamento). Confira e apague se não fizer mais sentido.'),
    h('ul', { class: 'lista-simples' }, r.orfas.map(o => h('li', null, linkComp(o.componente), ' · ', fmtDateTime(o.data_hora), ' · apontamento ', (o.apontamento && o.apontamento.nreg) || o.origem_id)))) : null;
  res.replaceChildren(
    h('section', { class: 'painel' }, h('div', { class: 'kpis', style: 'display:flex;gap:1.5rem;flex-wrap:wrap' },
      h('div', null, h('small', null, 'Apontamentos que viram ocorrência'), h('div', { style: 'font-size:1.6rem;font-weight:700' }, r.eventos)),
      h('div', null, h('small', null, 'Já são ocorrências'), h('div', { style: 'font-size:1.6rem;font-weight:700' }, vinculadas.length)),
      h('div', null, h('small', null, 'Tempo parado nessas ocorrências'), h('div', { style: 'font-size:1.6rem;font-weight:700' }, fmtMin(horas))),
      h('div', null, h('small', null, 'A vincular'), h('div', { style: 'font-size:1.6rem;font-weight:700;color:' + (r.pendentes.length ? 'var(--alerta)' : 'inherit') }, r.pendentes.length))),
      h('p', { class: 'dica' }, `Última leitura: agora · ${r.novas} nova(s), ${r.atualizadas} atualizada(s).`)),
    secPend, secVinc, secOrf);
}

// roda sozinho ao abrir o arquivo vivo (se já estiver conectado e puder editar)
export async function sincronizarSilencioso() {
  try {
    if (!podeEditar() || !(await apSessao())) return;
    const r = await sincronizar(); ultimo = r;
    if (r.novas) toast(`${r.novas} ocorrência(s) nova(s) vindas dos apontamentos.`);
    if (r.pendentes.length) toast(`${r.pendentes.length} apontamento(s) a vincular a um componente (menu Apontamentos).`);
    return r;
  } catch (e) { console.warn('Apontamentos:', e.message); }
}
