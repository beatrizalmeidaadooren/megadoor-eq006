// Cálculo da criticidade e da estratégia de manutenção recomendada (sem interface)
import { state, nivelComponente } from './data.js';
import { laplace } from './estatistica.js';

const CHAVE_OPER = 'parametro_operacao';
export function lerOperacao() {
  const [hd, ds, ini] = (state.t.opcoes.find(o => o.lista === CHAVE_OPER)?.valor || '').split('|');
  return { hd: Number(hd) || 0, ds: Number(ds) || 0, inicio: ini || '' };
}
const diasEntre = (a, b) => (new Date(b) - new Date(a)) / 86400000;

// Horas de operação acumuladas, descontando o tempo parado por falha
export function horasObservadas(falhas, inicio, hPorDia) {
  const fl = falhas.filter(o => o.data_hora.slice(0, 10) >= inicio).sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  let parado = 0; const tempos = [];
  for (const o of fl) { const t = Math.max(1e-6, diasEntre(inicio + 'T00:00:00', o.data_hora) * hPorDia - parado); tempos.push(t); parado += (o.parada_min || 0) / 60; }
  const T = Math.max(1e-6, diasEntre(inicio + 'T00:00:00', new Date()) * hPorDia - parado);
  return { tempos: tempos.map(t => Math.min(t, T)), T, r: fl.length };
}


import { RESERVAS_LISTA as RESERVAS } from './schema.js';
const PERIODO_SUGERIDO = { A: 7, B: 30, C: 90 };
export const periodoSugerido = classe => PERIODO_SUGERIDO[classe] || 30;

const freqNota = n => n >= 5 ? 5 : n >= 3 ? 4 : n === 2 ? 3 : n === 1 ? 2 : 1;

export function calcularCriticidade(cod) {
  const av = state.t.criticidade.find(x => x.componente === cod) || null;
  const falhas = state.t.ocorrencias.filter(o => o.tipo === 'Falha' && nivelComponente(o.componente) === cod);
  const corte = new Date(); corte.setFullYear(corte.getFullYear() - 1);
  const f12 = falhas.filter(o => new Date(o.data_hora) >= corte).length;
  const freq = freqNota(f12);
  // tendência de desgaste (teste de Laplace sobre as horas de operação), quando há dados
  let desgaste = false;
  const cfg = lerOperacao();
  const primeiro = state.t.ocorrencias.map(o => o.data_hora?.slice(0, 10)).filter(Boolean).sort()[0];
  const inicio = cfg.inicio || primeiro;
  if (cfg.hd > 0 && cfg.ds > 0 && inicio && falhas.length >= 3) {
    const { tempos, T } = horasObservadas(falhas, inicio, cfg.hd * cfg.ds / 7);
    const l = laplace(tempos, T); desgaste = !!(l && l.U > 1.645);
  }
  const base = { av, f12, freq, desgaste, avaliado: false };
  const notas = av ? [av.seguranca, av.producao, av.qualidade].filter(n => n != null) : [];
  if (!notas.length) return { ...base, classe: '', recomendada: '', motivos: ['Falta avaliar segurança, produção e qualidade.'] };
  let cons = Math.max(...notas);
  const motivos = [];
  if (av.reserva === RESERVAS[2] && cons < 5) { cons += 1; motivos.push('Sem peça reserva e reposição demorada: consequência +1.'); }
  const score = cons * freq;
  let classe = (av.seguranca >= 5 || score >= 15) ? 'A' : score >= 8 ? 'B' : 'C';
  if (cons >= 4 && classe === 'C') { classe = 'B'; motivos.push('Consequência alta: nunca fica na classe C.'); }
  if (av.seguranca >= 5) motivos.push('Risco grave de segurança: classe A.');
  let rec;
  if (classe === 'A') {
    rec = desgaste ? 'Preventiva + preditiva' : 'Preditiva (por condição)';
    motivos.push(desgaste ? 'Falhas cada vez mais frequentes (desgaste): troca ou revisão por idade, além de medir a condição.' : 'Medir a condição (corrente, temperatura, vibração) para agir antes da falha.');
    if (av.reserva && av.reserva !== RESERVAS[0]) motivos.push('Manter peça reserva em estoque.');
    if (av.seguranca >= 4) motivos.push('Incluir verificação de segurança obrigatória.');
  } else if (classe === 'B') {
    rec = desgaste ? 'Preventiva + preditiva' : 'Preventiva por tempo';
    motivos.push(desgaste ? 'Falhas cada vez mais frequentes: revisar por idade.' : 'Inspeção e troca por tempo, a partir do checklist.');
  } else { rec = 'Corretiva planejada'; motivos.push('Pode operar até falhar, com limpeza, lubrificação e aperto pelo operador (manutenção autônoma).'); }
  return { ...base, avaliado: true, cons, score, classe, recomendada: rec, motivos };
}
