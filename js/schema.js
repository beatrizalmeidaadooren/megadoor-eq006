// Definição dos cadastros: campos, rótulos e opções. Os nomes dos campos
// são os mesmos das colunas do banco (banco/01_esquema.sql).

export const CANAIS = ['Canal 1 (fechadura)', 'Canal 2 (dobradiça)', 'Comum'];
export const TIPOS_OCORRENCIA = ['Falha', 'Troca', 'Melhoria', 'Inspeção', 'Outro'];
export const TIPOS_LIGACAO = ['Potência', 'Comando', 'Sinal', '24 V', 'Pneumática', 'Lubrificação', 'Mecânica', 'Dados'];

export const MODOS_FALHA_SUGERIDOS = [
  'Superaquecimento', 'Rolamento travado', 'Rolamento com ruído ou folga', 'Enrolamento queimado',
  'Curto-circuito na bobina', 'Falta de fase', 'Eixo empenado ou desalinhado', 'Vibração excessiva',
  'Desgaste da ferramenta', 'Ferramenta quebrada', 'Vazamento de ar', 'Sensor sem leitura', 'Parada por proteção (inversor ou disjuntor)'
];
export const CAUSAS_SUGERIDAS = [
  'Sobrecarga mecânica', 'Falta de lubrificação', 'Pó ou umidade', 'Tensão ou frequência incompatível',
  'Parâmetro do inversor inadequado', 'Fim de vida útil', 'Montagem inadequada', 'Ferramenta inadequada', 'A investigar'
];

export const TABELAS = {
  componentes: {
    rotulo: 'Componente', plural: 'Componentes', chave: 'codigo',
    campos: [
      { k: 'codigo', t: 'text', rotulo: 'Código', req: true, dica: 'Fixo. Exemplo: EQ006-Y1-06.03. Não é possível mudar depois de criado.' },
      { k: 'nome', t: 'text', rotulo: 'Nome', req: true },
      { k: 'nivel', t: 'select', rotulo: 'Nível', opcoes: ['Conjunto', 'Componente', 'Peça ou subitem'], req: true },
      { k: 'canal', t: 'select', rotulo: 'Canal', opcoes: CANAIS },
      { k: 'qtd', t: 'text', rotulo: 'Quantidade' },
      { k: 'fabricante', t: 'text', rotulo: 'Fabricante / marca', lista: 'fabricantes' },
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
      { k: 'tipo', t: 'select', rotulo: 'Tipo', opcoes: TIPOS_OCORRENCIA, req: true, padrao: 'Falha', semVazio: true },
      { k: 'data_hora', t: 'datetime', rotulo: 'Data e hora', req: true },
      { k: 'sintoma_previo', t: 'textarea', rotulo: 'Sintoma antes da falha', dica: 'Ruído, cheiro, aquecimento, vibração, alarme... O que alguém notou antes?' },
      { k: 'modo_falha', t: 'text', rotulo: 'Modo de falha', lista: 'modos', dica: 'Como a falha se manifestou.' },
      { k: 'causa', t: 'text', rotulo: 'Causa', lista: 'causas', dica: 'Se ainda não se sabe, escreva "A investigar".' },
      { k: 'parada_min', t: 'number', rotulo: 'Tempo de máquina parada (minutos)' },
      { k: 'executor', t: 'text', rotulo: 'Quem executou a manutenção', lista: 'pessoas' },
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
      { k: 'fornecedor', t: 'text', rotulo: 'Fornecedor', lista: 'fornecedores' },
      { k: 'data_pedido', t: 'date', rotulo: 'Data do pedido' },
      { k: 'data_recebimento', t: 'date', rotulo: 'Data de recebimento' },
      { k: 'prazo_dias', t: 'number', rotulo: 'Prazo de entrega (dias)' },
      { k: 'quantidade', t: 'number', rotulo: 'Quantidade' },
      { k: 'valor', t: 'number', rotulo: 'Valor total (R$)', passo: '0.01' },
      { k: 'nf_pedido', t: 'text', rotulo: 'Nota fiscal ou nº do pedido' },
      { k: 'motivo_decisao', t: 'textarea', rotulo: 'Como e por que a compra foi decidida' },
      { k: 'alternativas', t: 'textarea', rotulo: 'Alternativas consideradas' },
      { k: 'por_que_escolhida', t: 'textarea', rotulo: 'Por que esta marca ou modelo' },
      { k: 'aprovado_por', t: 'text', rotulo: 'Quem aprovou', lista: 'pessoas' },
      { k: 'ocorrencia_id', t: 'ocorrencia', rotulo: 'Ocorrência que originou a compra' },
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
      { k: 'responsavel', t: 'text', rotulo: 'Quem alterou', lista: 'pessoas' },
      { k: 'motivo', t: 'textarea', rotulo: 'Motivo' },
      { k: 'anexos', t: 'files', rotulo: 'Foto do display ou arquivo de backup' }
    ]
  },
  ligacoes: {
    rotulo: 'Ligação', plural: 'Ligações e fiação', chave: 'id',
    campos: [
      { k: 'origem', t: 'comp', rotulo: 'Origem (quem alimenta ou envia)', req: true },
      { k: 'destino', t: 'comp', rotulo: 'Destino (quem recebe)', req: true },
      { k: 'tipo', t: 'select', rotulo: 'Tipo de ligação', opcoes: TIPOS_LIGACAO, req: true, semVazio: true, padrao: 'Potência' },
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
      { k: 'operacao', t: 'text', rotulo: 'Operação', req: true, lista: 'operacoes', dica: 'Caixa da fechadura, chapa-testa, pré-furo, fresagem da dobradiça...' },
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
      { k: 'responsavel', t: 'text', rotulo: 'Quem alterou', lista: 'pessoas' },
      { k: 'observacao', t: 'textarea', rotulo: 'Observação' }
    ]
  }
};

// colunas de cada listagem
export const COLUNAS = {
  ocorrencias: ['data_hora', 'componente', 'tipo', 'modo_falha', 'causa', 'parada_min', 'executor'],
  compras: ['data_pedido', 'componente', 'peca', 'fornecedor', 'valor', 'estoque_qtd'],
  parametros: ['data_alteracao', 'componente', 'parametro', 'valor_atual', 'valor_anterior', 'responsavel'],
  ligacoes: ['origem', 'destino', 'tipo', 'n_fio', 'situacao'],
  usinagem: ['operacao', 'canal', 'material', 'ferramenta', 'rotacao_rpm', 'avanco_mm_min', 'passe_mm', 'n_passadas']
};
