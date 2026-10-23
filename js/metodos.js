// Guia de métodos e blocos de ajuda de cada tela: para que serve, como usar e exemplo real.
// Os exemplos usam o caso do motor da caixa da fechadura, com números ilustrativos.
import { h } from './ui.js';
import { tituloPagina } from './views.js';

export const AJUDA = {
  natureza: {
    t: 'Falha esporádica ou crônica',
    serve: 'Descobrir que tipo de problema você tem, antes de escolher como analisar. Esporádica é a que aparece de repente, fora do comum. Crônica é a que se repete até parecer normal.',
    como: ['Olhe o histórico do componente: a mesma falha já aconteceu antes?', 'Esporádica: algo mudou (peça nova, ferramenta, ajuste). Corrija restaurando a condição normal.', 'Crônica: costuma ter várias causas pequenas juntas e resiste a conserto rápido. Use P-M, hipóteses e as cinco medidas.'],
    ex: 'O rolamento do eletromandril travou uma única vez, depois de entrar cavaco: esporádica; limpar e trocar resolve. O motor da caixa da fechadura queimou três vezes em seis meses, sempre com a borneira escurecida: crônica; trocar o motor de novo não resolve, é preciso achar o conjunto de causas.',
    f: 'Suzuki (1989), cap. 2, p. 38-47'
  },
  cincoporques: {
    t: 'Cinco porquês',
    serve: 'Seguir uma cadeia de causas até algo que, se for corrigido, impede o problema de voltar. Funciona bem quando a causa parece clara e única.',
    como: ['Escreva o problema em uma frase.', 'Pergunte "por que isso aconteceu?" e anote a resposta, com a evidência (medição, foto, observação).', 'Pergunte "por quê?" sobre a resposta. Repita até chegar a uma causa que a equipe consegue corrigir (em geral cinco vezes, às vezes menos).', 'A última resposta é a causa raiz. Crie uma ação para ela.', 'Cuidado: se a falha é crônica, uma só cadeia pode esconder outras causas. Use também o P-M e as hipóteses.'],
    ex: 'Problema: o motor da caixa queimou. 1) Por quê? O enrolamento superaqueceu. 2) Por quê? A corrente ficou acima da nominal por muito tempo. 3) Por quê? A proteção não desarmou. 4) Por quê? O disjuntor-motor estava regulado acima da corrente do motor. 5) Por quê? Ninguém tinha a corrente da plaqueta registrada na hora de ajustar. Causa raiz: falta de padrão para ajustar as proteções. Ação: registrar a plaqueta e padronizar o ajuste.',
    f: 'Método consagrado (origem Toyota). Não é detalhado nos livros de TPM enviados.'
  },
  pm: {
    t: 'Análise P-M (fenômeno e mecanismo)',
    serve: 'Resolver falhas crônicas, em que já se tentou consertar e o problema voltou. Em vez de apostar em uma causa, entende a física do problema e lista todas as condições que o produzem.',
    como: ['Esclarecer: o que acontece, onde, quando. Compare com equipamento semelhante.', 'Física: que lei da natureza explica o fenômeno? (calor, atrito, vibração, sobrecorrente)', 'Listar todas as condições que precisam existir para o fenômeno acontecer.', 'Para cada condição, listar os fatores de máquina, ferramenta, material e método.', 'Planejar a investigação: o que medir, como e onde.', 'Investigar e anotar toda anomalia, mesmo as que parecem inofensivas.', 'Montar o plano de melhoria para cada fator.'],
    ex: 'Fenômeno: a borneira do motor da caixa escurece e derrete. Comparação: a do motor do canal 2 também escurece? Física: calor por resistência de contato (potência = resistência × corrente ao quadrado). Condições: contato com resistência alta, corrente alta, calor que não sai. Fatores: terminal frouxo ou oxidado (máquina), aperto sem torque definido (método), corrente real nunca medida. Investigar: termômetro infravermelho na borneira durante a usinagem, torque dos parafusos, corrente medida nas nove passadas.',
    f: 'Suzuki (1989), cap. 2, p. 71-74'
  },
  hipoteses: {
    t: 'Hipóteses por categoria (diagrama de causa e efeito, 6M)',
    serve: 'Organizar todas as causas possíveis em Máquina, Método, Material, Mão de obra, Meio ambiente e Medição, e registrar o que foi confirmado ou descartado.',
    como: ['Para cada categoria, pense: o que ali poderia causar o problema?', 'Escreva cada hipótese como uma afirmação que pode ser provada ou descartada.', 'Diga como verificar e quem verifica.', 'Marque Confirmada ou Descartada e anote a evidência. Não descarte por palpite.', 'Quando há muitas causas pequenas, o TPM recomenda eliminar todas as suspeitas, mesmo que seja mais lento.'],
    ex: 'Máquina: não há proteção térmica (PTC) no motor. Método: passe de usinagem fundo demais, com muitas passadas. Material: fresa desgastada exige mais potência. Mão de obra: disjuntor ajustado sem padrão. Meio ambiente: pó de MDP cobrindo o motor. Medição: a corrente do motor nunca foi medida. Cada uma vira uma linha com "como verificar", por exemplo "medir a corrente com alicate amperímetro durante uma porta de 70 mm".',
    f: 'Suzuki (1989), cap. 2, p. 66-74'
  },
  cincomedidas: {
    t: 'Cinco medidas para zero quebras',
    serve: 'Conferir, para um componente, se as cinco coisas que mais evitam quebra estão em ordem. Uma falha que volta quase sempre tem mais de uma medida descuidada.',
    como: ['Para cada medida, responda às perguntas sugeridas olhando a máquina.', 'Marque Em ordem, Pendente ou Não se aplica e anote o que foi visto.', 'Toda medida Pendente vira uma ação.', 'As cinco: condições básicas (limpeza, lubrificação, aperto), condições de operação, restaurar a deterioração, corrigir fraquezas de projeto e melhorar as habilidades.'],
    ex: 'Motor da caixa: 1) borneira apertada e limpa? Pendente: parafuso frouxo. 2) corrente e frequência do inversor compatíveis com a plaqueta? Pendente: nunca conferido. 3) rolamento com folga? Em ordem. 4) existe proteção térmica? Pendente: não. 5) há procedimento escrito de troca? Pendente. Resultado: quatro ações.',
    f: 'Suzuki (1989), cap. 3, p. 91-101; Nakajima (1988), "Five Countermeasures for Zero Breakdowns"'
  },
  ocultos: {
    t: 'Defeitos ocultos',
    serve: 'Achar os problemas pequenos que ainda não deram sinal, mas que somados provocam as quebras repetidas: pó, folga, parafuso solto, desgaste, vibração.',
    como: ['Programe uma limpeza de inspeção no componente: limpar é inspecionar.', 'Registre tudo que achar, mesmo que pareça pequeno, com foto.', 'Diga o tipo, a gravidade e por que estava escondido (sujeira, acesso difícil, ignorado, subestimado).', 'Corrija enquanto é pequeno e marque como corrigido. Se for grande, crie uma ação.', 'Pare a máquina em intervalos razoáveis: a produção perdida numa parada planejada é pequena perto da perda de uma quebra.'],
    ex: 'Na limpeza do motor da caixa a equipe achou: pó de MDP cobrindo as aletas (o calor não saía), parafuso do bloco de bornes frouxo e cabo com a isolação ressecada. Eram três defeitos pequenos e juntos explicam o superaquecimento. Cada um foi registrado, com foto, e corrigido no mesmo dia.',
    f: 'Suzuki (1989), cap. 2, p. 66-70 e cap. 3, p. 89-93'
  },
  perdas: {
    t: 'Seis grandes perdas',
    serve: 'Classificar cada ocorrência pelo tipo de perda que causou, para saber onde a máquina mais perde.',
    como: ['No registro da ocorrência, escolha o tipo de perda.', 'Paradas: quebra ou falha, setup e ajustes. Velocidade: pequenas paradas, velocidade reduzida. Defeitos: retrabalho, perda no início da produção.', 'No Pareto, agrupe por tipo de perda para ver a maior.'],
    ex: 'O motor queimado é "Quebra ou falha de equipamento". Trocar a fresa e ajustar a posição a cada mudança de porta é "Setup e ajustes". A máquina rodar mais devagar por medo de queimar o motor é "Velocidade reduzida".',
    f: 'Suzuki (1989), cap. 1, p. 10 e cap. 2, p. 28-30'
  },
  pareto: {
    t: 'Pareto',
    serve: 'Decidir o que atacar primeiro. Mostra quais componentes, modos de falha ou causas concentram a maior parte das falhas ou do tempo parado.',
    como: ['Escolha como agrupar (componente, modo de falha, causa ou tipo de perda) e o que medir (número de falhas ou minutos parados).', 'Leia de cima para baixo: as barras vermelhas somam cerca de 80% do total.', 'Comece as análises pelas barras vermelhas.'],
    ex: 'Em 10 falhas do ano, 5 foram no motor da caixa, 2 no eletromandril e as demais espalhadas. O motor da caixa sozinho é 50% das falhas, então ele recebe a análise primeiro. Medindo em minutos parados, pode ser que o eletromandril, com poucas falhas longas, passe à frente: por isso vale ver os dois.',
    f: 'Ferramenta clássica da qualidade.'
  },
  mtbf: {
    t: 'MTBF e MTTR',
    serve: 'Medir se a máquina está ficando mais confiável (MTBF, tempo médio entre falhas) e mais fácil de consertar (MTTR, tempo médio de reparo).',
    como: ['Registre o início e o fim de cada falha: o MTTR sai da diferença.', 'O MTBF precisa de pelo menos duas falhas no mesmo componente.', 'Compare períodos: MTBF subindo e MTTR caindo indicam melhora.'],
    ex: 'Três falhas do motor da caixa, com 3 h 30 min, 2 h e 4 h de parada: MTTR de 3 h 10 min. Se entre elas passaram 40 e 25 dias, o MTBF é 32 dias e meio. Depois de uma melhoria, se o intervalo seguinte for de 90 dias, o MTBF sobe e dá para ver o efeito.',
    f: 'Suzuki (1989), cap. 5 (registro e análise de MTBF)'
  },
  confiabilidade: {
    t: 'Confiabilidade, MTBF com intervalo e tendência',
    serve: 'Dizer, com margem de erro honesta, quanto tempo o componente costuma rodar sem falhar e se as falhas estão ficando mais ou menos frequentes. Usa métodos próprios de itens que são consertados e voltam a operar.',
    como: ['Informe as horas de operação por dia, os dias por semana e a data em que o histórico passou a ser confiável.', 'MTBF = horas de operação ÷ número de falhas, com intervalo de 90%: quanto menos falhas, mais largo o intervalo. Se o intervalo é muito largo, ainda é cedo para concluir.', 'Tendência (teste de Laplace): U acima de 1,65 = falhas cada vez mais frequentes (desgaste); abaixo de −1,65 = cada vez menos (melhorando); no meio = sem evidência de mudança.', 'A chance de rodar 40 h ou 160 h sem falhar usa o modelo com tendência quando ela é comprovada, e taxa constante nos outros casos.'],
    ex: 'Cinco falhas em 1.000 h de operação: MTBF de 200 h, com 90% de confiança entre 95 e 508 h. A chance de rodar um turno de 8 h sem falhar é de cerca de 96%, e uma semana de 40 h, 82%. Se as falhas ocorreram nas horas 100, 300, 500, 700 e 900, não há tendência (U perto de 0). Se ocorreram em 700, 800, 850, 900 e 950, U vale 2,6: está piorando, e trocar ou revisar o componente por idade passa a valer a pena.',
    f: 'Estatística de sistemas reparáveis: intervalo por qui-quadrado, teste de Laplace e modelo de Crow-AMSAA (IEC 61710).'
  },
  outros: {
    t: 'Outros indicadores',
    serve: 'Recorrência de falhas, vida útil entre trocas, cumprimento da preventiva, tempo de fechamento de ações e prazo de entrega de peças.',
    como: ['Recorrência: se uma falha se repete em até 90 dias no mesmo componente e modo, a causa raiz ainda não foi eliminada. Abra uma análise.', 'Vida útil entre trocas: mostra quais peças duram menos. Precisa de trocas registradas.', 'Estoque crítico e prazo de entrega: orientam o que comprar antes de precisar.'],
    ex: 'Se o rolamento do motor aparece com 2 repetições, trocar o rolamento não eliminou a causa. Se a vida média dele é de 60 dias e a reposição leva 30, o estoque mínimo deve cobrir pelo menos uma troca.',
    f: 'Indicadores usuais de manutenção.'
  },
  fmea: {
    t: 'FMEA (modos de falha e efeitos)',
    serve: 'Antecipar as falhas e ordenar os riscos, para tratar primeiro os mais perigosos antes de acontecerem.',
    como: ['Para cada componente, liste um modo de falha (como pode falhar), o efeito e a causa provável.', 'Dê notas de 1 a 10: Severidade (quão grave), Ocorrência (quão frequente) e Detecção (quão difícil de perceber antes).', 'NPR = S × O × D (de 1 a 1.000). Comece pelos maiores.', 'Registre a ação recomendada, execute e dê novas notas: o NPR deve cair.'],
    ex: 'Borneira queimada: Severidade 8 (para a máquina e há risco de incêndio), Ocorrência 6 (já aconteceu várias vezes), Detecção 8 (ninguém inspeciona a borneira). NPR = 384. Ação: inspeção com termômetro infravermelho todo mês e torque padrão. Depois da ação, Detecção cai para 3 e o NPR vai a 144.',
    f: 'Método de engenharia da confiabilidade (IEC 60812). Não é detalhado nos livros de TPM enviados.'
  },
  criticidade: {
    t: 'Criticidade e estratégia de manutenção',
    serve: 'Decidir quais componentes merecem mais atenção e que tipo de manutenção cada um precisa, em vez de tratar tudo igual.',
    como: ['Para cada componente, dê notas de 1 a 5 para segurança, impacto na produção e impacto na qualidade, e diga se há peça reserva.', 'Consequência = maior das três notas (mais 1 se não há reserva e a reposição demora). Frequência vem sozinha das falhas dos últimos 12 meses.', 'Pontos = consequência × frequência. Classe A (15 ou mais), B (8 a 14), C (menos).', 'Siga a estratégia recomendada: A = medir a condição e manter reserva; B = preventiva por tempo; C = operar até falhar, com limpeza e lubrificação pelo operador.', 'Use "Criar rotina" para transformar a recomendação em rotina preventiva.'],
    ex: 'Motor da caixa: segurança 3, produção 4 (para um canal), qualidade 4, sem reserva e reposição demorada. Consequência = 4 + 1 = 5. Com 3 falhas em 12 meses a frequência é 4. Pontos = 20: classe A. Estratégia: medir a corrente e a temperatura (preditiva) e ter um motor reserva. Já a lâmpada de sinalização do painel: consequência 1 × frequência 1 = 1, classe C: troca quando queimar.',
    f: 'Manutenção centrada em confiabilidade (RCM, SAE JA1011) e manutenção planejada e autônoma do TPM (Suzuki, 1989, cap. 3 a 5).'
  },
  estrategias: {
    t: 'Preditiva, preventiva e corretiva planejada',
    serve: 'Escolher o tipo de manutenção certo para cada componente.',
    como: ['Preditiva: medir a condição (corrente, temperatura, vibração, folga) e agir quando o valor sair do normal. Boa para itens críticos que avisam antes de falhar.', 'Preventiva: trocar ou inspecionar por tempo de uso. Só compensa quando a falha aumenta com o uso (desgaste, teste de tendência positivo).', 'Corretiva planejada: operar até falhar, com peça e procedimento prontos. Para itens baratos e de baixa consequência.', 'Autônoma: o operador limpa, lubrifica e aperta. Vale para todos.'],
    ex: 'Motor da caixa: medir a corrente nas passadas e a temperatura da borneira (preditiva). Rolamento com desgaste comprovado: trocar a cada X horas (preventiva). Lâmpada do painel: trocar quando queimar (corretiva). Limpeza do motor ao fim do turno: operador (autônoma).',
    f: 'Suzuki (1989), cap. 3 a 5; manutenção centrada em confiabilidade.'
  },
  gut: {
    t: 'Matriz GUT (prioridade das ações)',
    serve: 'Decidir qual ação fazer primeiro quando há muitas ao mesmo tempo.',
    como: ['Dê notas de 1 a 5 para Gravidade (o estrago se acontecer), Urgência (quanto tempo há) e Tendência (se piora sozinho).', 'GUT = G × U × T (1 a 125). O quadro ordena os cartões do maior para o menor GUT.', 'Serve para problemas e ações; para classificar equipamentos use a criticidade.'],
    ex: '"Ajustar o disjuntor-motor": Gravidade 5, Urgência 5, Tendência 4: GUT 100, faz primeiro. "Medir a corrente nas passadas": 4 × 3 × 3 = 36. "Pintar a grade de proteção": 1 × 1 × 1 = 1, fica para depois.',
    f: 'Ferramenta clássica de gestão da qualidade (Kepner e Tregoe).'
  },
  preventiva: {
    t: 'Manutenção preventiva por rotinas',
    serve: 'Garantir que as inspeções e trocas planejadas aconteçam em dia e que fiquem registradas.',
    como: ['Crie a rotina: o que verificar, em quanto tempo ela se repete e quem é o responsável.', 'Quando executar, clique em "Registrar" e marque Conforme ou Com anomalia.', 'Com anomalia: o aplicativo oferece criar uma ação para corrigir.', 'A próxima data é calculada sozinha a partir da última execução. Atrasadas aparecem em vermelho e no Início.', 'Use "Gerar a partir do checklist" para criar as rotinas dos itens de checklist da árvore; ajuste a repetição de cada uma.'],
    ex: '"Apertar a borneira do motor da caixa com torquímetro": a cada 30 dias, 15 minutos, responsável Douglas. Na execução ele encontra marca de calor em um terminal, marca Com anomalia e cria a ação "Trocar o terminal e medir a corrente".',
    f: 'Suzuki (1989), cap. 5 (manutenção planejada).'
  }
};

// Bloco recolhível "Como usar", com a lembrança de quem já o fechou
export const blocoAjuda = (...chaves) => montarAjuda(chaves, false);
export const ajudaFechada = (...chaves) => montarAjuda(chaves, true);
function montarAjuda(chaves, guia) {
  const caixa = h('div', { class: 'ajuda-grupo' });
  chaves.forEach((k, idx) => {
    const a = AJUDA[k]; if (!a) return;
    const memoria = 'ajuda_fechada_' + k;
    let fechada = guia || idx > 0;   // em telas com vários blocos, só o primeiro abre sozinho
    try { if (!guia) { const v = localStorage.getItem(memoria); if (v !== null) fechada = v === '1'; } } catch { /* sem armazenamento */ }
    const det = h('details', { class: 'ajuda', open: !fechada },
      h('summary', null, h('span', { class: 'ajuda-icone', 'aria-hidden': 'true' }, '?'), ' Como usar: ', h('strong', null, a.t)),
      h('div', { class: 'ajuda-corpo' },
        h('h4', null, 'Para que serve'), h('p', null, a.serve),
        h('h4', null, 'Como usar'), h('ol', null, a.como.map(x => h('li', null, x))),
        h('h4', null, 'Exemplo'), h('p', { class: 'ajuda-exemplo' }, a.ex),
        h('small', { class: 'fonte' }, 'Fonte: ' + a.f)));
    if (!guia) det.addEventListener('toggle', () => { try { localStorage.setItem(memoria, det.open ? '0' : '1'); } catch { /* ignora */ } });
    caixa.append(det);
  });
  return caixa;
}

const GUIA = [
  ['Falha esporádica ou crônica', ['natureza']], ['Cinco porquês', ['cincoporques']], ['Análise P-M', ['pm']], ['Hipóteses por categoria (6M)', ['hipoteses']],
  ['Cinco medidas para zero quebras', ['cincomedidas']], ['Defeitos ocultos', ['ocultos']], ['Seis grandes perdas', ['perdas']], ['Pareto', ['pareto']], ['FMEA', ['fmea']],
  ['Criticidade e estratégia', ['criticidade', 'estrategias']], ['Matriz GUT', ['gut']], ['Preventiva por rotinas', ['preventiva']], ['MTBF e MTTR', ['mtbf']],
  ['Confiabilidade e tendência', ['confiabilidade']], ['Outros indicadores', ['outros']]
];
const PERGUNTAS = [
  ['A falha foi pontual e a causa parece clara?', 'Faça os cinco porquês e registre a causa raiz.', '#/causas/analises'],
  ['A falha se repete, ou já foi consertada e voltou?', 'É crônica: use o P-M, liste hipóteses por categoria e confira as cinco medidas.', '#/causas/analises'],
  ['Quero saber o que atacar primeiro', 'Pareto para as falhas, FMEA para os riscos, GUT para as ações.', '#/causas/pareto'],
  ['Quero decidir como cuidar de cada componente', 'Criticidade: classe A, B ou C e a estratégia recomendada.', '#/causas/criticidade'],
  ['Quero evitar uma nova falha', 'Procure defeitos ocultos na limpeza e transforme as inspeções em rotinas preventivas.', '#/causas/ocultos'],
  ['Quero saber se melhorou', 'MTBF, MTTR, tendência e confiabilidade.', '#/causas/indicadores']
];

export function viewMetodos() {
  return h('div', null, tituloPagina('Guia de métodos'),
    h('p', { class: 'dica' }, 'Cada método tem o que é, como usar e um exemplo com o caso do motor da caixa da fechadura (números ilustrativos). Base: livros de TPM de Nakajima (1988) e Suzuki (1989) e práticas consagradas da engenharia de manutenção.'),
    h('section', { class: 'painel' }, h('h2', null, 'Por onde começar'),
      h('ul', { class: 'lista-simples' }, PERGUNTAS.map(([p, r, l]) => h('li', null, h('div', null, h('strong', null, p), h('div', null, r)), h('a', { href: l, class: 'btn pequeno' }, 'Abrir'))))),
    GUIA.map(([, chaves]) => montarAjuda(chaves, true)));
}
