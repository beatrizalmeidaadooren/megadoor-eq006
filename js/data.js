// Camada de dados: fala com o Supabase (ou com o modo demonstração, local).
import { uuid } from './ui.js';
import { LISTAS } from './schema.js';

const CFG = window.MEGADOOR_CONFIG || {};
export const demo = !(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
export const NOMES = ['componentes', 'ocorrencias', 'compras', 'parametros', 'ligacoes', 'usinagem', 'acoes', 'analises', 'hipoteses', 'anomalias', 'criticidade', 'fmea', 'rotinas', 'execucoes_rotina'];
const AUXILIARES = ['opcoes'];                       // tabelas de apoio (menus)
const TODAS = [...NOMES, ...AUXILIARES];
// Tabelas criadas pelos scripts 04 e 06: se ainda não existirem no banco, o aplicativo segue funcionando sem elas
const OPCIONAIS = ['acoes', 'analises', 'hipoteses', 'anomalias', 'criticidade', 'fmea', 'rotinas', 'execucoes_rotina', 'opcoes'];
export const faltando = new Set();

export const state = {
  user: null, papel: null, nome: null,
  t: Object.fromEntries(TODAS.map(n => [n, []])),
  porCodigo: new Map(), filhos: new Map()
};

export const podeEditar = () => state.papel === 'admin' || state.papel === 'registra';
export const podeApagar = () => state.papel === 'admin';

let sb = null;
const mem = { arquivos: new Map() };           // anexos do modo demonstração (só na memória)

// ---------- indexação ----------
export function indexar() {
  state.porCodigo = new Map(state.t.componentes.map(c => [c.codigo, c]));
  state.filhos = new Map();
  const ord = [...state.t.componentes].sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || a.codigo.localeCompare(b.codigo, 'pt', { numeric: true }));
  for (const c of ord) {
    const k = c.pai || '';
    if (!state.filhos.has(k)) state.filhos.set(k, []);
    state.filhos.get(k).push(c);
  }
}
export const filhosDe = cod => state.filhos.get(cod || '') || [];
export const nomeDe = cod => state.porCodigo.get(cod)?.nome || '';
export function caminho(cod) {
  const out = []; let c = state.porCodigo.get(cod), guard = 0;
  while (c && guard++ < 20) { out.unshift(c); c = c.pai ? state.porCodigo.get(c.pai) : null; }
  return out;
}
export function descendentes(cod) {
  const out = []; const pilha = [cod];
  while (pilha.length) for (const f of filhosDe(pilha.pop())) { out.push(f.codigo); pilha.push(f.codigo); }
  return out;
}
// ancestral no nível "Componente" (para somar falhas das peças no componente)
export function nivelComponente(cod) {
  const cam = caminho(cod);
  return (cam.find(c => c.nivel === 'Componente') || cam[cam.length - 1] || {}).codigo || cod;
}

// ---------- início ----------
export async function iniciar() {
  if (demo) {
    state.user = { id: 'demo', email: 'demonstracao@local' };
    state.papel = 'admin'; state.nome = 'Demonstração';
    await demoCarregar();
    return true;
  }
  if (!window.supabase) throw new Error('Biblioteca do banco não carregou. Verifique a pasta vendor.');
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  const { data } = await sb.auth.getSession();
  if (data.session) { await definirUsuario(data.session.user); return true; }
  return false;
}

async function definirUsuario(user) {
  state.user = user;
  const { data, error } = await sb.from('perfis').select('papel,nome').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  state.papel = data?.papel || null; state.nome = data?.nome || user.email;
}

export async function entrar(email, senha) {
  if (demo) return true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
  await definirUsuario(data.user);
  return true;
}
export async function sair() {
  if (!demo) await sb.auth.signOut();
  state.user = null; state.papel = null;
}

export async function carregarTudo() {
  faltando.clear();
  for (const n of TODAS) {
    try { state.t[n] = await listar(n); }
    catch (e) {
      if (OPCIONAIS.includes(n) && /does not exist|schema cache|relation|Could not find/i.test(e.message || '')) { state.t[n] = []; faltando.add(n); }
      else throw e;
    }
  }
  indexar();
}
export async function recarregar(n) { state.t[n] = await listar(n); if (n === 'componentes') indexar(); }

// ---------- operações ----------
async function listar(n) {
  if (demo) return structuredClone(demoDados[n] || []);
  let tudo = [], de = 0;
  for (;;) {
    const { data, error } = await sb.from(n).select('*').range(de, de + 999);
    if (error) throw erro(error);
    tudo = tudo.concat(data);
    if (data.length < 1000) break;
    de += 1000;
  }
  return tudo;
}

export async function salvar(n, linha, novo) {
  const chave = chaveDe(n);
  const limpa = { ...linha };
  for (const k of Object.keys(limpa)) if (limpa[k] === '') limpa[k] = null;
  delete limpa.atualizado_em; delete limpa.npr;   // npr é calculado pelo banco
  if (demo) {
    const arr = demoDados[n];
    if (novo) { if (!limpa[chave]) limpa[chave] = uuid(); limpa.criado_em = new Date().toISOString(); arr.push(limpa); }
    else { const i = arr.findIndex(r => r[chave] === limpa[chave]); arr[i] = { ...arr[i], ...limpa }; }
    if (n === 'execucoes_rotina' && novo) {          // espelha o gatilho do banco
      const r = demoDados.rotinas.find(x => x.id === limpa.rotina_id);
      if (r && (!r.ultima_execucao || r.ultima_execucao < limpa.data_execucao)) r.ultima_execucao = limpa.data_execucao;
    }
    if (n === 'fmea') delete limpa.npr;
    demoSalvar();
  } else if (novo) {
    const { error } = await sb.from(n).insert(limpa);
    if (error) throw erro(error);
  } else {
    const { error } = await sb.from(n).update(limpa).eq(chave, limpa[chave]);
    if (error) throw erro(error);
  }
  await recarregar(n);
}

export async function apagar(n, linha) {
  const chave = chaveDe(n);
  if (demo) {
    const filhosTemRef = n === 'componentes' && (state.t.componentes.some(c => c.pai === linha.codigo) ||
      ['ocorrencias', 'compras', 'parametros', 'fmea'].some(t => state.t[t].some(r => r.componente === linha.codigo)) ||
      state.t.ligacoes.some(r => r.origem === linha.codigo || r.destino === linha.codigo));
    if (filhosTemRef) throw new Error('Este componente tem subitens, registros ou ligações. Apague ou mova esses itens antes.');
    demoDados[n] = demoDados[n].filter(r => r[chave] !== linha[chave]);
    demoSalvar();
  } else {
    const { error } = await sb.from(n).delete().eq(chave, linha[chave]);
    if (error) {
      if (error.code === '23503') throw new Error('Este item está em uso (tem subitens, registros ou ligações). Apague ou mova esses itens antes.');
      throw erro(error);
    }
  }
  await recarregar(n);
}

function chaveDe(n) { return n === 'componentes' ? 'codigo' : 'id'; }

function erro(e) {
  if (e.code === '42501' || /row-level security/i.test(e.message || '')) return new Error('Sem permissão para esta ação.');
  if (e.code === '23505') return new Error('Já existe um registro com este código.');
  return new Error(e.message || 'Erro ao falar com o banco de dados.');
}

// ---------- menus editáveis ----------
export function opcoesDe(lista) {
  const linhas = state.t.opcoes.filter(o => o.lista === lista);
  if (!linhas.length && faltando.has('opcoes')) return [...(LISTAS[lista]?.padrao || [])];   // banco ainda sem a tabela
  const ord = (a, b) => (a.ordem - b.ordem) || a.valor.localeCompare(b.valor, 'pt');
  return linhas.sort(lista === 'pessoas' ? (a, b) => a.valor.localeCompare(b.valor, 'pt') : ord).map(o => o.valor);
}
export async function adicionarOpcao(lista, valor) {
  valor = valor.trim().replace(/\s+/g, ' ');
  if (!valor) throw new Error('Digite um nome.');
  if (state.t.opcoes.some(o => o.lista === lista && o.valor.toLowerCase() === valor.toLowerCase())) throw new Error('Esta opção já existe na lista.');
  const ordem = Math.max(0, ...state.t.opcoes.filter(o => o.lista === lista).map(o => o.ordem || 0)) + 1;
  await salvar('opcoes', { id: uuid(), lista, valor, ordem }, true);
  return valor;
}
export async function removerOpcao(lista, valor) {
  const o = state.t.opcoes.find(x => x.lista === lista && x.valor === valor);
  if (o) await apagar('opcoes', o);
}

// ---------- anexos ----------
export async function enviarArquivo(pasta, id, file) {
  const nomeSeguro = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${pasta}/${id}/${Date.now()}-${nomeSeguro}`;
  if (demo) { mem.arquivos.set(path, URL.createObjectURL(file)); return { path, name: file.name, type: file.type, size: file.size }; }
  const { error } = await sb.storage.from('anexos').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw erro(error);
  return { path, name: file.name, type: file.type, size: file.size };
}
export async function urlArquivo(path) {
  if (!path) return null;
  if (demo) return mem.arquivos.get(path) || null;
  const { data, error } = await sb.storage.from('anexos').createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}
export async function apagarArquivo(path) {
  if (!path) return;                       // anexo do tipo link: não há arquivo para apagar
  if (demo) { mem.arquivos.delete(path); return; }
  await sb.storage.from('anexos').remove([path]);
}

// ---------- backup ----------
export function backupCompleto() {
  return {
    sistema: 'Arquivo vivo Megadoor EQ006', gerado_em: new Date().toISOString(), versao: 1,
    tabelas: structuredClone(state.t)
  };
}

// ---------- modo demonstração (dados só neste navegador) ----------
let demoDados = {};
const DEMO_CHAVE = 'megadoor_demo_v1';
function demoSalvar() { try { localStorage.setItem(DEMO_CHAVE, JSON.stringify(demoDados)); } catch { /* sem espaço: ignora */ } }
async function demoCarregar() {
  try { const s = localStorage.getItem(DEMO_CHAVE); if (s) { demoDados = JSON.parse(s); for (const n of TODAS) demoDados[n] ||= []; return; } } catch { /* ignora */ }
  let semente = null;
  try { const r = await fetch('demo_seed.json', { cache: 'no-store' }); if (r.ok) semente = await r.json(); } catch { /* ignora */ }
  demoDados = Object.fromEntries(TODAS.map(n => [n, []]));
  demoDados.opcoes = Object.entries(LISTAS).flatMap(([lista, d]) => d.padrao.map((valor, i) => ({ id: uuid(), lista, valor, ordem: i + 1 })));
  if (semente) {
    demoDados.componentes = semente.componentes || [];
    demoDados.ligacoes = (semente.ligacoes || []).map(l => ({ id: uuid(), ...l }));
  } else {
    demoDados.componentes = [
      { codigo: 'EQ006-Y1', pai: null, nivel: 'Conjunto', canal: 'Canal 1 (fechadura)', nome: 'Eixo Y1 (exemplo)', ordem: 1 },
      { codigo: 'EQ006-Y1-06', pai: 'EQ006-Y1', nivel: 'Componente', canal: 'Canal 1 (fechadura)', nome: 'Motor da caixa da fechadura (exemplo)', ordem: 2 }
    ];
  }
  demoSalvar();
}
export function demoReiniciar() { try { localStorage.removeItem(DEMO_CHAVE); } catch { /* ignora */ } location.reload(); }
