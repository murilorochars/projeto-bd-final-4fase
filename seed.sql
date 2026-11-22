INSERT INTO departamento (nome, descricao) VALUES
('Suporte N1', 'Atendimento inicial: dúvidas, pagamentos e configurações da loja'),
('Suporte N2', 'Casos técnicos: erros de sistema, checkout e atualizações'),
('Integrações', 'ERP, marketplaces, transportadoras e API');

INSERT INTO tecnico (nome, email, ativo, id_departamento)
SELECT v.nome, v.email, TRUE, d.id_departamento
FROM (VALUES
    (1, 'Carlos Silva', 'carlos.silva@smartech.com', 'Suporte N1'),
    (2, 'Beatriz Rocha', 'beatriz.rocha@smartech.com', 'Suporte N1'),
    (3, 'Ana Souza', 'ana.souza@smartech.com', 'Suporte N2'),
    (4, 'Diego Martins', 'diego.martins@smartech.com', 'Suporte N2'),
    (5, 'Fernanda Alves', 'fernanda.alves@smartech.com', 'Integrações')
) AS v(ordem, nome, email, departamento)
JOIN departamento d ON d.nome = v.departamento
ORDER BY v.ordem;

INSERT INTO loja (nome_loja, nome_lojista, email, telefone, data_cadastro) VALUES
('Moda Bella', 'Juliana Costa', 'contato@modabella.com.br', '(48) 99876-1234', NOW() - INTERVAL '300 days'),
('TechShop Eletrônicos', 'Ricardo Lima', 'ricardo@techshop.com.br', '(48) 98765-4321', NOW() - INTERVAL '250 days'),
('Casa & Decoração Lar', 'Patrícia Mendes', 'patricia@casalar.com.br', '(47) 99123-4567', NOW() - INTERVAL '200 days'),
('Pet Feliz', 'Marcos Oliveira', 'marcos@petfeliz.com.br', '(48) 99654-7890', NOW() - INTERVAL '180 days'),
('Sabor da Serra', 'Luana Ferreira', 'luana@sabordaserra.com.br', '(49) 98877-6655', NOW() - INTERVAL '120 days'),
('Esporte Total', 'Bruno Carvalho', 'bruno@esportetotal.com.br', '(48) 99443-2211', NOW() - INTERVAL '90 days');

INSERT INTO categoria (nome, descricao) VALUES
('Pagamento', 'Problemas com Pix, cartão, boleto, estorno e gateways de pagamento'),
('Atualização de sistema', 'Problemas após atualização da plataforma ou do tema da loja'),
('Integração', 'Integrações com ERP, marketplaces, transportadoras e API'),
('Erro técnico', 'Erros de sistema, checkout, carrinho e cadastro de produtos'),
('Dúvida geral', 'Dúvidas de uso e configuração da loja');

INSERT INTO prioridade (nome, nivel, prazo_sla_horas) VALUES
('Alta', 3, 4),
('Média', 2, 24),
('Baixa', 1, 48);

INSERT INTO status (nome, descricao) VALUES
('Aberto', 'Chamado aberto aguardando atendimento'),
('Em andamento', 'Técnico trabalhando no chamado'),
('Aguardando resposta', 'Aguardando retorno do lojista'),
('Resolvido', 'Solução aplicada, aguardando confirmação do lojista'),
('Fechado', 'Chamado resolvido e encerrado');

INSERT INTO artigo (titulo, conteudo, data_publicacao, id_categoria)
SELECT v.titulo, v.conteudo, CURRENT_DATE - v.dias, c.id_categoria
FROM (VALUES
    ('Pix não confirma o pagamento do pedido',
     'Quando o cliente paga via Pix e o pedido continua como aguardando pagamento, verifique se a URL de notificação (webhook) do gateway está configurada em Configurações > Pagamentos. Reenvie a notificação pelo painel do gateway e confira se o certificado do Pix está válido. Ajuste também o tempo de expiração do QR Code.',
     120, 'Pagamento'),
    ('Cartão recusado mesmo com limite disponível',
     'Recusas de cartão com limite disponível costumam ser causadas pelo antifraude do gateway ou por dados de cobrança incompletos. Revise as regras do antifraude, confira se o CPF e o endereço são obrigatórios no checkout e consulte o motivo da recusa no painel do gateway.',
     110, 'Pagamento'),
    ('Estoque não sincroniza com o ERP',
     'Se o estoque da loja não atualiza com o ERP, confira se o token da integração não expirou e se o SKU dos produtos é igual nos dois sistemas. Gere um novo token em Integrações > ERP e execute a sincronização manual. SKUs diferentes geram produtos duplicados.',
     100, 'Integração'),
    ('Etiqueta de frete e rastreio da transportadora',
     'Quando a etiqueta de frete não é gerada ou o rastreio não chega ao cliente, verifique as credenciais da transportadora em Integrações > Frete, o peso e as dimensões dos produtos e se o CEP de origem está correto. Reprocesse os pedidos parados.',
     90, 'Integração'),
    ('Loja fora do ar após atualizar o tema',
     'Se a loja ficou em branco ou com layout quebrado após uma atualização do tema ou da plataforma, restaure a versão anterior do tema em Aparência > Temas, limpe o cache e reaplique as personalizações uma por uma para achar a que conflita.',
     80, 'Atualização de sistema'),
    ('Como criar cupons e promoções',
     'Para criar um cupom de desconto acesse Marketing > Cupons, defina o código, o tipo de desconto (percentual ou valor), o valor mínimo do pedido e a validade. Frete grátis acima de um valor é configurado em Marketing > Promoções.',
     70, 'Dúvida geral'),
    ('Erro 500 no checkout e no carrinho',
     'Erros 500 no checkout ou carrinho que esvazia sozinho normalmente vêm de um plugin ou script personalizado incompatível. Desative scripts adicionados recentemente, teste em aba anônima e verifique os logs de erro no painel da loja.',
     60, 'Erro técnico')
) AS v(titulo, conteudo, dias, categoria)
JOIN categoria c ON c.nome = v.categoria
ORDER BY v.dias DESC;

INSERT INTO chamado (motivo, descricao, data_abertura, data_fechamento, nota_avaliacao, comentario_avaliacao, id_loja, id_categoria, id_prioridade, id_status, id_tecnico)
SELECT v.motivo, v.descricao,
       NOW() - (v.dias || ' days')::interval,
       CASE WHEN v.status = 'Fechado' THEN NOW() - (v.dias || ' days')::interval + (v.horas || ' hours')::interval END,
       v.nota, v.comentario, l.id_loja, c.id_categoria, p.id_prioridade, s.id_status, t.id_tecnico
FROM (VALUES
    ('Pagamento via Pix não é confirmado', 'Os clientes pagam com Pix, o dinheiro cai na conta, mas o pedido fica parado como aguardando pagamento na loja.', 45, 3, 5, 'Resolveram rápido, ótimo atendimento', 'Moda Bella', 'Pagamento', 'Alta', 'Fechado', 'carlos.silva@smartech.com'),
    ('Pedido pago no Pix continua pendente', 'O cliente mandou o comprovante do Pix mas o pedido não mudou de status no painel da loja.', 30, 5, 4, 'Bom atendimento', 'Pet Feliz', 'Pagamento', 'Alta', 'Fechado', 'carlos.silva@smartech.com'),
    ('Cartão de crédito recusado no checkout', 'Vários clientes reclamam que o cartão é recusado na hora de finalizar a compra, mesmo tendo limite.', 28, 8, 4, NULL, 'Esporte Total', 'Pagamento', 'Alta', 'Fechado', 'beatriz.rocha@smartech.com'),
    ('Boleto não é gerado após a compra', 'Quando o cliente escolhe boleto aparece uma tela em branco e o boleto não é gerado.', 20, 6, 3, 'Demorou um pouco', 'Casa & Decoração Lar', 'Pagamento', 'Média', 'Fechado', 'beatriz.rocha@smartech.com'),
    ('QR Code do Pix expira muito rápido', 'Os clientes dizem que o QR Code do Pix expira antes de conseguirem pagar pelo aplicativo do banco.', 12, 4, 5, 'Excelente', 'Sabor da Serra', 'Pagamento', 'Média', 'Fechado', 'carlos.silva@smartech.com'),
    ('Pagamento aprovado mas pedido cancelado', 'O gateway aprovou o pagamento no cartão mas o pedido foi cancelado automaticamente pela loja.', 6, NULL, NULL, NULL, 'TechShop Eletrônicos', 'Pagamento', 'Alta', 'Em andamento', 'carlos.silva@smartech.com'),
    ('Estorno de pagamento não aparece', 'Fiz o estorno de um pedido pelo painel e o cliente diz que o valor não voltou no cartão.', 2, NULL, NULL, NULL, 'Moda Bella', 'Pagamento', 'Baixa', 'Aberto', NULL),
    ('Estoque desatualizado com o ERP', 'Desde ontem o estoque dos produtos não atualiza com o nosso ERP e estamos vendendo itens que já acabaram.', 25, 10, 4, NULL, 'TechShop Eletrônicos', 'Integração', 'Alta', 'Fechado', 'ana.souza@smartech.com'),
    ('Produtos duplicados após sincronizar o ERP', 'Depois da sincronização com o ERP apareceram vários produtos duplicados na vitrine da loja.', 18, 12, 3, NULL, 'Casa & Decoração Lar', 'Integração', 'Média', 'Fechado', 'fernanda.alves@smartech.com'),
    ('Etiqueta de frete não é gerada', 'Ao gerar a etiqueta da transportadora aparece erro de integração e os pedidos ficam parados sem envio.', 10, 6, NULL, NULL, 'Pet Feliz', 'Integração', 'Alta', 'Resolvido', 'fernanda.alves@smartech.com'),
    ('Rastreio não atualiza para o cliente', 'O código de rastreio da transportadora não aparece para o cliente no e-mail de envio.', 4, NULL, NULL, NULL, 'Esporte Total', 'Integração', 'Média', 'Aguardando resposta', 'ana.souza@smartech.com'),
    ('Marketplace não recebe os pedidos', 'Os pedidos feitos no marketplace não estão caindo no painel da loja desde hoje cedo.', 1, NULL, NULL, NULL, 'Sabor da Serra', 'Integração', 'Alta', 'Aberto', NULL),
    ('Erro 500 ao finalizar a compra', 'Na última etapa do checkout aparece erro 500 e o cliente não consegue finalizar o pedido.', 22, 2, 5, 'Muito rápido', 'Moda Bella', 'Erro técnico', 'Alta', 'Fechado', 'ana.souza@smartech.com'),
    ('Página do produto não carrega imagens', 'As imagens dos produtos não aparecem em algumas páginas, fica só o ícone de imagem quebrada.', 15, 9, 4, NULL, 'Casa & Decoração Lar', 'Erro técnico', 'Média', 'Fechado', 'diego.martins@smartech.com'),
    ('Carrinho esvazia sozinho', 'Os clientes colocam produtos no carrinho e quando vão finalizar a compra o carrinho está vazio.', 8, 7, NULL, NULL, 'TechShop Eletrônicos', 'Erro técnico', 'Alta', 'Resolvido', 'ana.souza@smartech.com'),
    ('Erro ao cadastrar novo produto', 'Quando tento salvar um produto novo aparece uma mensagem de erro e o produto não é cadastrado.', 3, NULL, NULL, NULL, 'Esporte Total', 'Erro técnico', 'Média', 'Em andamento', 'diego.martins@smartech.com'),
    ('Loja fora do ar após atualizar o tema', 'Depois de atualizar o tema da loja o site ficou fora do ar mostrando uma página em branco.', 27, 4, 5, NULL, 'Sabor da Serra', 'Atualização de sistema', 'Alta', 'Fechado', 'diego.martins@smartech.com'),
    ('Layout quebrado depois da atualização', 'Depois da atualização da plataforma o menu e o rodapé da loja ficaram desconfigurados.', 14, 20, 2, 'Demorou para resolver', 'Pet Feliz', 'Atualização de sistema', 'Média', 'Fechado', 'beatriz.rocha@smartech.com'),
    ('Campo de cupom sumiu após atualização', 'A atualização mudou o checkout e os clientes não encontram mais o campo para digitar o cupom.', 5, NULL, NULL, NULL, 'Moda Bella', 'Atualização de sistema', 'Baixa', 'Aguardando resposta', 'beatriz.rocha@smartech.com'),
    ('Como criar cupom de desconto', 'Quero criar um cupom de 10% para a Black Friday e não encontro onde configurar.', 16, 1, 5, 'Muito didático', 'TechShop Eletrônicos', 'Dúvida geral', 'Baixa', 'Fechado', 'carlos.silva@smartech.com'),
    ('Como configurar frete grátis', 'Gostaria de oferecer frete grátis para pedidos acima de 200 reais, como faço?', 9, 2, NULL, NULL, 'Casa & Decoração Lar', 'Dúvida geral', 'Baixa', 'Resolvido', 'carlos.silva@smartech.com'),
    ('Como emitir relatório de vendas', 'Preciso tirar um relatório das vendas do mês para enviar ao contador.', 2, NULL, NULL, NULL, 'Sabor da Serra', 'Dúvida geral', 'Baixa', 'Em andamento', 'carlos.silva@smartech.com')
) AS v(motivo, descricao, dias, horas, nota, comentario, loja, categoria, prioridade, status, tecnico)
JOIN loja l ON l.nome_loja = v.loja
JOIN categoria c ON c.nome = v.categoria
JOIN prioridade p ON p.nome = v.prioridade
JOIN status s ON s.nome = v.status
LEFT JOIN tecnico t ON t.email = v.tecnico
ORDER BY v.dias DESC, v.motivo;

INSERT INTO mensagem (conteudo, autor_tipo, data_envio, id_chamado)
SELECT c.descricao, 'LOJISTA', c.data_abertura, c.id_chamado
FROM chamado c
ORDER BY c.id_chamado;

INSERT INTO mensagem (conteudo, autor_tipo, data_envio, id_chamado)
SELECT 'Olá! Já estou analisando o seu chamado e retorno em breve.', 'TECNICO', c.data_abertura + INTERVAL '1 hour', c.id_chamado
FROM chamado c
JOIN status s ON s.id_status = c.id_status
WHERE s.nome <> 'Aberto';

INSERT INTO mensagem (conteudo, autor_tipo, data_envio, id_chamado)
SELECT 'Pode me enviar um print da tela com o erro e o número de um pedido afetado?', 'TECNICO', c.data_abertura + INTERVAL '2 hours', c.id_chamado
FROM chamado c
JOIN status s ON s.id_status = c.id_status
WHERE s.nome = 'Aguardando resposta';

INSERT INTO anexo (nome_arquivo, caminho_arquivo, data_upload, id_mensagem)
SELECT v.arquivo, 'uploads/chamado_' || c.id_chamado || '/' || v.arquivo, m.data_envio, m.id_mensagem
FROM (VALUES
    ('Pagamento via Pix não é confirmado', 'print_pedido_pix.png'),
    ('Pedido pago no Pix continua pendente', 'comprovante_pix.pdf'),
    ('Cartão de crédito recusado no checkout', 'print_recusa_cartao.png'),
    ('Estoque desatualizado com o ERP', 'log_erp.txt'),
    ('Produtos duplicados após sincronizar o ERP', 'lista_produtos_duplicados.csv'),
    ('Etiqueta de frete não é gerada', 'erro_transportadora.png'),
    ('Erro 500 ao finalizar a compra', 'print_erro_500.png'),
    ('Loja fora do ar após atualizar o tema', 'print_pagina_branca.png'),
    ('Layout quebrado depois da atualização', 'print_layout.png')
) AS v(motivo, arquivo)
JOIN chamado c ON c.motivo = v.motivo
JOIN mensagem m ON m.id_chamado = c.id_chamado AND m.autor_tipo = 'LOJISTA';

INSERT INTO historico_status (data_alteracao, observacao, id_chamado, id_status_anterior, id_status_novo, id_tecnico)
SELECT c.data_abertura, 'Abertura do chamado', c.id_chamado, NULL, a.id_status, NULL
FROM chamado c
CROSS JOIN status a
WHERE a.nome = 'Aberto';

INSERT INTO historico_status (data_alteracao, observacao, id_chamado, id_status_anterior, id_status_novo, id_tecnico)
SELECT c.data_abertura + INTERVAL '1 hour', 'Técnico assumiu o chamado', c.id_chamado, a.id_status, e.id_status, c.id_tecnico
FROM chamado c
JOIN status s ON s.id_status = c.id_status
CROSS JOIN status a
CROSS JOIN status e
WHERE a.nome = 'Aberto' AND e.nome = 'Em andamento' AND s.nome <> 'Aberto';

INSERT INTO historico_status (data_alteracao, observacao, id_chamado, id_status_anterior, id_status_novo, id_tecnico)
SELECT COALESCE(c.data_fechamento, c.data_abertura + INTERVAL '6 hours'),
       CASE WHEN s.nome = 'Aguardando resposta' THEN 'Pedido de mais informações ao lojista' ELSE 'Solução aplicada' END,
       c.id_chamado, e.id_status, s.id_status, c.id_tecnico
FROM chamado c
JOIN status s ON s.id_status = c.id_status
CROSS JOIN status e
WHERE e.nome = 'Em andamento' AND s.nome IN ('Aguardando resposta', 'Resolvido', 'Fechado');

INSERT INTO solucao (descricao, data_registro, id_chamado)
SELECT v.solucao, COALESCE(c.data_fechamento, c.data_abertura + INTERVAL '6 hours') - INTERVAL '30 minutes', c.id_chamado
FROM (VALUES
    ('Pagamento via Pix não é confirmado', 'URL do webhook do gateway estava errada. Corrigida em Configurações > Pagamentos e notificações reenviadas.'),
    ('Pagamento via Pix não é confirmado', 'Pedidos parados foram confirmados manualmente e o lojista foi orientado a acompanhar o log do gateway.'),
    ('Pedido pago no Pix continua pendente', 'Webhook do Pix reconfigurado e notificação do pedido reenviada pelo painel do gateway.'),
    ('Cartão de crédito recusado no checkout', 'Regra do antifraude estava muito restritiva. Ajustada e CPF tornado obrigatório no checkout.'),
    ('Boleto não é gerado após a compra', 'Carteira do boleto estava sem convênio cadastrado. Convênio configurado no gateway.'),
    ('QR Code do Pix expira muito rápido', 'Tempo de expiração do QR Code aumentado de 5 para 30 minutos no gateway.'),
    ('Estoque desatualizado com o ERP', 'Token da integração com o ERP estava expirado. Novo token gerado e sincronização manual executada.'),
    ('Produtos duplicados após sincronizar o ERP', 'SKUs diferentes entre ERP e loja. SKUs corrigidos e produtos duplicados removidos.'),
    ('Etiqueta de frete não é gerada', 'Credenciais da transportadora atualizadas e pedidos parados reprocessados.'),
    ('Erro 500 ao finalizar a compra', 'Script de pixel adicionado no checkout causava o erro. Script removido.'),
    ('Página do produto não carrega imagens', 'Imagens com link antigo do CDN. Imagens reenviadas e cache limpo.'),
    ('Carrinho esvazia sozinho', 'Plugin de recuperação de carrinho incompatível desativado.'),
    ('Loja fora do ar após atualizar o tema', 'Versão anterior do tema restaurada e personalizações reaplicadas.'),
    ('Layout quebrado depois da atualização', 'CSS personalizado conflitando com a nova versão. CSS ajustado.'),
    ('Como criar cupom de desconto', 'Lojista orientado a criar o cupom em Marketing > Cupons.'),
    ('Como configurar frete grátis', 'Promoção de frete grátis acima de R$ 200 configurada em Marketing > Promoções.')
) AS v(motivo, solucao)
JOIN chamado c ON c.motivo = v.motivo;

INSERT INTO sugere (id_chamado, id_artigo, similaridade, data_sugestao, foi_util, id_tecnico)
SELECT c.id_chamado, a.id_artigo, 0, c.data_abertura, v.util,
       CASE WHEN v.util IS NOT NULL THEN c.id_tecnico END
FROM (VALUES
    ('Pagamento via Pix não é confirmado', 'Pix não confirma o pagamento do pedido', TRUE),
    ('Pedido pago no Pix continua pendente', 'Pix não confirma o pagamento do pedido', TRUE),
    ('QR Code do Pix expira muito rápido', 'Pix não confirma o pagamento do pedido', TRUE),
    ('Boleto não é gerado após a compra', 'Pix não confirma o pagamento do pedido', FALSE),
    ('Pagamento aprovado mas pedido cancelado', 'Pix não confirma o pagamento do pedido', FALSE),
    ('Estorno de pagamento não aparece', 'Pix não confirma o pagamento do pedido', NULL),
    ('Cartão de crédito recusado no checkout', 'Cartão recusado mesmo com limite disponível', TRUE),
    ('Pagamento aprovado mas pedido cancelado', 'Cartão recusado mesmo com limite disponível', TRUE),
    ('Boleto não é gerado após a compra', 'Cartão recusado mesmo com limite disponível', FALSE),
    ('Estoque desatualizado com o ERP', 'Estoque não sincroniza com o ERP', TRUE),
    ('Produtos duplicados após sincronizar o ERP', 'Estoque não sincroniza com o ERP', TRUE),
    ('Marketplace não recebe os pedidos', 'Estoque não sincroniza com o ERP', NULL),
    ('Etiqueta de frete não é gerada', 'Etiqueta de frete e rastreio da transportadora', TRUE),
    ('Rastreio não atualiza para o cliente', 'Etiqueta de frete e rastreio da transportadora', NULL),
    ('Loja fora do ar após atualizar o tema', 'Loja fora do ar após atualizar o tema', TRUE),
    ('Layout quebrado depois da atualização', 'Loja fora do ar após atualizar o tema', TRUE),
    ('Campo de cupom sumiu após atualização', 'Loja fora do ar após atualizar o tema', NULL),
    ('Página do produto não carrega imagens', 'Loja fora do ar após atualizar o tema', FALSE),
    ('Como criar cupom de desconto', 'Como criar cupons e promoções', TRUE),
    ('Como configurar frete grátis', 'Como criar cupons e promoções', TRUE),
    ('Campo de cupom sumiu após atualização', 'Como criar cupons e promoções', TRUE),
    ('Erro 500 ao finalizar a compra', 'Erro 500 no checkout e no carrinho', TRUE),
    ('Carrinho esvazia sozinho', 'Erro 500 no checkout e no carrinho', TRUE),
    ('Erro ao cadastrar novo produto', 'Erro 500 no checkout e no carrinho', NULL),
    ('Página do produto não carrega imagens', 'Erro 500 no checkout e no carrinho', TRUE)
) AS v(motivo, artigo, util)
JOIN chamado c ON c.motivo = v.motivo
JOIN artigo a ON a.titulo = v.artigo;
