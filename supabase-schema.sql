-- ========================================
-- Você Pode Tudo - Schema do Supabase (PostgreSQL)
-- Execute este SQL no Editor SQL do painel do Supabase
-- ========================================

-- Habilita extensão UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Tabela: courses (Cursos)
-- ========================================
CREATE TABLE IF NOT EXISTS public.courses (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE, -- URL amigável opcional

    -- Conteúdo Principal
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'tecnologia',
        'profissionalizacao',
        'gestao',
        'empreendedorismo',
        'saude',
        'artes',
        'acessibilidade',
        'outros'
    )),
    provider TEXT NOT NULL, -- Instituição/provedor do curso
    url TEXT NOT NULL, -- Link para o curso

    -- Metadados
    duration TEXT NOT NULL, -- Ex: "20h", "40h"
    level TEXT NOT NULL DEFAULT 'Iniciante' CHECK (level IN ('Iniciante', 'Intermediário', 'Avançado')),
    image_url TEXT, -- URL da imagem de capa (opcional)
    certificate BOOLEAN DEFAULT false, -- Oferece certificado?

    -- Controle de Exibição
    featured BOOLEAN DEFAULT false, -- Aparece em destaque no hero
    active BOOLEAN DEFAULT true, -- Visível no site
    display_order INTEGER DEFAULT 0, -- Ordem de exibição

    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_courses_category ON public.courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_active ON public.courses(active);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses(featured);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);

-- ========================================
-- Tabela: tracks (Trilhas de Aprendizagem)
-- ========================================
CREATE TABLE IF NOT EXISTS public.tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT, -- Nome do ícone (briefcase, monitor, code, lightbulb, file-text)

    courses_count INTEGER DEFAULT 0,
    duration TEXT, -- Ex: "40h"
    display_order INTEGER DEFAULT 0,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de junção: track_courses (Muitos-para-Muitos)
CREATE TABLE IF NOT EXISTS public.track_courses (
    track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    PRIMARY KEY (track_id, course_id)
);

-- ========================================
-- Tabela: resources (Recursos Profissionais)
-- ========================================
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT, -- Nome do ícone
    content TEXT, -- Conteúdo completo (Markdown/HTML)
    url TEXT, -- Link externo opcional

    category TEXT CHECK (category IN (
        'curriculo',
        'entrevista',
        'glossario',
        'vagas',
        'golpes',
        'outros'
    )),

    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Tabela: site_config (Configurações do Site)
-- ========================================
CREATE TABLE IF NOT EXISTS public.site_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações padrão
INSERT INTO public.site_config (key, value, description) VALUES
    ('hero_stats', '{"courses": 500, "tracks": 50, "people": 10000}', 'Estatísticas exibidas no hero'),
    ('site_title', '"Você Pode Tudo"', 'Título do site'),
    ('site_description', '"Democratizando acesso à capacitação profissional"', 'Descrição para SEO'),
    ('contact_email', '"contato@vocepodetudo.org"', 'Email de contato')
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Políticas para courses
-- Leitura pública: apenas cursos ativos
CREATE POLICY "Public read active courses" ON public.courses
    FOR SELECT USING (active = true);

-- Escrita: feita pelo painel do Supabase (service role), sem políticas de admin no site.

-- Políticas para tracks
CREATE POLICY "Public read active tracks" ON public.tracks
    FOR SELECT USING (active = true);

-- Políticas para track_courses
CREATE POLICY "Public read track_courses" ON public.track_courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tracks t
            WHERE t.id = track_courses.track_id AND t.active = true
        )
    );

-- Políticas para resources
CREATE POLICY "Public read active resources" ON public.resources
    FOR SELECT USING (active = true);

-- Políticas para site_config
CREATE POLICY "Public read site_config" ON public.site_config
    FOR SELECT USING (true);

-- ========================================
-- Triggers para updated_at
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_courses_updated_at ON public.courses;
CREATE TRIGGER trigger_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_tracks_updated_at ON public.tracks;
CREATE TRIGGER trigger_tracks_updated_at
    BEFORE UPDATE ON public.tracks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_resources_updated_at ON public.resources;
CREATE TRIGGER trigger_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_site_config_updated_at ON public.site_config;
CREATE TRIGGER trigger_site_config_updated_at
    BEFORE UPDATE ON public.site_config
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- Função helper: Buscar cursos com contagem de trilhas
-- ========================================
CREATE OR REPLACE FUNCTION public.get_courses_with_tracks()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    provider TEXT,
    url TEXT,
    duration TEXT,
    level TEXT,
    image_url TEXT,
    certificate BOOLEAN,
    featured BOOLEAN,
    active BOOLEAN,
    tracks JSONB
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.description,
        c.category,
        c.provider,
        c.url,
        c.duration,
        c.level,
        c.image_url,
        c.certificate,
        c.featured,
        c.active,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'title', t.title,
                    'slug', t.slug
                )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::jsonb
        ) as tracks
    FROM public.courses c
    LEFT JOIN public.track_courses tc ON tc.course_id = c.id
    LEFT JOIN public.tracks t ON t.id = tc.track_id AND t.active = true
    WHERE c.active = true
    GROUP BY c.id
    ORDER BY c.featured DESC, c.display_order, c.created_at DESC;
END;
$$;

-- ========================================
-- Dados Iniciais (Seed) - OPCIONAL
-- ========================================
-- Descomente e execute se quiser popular com dados de exemplo

/*
-- Trilhas
INSERT INTO public.tracks (slug, title, description, icon, courses_count, duration, display_order) VALUES
    ('primeiro-emprego', 'Primeiro Emprego', 'Do zero ao primeiro contracheque: currículo, entrevista, direitos trabalhistas e postura profissional.', 'briefcase', 8, '40h', 1),
    ('informatica-basica', 'Informática Básica', 'Domine o essencial: Windows, Office, internet, e-mail e segurança digital para o dia a dia.', 'monitor', 6, '30h', 2),
    ('tecnologia', 'Tecnologia', 'Inicie na programação: lógica, Git, HTML/CSS, JavaScript, Python e fundamentos de dados.', 'code', 10, '80h', 3),
    ('empreendedorismo', 'Empreendedorismo', 'Da ideia ao negócio: modelo de canvas, finanças, marketing digital, vendas e formalização.', 'lightbulb', 7, '50h', 4),
    ('melhorar-curriculo', 'Melhorar Meu Currículo', 'Destaque-se no mercado: currículo ATS, LinkedIn, portfólio, carta de apresentação e networking.', 'file-text', 5, '20h', 5)
ON CONFLICT (slug) DO NOTHING;

-- Cursos de exemplo (IDs serão gerados automaticamente)
-- Após inserir cursos, vincule nas trilhas via track_courses
*/

-- ========================================
-- Verificação Final
-- ========================================
-- Execute para verificar se tudo foi criado:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM public.courses LIMIT 5;