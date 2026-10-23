// Estatística de confiabilidade para sistemas reparáveis (sem bibliotecas externas)

// ---- distribuição qui-quadrado (função gama incompleta + inversão numérica) ----
function lnGama(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015; for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function gamaP(a, x) {                       // gama incompleta regularizada P(a, x)
  if (x <= 0) return 0;
  if (x < a + 1) { let s = 1 / a, t = s, n = a; for (let i = 0; i < 500; i++) { n++; t *= x / n; s += t; if (Math.abs(t) < Math.abs(s) * 1e-14) break; } return s * Math.exp(-x + a * Math.log(x) - lnGama(a)); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, hh = d;
  for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; hh *= del; if (Math.abs(del - 1) < 1e-14) break; }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGama(a)) * hh;
}
export const qui2Cdf = (x, k) => gamaP(k / 2, x / 2);
export function qui2Inv(p, k) {              // quantil: valor x tal que P(X <= x) = p
  let lo = 0, hi = Math.max(10, k * 4);
  while (qui2Cdf(hi, k) < p) hi *= 2;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (qui2Cdf(m, k) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// normal padrão
export function normalCdf(z) { return 0.5 * (1 + (z >= 0 ? 1 : -1) * gamaP(0.5, z * z / 2)); }

// ---- MTBF de sistema reparável, observação encerrada no tempo T (exato, por qui-quadrado) ----
// r = número de falhas, T = horas de operação observadas, conf = nível de confiança bilateral
export function mtbfComIntervalo(r, T, conf = 0.9) {
  const a = 1 - conf;
  if (!(T > 0)) return null;
  if (r === 0) return { r, T, pontual: null, inf: T * 2 / qui2Inv(1 - a, 2), sup: null };   // só limite inferior unilateral
  return { r, T, pontual: T / r, inf: 2 * T / qui2Inv(1 - a / 2, 2 * r + 2), sup: 2 * T / qui2Inv(a / 2, 2 * r) };
}

// ---- Teste de tendência de Laplace (falhas ao longo do tempo, observação encerrada em T) ----
// U > 1,645 (90%) ou 1,96 (95%): falhas cada vez mais frequentes (deterioração). U < -1,645: cada vez menos (melhora).
export function laplace(tempos, T) {
  const r = tempos.length;
  if (r < 3 || !(T > 0)) return null;
  const U = (tempos.reduce((a, b) => a + b, 0) / r - T / 2) / (T * Math.sqrt(1 / (12 * r)));
  return { U, p: 2 * (1 - normalCdf(Math.abs(U))), r };
}

// ---- Modelo de Crow-AMSAA (processo de Poisson não homogêneo, lei de potência) ----
// Número esperado de falhas até t: N(t) = lambda * t^beta. beta > 1: falhas cada vez mais frequentes.
export function crowAmsaa(tempos, T, conf = 0.9) {
  const r = tempos.length;
  if (r < 3 || !(T > 0) || tempos.some(t => !(t > 0) || t > T)) return null;
  const soma = tempos.reduce((a, t) => a + Math.log(T / t), 0);
  if (!(soma > 0)) return null;
  const betaMV = r / soma, beta = (r - 1) / soma;                 // beta não viesado
  const a = 1 - conf, g = 2 * (r - 1);
  const inf = beta * qui2Inv(a / 2, g) / g, sup = beta * qui2Inv(1 - a / 2, g) / g;   // intervalo aproximado
  const lambda = r / Math.pow(T, beta);
  return { r, beta, betaMV, inf, sup, lambda, esperadas: t => lambda * (Math.pow(T + t, beta) - Math.pow(T, beta)),
    mtbfAtual: 1 / (lambda * beta * Math.pow(T, beta - 1)) };
}
// Probabilidade de ao menos uma falha nas próximas t horas
export const probFalha = esperadas => 1 - Math.exp(-esperadas);
