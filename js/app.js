import { h, toast } from './ui.js';
import { demo, state, iniciar, entrar, sair, carregarTudo } from './data.js';
import { viewArvore, viewComponente, viewLista, viewLigacoes, viewBackup } from './views.js';
import { viewInicio } from './inicio.js';
import { viewAcoes } from './acoes.js';
import { viewPreventiva } from './preventiva.js';
import { viewCausas } from './causas.js';
import { viewMetodos } from './metodos.js';
import { viewListas } from './listas.js';
import { abrirFormulario } from './forms.js';
import { modal } from './ui.js';

const app = document.getElementById('app');

const MENU = [
  ['#/', 'Início', 'inicio'], ['#/arvore', 'Árvore', 'arvore'], ['#/ocorrencias', 'Ocorrências', 'ocorrencias'],
  ['#/acoes', 'Plano de ação', 'acoes'], ['#/preventiva', 'Preventiva', 'preventiva'], ['#/causas', 'Causas', 'causas']
];
const MAIS = [
  ['#/compras', 'Compras', 'compras', 'Peças compradas e estoque'], ['#/parametros', 'Parâmetros', 'parametros', 'Inversores, drivers e CNC'],
  ['#/ligacoes', 'Ligações', 'ligacoes', 'Fiação e mapa'], ['#/usinagem', 'Usinagem', 'usinagem', 'Parâmetros de corte'],
  ['#/metodos', 'Guia de métodos', 'metodos', '5 porquês, P-M, FMEA, TPM'], ['#/listas', 'Listas dos menus', 'listas', 'Adicionar e remover opções'],
  ['#/backup', 'Backup', 'backup', 'Baixar cópia dos dados']
];

const logo = (cls = 'logo') => h('picture', null,
  h('source', { srcset: 'icons/logo-escuro.png', media: '(prefers-color-scheme: dark)' }),
  h('img', { src: 'icons/logo-claro.png', alt: 'Adooren', class: cls }));

function abrirMais() {
  const m = modal('Mais opções', h('div', { class: 'grade-mais' }, MAIS.map(([href, rot, , dica]) =>
    h('a', { href, class: 'cartao-mais', onclick: () => setTimeout(() => m.close(), 0) }, h('strong', null, rot), h('small', null, dica)))));
}

function casca() {
  app.innerHTML = '';
  const nav = h('nav', { class: 'menu', 'aria-label': 'Principal' }, MENU.map(([href, rot, id]) => h('a', { href, 'data-id': id }, rot)),
    h('button', { type: 'button', 'data-id': 'mais', onclick: abrirMais }, 'Mais ▾'));
  const topo = h('header', { class: 'topo' },
    h('a', { href: '#/', class: 'marca', 'aria-label': 'Início' }, logo(),
      h('span', { class: 'marca-maq' }, h('b', null, 'Megadoor 2.3 CNC'), h('small', null, 'EQ006 • ARQUIVO VIVO'))),
    h('div', { class: 'usuario' }, h('span', { class: 'papel' }, state.nome + (state.papel === 'leitura' ? ' (só leitura)' : '')),
      h('button', { class: 'btn pequeno', type: 'button', onclick: async () => { await sair(); location.hash = '#/'; telaLogin(); } }, 'Sair')));
  const principal = h('main', { id: 'principal', tabindex: -1 });
  const fab = h('button', { class: 'fab', type: 'button', 'aria-label': 'Registrar ocorrência', onclick: () => abrirFormulario('ocorrencias', { aoSalvar: rotear }) }, '+');
  app.append(...[demo ? h('div', { class: 'faixa-demo' }, 'MODO DEMONSTRAÇÃO: os dados ficam só neste navegador.') : null, topo, nav, principal, state.papel === 'leitura' ? null : fab].filter(Boolean));
}

function rotear() {
  const principal = document.getElementById('principal');
  if (!principal) return;
  const [, rota = '', a, b] = location.hash.split('/');
  let no;
  try {
    if (rota === '' ) no = viewInicio();
    else if (rota === 'arvore') no = viewArvore();
    else if (rota === 'c') no = viewComponente(decodeURIComponent(a || ''));
    else if (rota === 'ligacoes') no = viewLigacoes(a, b);
    else if (rota === 'acoes') no = viewAcoes(a);
    else if (rota === 'preventiva') no = viewPreventiva();
    else if (rota === 'causas') no = viewCausas(a || 'pareto');
    else if (rota === 'metodos') no = viewMetodos();
    else if (rota === 'listas') no = viewListas();
    else if (['ocorrencias', 'compras', 'parametros', 'usinagem'].includes(rota)) no = viewLista(rota);
    else if (rota === 'backup') no = viewBackup();
    else no = h('p', null, 'Página não encontrada.');
  } catch (e) {
    console.error(e);
    no = h('div', { class: 'painel' }, h('h2', null, 'Algo deu errado ao montar esta tela'), h('p', null, e.message));
  }
  principal.replaceChildren(no);
  let id = rota === 'c' ? 'arvore' : (rota || 'inicio');
  if (MAIS.some(x => x[2] === id)) id = 'mais';
  document.querySelectorAll('.menu a, .menu button').forEach(l => l.classList.toggle('ativo', l.dataset.id === id));
  window.scrollTo(0, 0);
}

function semPermissao() {
  app.replaceChildren(h('div', { class: 'login' }, h('h1', null, 'Sem acesso'),
    h('p', null, 'Seu usuário entrou, mas ainda não tem um perfil de acesso. Peça à administradora para liberar.'),
    h('button', { class: 'btn', type: 'button', onclick: async () => { await sair(); telaLogin(); } }, 'Sair')));
}

async function abrir() {
  if (!state.papel) return semPermissao();
  const carregando = h('div', { class: 'login' }, h('p', null, 'Carregando dados…'));
  app.replaceChildren(carregando);
  try { await carregarTudo(); }
  catch (e) { app.replaceChildren(h('div', { class: 'login' }, h('h1', null, 'Não foi possível carregar'), h('p', null, e.message),
    h('p', { class: 'dica' }, 'Se for a primeira vez, confira se o esquema do banco (01_esquema.sql) foi executado.'), h('button', { class: 'btn', onclick: () => location.reload() }, 'Tentar de novo'))); return; }
  casca();
  rotear();
}

function telaLogin() {
  const email = h('input', { type: 'email', class: 'campo', id: 'email', autocomplete: 'username', required: true });
  const senha = h('input', { type: 'password', class: 'campo', id: 'senha', autocomplete: 'current-password', required: true });
  const erro = h('p', { class: 'erro-form', role: 'alert', hidden: true });
  const btn = h('button', { class: 'btn primario grande', type: 'submit' }, 'Entrar');
  const f = h('form', { class: 'login', onsubmit: async e => {
    e.preventDefault(); erro.hidden = true; btn.disabled = true; btn.textContent = 'Entrando…';
    try { await entrar(email.value.trim(), senha.value); await abrir(); }
    catch (err) { erro.textContent = err.message; erro.hidden = false; btn.disabled = false; btn.textContent = 'Entrar'; }
  } },
  logo('logo-grande'),
  h('h1', null, 'Arquivo vivo • Megadoor 2.3 CNC'),
  h('label', { for: 'email' }, 'E-mail'), email, h('label', { for: 'senha' }, 'Senha'), senha, erro, btn,
  h('p', { class: 'dica' }, 'Acesso restrito. Não há cadastro aberto.'), h('div', { class: 'rodape-marca' }, 'PORTAS PARA O FUTURO'));
  app.replaceChildren(f);
  email.focus();
}

window.addEventListener('hashchange', rotear);
window.addEventListener('unhandledrejection', e => toast(e.reason?.message || 'Erro inesperado.', 'erro'));

(async function boot() {
  try {
    const logado = await iniciar();
    if (logado) await abrir(); else telaLogin();
  } catch (e) {
    app.replaceChildren(h('div', { class: 'login' }, h('h1', null, 'Erro ao iniciar'), h('p', null, e.message)));
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
