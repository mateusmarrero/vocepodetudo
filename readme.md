# 🌟 Você Pode Tudo

> **Democratizando acesso à capacitação profissional** — Conectando pessoas a cursos gratuitos e ferramentas para conquistar independência financeira através do conhecimento e do trabalho.

**Slogan:** *Aprenda. Desenvolva. Conquiste.*

---

## 📋 Visão Geral

Portal web acessível, simples e bonito para catalogar cursos gratuitos de qualidade, organizados por categorias e trilhas de aprendizagem. Site público, com conta gratuita opcional para sincronizar progresso e favoritos; sem painel administrativo.

### ✨ Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| 🎯 **Catálogo de Cursos** | Filtro por 8 categorias, busca, nível, ordenação, paginação, cards responsivos |
| ❤️ **Favoritos** | Salva cursos no navegador (localStorage), filtro "Meus favoritos" e contador |
| **Conta gratuita** | Cadastro por e-mail, login e sincronização de progresso/favoritos na nuvem (Supabase) |
| 🔗 **Compartilhamento** | Web Share API (WhatsApp, etc.) com fallback de copiar link |
| 🌗 **Tema Claro / Escuro** | Seletor no cabeçalho, no menu mobile e no rodapé, com memória de preferência e respeito ao sistema |
| ♿ **Opções de Acessibilidade** | Aumentar/diminuir texto, alto contraste e reduzir animações, com preferências salvas |
| ℹ️ **Popup de Transparência** | Aviso ao abrir o site de que somos um hub e não hospedamos os cursos, com email de suporte |
| 🛤️ **Trilhas de Aprendizagem** | 5 trilhas principais com progresso visual |
| 📚 **Recursos Profissionais** | Currículo, entrevistas, glossário, onde procurar emprego, anti-golpes |
| ♿ **Acessibilidade WCAG 2.1 AA** | Navegação por teclado, leitores de tela, contraste, skip links |
| 📱 **Mobile First** | Responsivo, menu hambúrguer, touch-friendly |
| ⚡ **Performance** | Lazy loading, CSS otimizado, vanilla JS (sem build) |

---

## 🚀 Quick Start

### 1. Abra o site
A pasta contém:
```
index.html   → Site principal
styles.css   → Estilos
app.js       → Catálogo, filtros, favoritos e tema
README.md    → Este arquivo
```

Dê um duplo clique em `index.html` ou rode um servidor local (veja **Desenvolvimento**).

### 2. Personalize o catálogo
Todos os cursos ficam no arquivo `app.js`, na lista `MOCK_COURSES`. Para adicionar ou editar um curso, copie um bloco existente e altere os campos:

```js
{
    id: 'meu-curso',
    title: 'Nome do Curso',
    description: 'Descrição curta do curso.',
    category: 'tecnologia',
    provider: 'Instituição que oferece',
    url: 'https://link-do-curso',
    duration: '40h',
    level: 'Iniciante',
    certificate: true,
    image: null,
    featured: false,
    active: true
}
```

Categorias disponíveis: `tecnologia`, `profissionalizacao`, `gestao`, `empreendedorismo`, `saude`, `artes`, `acessibilidade`, `outros`.

### 3. Publique
Arraste a pasta para o [Netlify Drop](https://app.netlify.com/drop) ou faça upload pelo seu método preferido.

### 4. Ative as contas de usuário (opcional, mas necessário para sincronizar)
O cadastro usa **Supabase** (plano gratuito). O site continua funcionando sem ele, com progresso salvo apenas no navegador.

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings > API**, copie **Project URL** e **anon public**.
3. Cole os valores em `supabase-config.js`:
   ```js
   window.VPT_SUPABASE = {
       url: 'https://SEU-PROJETO.supabase.co',
       anonKey: 'SUA-CHAVE-ANON-PUBLICA'
   };
   ```
4. No **SQL Editor** do Supabase, execute o conteúdo de `supabase-auth.sql`.
5. Em **Authentication > URL Configuration**, configure:
   - **Site URL:** `https://vocepodetudo.netlify.app`
   - **Redirect URLs:** `https://vocepodetudo.netlify.app` e `http://localhost:8000` (para testes locais)
6. Publique o site novamente no Netlify.

A chave `anon` é pública por design; a segurança dos dados é feita pelas políticas de **Row Level Security** do arquivo SQL. Nunca use a chave `service_role` no front-end.

---

## 📁 Estrutura do Projeto

```
Você pode tudo/
├── index.html           # Página principal (Hero, Cursos, Trilhas, Recursos, Missão)
├── styles.css           # Design system completo (variáveis, componentes, responsivo)
├── app.js               # Lógica do site (catálogo, filtros, modal, favoritos, tema)
└── supabase-config.js   # URL e chave pública do Supabase
supabase-auth.sql    # Tabela user_data + políticas de segurança
vendor/              # Biblioteca supabase-js local (sem CDN)
README.md            # Este arquivo
```

---

## 🗄️ Schema do Banco (Resumo)

### `courses` — Cursos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK automático |
| `title` | TEXT | Título do curso |
| `description` | TEXT | Descrição completa |
| `category` | TEXT | Enum: 8 categorias |
| `provider` | TEXT | Instituição/provedor |
| `url` | TEXT | Link do curso |
| `duration` | TEXT | Ex: "20h" |
| `level` | TEXT | Iniciante/Intermediário/Avançado |
| `image_url` | TEXT | Imagem de capa (opcional) |
| `certificate` | BOOLEAN | Oferece certificado? |
| `featured` | BOOLEAN | Destaque no hero |
| `active` | BOOLEAN | Visível no site |
| `display_order` | INTEGER | Ordem personalizada |

### `tracks` — Trilhas
| Campo | Tipo |
|-------|------|
| `id` | UUID |
| `slug` | TEXT (único) |
| `title` | TEXT |
| `description` | TEXT |
| `icon` | TEXT |
| `courses_count` | INTEGER |
| `duration` | TEXT |
| `active` | BOOLEAN |

### `track_courses` — Junção N:M
| Campo | Tipo |
|-------|------|
| `track_id` | UUID (FK) |
| `course_id` | UUID (FK) |
| `position` | INTEGER |

### `resources` — Recursos Profissionais
| Campo | Tipo |
|-------|------|
| `id` | UUID |
| `slug` | TEXT (único) |
| `title` | TEXT |
| `description` | TEXT |
| `icon` | TEXT |
| `content` | TEXT (Markdown/HTML) |
| `category` | TEXT (enum) |

### `site_config` — Configurações
| Campo | Tipo |
|-------|------|
| `key` | TEXT (PK) |
| `value` | JSONB |
| `description` | TEXT |

---

## 🔐 Row Level Security (RLS)

- **Público**: lê apenas registros com `active = true` (courses, tracks, resources).
- **Usuários autenticados**: cada pessoa só lê e altera a própria linha em `user_data` (progresso e favoritos).
- **Escrita do catálogo**: feita diretamente no painel do Supabase (Table Editor), sem painel administrativo no site.

---

## 🎨 Design System (CSS)

### Cores (Acessíveis - Contraste 4.5:1+)
```css
--color-primary: #2563eb;      /* Blue 600 */
--color-secondary: #059669;    /* Emerald 600 */
--color-accent: #dc2626;       /* Red 600 */
--color-bg: #ffffff;
--color-bg-alt: #f8fafc;
--color-bg-dark: #0f172a;
--color-text: #1e293b;
--color-text-light: #64748b;
```

### Espaçamento (Escala 4px)
```css
--space-1: 4px  --space-4: 16px  --space-8: 32px  --space-16: 64px
```

### Breakpoints
```css
@media (max-width: 1024px)  /* Tablet */
@media (max-width: 768px)   /* Mobile */
@media (max-width: 480px)   /* Small Mobile */
```

---

## ♿ Checklist de Acessibilidade

- [x] **Skip link** para conteúdo principal
- [x] **Semântica HTML5** (header, main, section, nav, footer, article)
- [x] **ARIA labels** em elementos interativos
- [x] **Focus visible** em todos os elementos interativos
- [x] **Contraste AA** em todos os textos (4.5:1) e UI (3:1)
- [x] **Navegação por teclado** (Tab, Enter, Escape, Setas)
- [x] **Leitores de tela** (alt text, aria-live, roles)
- [x] **Reduced motion** respeitado
- [x] **Textos claros** e linguagem simples
- [x] **Zoom até 200%** sem perda de funcionalidade

---

## 🛠️ Desenvolvimento

### Executar localmente
```bash
# Opção 1: VS Code Live Server (clique direito no index.html → Open with Live Server)
# Opção 2: Python
python -m http.server 8000
# Opção 3: Node
npx serve .
# Opção 4: PHP
php -S localhost:8000
```

### Deploy Gratuito
| Plataforma | Comando |
|------------|---------|
| **Netlify** | Arraste a pasta para app.netlify.com/drop |
| **Vercel** | `npx vercel` na pasta |
| **GitHub Pages** | Push para repo → Settings → Pages |
| **Firebase Hosting** | `firebase init hosting` → `firebase deploy` |
| **Supabase Hosting** | (Em beta) `supabase projects create` |

> **Dica**: Como é HTML/CSS/JS puro, funciona em **qualquer hosting estático**.

---

## 🧪 Testando com a Comunidade

### Checklist pré-teste
- [ ] Pelo menos 10 cursos cadastrados (variadas categorias)
- [ ] Trilhas criadas e vinculadas
- [ ] Site abre no celular (teste Chrome DevTools → Device Toolbar)
- [ ] Navegação por teclado funciona (Tab, Enter, Esc)
- [ ] Leitor de tela (NVDA/VoiceOver) lê conteúdo na ordem
- [ ] Contraste OK (teste com [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/))

### Roteiro de teste com usuários
1. **"Encontre um curso de Excel"** → Testa busca/filtro
2. **"Quero aprender programação do zero"** → Testa trilha "Tecnologia"
3. **"Preciso melhorar meu currículo"** → Testa recursos + trilha
4. **"Tenho deficiência visual"** → Testa navegação teclado + leitor
5. **"Acesso pelo celular"** → Testa responsividade, touch targets

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Cursos não aparecem | Confira a lista `MOCK_COURSES` no `app.js` e o console (F12) |
| Curso não abre | Verifique se o campo `url` do curso é um link válido (https://) |
| Filtro não encontra o curso | Confira se `category` e `level` usam um dos valores permitidos |
| Imagens não carregam | Use HTTPS nas URLs de imagem; o site cria um fundo colorido automático |
| Modal não abre | Verifique se `app.js` carregou (console sem erros) |
| Tema não troca | Verifique se o navegador permite localStorage |

---

## 📝 Próximos Passos (Roadmap)

### v1.1 - Melhorias Imediatas
- [ ] Busca textual em tempo real (debounced)
- [ ] Favoritos (localStorage)
- [ ] Compartilhamento social (Web Share API)
- [ ] PWA (manifest + service worker offline)

### v1.2 - Engajamento
- [ ] Progresso do usuário (localStorage + sync opcional)
- [ ] Badges/conquistas por trilha completada
- [ ] Newsletter (Supabase Edge Function + Resend)
- [ ] Depoimentos de alunos

### v2.0 - Plataforma
- [ ] Auth real (magic link / email)
- [ ] Perfil do aluno + certificados
- [ ] Fórum/Dúvidas por curso
- [ ] Webhooks para automações (n8n, Zapier)

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona X'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra Pull Request

### Padrões de Commit
```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação (CSS, semântica)
refactor: refatoração de código
perf: performance
a11y: acessibilidade
```

---

## 📄 Licença

**MIT License** — Use livremente para fins educacionais, sociais ou comerciais.

> *Feito com propósito para democratizar o conhecimento. 💙*

---

## 🙏 Agradecimentos

- **Comunidade da igreja** — Pelo teste piloto e feedback real
- **Supabase** — Backend gratuito e generoso
- **Unsplash** — Imagens de placeholder
- **Inter Font** — Tipografia aberta e bonita
- **Lucide Icons** — Ícones SVG (referência visual)

---

## 📞 Suporte

- **Email:** [contato.vocepodetudo@gmail.com](mailto:contato.vocepodetudo@gmail.com)
- **Issues:** GitHub Issues (se versionado)
- **Comunidade:** Grupo WhatsApp/Telegram da igreja

> **Aviso:** somos um hub de cursos gratuitos. Não hospedamos os cursos — ao clicar, você é direcionado ao site oficial da instituição que os oferece.

---

> **"Simples, bonito, e com propósito real: encontrar uma oportunidade de verdade para aprender algo útil. É assim que o projeto começa a fazer diferença."**