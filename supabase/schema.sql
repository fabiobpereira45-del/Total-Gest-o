-- =============================================================
-- TOTAL GESTÃO — Schema Multi-tenant Completo
-- Execute no SQL Editor do Supabase do NOVO projeto
-- =============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABELA: tenants (Organizações/Empresas)
-- =============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cor_primaria TEXT DEFAULT '#6366f1',
  cor_secundaria TEXT DEFAULT '#8b5cf6',
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABELA: usuarios_admin (Usuários administradores dos tenants)
-- =============================================================
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('master', 'admin', 'operador')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABELA: inscricoes_batismo (Módulo 1 — Cadastro / Batismo)
-- Preserva todos os dados do projeto original + tenant_id
-- =============================================================
CREATE TABLE IF NOT EXISTS inscricoes_batismo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  -- Dados originais do projeto base
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  data_consagracao DATE,
  telefone TEXT,
  igreja TEXT,
  pastor TEXT,
  cargo TEXT,
  funcao TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  estado_civil TEXT,
  nome_pai TEXT,
  nome_mae TEXT,
  naturalidade TEXT,
  rg TEXT,
  data_batismo DATE,
  foto_url TEXT,
  -- Matrícula automática
  matricula TEXT UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscas por CPF e tenant
CREATE INDEX IF NOT EXISTS idx_batismo_cpf ON inscricoes_batismo(cpf);
CREATE INDEX IF NOT EXISTS idx_batismo_tenant ON inscricoes_batismo(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_batismo_cpf_tenant ON inscricoes_batismo(cpf, tenant_id);

-- =============================================================
-- TABELA: membros_gerais (Módulo 2 — Cadastro Geral)
-- =============================================================
CREATE TABLE IF NOT EXISTS membros_gerais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  foto_url TEXT,
  matricula TEXT UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membros_cpf ON membros_gerais(cpf);
CREATE INDEX IF NOT EXISTS idx_membros_tenant ON membros_gerais(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_membros_cpf_tenant ON membros_gerais(cpf, tenant_id);

-- =============================================================
-- TABELA: sequencias_matricula (Controle de sequência por tenant)
-- =============================================================
CREATE TABLE IF NOT EXISTS sequencias_matricula (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE PRIMARY KEY,
  ultimo_numero INTEGER DEFAULT 0
);

-- Function para gerar matrícula automaticamente
CREATE OR REPLACE FUNCTION gerar_matricula(p_tenant_id UUID, p_ano INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_ano INTEGER;
  v_numero INTEGER;
  v_slug TEXT;
  v_matricula TEXT;
BEGIN
  v_ano := COALESCE(p_ano, EXTRACT(YEAR FROM NOW())::INTEGER);
  
  -- Busca slug do tenant
  SELECT UPPER(LEFT(slug, 3)) INTO v_slug FROM tenants WHERE id = p_tenant_id;
  
  -- Incrementa o número na tabela de sequências
  INSERT INTO sequencias_matricula (tenant_id, ultimo_numero)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id) DO UPDATE
    SET ultimo_numero = sequencias_matricula.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_numero;
  
  -- Formato: SLUG-AAAA-NNNNN
  v_matricula := v_slug || '-' || v_ano || '-' || LPAD(v_numero::TEXT, 5, '0');
  
  RETURN v_matricula;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- TABELA: configuracoes_credencial (Módulo 3 — Credencial de Evento)
-- =============================================================
CREATE TABLE IF NOT EXISTS configuracoes_credencial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome_template TEXT NOT NULL DEFAULT 'Meu Template',
  nome_evento TEXT,
  data_evento DATE,
  local_evento TEXT,
  cor_fundo TEXT DEFAULT '#6366f1',
  cor_texto TEXT DEFAULT '#ffffff',
  cor_accent TEXT DEFAULT '#f59e0b',
  mostrar_foto BOOLEAN DEFAULT TRUE,
  mostrar_matricula BOOLEAN DEFAULT TRUE,
  mostrar_cargo BOOLEAN DEFAULT TRUE,
  mostrar_qr_code BOOLEAN DEFAULT FALSE,
  orientacao TEXT DEFAULT 'portrait' CHECK (orientacao IN ('portrait', 'landscape')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABELA: configuracoes_carteira (Módulo 4 — Carteira de Membro)
-- =============================================================
CREATE TABLE IF NOT EXISTS configuracoes_carteira (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome_template TEXT NOT NULL DEFAULT 'Carteira Padrão',
  -- Frente
  cor_fundo_frente TEXT DEFAULT '#1e1b4b',
  cor_texto_frente TEXT DEFAULT '#ffffff',
  mostrar_foto BOOLEAN DEFAULT TRUE,
  mostrar_matricula BOOLEAN DEFAULT TRUE,
  mostrar_cargo BOOLEAN DEFAULT TRUE,
  mostrar_validade BOOLEAN DEFAULT TRUE,
  validade_meses INTEGER DEFAULT 12,
  -- Verso
  cor_fundo_verso TEXT DEFAULT '#312e81',
  cor_texto_verso TEXT DEFAULT '#ffffff',
  mostrar_qr_code BOOLEAN DEFAULT TRUE,
  texto_verso TEXT DEFAULT 'Portador desta carteira é membro ativo e regularmente registrado.',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABELA: certificados_templates (Módulo 5 — Certificados)
-- =============================================================
CREATE TABLE IF NOT EXISTS certificados_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome_template TEXT NOT NULL,
  modelo TEXT DEFAULT 'classico' CHECK (modelo IN ('classico', 'moderno', 'eclesial')),
  titulo TEXT NOT NULL DEFAULT 'CERTIFICADO',
  subtitulo TEXT,
  texto_principal TEXT NOT NULL DEFAULT 'Certificamos que {nome} participou com êxito.',
  texto_complementar TEXT,
  assinatura_1_nome TEXT,
  assinatura_1_cargo TEXT,
  assinatura_2_nome TEXT,
  assinatura_2_cargo TEXT,
  assinatura_3_nome TEXT,
  assinatura_3_cargo TEXT,
  cor_primaria TEXT DEFAULT '#1e1b4b',
  cor_secundaria TEXT DEFAULT '#6366f1',
  orientacao TEXT DEFAULT 'landscape' CHECK (orientacao IN ('portrait', 'landscape')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- ROW LEVEL SECURITY (RLS) — Isolamento por tenant
-- =============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscricoes_batismo ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_gerais ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_credencial ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_carteira ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequencias_matricula ENABLE ROW LEVEL SECURITY;

-- Policies: autenticados acessam todos (a lógica de tenant fica no servidor/client)
-- Em produção, usar JWT claims para filtrar por tenant_id automaticamente

CREATE POLICY "Acesso autenticado" ON inscricoes_batismo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Insert publico batismo" ON inscricoes_batismo
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Select publico batismo" ON inscricoes_batismo
  FOR SELECT TO public USING (true);

CREATE POLICY "Acesso autenticado membros" ON membros_gerais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Insert publico membros" ON membros_gerais
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Select publico membros" ON membros_gerais
  FOR SELECT TO public USING (true);

CREATE POLICY "Acesso autenticado credenciais" ON configuracoes_credencial
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso autenticado carteiras" ON configuracoes_carteira
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso autenticado certificados" ON certificados_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso tenants" ON tenants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso usuarios_admin" ON usuarios_admin
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso sequencias" ON sequencias_matricula
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Insert sequencias public" ON sequencias_matricula
  FOR ALL TO public USING (true) WITH CHECK (true);

-- =============================================================
-- STORAGE BUCKETS
-- =============================================================
-- Execute estes comandos separadamente no SQL Editor do Supabase:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-membros', 'fotos-membros', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos-tenants', 'logos-tenants', true);

-- =============================================================
-- DADOS INICIAIS: Tenant padrão para migração dos dados existentes
-- =============================================================
-- Insira o tenant da organização original (mude conforme necessário):
-- INSERT INTO tenants (id, nome, slug, email, cor_primaria, cor_secundaria)
-- VALUES (
--   'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
--   'Igreja Assembleia de Deus - Ministério Tancredo Neves',
--   'admtn',
--   'contato@admtn.com.br',
--   '#6366f1',
--   '#8b5cf6'
-- );

-- =============================================================
-- SCRIPT DE MIGRAÇÃO DOS DADOS EXISTENTES
-- Execute APÓS inserir o tenant acima e APÓS importar do banco antigo
-- =============================================================
-- UPDATE inscricoes_batismo SET tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' WHERE tenant_id IS NULL;
-- UPDATE membros_gerais SET tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' WHERE tenant_id IS NULL;
