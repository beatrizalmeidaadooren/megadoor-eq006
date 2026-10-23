// Funções de apoio para montar a interface (sem bibliotecas externas)

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'readOnly') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// minúsculas e sem acento, para buscas
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v.length === 10 ? v + 'T12:00:00' : v);
  return isNaN(d) ? String(v) : d.toLocaleDateString('pt-BR');
}
export function fmtDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
export function toLocalInput(v) {
  const d = v ? new Date(v) : new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function fmtMin(min) {
  if (min === null || min === undefined || min === '') return '';
  min = Number(min);
  if (min < 60) return `${min} min`;
  const hh = Math.floor(min / 60), mm = min % 60;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}
export function fmtMoney(v) {
  if (v === null || v === undefined || v === '') return '';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  });
}

// ---------- avisos e janelas ----------
export function toast(msg, kind = 'ok') {
  const box = document.getElementById('toasts');
  const t = h('div', { class: 'toast ' + kind, role: 'status' }, msg);
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), kind === 'erro' ? 6000 : 2800);
  setTimeout(() => t.remove(), kind === 'erro' ? 6500 : 3300);
}

export function modal(title, body, { wide = false, onClose } = {}) {
  const root = document.getElementById('modal-root');
  const close = () => { overlay.remove(); document.body.classList.remove('sem-rolagem'); onClose && onClose(); };
  const overlay = h('div', { class: 'overlay', onmousedown: e => { if (e.target === overlay) close(); } },
    h('div', { class: 'janela' + (wide ? ' larga' : ''), role: 'dialog', 'aria-label': title },
      h('div', { class: 'janela-topo' },
        h('h2', null, title),
        h('button', { class: 'btn-icone', type: 'button', 'aria-label': 'Fechar', onclick: close }, '×')),
      h('div', { class: 'janela-corpo' }, body)));
  root.appendChild(overlay);
  document.body.classList.add('sem-rolagem');
  return { close, overlay };
}

export function confirmar(texto, rotulo = 'Apagar') {
  return new Promise(resolve => {
    let m;
    const fim = v => { resolve(v); m.close(); };   // resolve primeiro: fechar a janela resolve como "não"
    m = modal('Confirmar', h('div', null,
      h('p', null, texto),
      h('div', { class: 'acoes' },
        h('button', { class: 'btn', type: 'button', onclick: () => fim(false) }, 'Cancelar'),
        h('button', { class: 'btn perigo', type: 'button', onclick: () => fim(true) }, rotulo))),
      { onClose: () => resolve(false) });
  });
}

export function baixar(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const a = h('a', { href: URL.createObjectURL(blob), download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function csv(linhas, colunas) {
  const cel = v => {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v) && v.every(x => typeof x === 'string')) v = v.join('; ');
    else if (typeof v === 'object') v = JSON.stringify(v);
    v = String(v);
    return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  return '﻿' + [colunas.join(';'), ...linhas.map(l => colunas.map(c => cel(l[c])).join(';'))].join('\r\n');
}

// reduz fotos antes de enviar (economiza espaço no plano gratuito)
export function reduzirImagem(file, max = 1280, qualidade = 0.72) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const f = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => {
        URL.revokeObjectURL(url);
        if (!b || b.size >= file.size) return resolve(file);
        resolve(new File([b], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', qualidade);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ---------- datas (dia a dia, no fuso local) ----------
export const hojeISO = () => toLocalInput().slice(0, 10);
const paraData = iso => new Date(iso + 'T12:00:00');
export function addDias(iso, n) { const d = paraData(iso); d.setDate(d.getDate() + n); return toLocalInput(d.toISOString()).slice(0, 10); }
// dias de hoje até a data (negativo = já passou)
export const diasAte = iso => iso ? Math.round((paraData(iso) - paraData(hojeISO())) / 86400000) : null;
