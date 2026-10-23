// Desenho automático das ligações (colunas: quem alimenta -> quem recebe)
import { h } from './ui.js';
import { state } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs, ...kids) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  for (const k of kids.flat()) if (k) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  return e;
};

const COR_CANAL = { 1: '#e07b1a', 2: '#2f7fd1', 0: '#7a8591' };
const canalNum = c => (c || '').startsWith('Canal 1') ? 1 : (c || '').startsWith('Canal 2') ? 2 : 0;

function quebra(texto, max) {
  const pal = String(texto).split(/\s+/), linhas = []; let atual = '';
  for (const p of pal) {
    if ((atual + ' ' + p).trim().length > max && atual) { linhas.push(atual); atual = p; } else atual = (atual + ' ' + p).trim();
  }
  if (atual) linhas.push(atual);
  if (linhas.length > 2) { linhas.length = 2; linhas[1] = linhas[1].replace(/.{0,3}$/, '…'); }
  return linhas;
}

export function alcance(ligs, cod, sentido) {
  // sentido 'abaixo': tudo que recebe a partir de cod; 'acima': tudo que alimenta cod
  const visto = new Set(); const pilha = [cod];
  while (pilha.length) {
    const c = pilha.pop();
    for (const l of ligs) {
      const de = sentido === 'abaixo' ? l.origem : l.destino, para = sentido === 'abaixo' ? l.destino : l.origem;
      if (de === c && !visto.has(para)) { visto.add(para); pilha.push(para); }
    }
  }
  return visto;
}

// Constrói o SVG. opcoes: { selecionado, aoClicar }
export function desenharMapa(ligs, { selecionado = null, aoClicar = () => {} } = {}) {
  if (!ligs.length) return h('p', { class: 'vazio' }, 'Nenhuma ligação cadastrada para este filtro.');
  const cods = [...new Set(ligs.flatMap(l => [l.origem, l.destino]))];

  // nível = caminho mais longo desde as fontes (limitado, para tolerar ciclos)
  const nivel = Object.fromEntries(cods.map(c => [c, 0]));
  for (let i = 0; i < cods.length + 1; i++) {
    let mudou = false;
    for (const l of ligs) if (nivel[l.destino] < nivel[l.origem] + 1 && nivel[l.origem] + 1 <= cods.length) { nivel[l.destino] = nivel[l.origem] + 1; mudou = true; }
    if (!mudou) break;
  }
  const colunas = [];
  for (const c of cods) (colunas[nivel[c]] ||= []).push(c);
  const cheias = colunas.map(c => c || []);

  // ordem vertical: média da posição dos vizinhos à esquerda (2 passadas)
  const pos = {};
  cheias.forEach(col => col.sort((a, b) => a.localeCompare(b, 'pt', { numeric: true })).forEach((c, i) => pos[c] = i));
  for (let r = 0; r < 2; r++) {
    for (let k = 1; k < cheias.length; k++) {
      const media = c => {
        const v = ligs.filter(l => l.destino === c).map(l => pos[l.origem]);
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : pos[c];
      };
      cheias[k].sort((a, b) => media(a) - media(b) || a.localeCompare(b, 'pt', { numeric: true }));
      cheias[k].forEach((c, i) => pos[c] = i);
    }
  }

  const LARG = 250, ALT = 58, GAPX = 100, GAPY = 20, M = 20;
  const maxLinhas = Math.max(...cheias.map(c => c.length));
  const largTotal = M * 2 + cheias.length * LARG + (cheias.length - 1) * GAPX;
  const altTotal = M * 2 + maxLinhas * ALT + (maxLinhas - 1) * GAPY;
  const xy = {};
  cheias.forEach((col, k) => {
    const alturaCol = col.length * ALT + (col.length - 1) * GAPY;
    const y0 = M + (maxLinhas * ALT + (maxLinhas - 1) * GAPY - alturaCol) / 2;
    col.forEach((c, i) => xy[c] = { x: M + k * (LARG + GAPX), y: y0 + i * (ALT + GAPY) });
  });

  const abaixo = selecionado ? alcance(ligs, selecionado, 'abaixo') : new Set();
  const acima = selecionado ? alcance(ligs, selecionado, 'acima') : new Set();
  const emDestaque = c => !selecionado || c === selecionado || abaixo.has(c) || acima.has(c);

  const svg = s('svg', { viewBox: `0 0 ${largTotal} ${altTotal}`, width: largTotal, height: altTotal, class: 'mapa-svg', role: 'img', 'aria-label': 'Mapa de ligações' });
  const defs = s('defs');
  for (const [k, cor] of Object.entries(COR_CANAL)) {
    defs.appendChild(s('marker', { id: 'seta' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M0,0 L10,5 L0,10 z', fill: cor })));
  }
  svg.appendChild(defs);

  // setas primeiro (ficam atrás das caixas)
  const rotulos = [];
  ligs.forEach(l => {
    const a = xy[l.origem], b = xy[l.destino];
    const x1 = a.x + LARG, y1 = a.y + ALT / 2, x2 = b.x, y2 = b.y + ALT / 2;
    const dx = Math.max(40, (x2 - x1) / 2);
    const cn = canalNum(state.porCodigo.get(l.destino)?.canal);
    const ativa = !selecionado || ((l.origem === selecionado || abaixo.has(l.origem)) && (abaixo.has(l.destino))) ||
      ((l.destino === selecionado || acima.has(l.destino)) && (acima.has(l.origem)));
    const p = s('path', {
      d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2 - 2},${y2}`, fill: 'none',
      stroke: COR_CANAL[cn], 'stroke-width': ativa ? 2.2 : 1.2, opacity: ativa ? 1 : 0.18,
      'marker-end': `url(#seta${cn})`, 'stroke-dasharray': l.situacao === 'Confirmada' ? '' : '6 4'
    }, s('title', {}, `${l.tipo} • fio ${l.n_fio || '?'} • ${l.situacao}`));
    svg.appendChild(p);
    rotulos.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, t: l.n_fio ? `fio ${l.n_fio}` : 'fio nº ?', ativa, falta: !l.n_fio });
  });

  // caixas
  for (const c of cods) {
    const { x, y } = xy[c];
    const comp = state.porCodigo.get(c);
    const cn = canalNum(comp?.canal);
    const sel = c === selecionado;
    const g = s('g', { class: 'no', tabindex: 0, role: 'button', 'aria-label': `${c} ${comp?.nome || ''}`, opacity: emDestaque(c) ? 1 : 0.25, style: 'cursor:pointer' });
    g.appendChild(s('rect', { x, y, width: LARG, height: ALT, rx: 8, class: 'no-caixa' + (sel ? ' sel' : ''), stroke: COR_CANAL[cn], 'stroke-width': sel ? 3 : 1.6 }));
    g.appendChild(s('rect', { x, y, width: 6, height: ALT, rx: 3, fill: COR_CANAL[cn] }));
    g.appendChild(s('text', { x: x + 14, y: y + 16, class: 'no-cod' }, c.replace('EQ006-', '')));
    quebra(comp?.nome || '(componente não encontrado)', 31).forEach((ln, i) => g.appendChild(s('text', { x: x + 14, y: y + 32 + i * 14, class: 'no-nome' }, ln)));
    g.addEventListener('click', () => aoClicar(c));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoClicar(c); } });
    svg.appendChild(g);
  }

  // números dos fios por cima de tudo
  for (const r of rotulos) {
    const w = r.t.length * 6.4 + 10;
    const g = s('g', { opacity: r.ativa ? 1 : 0.2 });
    g.appendChild(s('rect', { x: r.x - w / 2, y: r.y - 9, width: w, height: 18, rx: 9, class: 'fio-caixa' + (r.falta ? ' falta' : '') }));
    g.appendChild(s('text', { x: r.x, y: r.y + 4, 'text-anchor': 'middle', class: 'fio-texto' }, r.t));
    svg.appendChild(g);
  }
  return h('div', { class: 'mapa-rolagem' }, svg);
}
