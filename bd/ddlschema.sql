
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE departamento (
    id_departamento SERIAL PRIMARY KEY,
    nome VARCHAR(60) UNIQUE NOT NULL,
    descricao VARCHAR(255)
);

CREATE TABLE tecnico (
    id_tecnico SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    id_departamento INTEGER NOT NULL,
    FOREIGN KEY(id_departamento) REFERENCES departamento (id_departamento) ON DELETE RESTRICT
);

CREATE TABLE loja (
    id_loja SERIAL PRIMARY KEY,
    nome_loja VARCHAR(100) NOT NULL,
    nome_lojista VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nome VARCHAR(60) UNIQUE NOT NULL,
    descricao VARCHAR(255)
);

CREATE TABLE prioridade (
    id_prioridade SERIAL PRIMARY KEY,
    nome VARCHAR(30) UNIQUE NOT NULL,
    nivel INTEGER NOT NULL,
    prazo_sla_horas INTEGER NOT NULL
);

CREATE TABLE status (
    id_status SERIAL PRIMARY KEY,
    nome VARCHAR(30) UNIQUE NOT NULL,
    descricao VARCHAR(255)
);

CREATE TABLE artigo (
    id_artigo SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    conteudo TEXT NOT NULL,
    data_publicacao DATE DEFAULT CURRENT_DATE,
    embedding VECTOR(768),
    id_categoria INTEGER NOT NULL,
    FOREIGN KEY(id_categoria) REFERENCES categoria (id_categoria) ON DELETE RESTRICT
);

CREATE TABLE chamado (
    id_chamado SERIAL PRIMARY KEY,
    motivo VARCHAR(150) NOT NULL,
    descricao TEXT NOT NULL,
    data_abertura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP,
    nota_avaliacao INTEGER CHECK (nota_avaliacao BETWEEN 1 AND 5),
    comentario_avaliacao VARCHAR(255),
    embedding VECTOR(768),
    id_loja INTEGER NOT NULL,
    id_categoria INTEGER NOT NULL,
    id_prioridade INTEGER NOT NULL,
    id_status INTEGER NOT NULL,
    id_tecnico INTEGER,
    FOREIGN KEY(id_loja) REFERENCES loja (id_loja) ON DELETE RESTRICT,
    FOREIGN KEY(id_categoria) REFERENCES categoria (id_categoria) ON DELETE RESTRICT,
    FOREIGN KEY(id_prioridade) REFERENCES prioridade (id_prioridade) ON DELETE RESTRICT,
    FOREIGN KEY(id_status) REFERENCES status (id_status) ON DELETE RESTRICT,
    FOREIGN KEY(id_tecnico) REFERENCES tecnico (id_tecnico) ON DELETE SET NULL
);

CREATE TABLE mensagem (
    id_mensagem SERIAL PRIMARY KEY,
    conteudo TEXT NOT NULL,
    autor_tipo VARCHAR(10) NOT NULL CHECK (autor_tipo IN ('LOJISTA', 'TECNICO')),
    data_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_chamado INTEGER NOT NULL,
    FOREIGN KEY(id_chamado) REFERENCES chamado (id_chamado) ON DELETE CASCADE
);

CREATE TABLE anexo (
    id_anexo SERIAL PRIMARY KEY,
    nome_arquivo VARCHAR(150) NOT NULL,
    caminho_arquivo VARCHAR(255) NOT NULL,
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_mensagem INTEGER NOT NULL,
    FOREIGN KEY(id_mensagem) REFERENCES mensagem (id_mensagem) ON DELETE CASCADE
);

CREATE TABLE historico_status (
    id_historico SERIAL PRIMARY KEY,
    data_alteracao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacao VARCHAR(255),
    id_chamado INTEGER NOT NULL,
    id_status_anterior INTEGER,
    id_status_novo INTEGER NOT NULL,
    id_tecnico INTEGER,
    FOREIGN KEY(id_status_novo) REFERENCES status (id_status) ON DELETE RESTRICT,
    FOREIGN KEY(id_status_anterior) REFERENCES status (id_status) ON DELETE SET NULL,
    FOREIGN KEY(id_chamado) REFERENCES chamado (id_chamado) ON DELETE CASCADE,
    FOREIGN KEY(id_tecnico) REFERENCES tecnico (id_tecnico) ON DELETE SET NULL
);

CREATE TABLE solucao (
    id_solucao SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_chamado INTEGER NOT NULL,
    FOREIGN KEY(id_chamado) REFERENCES chamado (id_chamado) ON DELETE CASCADE
);

CREATE TABLE sugere (
    id_chamado INTEGER,
    id_artigo INTEGER,
    similaridade NUMERIC(5,4) NOT NULL,
    data_sugestao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    foi_util BOOLEAN,
    id_tecnico INTEGER,
    PRIMARY KEY (id_chamado, id_artigo),
    FOREIGN KEY(id_tecnico) REFERENCES tecnico (id_tecnico) ON DELETE SET NULL,
    FOREIGN KEY(id_artigo) REFERENCES artigo (id_artigo) ON DELETE CASCADE,
    FOREIGN KEY(id_chamado) REFERENCES chamado (id_chamado) ON DELETE CASCADE
);
