// Definição dos cadastros: campos, rótulos e opções. Os nomes dos campos
// são os mesmos das colunas do banco (banco/01_esquema.sql).

export const CANAIS = ['Canal 1 (fechadura)', 'Canal 2 (dobradiça)', 'Comum'];
// Listas fixas: o aplicativo usa estes valores para calcular (quadro de ações, atrasos, cores)
export const STATUS_ACAO = ['A fazer', 'Em andamento', 'Aguardando peça', 'Concluída', 'Cancelada'];
export const PRIORIDADES = ['Alta', 'Média', 'Baixa'];
export const MEDIDAS_TPM = [
  { n: '1', t: 'Manter as condições básicas', d: 'Limpeza, lubrificação e aperto de parafusos e bornes. Limpar é inspecionar: aparecem folgas, aquecimento, ruído e parafusos soltos.', ex: 'Borneira do motor apertada? Rolamento lubrificado? Pó ou cavaco no motor e no painel?' },
  { n: '2', t: 'Cumprir as condições de operação', d: 'Operar dentro do que o equipamento suporta: tensão, frequência, corrente, temperatura, ar, carga.', ex: 'Frequência e corrente do inversor compatíveis com a plaqueta do motor? Disjuntor-motor ajustado? Parâmetros de usinagem dentro do limite?' },
  { n: '3', t: 'Restaurar a deterioração', d: 'Trocar só a peça quebrada não basta: o desgaste das peças vizinhas continua. Medir e restaurar o conjunto.', ex: 'Rolamento com folga? Isolação do enrolamento medida? Eixo e acoplamento alinhados?' },
  { n: '4', t: 'Corrigir fraquezas de projeto', d: 'Se mesmo com tudo em ordem a vida útil é curta, o problema pode estar no projeto: material, dimensão, forma ou especificação.', ex: 'O motor é adequado para a carga real? Existe proteção térmica (PTC)? A refrigeração é suficiente?' },
  { n: '5', t: 'Melhorar as habilidades', d: 'Muitas quebras vêm de falta de conhecimento. Treinar operadores e manutentores e padronizar os procedimentos.', ex: 'Todos sabem ajustar o inversor e o disjuntor? Existe passo a passo escrito para a troca do motor?' }
];
export const RESERVAS_LISTA = ['Tem peça reserva', 'Sem reserva, reposição rápida (até 15 dias)', 'Sem reserva, reposição demorada (mais de 15 dias)'];
export const NOTAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const MODOS_FALHA_SUGERIDOS = [
  'Superaquecimento', 'Rolamento travado', 'Rolamento com ruído ou folga', 'Enrolamento queimado',
  'Curto-circuito na bobina', 'Falta de fase', 'Eixo empenado ou desalinhado', 'Vibração excessiva',
  'Desgaste da ferramenta', 'Ferramenta quebrada', 'Vazamento de ar', 'Sensor sem leitura', 'Parada por proteção (inversor ou disjuntor)'
];
const CAUSAS_SUGERIDAS = [
  'Sobrecarga mecânica', 'Falta de lubrificação', 'Pó ou umidade', 'Tensão ou frequência incompatível',
  'Parâmetro do inversor inadequado', 'Fim de vida útil', 'Montagem inadequada', 'Ferramenta inadequada', 'A investigar'
];

// Menus editáveis pelo usuário (tela "Listas" ou botão "editar lista" ao lado de cada menu).
// `padrao` é o que vem de fábrica; `travados` não podem ser removidos porque o aplicativo depende deles.
export const LISTAS = {
  pessoas: { rotulo: 'Eletromecânicos (quem executa e quem responde)', padrao: [], travados: [], dica: 'Cadastre aqui os nomes da equipe. Eles aparecem nos menus de "quem executou" e "responsável".' },
  tipos_ocorrencia: { rotulo: 'Tipos de ocorrência', padrao: ['Falha', 'Troca', 'Melhoria', 'Inspeção', 'Outro', 'Anomalia detectada'], travados: ['Falha'], dica: '"Falha" não pode ser removida: ela alimenta os indicadores.' },
  modos_falha: { rotulo: 'Modos de falha', padrao: MODOS_FALHA_SUGERIDOS, travados: [] },
  causas: { rotulo: 'Causas', padrao: CAUSAS_SUGERIDAS, travados: [] },
  fabricantes: { rotulo: 'Fabricantes e marcas', padrao: [], travados: [] },
  fornecedores: { rotulo: 'Fornecedores', padrao: [], travados: [] },
  operacoes: { rotulo: 'Operações de usinagem', padrao: ['Caixa da fechadura', 'Chapa-testa', 'Pré-furo da fechadura', 'Fresagem da dobradiça', 'Pré-furo da dobradiça'], travados: [] },
  tipos_ligacao: { rotulo: 'Tipos de ligação', padrao: ['Potência', 'Comando', 'Sinal', '24 V', 'Pneumática', 'Lubrificação', 'Mecânica', 'Dados'], travados: [] },
  tipos_acao: { rotulo: 'Tipos de ação', padrao: ['Corretiva', 'Preventiva', 'Melhoria', 'Investigação'], travados: [] },
  perdas: { rotulo: 'Tipos de perda (seis grandes perdas do TPM)', padrao: ['Quebra ou falha de equipamento', 'Setup e ajustes', 'Pequenas paradas e ociosidade', 'Velocidade reduzida', 'Defeitos e retrabalho', 'Perdas no início da produção'], travados: [], dica: 'Lista de referência do TPM. Use "Quebra ou falha de equipamento" para as falhas de motor.' },
  tipos_defeito: { rotulo: 'Tipos de defeito oculto', padrao: ['Pó, sujeira ou cavaco acumulado', 'Parafuso, porca ou borne solto', 'Falta ou excesso de lubrificação', 'Desgaste ou abrasão', 'Folga em rolamento, acoplamento ou guia', 'Vibração', 'Ruído anormal', 'Aquecimento acima do normal', 'Fiação ou conexão danificada', 'Vazamento de ar', 'Risco, trinca ou empenamento', 'Condição de operação fora do padrão', 'Difícil de inspecionar (acesso ruim)'], travados: [] },
  motivos_oculto: { rotulo: 'Por que o defeito estava oculto', padrao: ['Sujeira ou contaminação cobrindo', 'Acesso difícil: montagem ou layout dificulta a inspeção', 'Inspeção ou análise do desgaste insuficiente', 'Visto, mas ignorado', 'Subestimado ("é pequeno")', 'Sintoma visível que ninguém associou ao problema'], travados: [], dica: 'Segundo o TPM, o defeito fica oculto fisicamente (sujeira, acesso difícil, pouca inspeção) ou psicologicamente (ignorado, subestimado, não associado).' },
  estrategias: { rotulo: 'Estratégias de manutenção', padrao: ['Preditiva (por condição)', 'Preventiva por tempo', 'Preventiva + preditiva', 'Corretiva planejada', 'Autônoma (operador)', 'Melhoria de projeto'], travados: [], dica: 'Preditiva = medir a condição para agir antes da falha. Preventiva = trocar ou inspecionar por tempo. Corretiva planejada = operar até falhar, com preparo.' },
  categorias_6m: { rotulo: 'Categorias da causa (6M)', padrao: ['Máquina', 'Método', 'Material', 'Mão de obra', 'Meio ambiente', 'Medição'], travados: [] }
};

export const TABELAS = {
  componentes: {
    rotulo: 'Componente', plural: 'Componentes', chave: 'codigo',
    campos: [
      { k: 'codigo', t: 'text', rotulo: 'Código', req: true, dica: 'Fixo. Exemplo: EQ006-Y1-06.03. Não é possível mudar depois de criado.' },
      { k: 'nome', t: 'text', rotulo: 'Nome', req: true },
      { k: 'nivel', t: 'select', rotulo: 'Nível', opcoes: ['Conjunto', 'Componente', 'Peça ou subitem'], req: true },
      { k: 'canal', t: 'select', rotulo: 'Canal', opcoes: CANAIS },
      { k: 'qtd', t: 'text', rotulo: 'Quantidade' },
      { k: 'fabricante', t: 'menu', rotulo: 'Fabricante / marca', lista: 'fabricantes' },
      { k: 'modelo', t: 'text', rotulo: 'Modelo' },
      { k: 'n_serie', t: 'text', rotulo: 'Número de série' },
      { k: 'especificacao', t: 'textarea', rotulo: 'Especificação técnica', dica: 'Potência, tensão, corrente, frequência, rpm, dimensões, rolamentos...' },
      { k: 'falta_saber', t: 'textarea', rotulo: 'O que ainda falta saber' },
      { k: 'critico', t: 'select', rotulo: 'Crítico?', opcoes: ['Sim', 'Não', 'A definir'] },
      { k: 'detalhar', t: 'select', rotulo: 'Detalhar', opcoes: ['Agora', 'Depois'] },
      { k: 'status', t: 'select', rotulo: 'Status do cadastro', opcoes: ['Rascunho', 'Confirmado'] }
    ]
  },
  ocorrencias: {
    rotulo: 'Ocorrência', plural: 'Ocorrências', chave: 'id', anexos: true,
    campos: [
      { k: 'componente', t: 'comp', rotulo: 'Componente', req: true },
      { k: 'tipo', t: 'menu', rotulo: 'Tipo', lista: 'tipos_ocorrencia', req: true, padrao: 'Falha' },
      { k: 'data_hora', t: 'datetime', rotulo: 'Início (data e hora)', req: true },
      { k: 'data_hora_fim', t: 'datetime', rotulo: 'Fim (data e hora)', dica: 'Deixe vazio se ainda não terminou.' },
      { k: 'perda', t: 'menu', rotulo: 'Tipo de perda (seis grandes perdas)', lista: 'perdas', dica: 'Para motor queimado ou parado: Quebra ou falha de equipamento.' },
      { k: 'sintoma_previo', t: 'textarea', rotulo: 'Sintoma antes da falha', dica: 'Ruído, cheiro, aquecimento, vibração, alarme... O que alguém notou antes?' },
      { k: 'modo_falha', t: 'menu', rotulo: 'Modo de falha', lista: 'modos_falha', dica: 'Como a falha se manifestou.' },
      { k: 'causa', t: 'menu', rotulo: 'Causa', lista: 'causas', dica: 'Se ainda não se sabe, escolha "A investigar".' },
      { k: 'parada_min', t: 'number', rotulo: 'Tempo de máquina parada (minutos)', dica: 'Calculado do início ao fim. Pode ajustar se a máquina ficou parada por menos tempo.' },
      { k: 'executores', t: 'menu', multi: true, rotulo: 'Quem executou a manutenção', lista: 'pessoas', dica: 'Pode marcar mais de um.' },
      { k: 'acao', t: 'textarea', rotulo: 'Ação tomada' },
      { k: 'observacoes', t: 'textarea', rotulo: 'Observações' },
      { k: 'anexos', t: 'files', rotulo: 'Fotos e anexos' }
    ]
  },
  compras: {
    rotulo: 'Compra de peça', plural: 'Compras de peças', chave: 'id', anexos: true,
    campos: [
      { k: 'componente', t: 'comp', rotulo: 'Componente', req: true },
      { k: 'peca', t: 'text', rotulo: 'Peça comprada', req: true },
      { k: 'fornecedor', t: 'menu', rotulo: 'Fornecedor', lista: 'fornecedores' },
      { k: 'data_pedido', t: 'date', rotulo: 'Data do pedido' },
      { k: 'data_recebimento', t: 'date', rotulo: 'Data de recebimento' },
      { k: 'prazo_dias', t: 'number', rotulo: 'Prazo de entrega (dias)' },
      { k: 'quantidade', t: 'number', rotulo: 'Quantidade' },
      { k: 'valor', t: 'number', rotulo: 'Valor total (R$)', passo: '0.01' },
      { k: 'nf_pedido', t: 'text', rotulo: 'Nota fiscal ou nº do pedido' },
      { k: 'motivo_decisao', t: 'textarea', rotulo: 'Como e por que a compra foi decidida' },
      { k: 'alternativas', t: 'textarea', rotulo: 'Alternativas consideradas' },
      { k: 'por_que_escolhida', t: 'textarea', rotulo: 'Por que esta marca ou modelo' },
      { k: 'aprovado_por', t: 'menu', rotulo: 'Quem aprovou', lista: 'pessoas' },
      { k: 'ocorrencia_id', t: 'ref', ref: 'ocorrencias', rotulo: 'Ocorrência que originou a compra' },
      { k: 'estoque_qtd', t: 'number', rotulo: 'Estoque de reposição: quantidade' },
      { k: 'estoque_min', t: 'number', rotulo: 'Estoque mínimo' },
      { k: 'estoque_local', t: 'text', rotulo: 'Local do estoque' },
      { k: 'observacoes', t: 'textarea', rotulo: 'Observações' },
      { k: 'anexos', t: 'files', rotulo: 'Notas, orçamentos e fotos' }
    ]
  },
  parametros: {
    rotulo: 'Parâmetro', plural: 'Parâmetros (programação)', chave: 'id', anexos: true,
    campos: [
      { k: 'componente', t: 'comp', rotulo: 'Equipamento (inversor, driver, CNC...)', req: true },
      { k: 'parametro', t: 'text', rotulo: 'Parâmetro', req: true, dica: 'Número e nome, como aparece no display. Exemplo: P0100 - Tempo de aceleração.' },
      { k: 'valor_atual', t: 'text', rotulo: 'Valor atual', req: true },
      { k: 'valor_anterior', t: 'text', rotulo: 'Valor anterior' },
      { k: 'unidade', t: 'text', rotulo: 'Unidade', dica: 'Hz, A, s, V, %...' },
      { k: 'data_alteracao', t: 'date', rotulo: 'Data da alteração' },
      { k: 'responsavel', t: 'menu', rotulo: 'Quem alterou', lista: 'pessoas' },
      { k: 'motivo', t: 'textarea', rotulo: 'Motivo' },
      { k: 'anexos', t: 'files', rotulo: 'Foto do display ou arquivo de backup' }
    ]
  },
  ligacoes: {
    rotulo: 'Ligação', plural: 'Ligações e fiação', chave: 'id',
    campos: [
      { k: 'origem', t: 'comp', rotulo: 'Origem (quem alimenta ou envia)', req: true },
      { k: 'destino', t: 'comp', rotulo: 'Destino (quem recebe)', req: true },
      { k: 'tipo', t: 'menu', rotulo: 'Tipo de ligação', lista: 'tipos_ligacao', req: true, padrao: 'Potência' },
      { k: 'n_fio', t: 'text', rotulo: 'Nº do fio ou cabo', dica: 'Como está marcado no fio, no painel e no componente.' },
      { k: 'funcao', t: 'text', rotulo: 'Função', dica: 'Fase U, terra, sinal, 24 V...' },
      { k: 'bitola', t: 'text', rotulo: 'Bitola (mm²)' },
      { k: 'cor', t: 'text', rotulo: 'Cor do fio' },
      { k: 'borne_origem', t: 'text', rotulo: 'Borne de origem' },
      { k: 'borne_destino', t: 'text', rotulo: 'Borne de destino' },
      { k: 'situacao', t: 'select', rotulo: 'Situação', opcoes: ['A confirmar', 'Confirmada'], req: true, semVazio: true, padrao: 'A confirmar' },
      { k: 'observacao', t: 'textarea', rotulo: 'Observação' }
    ]
  },
  usinagem: {
    rotulo: 'Parâmetro de usinagem', plural: 'Parâmetros de usinagem (CNC)', chave: 'id',
    campos: [
      { k: 'operacao', t: 'menu', rotulo: 'Operação', req: true, lista: 'operacoes', dica: 'Caixa da fechadura, chapa-testa, pré-furo, fresagem da dobradiça...' },
      { k: 'canal', t: 'select', rotulo: 'Canal', opcoes: CANAIS },
      { k: 'material', t: 'text', rotulo: 'Material', dica: 'Exemplo: MDP Supin E1' },
      { k: 'espessura_mm', t: 'number', rotulo: 'Espessura da porta (mm)', passo: '0.1' },
      { k: 'ferramenta', t: 'text', rotulo: 'Ferramenta (código ou descrição)' },
      { k: 'diametro_mm', t: 'number', rotulo: 'Diâmetro da ferramenta (mm)', passo: '0.1' },
      { k: 'rotacao_rpm', t: 'number', rotulo: 'Rotação (rpm)' },
      { k: 'avanco_mm_min', t: 'number', rotulo: 'Avanço (mm/min)', dica: 'Se o CNC mostra em m/min, multiplique por 1000.' },
      { k: 'passe_mm', t: 'number', rotulo: 'Passe de profundidade (mm)', passo: '0.1' },
      { k: 'profundidade_total_mm', t: 'number', rotulo: 'Profundidade total (mm)', passo: '0.1' },
      { k: 'n_passadas', t: 'number', rotulo: 'Número de passadas' },
      { k: 'vigencia_inicio', t: 'date', rotulo: 'Vale desde' },
      { k: 'vigencia_fim', t: 'date', rotulo: 'Valeu até (vazio = vale hoje)' },
      { k: 'responsavel', t: 'menu', rotulo: 'Quem alterou', lista: 'pessoas' },
      { k: 'observacao', t: 'textarea', rotulo: 'Observação' }
    ]
  },
  acoes: {
    rotulo: 'Ação', plural: 'Plano de ação', chave: 'id', anexos: true,
    campos: [
      { k: 'titulo', t: 'text', rotulo: 'O que precisa ser feito', req: true },
      { k: 'descricao', t: 'textarea', rotulo: 'Detalhes' },
      { k: 'tipo', t: 'menu', rotulo: 'Tipo', lista: 'tipos_acao', req: true, padrao: 'Corretiva' },
      { k: 'prioridade', t: 'select', rotulo: 'Prioridade', opcoes: PRIORIDADES, req: true, semVazio: true, padrao: 'Média' },
      { k: 'status', t: 'select', rotulo: 'Situação', opcoes: STATUS_ACAO, req: true, semVazio: true, padrao: 'A fazer' },
      { k: 'gut_g', t: 'select', num: true, rotulo: 'GUT: Gravidade', opcoes: NOTAS.slice(0, 5), dica: '1 = sem gravidade · 3 = grave · 5 = extremamente grave (segurança, parada longa).' },
      { k: 'gut_u', t: 'select', num: true, rotulo: 'GUT: Urgência', opcoes: NOTAS.slice(0, 5), dica: '1 = pode esperar · 3 = o mais cedo possível · 5 = imediata.' },
      { k: 'gut_t', t: 'select', num: true, rotulo: 'GUT: Tendência', opcoes: NOTAS.slice(0, 5), dica: '1 = não piora · 3 = piora em algum tempo · 5 = piora rápido se nada for feito.' },
      { k: 'responsavel', t: 'menu', rotulo: 'Responsável', lista: 'pessoas' },
      { k: 'prazo', t: 'date', rotulo: 'Prazo' },
      { k: 'concluida_em', t: 'date', rotulo: 'Concluída em', dica: 'Preenchida sozinha ao concluir.' },
      { k: 'componente', t: 'comp', rotulo: 'Componente relacionado' },
      { k: 'ocorrencia_id', t: 'ref', ref: 'ocorrencias', rotulo: 'Ocorrência relacionada' },
      { k: 'analise_id', t: 'ref', ref: 'analises', rotulo: 'Análise de causa raiz relacionada' },
      { k: 'custo_estimado', t: 'number', rotulo: 'Custo estimado (R$)', passo: '0.01' },
      { k: 'resultado', t: 'textarea', rotulo: 'Resultado: o que foi feito e se funcionou' },
      { k: 'anexos', t: 'files', rotulo: 'Fotos e anexos' }
    ]
  },
  analises: {
    rotulo: 'Análise de causa raiz', plural: 'Análises de causa raiz', chave: 'id', anexos: true,
    campos: [
      { k: '_s1', t: 'titulo', rotulo: '1. O problema' },
      { k: 'titulo', t: 'text', rotulo: 'Problema analisado', req: true, dica: 'Exemplo: Motor da caixa da fechadura queimou.' },
      { k: 'componente', t: 'comp', rotulo: 'Componente' },
      { k: 'ocorrencia_id', t: 'ref', ref: 'ocorrencias', rotulo: 'Ocorrência analisada' },
      { k: 'data_analise', t: 'date', rotulo: 'Data da análise', padrao: 'hoje' },
      { k: 'natureza', t: 'select', rotulo: 'Natureza da falha', opcoes: ['Esporádica (aconteceu poucas vezes)', 'Crônica (repete)'], dica: 'Se repete, a análise precisa ser mais profunda: use os passos P-M abaixo.' },
      { k: 'tipo_perda', t: 'menu', rotulo: 'Tipo de perda (seis grandes perdas)', lista: 'perdas' },
      { k: '_s2', t: 'titulo', rotulo: '2. Esclarecer o fenômeno e a física (método P-M)' },
      { k: 'fatos', t: 'textarea', rotulo: 'O que aconteceu, quando e onde', dica: 'Só fatos observados: sintoma, horário, peça afetada, estado da máquina.' },
      { k: 'comparacao', t: 'textarea', rotulo: 'Comparação com equipamento semelhante', dica: 'Exemplo: o motor do canal 2 também falha? Em que é diferente do canal 1?' },
      { k: 'principio_fisico', t: 'textarea', rotulo: 'Princípio físico por trás do problema', dica: 'Qual lei da natureza explica? Exemplo: calor = corrente elevada ou pouca ventilação; ruído = folga ou atrito.' },
      { k: 'condicoes', t: 'textarea', rotulo: 'Condições que precisam existir para o problema acontecer', dica: 'Liste todas, sem descartar nenhuma por palpite. Depois cadastre cada uma como hipótese.' },
      { k: '_s3', t: 'titulo', rotulo: '3. Cinco porquês' },
      { k: 'porque1', t: 'textarea', rotulo: '1º porquê: por que o problema aconteceu?' },
      { k: 'porque2', t: 'textarea', rotulo: '2º porquê: por que isso aconteceu?' },
      { k: 'porque3', t: 'textarea', rotulo: '3º porquê: por que isso aconteceu?' },
      { k: 'porque4', t: 'textarea', rotulo: '4º porquê: por que isso aconteceu?' },
      { k: 'porque5', t: 'textarea', rotulo: '5º porquê: por que isso aconteceu?' },
      { k: '_s4', t: 'titulo', rotulo: '4. Conclusão' },
      { k: 'causa_raiz', t: 'textarea', rotulo: 'Causa raiz', dica: 'A resposta em que, se for corrigida, o problema não volta.' },
      { k: 'categoria', t: 'menu', rotulo: 'Categoria da causa raiz (6M)', lista: 'categorias_6m' },
      { k: 'evidencias', t: 'textarea', rotulo: 'Evidências (medições, fotos, observações)' },
      { k: 'status', t: 'select', rotulo: 'Situação', opcoes: ['Aberta', 'Concluída'], req: true, semVazio: true, padrao: 'Aberta' },
      { k: 'responsavel', t: 'menu', rotulo: 'Responsável', lista: 'pessoas' },
      { k: 'anexos', t: 'files', rotulo: 'Fotos e anexos' }
    ]
  },
  criticidade: {
    rotulo: 'Avaliação de criticidade', plural: 'Criticidade dos componentes', chave: 'id',
    campos: [
      { k: 'componente', t: 'comp', rotulo: 'Componente', req: true },
      { k: 'seguranca', t: 'select', num: true, rotulo: 'Segurança', opcoes: NOTAS.slice(0, 5), dica: '1 = nenhum risco · 3 = risco de lesão leve · 5 = risco grave ao operador.' },
      { k: 'producao', t: 'select', num: true, rotulo: 'Impacto na produção', opcoes: NOTAS.slice(0, 5), dica: '1 = não afeta · 3 = reduz a produção · 4 = para um canal · 5 = para a máquina toda.' },
      { k: 'qualidade', t: 'select', num: true, rotulo: 'Impacto na qualidade', opcoes: NOTAS.slice(0, 5), dica: '1 = não afeta · 3 = peça fora de medida às vezes · 5 = refugo certo.' },
      { k: 'reserva', t: 'select', rotulo: 'Peça reserva', opcoes: RESERVAS_LISTA, dica: 'Se não há reserva e a reposição passa de 15 dias, a consequência sobe um ponto.' },
      { k: 'estrategia', t: 'menu', rotulo: 'Estratégia adotada', lista: 'estrategias', dica: 'Deixe vazio para seguir a recomendada pelo aplicativo.' },
      { k: 'observacao', t: 'textarea', rotulo: 'Observação' }
    ]
  },
  anomalias: {
    rotulo: 'Defeito oculto', plural: 'Defeitos ocultos (anomalias)', chave: 'id', anexos: true,
    campos: [
      { k: 'componente', t: 'comp', rotulo: 'Onde foi encontrado', req: true },
      { k: 'encontrado_em', t: 'date', rotulo: 'Encontrado em', req: true, padrao: 'hoje' },
      { k: 'encontrado_por', t: 'menu', rotulo: 'Quem encontrou', lista: 'pessoas' },
      { k: 'descricao', t: 'textarea', rotulo: 'O que foi encontrado', req: true, dica: 'Qualquer coisa suspeita, mesmo pequena: folga, sujeira, aperto, ruído, aquecimento.' },
      { k: 'tipo_defeito', t: 'menu', rotulo: 'Tipo de defeito', lista: 'tipos_defeito' },
      { k: 'gravidade', t: 'select', rotulo: 'Gravidade', opcoes: ['Leve', 'Moderado', 'Significativo'], dica: 'Leve: efeito pequeno sozinho. Moderado: reduz qualidade ou produção. Significativo: pode parar a máquina.' },
      { k: 'por_que_oculto', t: 'menu', rotulo: 'Por que estava oculto', lista: 'motivos_oculto' },
      { k: 'status', t: 'select', rotulo: 'Situação', opcoes: ['Aberta', 'Corrigida'], req: true, semVazio: true, padrao: 'Aberta' },
      { k: 'corrigida_em', t: 'date', rotulo: 'Corrigida em', dica: 'Preenchida sozinha ao marcar como corrigida.' },
      { k: 'acao_id', t: 'ref', ref: 'acoes', rotulo: 'Ação relacionada' },
      { k: 'anexos', t: 'files', rotulo: 'Fotos' }
    ]
  },
  hipoteses: {
    rotulo: 'Hipótese de causa', plural: 'Hipóteses de causa', chave: 'id',
    campos: [
      { k: 'analise_id', t: 'ref', ref: 'analises', rotulo: 'Análise', req: true },
      { k: 'categoria', t: 'menu', rotulo: 'Categoria (6M)', lista: 'categorias_6m', req: true },
      { k: 'hipotese', t: 'textarea', rotulo: 'Hipótese', req: true, dica: 'Escreva como afirmação que pode ser provada ou descartada. Exemplo: o disjuntor-motor está regulado acima da corrente do motor.' },
      { k: 'como_verificar', t: 'textarea', rotulo: 'Como verificar', dica: 'O que medir ou olhar, e onde.' },
      { k: 'resultado', t: 'select', rotulo: 'Resultado', opcoes: ['A verificar', 'Confirmada', 'Descartada'], req: true, semVazio: true, padrao: 'A verificar' },
      { k: 'evidencia', t: 'textarea', rotulo: 'Evidência encontrada' },
      { k: 'responsavel', t: 'menu', rotulo: 'Quem verifica', lista: 'pessoas' }
    ]
  },
  fmea: {
    rotulo: 'Linha da FMEA', plural: 'FMEA (modos de falha e efeitos)', chave: 'id',
    campos: [
      { k: 'componente', t: 'comp', rotulo: 'Componente', req: true },
      { k: 'funcao', t: 'text', rotulo: 'Função do componente' },
      { k: 'modo_falha', t: 'menu', rotulo: 'Modo de falha', lista: 'modos_falha', req: true },
      { k: 'efeito', t: 'textarea', rotulo: 'Efeito da falha' },
      { k: 'causa', t: 'menu', rotulo: 'Causa provável', lista: 'causas' },
      { k: 'controle_atual', t: 'textarea', rotulo: 'Controle atual (o que hoje evita ou detecta)' },
      { k: 'severidade', t: 'select', num: true, rotulo: 'Severidade (S): 1 leve a 10 gravíssima', opcoes: NOTAS },
      { k: 'probabilidade', t: 'select', num: true, rotulo: 'Ocorrência (O): 1 rara a 10 constante', opcoes: NOTAS },
      { k: 'deteccao', t: 'select', num: true, rotulo: 'Detecção (D): 1 fácil de detectar a 10 impossível', opcoes: NOTAS },
      { k: 'npr_referencia', t: 'number', rotulo: 'NPR de referência (de relatório anterior)', dica: 'Só vale enquanto S, O e D não estiverem preenchidos.' },
      { k: 'acao_recomendada', t: 'textarea', rotulo: 'Ação recomendada' },
      { k: 'fonte', t: 'text', rotulo: 'Fonte' }
    ]
  },
  rotinas: {
    rotulo: 'Rotina preventiva', plural: 'Manutenção preventiva', chave: 'id',
    campos: [
      { k: 'titulo', t: 'text', rotulo: 'Rotina', req: true },
      { k: 'componente', t: 'comp', rotulo: 'Componente' },
      { k: 'item_checklist', t: 'text', rotulo: 'Item do checklist' },
      { k: 'instrucoes', t: 'textarea', rotulo: 'O que verificar e como' },
      { k: 'periodicidade_dias', t: 'number', rotulo: 'Repetir a cada (dias)', req: true, padrao: 30, passo: '1' },
      { k: 'inicio', t: 'date', rotulo: 'Primeira execução prevista para', req: true, padrao: 'hoje' },
      { k: 'ultima_execucao', t: 'date', rotulo: 'Última execução', dica: 'Atualizada sozinha ao registrar uma execução.' },
      { k: 'responsavel', t: 'menu', rotulo: 'Responsável', lista: 'pessoas' },
      { k: 'tempo_estimado_min', t: 'number', rotulo: 'Tempo estimado (minutos)' },
      { k: 'ativa', t: 'bool', rotulo: 'Rotina ativa', padrao: true }
    ]
  },
  execucoes_rotina: {
    rotulo: 'Execução de rotina', plural: 'Execuções de rotina', chave: 'id', anexos: true,
    campos: [
      { k: 'rotina_id', t: 'ref', ref: 'rotinas', rotulo: 'Rotina', req: true },
      { k: 'data_execucao', t: 'date', rotulo: 'Data da execução', req: true, padrao: 'hoje' },
      { k: 'executores', t: 'menu', multi: true, rotulo: 'Quem executou', lista: 'pessoas', dica: 'Pode marcar mais de um.' },
      { k: 'resultado', t: 'select', rotulo: 'Resultado', opcoes: ['Conforme', 'Com anomalia'], req: true, semVazio: true, padrao: 'Conforme' },
      { k: 'observacoes', t: 'textarea', rotulo: 'Observações' },
      { k: 'anexos', t: 'files', rotulo: 'Fotos e anexos' }
    ]
  }
};

// colunas de cada listagem
export const COLUNAS = {
  ocorrencias: ['data_hora', 'data_hora_fim', 'componente', 'tipo', 'modo_falha', 'causa', 'parada_min', 'executores'],
  compras: ['data_pedido', 'componente', 'peca', 'fornecedor', 'valor', 'estoque_qtd'],
  parametros: ['data_alteracao', 'componente', 'parametro', 'valor_atual', 'valor_anterior', 'responsavel'],
  ligacoes: ['origem', 'destino', 'tipo', 'n_fio', 'situacao'],
  usinagem: ['operacao', 'canal', 'material', 'ferramenta', 'rotacao_rpm', 'avanco_mm_min', 'passe_mm', 'n_passadas']
};
