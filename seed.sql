INSERT INTO departamento (nome, descricao) VALUES
('Suporte N1', 'Atendimento inicial: dúvidas, pagamentos e configurações da loja'),
('Suporte N2', 'Casos técnicos: integrações, ERP, API e erros de sistema');

INSERT INTO tecnico (nome, email, ativo, id_departamento) VALUES
('Carlos Silva', 'carlos.silva@smartech.com', TRUE, (SELECT id_departamento FROM departamento WHERE nome = 'Suporte N1')),
('Ana Souza', 'ana.souza@smartech.com', TRUE, (SELECT id_departamento FROM departamento WHERE nome = 'Suporte N2'));

INSERT INTO loja (nome_loja, nome_lojista, email, telefone) VALUES
('Moda Bella', 'Juliana Costa', 'contato@modabella.com.br', '(48) 99876-1234'),
('TechShop Eletrônicos', 'Ricardo Lima', 'ricardo@techshop.com.br', '(48) 98765-4321');

INSERT INTO categoria (nome, descricao) VALUES
('Pagamento', 'Problemas com Pix, cartão, boleto e gateways de pagamento'),
('Integração', 'Integrações com ERP, marketplaces, transportadoras e API');

INSERT INTO prioridade (nome, nivel, prazo_sla_horas) VALUES
('Alta', 3, 4),
('Baixa', 1, 48);

INSERT INTO status (nome, descricao) VALUES
('Aberto', 'Chamado aberto aguardando atendimento'),
('Fechado', 'Chamado resolvido e encerrado');

INSERT INTO artigo (titulo, conteudo, data_publicacao, id_categoria) VALUES
('Pix não confirma o pagamento do pedido',
 'Quando o cliente paga via Pix e o pedido continua como aguardando pagamento, verifique se a URL de notificação (webhook) do gateway está configurada no painel em Configurações > Pagamentos. Reenvie a notificação pelo painel do gateway e confira se o certificado do Pix está válido. Após corrigir o webhook, os pagamentos passam a ser confirmados automaticamente.',
 CURRENT_DATE - 30, (SELECT id_categoria FROM categoria WHERE nome = 'Pagamento')),
('Estoque não sincroniza com o ERP',
 'Se o estoque da loja não atualiza com o ERP, confira se o token da integração não expirou e se o SKU dos produtos é igual nos dois sistemas. Gere um novo token em Integrações > ERP, salve e execute a sincronização manual. Produtos com SKU diferente precisam ser corrigidos no cadastro para voltarem a sincronizar.',
 CURRENT_DATE - 20, (SELECT id_categoria FROM categoria WHERE nome = 'Integração'));

INSERT INTO chamado (motivo, descricao, data_abertura, data_fechamento, nota_avaliacao, comentario_avaliacao, id_loja, id_categoria, id_prioridade, id_status, id_tecnico) VALUES
('Pagamento via Pix não é confirmado',
 'Os clientes pagam com Pix, o dinheiro cai na conta, mas o pedido fica parado como aguardando pagamento na loja.',
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 5, 'Resolveram rápido, ótimo atendimento',
 (SELECT id_loja FROM loja WHERE nome_loja = 'Moda Bella'),
 (SELECT id_categoria FROM categoria WHERE nome = 'Pagamento'),
 (SELECT id_prioridade FROM prioridade WHERE nome = 'Alta'),
 (SELECT id_status FROM status WHERE nome = 'Fechado'),
 (SELECT id_tecnico FROM tecnico WHERE email = 'carlos.silva@smartech.com')),
('Estoque desatualizado com o ERP',
 'Desde ontem o estoque dos produtos não atualiza com o nosso ERP e estamos vendendo itens que já acabaram.',
 NOW() - INTERVAL '5 hours', NULL, NULL, NULL,
 (SELECT id_loja FROM loja WHERE nome_loja = 'TechShop Eletrônicos'),
 (SELECT id_categoria FROM categoria WHERE nome = 'Integração'),
 (SELECT id_prioridade FROM prioridade WHERE nome = 'Baixa'),
 (SELECT id_status FROM status WHERE nome = 'Aberto'),
 (SELECT id_tecnico FROM tecnico WHERE email = 'ana.souza@smartech.com'));

INSERT INTO mensagem (conteudo, autor_tipo, data_envio, id_chamado) VALUES
('Os clientes pagam com Pix, o dinheiro cai na conta, mas o pedido fica parado como aguardando pagamento.', 'LOJISTA',
 NOW() - INTERVAL '2 days', (SELECT id_chamado FROM chamado WHERE motivo = 'Pagamento via Pix não é confirmado')),
('Desde ontem o estoque não atualiza com o ERP. Segue o log do erro em anexo.', 'LOJISTA',
 NOW() - INTERVAL '5 hours', (SELECT id_chamado FROM chamado WHERE motivo = 'Estoque desatualizado com o ERP'));

INSERT INTO anexo (nome_arquivo, caminho_arquivo, id_mensagem) VALUES
('print_pedido_pix.png', 'uploads/chamado_1/print_pedido_pix.png',
 (SELECT id_mensagem FROM mensagem WHERE autor_tipo = 'LOJISTA' AND conteudo LIKE 'Os clientes pagam com Pix%')),
('log_erp.txt', 'uploads/chamado_2/log_erp.txt',
 (SELECT id_mensagem FROM mensagem WHERE autor_tipo = 'LOJISTA' AND conteudo LIKE 'Desde ontem o estoque%'));

INSERT INTO historico_status (data_alteracao, observacao, id_chamado, id_status_anterior, id_status_novo, id_tecnico) VALUES
(NOW() - INTERVAL '2 days', 'Abertura do chamado',
 (SELECT id_chamado FROM chamado WHERE motivo = 'Pagamento via Pix não é confirmado'),
 NULL, (SELECT id_status FROM status WHERE nome = 'Aberto'), NULL),
(NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 'Webhook corrigido, pagamentos confirmando',
 (SELECT id_chamado FROM chamado WHERE motivo = 'Pagamento via Pix não é confirmado'),
 (SELECT id_status FROM status WHERE nome = 'Aberto'), (SELECT id_status FROM status WHERE nome = 'Fechado'),
 (SELECT id_tecnico FROM tecnico WHERE email = 'carlos.silva@smartech.com')),
(NOW() - INTERVAL '5 hours', 'Abertura do chamado',
 (SELECT id_chamado FROM chamado WHERE motivo = 'Estoque desatualizado com o ERP'),
 NULL, (SELECT id_status FROM status WHERE nome = 'Aberto'), NULL);

INSERT INTO solucao (descricao, data_registro, id_chamado) VALUES
('URL do webhook do gateway estava errada no painel. Corrigida em Configurações > Pagamentos e notificações reenviadas.',
 NOW() - INTERVAL '2 days' + INTERVAL '2 hours', (SELECT id_chamado FROM chamado WHERE motivo = 'Pagamento via Pix não é confirmado')),
('Pedidos que ficaram parados foram confirmados manualmente e o lojista foi orientado a acompanhar o log do gateway.',
 NOW() - INTERVAL '2 days' + INTERVAL '3 hours', (SELECT id_chamado FROM chamado WHERE motivo = 'Pagamento via Pix não é confirmado'));

INSERT INTO sugere (id_chamado, id_artigo, similaridade, data_sugestao, foi_util, id_tecnico) VALUES
((SELECT id_chamado FROM chamado WHERE motivo = 'Pagamento via Pix não é confirmado'),
 (SELECT id_artigo FROM artigo WHERE titulo = 'Pix não confirma o pagamento do pedido'),
 0, NOW() - INTERVAL '2 days', TRUE, (SELECT id_tecnico FROM tecnico WHERE email = 'carlos.silva@smartech.com')),
((SELECT id_chamado FROM chamado WHERE motivo = 'Estoque desatualizado com o ERP'),
 (SELECT id_artigo FROM artigo WHERE titulo = 'Estoque não sincroniza com o ERP'),
 0, NOW() - INTERVAL '5 hours', NULL, NULL);
