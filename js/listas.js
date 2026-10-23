// Menus editáveis: adicionar e excluir opções de cada lista
import { h, modal, toast, confirmar } from './ui.js';
import { LISTAS } from './schema.js';
import { opcoesDe, adicionarOpcao, removerOpcao, podeEditar, faltando } from './data.js';

// Painel com as opções de uma lista (fichas com "×") e um campo para acrescentar
export function painelLista(chave, { aoMudar = () => {} } = {}) {
  const def = LISTAS[chave];
  const raiz = h('div', { class: 'lista-edit' });
  const desenhar = () => {
    raiz.innerHTML = '';
    const itens = opcoesDe(chave);
    raiz.append(h('div', { class: 'fichas' }, itens.length
      ? itens.map(v => h('span', { class: 'ficha-op' }, v,
        podeEditar() && !def.travados.includes(v) ? h('button', { type: 'button', class: 'x', 'aria-label': `Remover ${v}`, title: 'Remover da lista', onclick: async () => {
          if (!await confirmar(`Remover "${v}" da lista? Os registros que já usam este valor continuam como estão.`, 'Remover')) return;
          try { await removerOpcao(chave, v); desenhar(); aoMudar(); } catch (e) { toast(e.message, 'erro'); }
        } }, '×') : null))
      : h('span', { class: 'vazio' }, 'Lista vazia. Acrescente a primeira opção abaixo.')));
    if (podeEditar()) {
      const campo = h('input', { type: 'text', class: 'campo', placeholder: 'Nova opção', maxlength: 80, 'aria-label': 'Nova opção' });
      const enviar = async () => {
        try { await adicionarOpcao(chave, campo.value); campo.value = ''; desenhar(); aoMudar(); raiz.querySelector('input')?.focus(); }
        catch (e) { toast(e.message, 'erro'); }
      };
      campo.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); enviar(); } });
      raiz.append(h('div', { class: 'linha-add' }, campo, h('button', { class: 'btn primario pequeno', type: 'button', onclick: enviar }, 'Adicionar')));
    }
    if (def.dica) raiz.append(h('small', { class: 'dica' }, def.dica));
  };
  desenhar();
  return raiz;
}

export function abrirEditorLista(chave, aoMudar = () => {}) {
  const m = modal(`Editar lista: ${LISTAS[chave].rotulo}`, h('div', null,
    painelLista(chave, { aoMudar }),
    h('div', { class: 'acoes' }, h('button', { class: 'btn primario', type: 'button', onclick: () => m.close() }, 'Pronto'))));
  return m;
}

export function viewListas() {
  const aviso = faltando.has('opcoes') ? h('p', { class: 'erro-form' }, 'As listas editáveis ainda não foram ativadas no banco (falta rodar o script 06). Por enquanto valem as listas de fábrica.') : null;
  return h('div', null,
    h('div', { class: 'topo-pagina' }, h('h1', null, 'Listas dos menus')),
    h('p', { class: 'dica' }, 'Todos os menus do aplicativo saem daqui. Acrescente ou remova opções quando precisar; isso vale para todos da equipe.'),
    aviso,
    Object.entries(LISTAS).map(([chave, d]) => h('section', { class: 'painel' }, h('h2', null, d.rotulo), painelLista(chave))));
}
