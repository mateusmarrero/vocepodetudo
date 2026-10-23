/**
 * Você Pode Tudo - Aplicação Principal
 * Acessibilidade: WCAG 2.1 AA
 * Sem framework. Supabase JS local para contas opcionais.
 */

// ========================================
// Configuração & Constantes
// ========================================
const CONFIG = {
    supabase: { url: '', key: '' },    coursesPerPage: 9,
    categories: [
        { id: 'all', name: 'Todas as Categorias' },
        { id: 'tecnologia', name: 'Tecnologia e Informática' },
        { id: 'profissionalizacao', name: 'Profissionalização e Emprego' },
        { id: 'gestao', name: 'Gestão e Administração' },
        { id: 'empreendedorismo', name: 'Empreendedorismo' },
        { id: 'saude', name: 'Saúde e Bem-estar' },
        { id: 'artes', name: 'Artes' },
        { id: 'acessibilidade', name: 'Acessibilidade' },
        { id: 'outros', name: 'Outros Cursos' }
    ],
    tracks: [
        { id: 'primeiro-emprego', title: 'Primeiro Emprego', description: 'Do zero ao primeiro contracheque: currículo, entrevista, direitos trabalhistas e postura profissional.', icon: 'briefcase', duration: '40h', progress: 0, courses: ['como-fazer-curriculo', 'preparacao-entrevistas', 'direitos-trabalhistas', 'comunicacao-profissional', 'etiqueta-corporativa', 'financas-pessoais', 'trabalho-equipe', 'planejamento-carreira'] },
        { id: 'informatica-basica', title: 'Informática Básica', description: 'Domine o essencial: Windows, Office, internet, e-mail e segurança digital para o dia a dia.', icon: 'monitor', duration: '30h', progress: 0, courses: ['windows-basico', 'word-basico', 'excel-basico', 'powerpoint-basico', 'internet-email', 'seguranca-digital'] },
        { id: 'tecnologia', title: 'Tecnologia', description: 'Inicie na programação: lógica, Git, HTML/CSS, JavaScript, Python e fundamentos de dados.', icon: 'code', duration: '80h', progress: 0, courses: ['logica-programacao', 'git-github', 'html-css', 'javascript-basico', 'python-basico', 'banco-dados-sql', 'api-rest', 'react-basico', 'deploy-cloud', 'carreira-dev', 'hackers-nivelamento'] },
        { id: 'empreendedorismo', title: 'Empreendedorismo', description: 'Da ideia ao negócio: modelo de canvas, finanças, marketing digital, vendas e formalização.', icon: 'lightbulb', duration: '50h', progress: 0, courses: ['canvas-negocio', 'validacao-ideia', 'financas-empreendedor', 'marketing-digital', 'vendas-atendimento', 'formalizacao-mei', 'gestao-pequenos-negocios'] },
        { id: 'melhorar-curriculo', title: 'Melhorar Meu Currículo', description: 'Destaque-se no mercado: currículo ATS, LinkedIn, portfólio, carta de apresentação e networking.', icon: 'file-text', duration: '20h', progress: 0, courses: ['curriculo-ats', 'linkedin-profissional', 'portfolio-digital', 'carta-apresentacao', 'networking-efetivo'] }
    ]
};

// ========================================
// Estado da Aplicação
// ========================================
const state = {
    courses: [],
    filteredCourses: [],
    currentCategory: 'all',
    currentProvider: 'all',
    currentLevel: 'all',
    searchQuery: '',
    sortBy: 'featured',
    showFavoritesOnly: false,
    favorites: new Set(),
    progress: new Set(),
    compare: new Set(),
    displayedCount: 0,
    isLoading: false,
    supabaseClient: null,
    user: null,
    authReady: false,
    authMode: 'login',
    authBusy: false,
    authMessage: null,
    recoveryMode: false,
    cloudSyncTimer: null,
    cloudLoading: false
};

// ========================================
// Utilitários
// ========================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
}

function showToast(message, type = 'info') {
    const container = $('#toast-container') || createToastContainer();
    const toast = createElement(`
        <div class="toast toast--${type}" role="alert" aria-live="polite">
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Fechar notificação">&times;</button>
        </div>
    `);
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showLoading(el, show = true) {
    if (!el) return;
    if (show) {
        el.dataset.originalContent = el.innerHTML;
        el.innerHTML = '<span class="loading" aria-hidden="true"></span> Carregando...';
        el.disabled = true;
    } else {
        el.innerHTML = el.dataset.originalContent || '';
        el.disabled = false;
    }
}

// ========================================
// Tema (Claro / Escuro)
// ========================================
function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    const dark = theme === 'dark';

    $$('[data-theme-toggle]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(dark));
        btn.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
        btn.setAttribute('title', dark ? 'Modo claro' : 'Modo escuro');
    });

    $$('[data-theme-label]').forEach(label => {
        label.textContent = dark ? 'Claro' : 'Escuro';
    });

    $$('[data-theme-choice]').forEach(choice => {
        choice.setAttribute('aria-pressed', String(choice.dataset.themeChoice === theme));
    });

    if (persist) {
        try { localStorage.setItem('theme', theme); } catch (e) { /* modo privado */ }
    }
}

function initTheme() {
    let theme = null;
    try { theme = localStorage.getItem('theme'); } catch (e) { /* ignore */ }
    if (theme !== 'light' && theme !== 'dark') {
        theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(theme);

    $$('[data-theme-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
        });
    });

    $$('[data-theme-choice]').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice));
    });

    // Se o usuário nunca escolheu manualmente, acompanha o tema do sistema
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e) => {
            let saved = null;
            try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
            if (!saved) applyTheme(e.matches ? 'dark' : 'light', false);
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
    }
}

// ========================================
// Acessibilidade (texto, contraste, movimento)
// ========================================
const A11Y_DEFAULT = { fontScale: 100, contrast: false, reduceMotion: false, dyslexia: false };
const A11Y_FONT_STEPS = [90, 100, 110, 120, 130, 140];
let a11yPrefs = { ...A11Y_DEFAULT };

function loadA11yPrefs() {
    try {
        const raw = localStorage.getItem('vpt_a11y');
        const parsed = raw ? JSON.parse(raw) : {};
        return {
            fontScale: Number.isFinite(parsed.fontScale) ? parsed.fontScale : A11Y_DEFAULT.fontScale,
            contrast: Boolean(parsed.contrast),
            reduceMotion: Boolean(parsed.reduceMotion),
            dyslexia: Boolean(parsed.dyslexia)
        };
    } catch (e) {
        return { ...A11Y_DEFAULT };
    }
}

function saveA11yPrefs() {
    try { localStorage.setItem('vpt_a11y', JSON.stringify(a11yPrefs)); } catch (e) { /* modo privado */ }
}

function applyA11y() {
    const root = document.documentElement;

    root.style.fontSize = a11yPrefs.fontScale === 100 ? '' : a11yPrefs.fontScale + '%';

    if (a11yPrefs.contrast) root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');

    if (a11yPrefs.reduceMotion) root.setAttribute('data-reduce-motion', 'true');
    else root.removeAttribute('data-reduce-motion');

    if (a11yPrefs.dyslexia) root.setAttribute('data-dyslexia', 'true');
    else root.removeAttribute('data-dyslexia');

    const value = $('#a11y-font-value');
    if (value) value.textContent = a11yPrefs.fontScale + '%';

    const decrease = $('[data-a11y-font="decrease"]');
    const increase = $('[data-a11y-font="increase"]');
    if (decrease) decrease.disabled = a11yPrefs.fontScale <= A11Y_FONT_STEPS[0];
    if (increase) increase.disabled = a11yPrefs.fontScale >= A11Y_FONT_STEPS[A11Y_FONT_STEPS.length - 1];

    $$('[data-a11y-contrast]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(a11yPrefs.contrast));
        const stateEl = btn.querySelector('.a11y-option-state');
        if (stateEl) stateEl.textContent = a11yPrefs.contrast ? 'Ligado' : 'Desligado';
    });

    $$('[data-a11y-motion]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(a11yPrefs.reduceMotion));
        const stateEl = btn.querySelector('.a11y-option-state');
        if (stateEl) stateEl.textContent = a11yPrefs.reduceMotion ? 'Ligado' : 'Desligado';
    });
    $$('[data-a11y-dyslexia]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(a11yPrefs.dyslexia));
        const stateEl = btn.querySelector('.a11y-option-state');
        if (stateEl) stateEl.textContent = a11yPrefs.dyslexia ? 'Ligado' : 'Desligado';
    });
}

function changeFontScale(direction) {
    let index = A11Y_FONT_STEPS.indexOf(a11yPrefs.fontScale);
    if (index === -1) {
        index = A11Y_FONT_STEPS.reduce((closest, step, i) =>
            Math.abs(step - a11yPrefs.fontScale) < Math.abs(A11Y_FONT_STEPS[closest] - a11yPrefs.fontScale) ? i : closest, 1);
    }
    const next = Math.max(0, Math.min(A11Y_FONT_STEPS.length - 1, index + direction));
    a11yPrefs.fontScale = A11Y_FONT_STEPS[next];
    applyA11y();
    saveA11yPrefs();
}

function initA11y() {
    a11yPrefs = loadA11yPrefs();
    applyA11y();

    const widget = $('[data-a11y-widget]');
    const toggle = $('#a11y-toggle');
    const panel = $('#a11y-panel');
    const close = $('#a11y-close');
    if (!widget || !toggle || !panel) return;

    const openPanel = () => {
        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        panel.focus();
    };

    const closePanel = (returnFocus = true) => {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => {
        if (panel.hidden) openPanel();
        else closePanel();
    });

    if (close) close.addEventListener('click', () => closePanel());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.hidden) closePanel();
    });

    document.addEventListener('click', (e) => {
        if (panel.hidden) return;
        if (!e.target.closest('[data-a11y-widget]')) closePanel(false);
    });

    $$('[data-a11y-font]').forEach(btn => {
        btn.addEventListener('click', () => changeFontScale(btn.dataset.a11yFont === 'increase' ? 1 : -1));
    });

    $$('[data-a11y-contrast]').forEach(btn => {
        btn.addEventListener('click', () => {
            a11yPrefs.contrast = !a11yPrefs.contrast;
            applyA11y();
            saveA11yPrefs();
        });
    });

    $$('[data-a11y-motion]').forEach(btn => {
        btn.addEventListener('click', () => {
            a11yPrefs.reduceMotion = !a11yPrefs.reduceMotion;
            applyA11y();
            saveA11yPrefs();
        });
    });

    $$('[data-a11y-dyslexia]').forEach(btn => {
        btn.addEventListener('click', () => {
            a11yPrefs.dyslexia = !a11yPrefs.dyslexia;
            applyA11y();
            saveA11yPrefs();
        });
    });

    $$('[data-a11y-reset]').forEach(btn => {
        btn.addEventListener('click', () => {
            a11yPrefs = { ...A11Y_DEFAULT };
            applyA11y();
            saveA11yPrefs();
            showToast('Configurações de acessibilidade restauradas.', 'success');
        });
    });
}

function initInfoPopup() {
    const popup = $('#info-popup');
    if (!popup) return;

    const closeButtons = $$('[data-info-popup-close]', popup);
    let lastFocus = null;
    let keydownHandler = null;

    const close = () => {
        popup.hidden = true;
        document.body.style.overflow = '';
        if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    };

    const open = () => {
        lastFocus = document.activeElement;
        popup.hidden = false;
        document.body.style.overflow = 'hidden';

        keydownHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
                return;
            }
            if (e.key !== 'Tab') return;

            const focusables = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', popup)
                .filter(el => el.offsetParent !== null);
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', keydownHandler);

        const ok = $('#info-popup-ok');
        if (ok) ok.focus();
    };

    closeButtons.forEach(btn => btn.addEventListener('click', close));
    setTimeout(open, 600);
}

// ========================================
// Imagens dos cursos (placeholder offline)
// ========================================
const CATEGORY_GRADIENTS = {
    tecnologia: ['#2563eb', '#7c3aed'],
    profissionalizacao: ['#d97706', '#dc2626'],
    gestao: ['#4f46e5', '#0284c7'],
    empreendedorismo: ['#db2777', '#e11d48'],
    saude: ['#059669', '#0d9488'],
    artes: ['#9333ea', '#db2777'],
    acessibilidade: ['#e11d48', '#ea580c'],
    outros: ['#475569', '#1e293b']
};

const CATEGORY_ICONS = {
    tecnologia: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    profissionalizacao: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    gestao: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    empreendedorismo: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5a6 6 0 0 0-12 0c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    saude: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    artes: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z"/>',
    acessibilidade: '<circle cx="12" cy="4" r="2"/><path d="M19 13v-2a7 7 0 0 0-14 0v2"/><path d="M12 12v6"/><path d="M8 22l4-4 4 4"/>',
    outros: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'
};

function buildPlaceholder(course) {
    const [from, to] = CATEGORY_GRADIENTS[course.category] || CATEGORY_GRADIENTS.outros;
    const icon = CATEGORY_ICONS[course.category] || CATEGORY_ICONS.outros;
    const box = document.createElement('div');
    box.className = 'course-image course-image--generated';
    box.setAttribute('aria-hidden', 'true');
    box.style.background = `linear-gradient(135deg, ${from}, ${to})`;
    box.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
    return box;
}

function buildCourseMedia(course) {
    if (course.image && typeof course.image === 'string') {
        const img = document.createElement('img');
        img.className = 'course-image';
        img.alt = '';
        img.loading = 'lazy';
        img.src = course.image;
        img.addEventListener('error', () => {
            img.replaceWith(buildPlaceholder(course));
        }, { once: true });
        return img;
    }
    return buildPlaceholder(course);
}

// ========================================
// Inicialização do Supabase
// ========================================
async function initSupabase() {
    const cfg = window.VPT_SUPABASE || {};
    let savedUrl = (cfg.url || CONFIG.supabase.url || '').trim();
    let savedKey = (cfg.anonKey || CONFIG.supabase.key || '').trim();

    // Compatibilidade com configuração antiga salva no navegador.
    if (!savedUrl || !savedKey) {
        try {
            savedUrl = savedUrl || localStorage.getItem('supabase_url') || '';
            savedKey = savedKey || localStorage.getItem('supabase_key') || '';
        } catch (e) { /* modo privado */ }
    }

    if (!savedUrl || !savedKey || !window.supabase) return false;

    try {
        state.supabaseClient = window.supabase.createClient(savedUrl, savedKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        return true;
    } catch (e) {
        console.warn('Erro ao conectar Supabase:', e);
        return false;
    }
}

// ========================================
// Conta e sincronização (Supabase Auth)
// ========================================
function getAccountBaseUrl() {
    return window.location.origin + window.location.pathname;
}

function getDisplayName(user) {
    if (!user) return 'Minha conta';
    const metaName = user.user_metadata && user.user_metadata.full_name;
    if (metaName) return String(metaName).trim();
    if (user.email) return user.email.split('@')[0];
    return 'Minha conta';
}

function accountErrorMessage(error) {
    const msg = (error && error.message) ? String(error.message) : 'Não foi possível concluir. Tente novamente.';
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (lower.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    if (lower.includes('user already registered')) return 'Este e-mail já está cadastrado. Tente entrar.';
    if (lower.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
    if (lower.includes('weak password') || lower.includes('password is too weak')) return 'Escolha uma senha mais forte, com letras e números.';
    if (lower.includes('invalid email')) return 'Digite um e-mail válido.';
    if (lower.includes('rate limit') || lower.includes('only request this after')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (lower.includes('email address not authorized')) return 'Não foi possível enviar o e-mail. Tente novamente mais tarde.';
    if (lower.includes('network') || lower.includes('fetch')) return 'Sem conexão com o serviço de contas. Verifique sua internet.';
    return msg;
}

function updateAccountButton() {
    const btn = document.getElementById('account-button');
    const label = document.getElementById('account-button-label');
    if (!btn || !label) return;
    const logged = Boolean(state.user);
    const display = getDisplayName(state.user);
    const firstName = display.split(' ')[0];
    label.textContent = logged ? firstName : 'Entrar';
    btn.classList.toggle('account-button--logged', logged);
    btn.setAttribute('aria-label', logged
        ? `Abrir minha conta${state.user && state.user.email ? ' (' + state.user.email + ')' : ''}`
        : 'Entrar ou criar conta gratuita');
}

function isAccountModalOpen() {
    const modal = document.getElementById('account-modal');
    return Boolean(modal && !modal.hidden);
}

function openAccountModal(mode) {
    const modal = document.getElementById('account-modal');
    if (!modal) return;
    if (mode) state.authMode = mode;
    state.authMessage = null;
    renderAccountModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        const firstInput = modal.querySelector('input:not([type="hidden"])');
        const firstButton = modal.querySelector('#auth-form button[type="submit"]');
        (firstInput || firstButton || modal.querySelector('.modal-close'))?.focus();
    }, 30);
}

function closeAccountModal() {
    const modal = document.getElementById('account-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (state.recoveryMode) {
        state.recoveryMode = false;
        state.authMode = 'login';
    }
    const btn = document.getElementById('account-button');
    if (btn) btn.focus();
}

function authMessageHtml() {
    const msg = state.authMessage;
    const type = msg && msg.type ? msg.type : 'info';
    return `<p id="auth-message" class="account-message account-message--${type}" role="status" aria-live="polite">${msg ? escapeAttr(msg.text) : ''}</p>`;
}

function setAuthMessage(text, type = 'error') {
    state.authMessage = { text, type };
    const el = document.getElementById('auth-message');
    if (el) {
        el.textContent = text;
        el.className = `account-message account-message--${type}`;
    }
}

function renderAccountModal() {
    const body = document.getElementById('account-body');
    if (!body) return;

    if (!state.authReady) {
        body.innerHTML = `
            <h2 id="account-modal-title" class="sr-only">Sua conta</h2>
            <div class="account-loading" role="status">
                <span class="account-spinner" aria-hidden="true"></span>
                Verificando sua conta...
            </div>`;
        return;
    }

    if (!state.supabaseClient) {
        body.innerHTML = `
            <div class="modal-header">
                <span class="account-eyebrow">Conta gratuita</span>
                <h2 id="account-modal-title" class="modal-title">Salve seu progresso</h2>
            </div>
            <p class="account-intro">O cadastro está sendo ativado. Enquanto isso, seu progresso e seus favoritos continuam salvos neste navegador.</p>
            <p class="account-note">Em breve você poderá entrar em qualquer dispositivo e continuar de onde parou.</p>
            <div class="modal-actions">
                <button type="button" class="btn btn--secondary" data-account-close>Fechar</button>
            </div>`;
        return;
    }

    if (state.recoveryMode || state.authMode === 'recovery') {
        body.innerHTML = `
            <div class="modal-header">
                <span class="account-eyebrow">Recuperar acesso</span>
                <h2 id="account-modal-title" class="modal-title">Crie uma nova senha</h2>
                <p class="account-intro">Digite e confirme sua nova senha para voltar a acessar sua conta.</p>
            </div>
            <form id="auth-form" class="account-form" data-auth-mode="recovery">
                <div class="form-group">
                    <label class="form-label" for="auth-password">Nova senha</label>
                    <input class="form-input" id="auth-password" name="password" type="password" minlength="6" autocomplete="new-password" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="auth-password-confirm">Confirme a nova senha</label>
                    <input class="form-input" id="auth-password-confirm" name="passwordConfirm" type="password" minlength="6" autocomplete="new-password" required>
                </div>
                ${authMessageHtml()}
                <button class="btn btn--primary btn--full" type="submit">Salvar nova senha</button>
            </form>`;
        return;
    }

    if (state.user) {
        const name = getDisplayName(state.user);
        const email = state.user.email || '';
        const initial = escapeAttr(name.trim().charAt(0).toUpperCase() || 'V');
        body.innerHTML = `
            <div class="modal-header">
                <span class="account-eyebrow">Sua conta</span>
                <h2 id="account-modal-title" class="modal-title">Olá, ${escapeAttr(name.split(' ')[0])}!</h2>
                <p class="account-intro">Seu progresso está salvo na nuvem e pode ser acessado em outros dispositivos.</p>
            </div>
            <div class="account-user">
                <div class="account-avatar" aria-hidden="true">${initial}</div>
                <div class="account-user-info">
                    <strong>${escapeAttr(name)}</strong>
                    <span>${escapeAttr(email)}</span>
                </div>
            </div>
            <div class="account-stats">
                <div class="account-stat">
                    <strong>${state.progress.size}</strong>
                    <span>cursos concluídos</span>
                </div>
                <div class="account-stat">
                    <strong>${state.favorites.size}</strong>
                    <span>favoritos salvos</span>
                </div>
            </div>
            ${authMessageHtml()}
            <div class="account-actions">
                <button type="button" class="btn btn--outline btn--full" id="account-sync">Sincronizar agora</button>
                <button type="button" class="btn btn--secondary btn--full" id="account-signout">Sair da conta</button>
            </div>
            <p class="account-note">Ao sair, o progresso continua salvo neste navegador. Entre novamente para sincronizar em outro dispositivo.</p>`;
        return;
    }

    if (state.authMode === 'reset') {
        body.innerHTML = `
            <div class="modal-header">
                <span class="account-eyebrow">Recuperar acesso</span>
                <h2 id="account-modal-title" class="modal-title">Esqueci minha senha</h2>
                <p class="account-intro">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
            </div>
            <form id="auth-form" class="account-form" data-auth-mode="reset">
                <div class="form-group">
                    <label class="form-label" for="auth-email">E-mail</label>
                    <input class="form-input" id="auth-email" name="email" type="email" autocomplete="email" required>
                </div>
                ${authMessageHtml()}
                <button class="btn btn--primary btn--full" type="submit">Enviar link de recuperação</button>
                <button type="button" class="account-link" data-auth-tab="login">Voltar para entrar</button>
            </form>`;
        return;
    }

    const isSignup = state.authMode === 'signup';
    body.innerHTML = `
        <div class="modal-header">
            <span class="account-eyebrow">Conta gratuita</span>
            <h2 id="account-modal-title" class="modal-title">${isSignup ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
            <p class="account-intro">${isSignup
                ? 'Salve seu progresso na nuvem e continue de onde parou em qualquer dispositivo.'
                : 'Acesse seu progresso, favoritos e continue seus estudos de onde parou.'}</p>
        </div>
        <div class="account-tabs" role="group" aria-label="Entrar ou criar conta">
            <button type="button" class="account-tab" data-auth-tab="login" aria-pressed="${!isSignup}">Entrar</button>
            <button type="button" class="account-tab" data-auth-tab="signup" aria-pressed="${isSignup}">Criar conta</button>
        </div>
        <form id="auth-form" class="account-form" data-auth-mode="${isSignup ? 'signup' : 'login'}">
            ${isSignup ? `
            <div class="form-group">
                <label class="form-label" for="auth-name">Nome (opcional)</label>
                <input class="form-input" id="auth-name" name="name" type="text" autocomplete="name" maxlength="80" placeholder="Como quer ser chamado(a)?">
            </div>` : ''}
            <div class="form-group">
                <label class="form-label" for="auth-email">E-mail</label>
                <input class="form-input" id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" required>
            </div>
            <div class="form-group">
                <label class="form-label" for="auth-password">Senha</label>
                <input class="form-input" id="auth-password" name="password" type="password" minlength="6" autocomplete="${isSignup ? 'new-password' : 'current-password'}" required>
                ${isSignup ? '<span class="form-hint">Mínimo de 6 caracteres.</span>' : ''}
            </div>
            ${authMessageHtml()}
            <button class="btn btn--primary btn--full" type="submit">${isSignup ? 'Criar conta gratuita' : 'Entrar'}</button>
            ${!isSignup ? '<button type="button" class="account-link" id="auth-forgot">Esqueci minha senha</button>' : ''}
        </form>
        <p class="account-note">${isSignup
            ? 'Ao criar a conta, você concorda em salvar seu nome, e-mail, progresso e favoritos para sincronização. Não enviamos spam.'
            : 'Seus dados ficam protegidos. O progresso salvo neste navegador será unido ao da sua conta.'}</p>`;
}

async function loadCloudData(showFeedback = false) {
    if (!state.supabaseClient || !state.user || state.cloudLoading) return;
    state.cloudLoading = true;
    try {
        const { data, error } = await state.supabaseClient
            .from('user_data')
            .select('progress,favorites')
            .eq('user_id', state.user.id)
            .maybeSingle();

        if (error) throw error;

        const cloudProgress = new Set(Array.isArray(data && data.progress) ? data.progress : []);
        const cloudFavorites = new Set(Array.isArray(data && data.favorites) ? data.favorites : []);
        const localProgress = [...state.progress];
        const localFavorites = [...state.favorites];

        state.progress = new Set([...cloudProgress, ...localProgress]);
        state.favorites = new Set([...cloudFavorites, ...localFavorites]);

        const hasNewProgress = localProgress.some(id => !cloudProgress.has(id));
        const hasNewFavorites = localFavorites.some(id => !cloudFavorites.has(id));

        persistProgressLocal();
        persistFavoritesLocal();
        updateProgressUI();
        updateFavoritesUI();
        renderTracks();
        if (state.showFavoritesOnly) applyFilters();

        if (!data || hasNewProgress || hasNewFavorites) {
            await saveCloudData();
        }

        if (showFeedback) showToast('Progresso sincronizado!', 'success');
    } catch (e) {
        console.warn('Erro ao sincronizar dados:', e);
        if (showFeedback) showToast('Não foi possível sincronizar agora. Tente novamente.', 'error');
    } finally {
        state.cloudLoading = false;
        if (isAccountModalOpen()) renderAccountModal();
    }
}

async function saveCloudData() {
    if (!state.supabaseClient || !state.user) return false;
    try {
        const { error } = await state.supabaseClient
            .from('user_data')
            .upsert({
                user_id: state.user.id,
                progress: [...state.progress],
                favorites: [...state.favorites],
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn('Erro ao salvar dados na nuvem:', e);
        return false;
    }
}

function scheduleCloudSync() {
    if (!state.user || !state.supabaseClient) return;
    if (state.cloudSyncTimer) clearTimeout(state.cloudSyncTimer);
    state.cloudSyncTimer = setTimeout(() => {
        state.cloudSyncTimer = null;
        saveCloudData();
    }, 600);
}

async function initAuth() {
    state.authReady = false;
    updateAccountButton();

    window.addEventListener('online', () => {
        if (state.user && state.supabaseClient) saveCloudData();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && state.user && state.supabaseClient) saveCloudData();
    });

    if (!state.supabaseClient) {
        state.authReady = true;
        updateAccountButton();
        return;
    }

    // Registra o listener antes de getSession para não perder eventos como PASSWORD_RECOVERY.
    state.supabaseClient.auth.onAuthStateChange((event, session) => {
        state.user = session ? session.user : null;
        state.authReady = true;
        state.authBusy = false;

        if (event === 'PASSWORD_RECOVERY') {
            state.recoveryMode = true;
            state.authMode = 'recovery';
            openAccountModal('recovery');
            return;
        }

        if (event === 'SIGNED_OUT') {
            state.authMessage = null;
            updateAccountButton();
            if (isAccountModalOpen()) renderAccountModal();
            return;
        }

        if (state.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
            setTimeout(() => {
                loadCloudData().then(() => {
                    updateAccountButton();
                    if (isAccountModalOpen()) renderAccountModal();
                });
            }, 0);
        } else {
            updateAccountButton();
            if (isAccountModalOpen()) renderAccountModal();
        }
    });

    try {
        const { data, error } = await state.supabaseClient.auth.getSession();
        if (error) throw error;
        state.user = data.session ? data.session.user : null;
        state.authReady = true;

        if (state.user) await loadCloudData();
        updateAccountButton();
        if (isAccountModalOpen()) renderAccountModal();
    } catch (e) {
        console.warn('Erro ao verificar sessão:', e);
        state.authReady = true;
        updateAccountButton();
        if (isAccountModalOpen()) renderAccountModal();
    }
}

function setAuthBusy(form, busy) {
    if (!form) return;
    state.authBusy = busy;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
        submit.disabled = busy;
        if (!submit.dataset.originalText) submit.dataset.originalText = submit.textContent;
        submit.textContent = busy ? 'Aguarde...' : submit.dataset.originalText;
    }
}

async function handleAuthSubmit(form) {
    if (!form || !state.supabaseClient || state.authBusy) return;
    const mode = form.dataset.authMode;
    const emailEl = form.querySelector('[name="email"]');
    const passwordEl = form.querySelector('[name="password"]');
    const nameEl = form.querySelector('[name="name"]');
    const confirmEl = form.querySelector('[name="passwordConfirm"]');

    if (emailEl && !emailEl.value.trim()) {
        emailEl.focus();
        setAuthMessage('Digite seu e-mail.', 'error');
        return;
    }

    if ((mode === 'login' || mode === 'signup' || mode === 'recovery') && passwordEl && passwordEl.value.length < 6) {
        passwordEl.focus();
        setAuthMessage('A senha precisa ter pelo menos 6 caracteres.', 'error');
        return;
    }

    if (mode === 'recovery' && confirmEl && passwordEl.value !== confirmEl.value) {
        confirmEl.focus();
        setAuthMessage('As senhas não coincidem.', 'error');
        return;
    }

    setAuthBusy(form, true);
    state.authMessage = null;

    try {
        if (mode === 'signup') {
            const { data, error } = await state.supabaseClient.auth.signUp({
                email: emailEl.value.trim(),
                password: passwordEl.value,
                options: {
                    data: { full_name: nameEl ? nameEl.value.trim() : '' },
                    emailRedirectTo: getAccountBaseUrl()
                }
            });
            if (error) throw error;

            if (data.session) {
                state.user = data.user;
                state.authMessage = { text: 'Conta criada! Seu progresso será sincronizado.', type: 'success' };
                await loadCloudData();
                showToast('Conta criada com sucesso!', 'success');
            } else {
                state.authMode = 'login';
                state.authMessage = { text: 'Conta criada! Confirme seu e-mail para entrar.', type: 'success' };
                renderAccountModal();
            }
        } else if (mode === 'login') {
            const { error } = await state.supabaseClient.auth.signInWithPassword({
                email: emailEl.value.trim(),
                password: passwordEl.value
            });
            if (error) throw error;
            state.authMessage = { text: 'Login realizado com sucesso!', type: 'success' };
            closeAccountModal();
            showToast('Bem-vindo(a) de volta!', 'success');
        } else if (mode === 'reset') {
            const { error } = await state.supabaseClient.auth.resetPasswordForEmail(emailEl.value.trim(), {
                redirectTo: getAccountBaseUrl()
            });
            if (error) throw error;
            state.authMode = 'login';
            state.authMessage = { text: 'Enviamos um link de recuperação para seu e-mail.', type: 'success' };
            renderAccountModal();
        } else if (mode === 'recovery') {
            const { error } = await state.supabaseClient.auth.updateUser({ password: passwordEl.value });
            if (error) throw error;
            state.recoveryMode = false;
            state.authMode = 'login';
            state.authMessage = { text: 'Senha atualizada! Você já está conectado(a).', type: 'success' };
            renderAccountModal();
            showToast('Senha atualizada com sucesso!', 'success');
        }
    } catch (e) {
        setAuthMessage(accountErrorMessage(e), 'error');
    } finally {
        state.authBusy = false;
        if (form.isConnected) setAuthBusy(form, false);
    }
}

function initAccount() {
    const accountBtn = document.getElementById('account-button');
    if (accountBtn) {
        accountBtn.addEventListener('click', () => openAccountModal());
    }

    document.addEventListener('click', async (e) => {
        const openLink = e.target.closest('[data-open-account]');
        if (openLink) {
            e.preventDefault();
            openAccountModal();
            return;
        }

        const closeBtn = e.target.closest('[data-account-close]');
        if (closeBtn) {
            e.preventDefault();
            closeAccountModal();
            return;
        }

        const tab = e.target.closest('[data-auth-tab]');
        if (tab && tab.dataset.authTab) {
            e.preventDefault();
            state.authMode = tab.dataset.authTab;
            state.authMessage = null;
            renderAccountModal();
            const first = document.querySelector('#account-body input');
            if (first) first.focus();
            return;
        }

        if (e.target.closest('#auth-forgot')) {
            e.preventDefault();
            state.authMode = 'reset';
            state.authMessage = null;
            renderAccountModal();
            const input = document.querySelector('#auth-email');
            if (input) input.focus();
            return;
        }

        if (e.target.closest('#account-signout')) {
            e.preventDefault();
            try {
                await state.supabaseClient.auth.signOut();
                state.user = null;
                state.authMessage = null;
                closeAccountModal();
                showToast('Você saiu da conta. Seu progresso local foi mantido.', 'info');
            } catch (err) {
                showToast('Não foi possível sair agora. Tente novamente.', 'error');
            }
            return;
        }

        if (e.target.closest('#account-sync')) {
            e.preventDefault();
            const btn = e.target.closest('#account-sync');
            btn.disabled = true;
            btn.textContent = 'Sincronizando...';
            await loadCloudData(true);
            if (btn.isConnected) {
                btn.disabled = false;
                btn.textContent = 'Sincronizar agora';
            }
            return;
        }
    });

    document.addEventListener('submit', (e) => {
        if (e.target && e.target.id === 'auth-form') {
            e.preventDefault();
            handleAuthSubmit(e.target);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isAccountModalOpen()) {
            closeAccountModal();
        }
    });
}

// ========================================
// Favoritos (localStorage)
// ========================================
function loadFavorites() {
    try {
        const raw = localStorage.getItem('vpt_favorites');
        const ids = raw ? JSON.parse(raw) : [];
        state.favorites = new Set(Array.isArray(ids) ? ids : []);
    } catch (e) {
        state.favorites = new Set();
    }
    updateFavoritesUI();
}

function loadProgress() {
    try {
        const raw = localStorage.getItem('vpt_progress');
        const ids = raw ? JSON.parse(raw) : [];
        state.progress = new Set(Array.isArray(ids) ? ids : []);
    } catch (e) {
        state.progress = new Set();
    }
}

function persistProgressLocal() {
    try { localStorage.setItem('vpt_progress', JSON.stringify([...state.progress])); } catch (e) { /* modo privado */ }
}

function persistProgress() {
    persistProgressLocal();
    scheduleCloudSync();
}
function exportUserData() {
    const data = {
        favorites: [...state.favorites],
        progress: [...state.progress],
        theme: (function(){ try { return localStorage.getItem('theme'); } catch(e){ return null; } })(),
        a11y: (function(){ try { return JSON.parse(localStorage.getItem('vpt_a11y') || '{}'); } catch(e){ return {}; } })()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voce-pode-tudo-dados.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Dados exportados com sucesso!', 'success');
}

function importUserData(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (Array.isArray(data.favorites)) {
                state.favorites = new Set(data.favorites);
                persistFavorites();
            }
            if (Array.isArray(data.progress)) {
                state.progress = new Set(data.progress);
                persistProgress();
            }
            if (data.theme === 'light' || data.theme === 'dark') {
                try { localStorage.setItem('theme', data.theme); } catch(e){}
                applyTheme(data.theme);
            }
            if (data.a11y && typeof data.a11y === 'object') {
                try { localStorage.setItem('vpt_a11y', JSON.stringify(data.a11y)); } catch(e){}
            }
            updateFavoritesUI();
            updateProgressUI();
            renderTracks();
            applyFilters();
            showToast('Dados importados com sucesso!', 'success');
        } catch (e) {
            showToast('Arquivo inválido. Use um JSON exportado pelo site.', 'error');
        }
    };
    reader.readAsText(file);
}

function initUserData() {
    const exportBtn = document.getElementById('export-data');
    const importBtn = document.getElementById('import-data');
    const fileInput = document.getElementById('import-file');
    if (exportBtn) exportBtn.addEventListener('click', exportUserData);
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) importUserData(file);
            e.target.value = '';
        });
    }
}


function isCompleted(id) {
    return state.progress.has(id);
}

function toggleProgress(id) {
    if (state.progress.has(id)) state.progress.delete(id);
    else state.progress.add(id);
    persistProgress();
    updateProgressUI();
    renderTracks();
}

function updateProgressUI() {
    $$('.progress-btn').forEach(btn => {
        const id = btn.dataset.progressId;
        const active = state.progress.has(id);
        btn.setAttribute('aria-pressed', String(active));
        btn.textContent = active ? 'Concluído ✓' : 'Marcar como concluído';
        btn.classList.toggle('progress-btn--done', active);
    });
}

function persistFavoritesLocal() {
    try {
        localStorage.setItem('vpt_favorites', JSON.stringify([...state.favorites]));
    } catch (e) { /* modo privado */ }
}

function persistFavorites() {
    persistFavoritesLocal();
    scheduleCloudSync();
}

function isFavorite(id) {
    return state.favorites.has(id);
}

function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    persistFavorites();
    updateFavoritesUI();
    if (state.showFavoritesOnly) applyFilters();
}

function updateFavoritesUI() {
    const countEl = $('#favorites-count');
    if (countEl) countEl.textContent = state.favorites.size;

    const filterBtn = $('#favorites-filter');
    if (filterBtn) filterBtn.setAttribute('aria-pressed', String(state.showFavoritesOnly));

    $$('.favorite-btn').forEach(btn => {
        const id = btn.dataset.favoriteId;
        const active = state.favorites.has(id);
        const title = btn.dataset.courseTitle || 'curso';
        btn.setAttribute('aria-pressed', String(active));
        btn.setAttribute('aria-label', `${active ? 'Remover' : 'Adicionar'} ${title} ${active ? 'dos' : 'aos'} favoritos`);
    });
}

// ========================================
// Compartilhamento
// ========================================
async function shareCourse(course) {
    let url = course.url;
    try { url = new URL(course.url, window.location.href).href; } catch (e) { /* mantém */ }

    const text = `${course.title} — curso gratuito (${course.provider}). Aprenda. Desenvolva. Conquiste.`;
    const shareData = { title: `${course.title} | Você Pode Tudo`, text, url };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
            return;
        }
    } catch (err) {
        if (err && err.name === 'AbortError') return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(`${text}\n${url}`);
            showToast('Link copiado para a área de transferência!', 'success');
            return;
        }
    } catch (e) { /* tenta fallback */ }

    window.prompt('Copie o link do curso:', url);
}

// ========================================
// Catálogo de cursos gratuitos (Brasil)
// ========================================
const MOCK_COURSES = [
    // ---------- Tecnologia ----------
    { id: 'logica-programacao', title: 'Lógica de Programação e Algoritmos', description: 'Aprenda os fundamentos: variáveis, condicionais, laços e algoritmos. Base para qualquer linguagem de programação.', category: 'tecnologia', provider: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/curso/curso-de-algoritmo/', duration: '40h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'html-css', title: 'HTML5 e CSS3 na Prática', description: 'Crie sites responsivos do zero: semântica, Flexbox, Grid, cores, fontes e boas práticas de acessibilidade.', category: 'tecnologia', provider: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/curso/html5-css3-modulo-1/', duration: '40h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'javascript-basico', title: 'JavaScript para Iniciantes', description: 'Variáveis, funções, DOM, eventos e lógica assíncrona. O passo essencial para criar páginas interativas.', category: 'tecnologia', provider: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/curso/javascript/', duration: '40h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'python-basico', title: 'Python 3 do Zero', description: 'Sintaxe, estruturas de dados, funções e projetos práticos. Ideal para quem nunca programou na vida.', category: 'tecnologia', provider: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/curso/python-3-mundo-1/', duration: '40h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'git-github', title: 'Git e GitHub Essencial', description: 'Controle de versão, commits, branches, pull requests e publicação de projetos no GitHub.', category: 'tecnologia', provider: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/curso/curso-de-git-e-github/', duration: '20h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'banco-dados-sql', title: 'Banco de Dados e SQL', description: 'Modelagem, tabelas, consultas SELECT, JOINs e boas práticas para guardar e consultar informações.', category: 'tecnologia', provider: 'Curso em Vídeo', url: 'https://www.cursoemvideo.com/curso/mysql/', duration: '30h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'api-rest', title: 'APIs REST na Prática', description: 'Entenda HTTP, verbos, status codes, JSON e como consumir/criar APIs para integrar sistemas.', category: 'tecnologia', provider: 'DIO', url: 'https://www.dio.me/', duration: '15h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'react-basico', title: 'React: Primeiros Passos', description: 'Componentes, props, state e hooks. Construa interfaces modernas com a biblioteca mais usada do mercado.', category: 'tecnologia', provider: 'DIO', url: 'https://www.dio.me/', duration: '25h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'deploy-cloud', title: 'Deploy e Cloud Computing', description: 'Publique seu projeto na internet: hospedagem estática, variáveis de ambiente e fundamentos de nuvem.', category: 'tecnologia', provider: 'AWS Skill Builder', url: 'https://skillbuilder.aws/', duration: '20h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'carreira-dev', title: 'Carreira em Tecnologia', description: 'Como entrar na área: trilhas, portfólio, LinkedIn, processos seletivos e primeiras oportunidades.', category: 'tecnologia', provider: 'DIO', url: 'https://www.dio.me/', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'dio-bootcamp', title: 'Bootcamps Gratuitos DIO', description: 'Trilhas intensivas em parceria com empresas: Java, Python, Cloud, Dados e muito mais.', category: 'tecnologia', provider: 'DIO', url: 'https://www.dio.me/bootcamp', duration: '80h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'redes-cisco', title: 'Introdução a Redes', description: 'Fundamentos de redes, protocolos, IP e segurança — curso oficial da Cisco Networking Academy.', category: 'tecnologia', provider: 'Cisco Networking Academy', url: 'https://www.netacad.com/courses/networking', duration: '70h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'hackers-nivelamento', title: 'Hackers do Bem: Nivelamento em Cibersegurança', description: 'Comece do zero: hardware, redes, internet, Windows, Linux e lógica de programação. Formação gratuita do MCTI e da RNP.', category: 'tecnologia', provider: 'Hackers do Bem (RNP/MCTI)', url: 'https://hackersdobem.org.br/', duration: '80h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'hackers-basico', title: 'Hackers do Bem: Cibersegurança Básico', description: 'Ameaças, vulnerabilidades, criptografia, computação em nuvem e GRC, com certificado reconhecido e acesso ao Hub de vagas.', category: 'tecnologia', provider: 'Hackers do Bem (RNP/MCTI)', url: 'https://hackersdobem.org.br/', duration: '64h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'hackers-especializado', title: 'Hackers do Bem: Especialização em Cibersegurança', description: 'Red Team, Blue Team, DevSecOps, resposta a incidentes e GRC com laboratórios práticos, simuladores e residência tecnológica.', category: 'tecnologia', provider: 'Hackers do Bem (RNP/MCTI)', url: 'https://hackersdobem.org.br/', duration: '96h', level: 'Avançado', certificate: true, image: null, featured: false, active: true },
    { id: 'ia-microsoft', title: 'Fundamentos de Inteligência Artificial', description: 'Conceitos de IA, machine learning e uso responsável — trilha oficial e gratuita da Microsoft.', category: 'tecnologia', provider: 'Microsoft Learn', url: 'https://learn.microsoft.com/pt-br/training/paths/ai-fundamentals/', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // ---------- Profissionalização ----------
    { id: 'windows-basico', title: 'Windows e Uso do Computador', description: 'Arquivos, pastas, atalhos, configurações e tarefas essenciais do dia a dia no computador.', category: 'profissionalizacao', provider: 'Fundação Bradesco', url: 'https://www.ev.org.br/', duration: '12h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'word-basico', title: 'Microsoft Word do Básico ao Útil', description: 'Formatação, tabelas, imagens, mala direta e documentos profissionais prontos para o trabalho.', category: 'profissionalizacao', provider: 'Fundação Bradesco', url: 'https://www.ev.org.br/cursos/microsoft-word-2016-basico', duration: '20h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'excel-basico', title: 'Microsoft Excel do Básico ao Intermediário', description: 'Fórmulas, funções, tabelas dinâmicas, gráficos e automação de planilhas para o mercado de trabalho.', category: 'profissionalizacao', provider: 'Fundação Bradesco', url: 'https://www.ev.org.br/cursos/microsoft-excel-2016-basico', duration: '25h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'powerpoint-basico', title: 'PowerPoint para Apresentações', description: 'Slides claros e profissionais: estrutura, design, transições e dicas para apresentar sem medo.', category: 'profissionalizacao', provider: 'Fundação Bradesco', url: 'https://www.ev.org.br/cursos/microsoft-powerpoint-2016-basico', duration: '15h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'internet-email', title: 'Internet, E-mail e Cidadania Digital', description: 'Navegação segura, pesquisa, e-mail, armazenamento em nuvem e serviços públicos online.', category: 'profissionalizacao', provider: 'Escola Virtual Gov', url: 'https://www.escolavirtual.gov.br/', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'seguranca-digital', title: 'Segurança Digital e Proteção de Dados', description: 'Senhas fortes, golpes comuns, phishing e como proteger sua vida digital e seus dados pessoais.', category: 'profissionalizacao', provider: 'Escola Virtual Gov', url: 'https://www.escolavirtual.gov.br/', duration: '12h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'como-fazer-curriculo', title: 'Como Fazer um Currículo Profissional', description: 'Modelos ATS-friendly, palavras-chave, formatação, erros comuns e como adaptar para cada vaga.', category: 'profissionalizacao', provider: 'Você Pode Tudo', url: '#recursos', duration: '3h', level: 'Iniciante', certificate: false, image: null, featured: true, active: true },
    { id: 'preparacao-entrevistas', title: 'Preparação Completa para Entrevistas', description: 'Perguntas comportamentais (STAR), linguagem corporal, perguntas para o recrutador e simulações.', category: 'profissionalizacao', provider: 'Você Pode Tudo', url: '#recursos', duration: '5h', level: 'Iniciante', certificate: false, image: null, featured: false, active: true },
    { id: 'direitos-trabalhistas', title: 'Direitos Trabalhistas Básicos', description: 'CLT, contrato, jornada, férias, 13º, FGTS e o que fazer em caso de assédio ou demissão.', category: 'profissionalizacao', provider: 'Escola Virtual Gov', url: 'https://www.escolavirtual.gov.br/', duration: '15h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'comunicacao-profissional', title: 'Comunicação no Ambiente de Trabalho', description: 'Fala, escrita, escuta ativa, feedback e comunicação não violenta para se destacar profissionalmente.', category: 'profissionalizacao', provider: 'Escola Virtual Gov', url: 'https://www.escolavirtual.gov.br/', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'etiqueta-corporativa', title: 'Postura e Etiqueta Profissional', description: 'Pontualidade, vestimenta, convivência, reuniões e comportamento ético no ambiente corporativo.', category: 'profissionalizacao', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '6h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'trabalho-equipe', title: 'Trabalho em Equipe e Colaboração', description: 'Papéis, conflitos, confiança e ferramentas para colaborar bem em qualquer equipe.', category: 'profissionalizacao', provider: 'Fundação Bradesco', url: 'https://www.ev.org.br/', duration: '8h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'planejamento-carreira', title: 'Planejamento de Carreira', description: 'Defina objetivos, mapeie habilidades, crie um plano de 5 anos e acompanhe seu progresso.', category: 'profissionalizacao', provider: 'Fundação Estudar', url: 'https://www.napratica.org.br/', duration: '8h', level: 'Iniciante', certificate: false, image: null, featured: false, active: true },
    { id: 'financas-pessoais', title: 'Educação Financeira e Controle de Gastos', description: 'Orçamento familiar, reserva de emergência, dívidas e planejamento de metas financeiras.', category: 'profissionalizacao', provider: 'Banco Central do Brasil', url: 'https://www.bcb.gov.br/cidadaniafinanceira', duration: '12h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'educacao-financeira', title: 'Cidadania Financeira na Prática', description: 'Consumo consciente, crédito, investimentos básicos e prevenção à inadimplência.', category: 'profissionalizacao', provider: 'Banco Central do Brasil', url: 'https://www.bcb.gov.br/cidadaniafinanceira', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // ---------- Gestão ----------
    { id: 'gestao-projetos-fgv', title: 'Gestão de Projetos', description: 'Escopo, cronograma, riscos, equipe e entrega. Métodos tradicionais e ágeis na prática.', category: 'gestao', provider: 'FGV Educação Executiva', url: 'https://educacao-executiva.fgv.br/cursos/gratuitos', duration: '30h', level: 'Intermediário', certificate: true, image: null, featured: true, active: true },
    { id: 'administracao-fgv', title: 'Fundamentos de Administração', description: 'Planejamento, organização, direção e controle: a base para gerir qualquer negócio ou equipe.', category: 'gestao', provider: 'FGV Educação Executiva', url: 'https://educacao-executiva.fgv.br/cursos/gratuitos', duration: '40h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'lideranca-sebrae', title: 'Liderança e Gestão de Pessoas', description: 'Estilos de liderança, motivação, delegação e desenvolvimento de equipes de alta performance.', category: 'gestao', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '8h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'power-bi', title: 'Power BI para Análise de Dados', description: 'Importe dados, crie relatórios e dashboards interativos para tomar decisões com base em números.', category: 'gestao', provider: 'Microsoft Learn', url: 'https://learn.microsoft.com/pt-br/training/paths/introduction-power-bi/', duration: '15h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },

    // ---------- Empreendedorismo ----------
    { id: 'canvas-negocio', title: 'Business Model Canvas na Prática', description: 'Valide sua ideia de negócio: 9 blocos do canvas, proposta de valor, canais, receitas e custos.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '15h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'validacao-ideia', title: 'Validação de Ideia de Negócio', description: 'Entrevistas com clientes, MVP, testes rápidos e como saber se sua ideia realmente tem mercado.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'financas-empreendedor', title: 'Finanças para Empreendedores', description: 'Fluxo de caixa, precificação, custos fixos e variáveis, lucro e planejamento financeiro.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '15h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'marketing-digital', title: 'Marketing Digital para Pequenos Negócios', description: 'Redes sociais, tráfego pago, e-mail marketing, conteúdo, SEO local e métricas para vender mais.', category: 'empreendedorismo', provider: 'Google Ateliê Digital', url: 'https://learndigital.withgoogle.com/ateliedigital', duration: '40h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'vendas-atendimento', title: 'Vendas e Atendimento ao Cliente', description: 'Técnicas de venda ética, escuta do cliente, objeções, pós-venda e fidelização.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'formalizacao-mei', title: 'Como Formalizar seu MEI', description: 'Passo a passo para abrir o MEI, obrigações, impostos, benefícios e quando migrar de categoria.', category: 'empreendedorismo', provider: 'Gov.br', url: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor', duration: '6h', level: 'Iniciante', certificate: false, image: null, featured: false, active: true },
    { id: 'gestao-pequenos-negocios', title: 'Gestão de Pequenos Negócios', description: 'Rotina do negócio, compras, estoque, equipe, indicadores e ferramentas de gestão simples.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '12h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },

    // ---------- Saúde e Bem-estar ----------
    { id: 'primeiros-socorros', title: 'Primeiros Socorros Básicos', description: 'RCP, engasgo, queimaduras, fraturas, sangramentos e quando acionar o SAMU (192).', category: 'saude', provider: 'Cruz Vermelha Brasileira', url: 'https://www.cruzvermelha.org.br/', duration: '8h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'saude-mental', title: 'Saúde Mental e Bem-estar', description: 'Ansiedade, estresse, sono, autocuidado e quando buscar ajuda profissional. Linguagem acolhedora.', category: 'saude', provider: 'Fiocruz', url: 'https://campusvirtual.fiocruz.br/', duration: '20h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'alimentacao-saudavel', title: 'Alimentação Saudável e Economia Doméstica', description: 'Montagem de pratos equilibrados, aproveitamento integral dos alimentos e compras inteligentes.', category: 'saude', provider: 'Escola Virtual Gov', url: 'https://www.escolavirtual.gov.br/', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // ---------- Artes ----------
    { id: 'fotografia', title: 'Introdução à Fotografia', description: 'Enquadramento, luz, composição e uso do celular para fotos profissionais.', category: 'artes', provider: 'Cursa', url: 'https://cursa.app/pt', duration: '15h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'desenho', title: 'Desenho para Iniciantes', description: 'Formas básicas, perspectiva, sombra e luz: perca o medo de desenhar e desenvolva seu traço.', category: 'artes', provider: 'Cursa', url: 'https://cursa.app/pt', duration: '12h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'producao-video', title: 'Produção de Vídeo com o Celular', description: 'Roteiro, gravação, iluminação, áudio e edição para criar vídeos que comunicam bem.', category: 'artes', provider: 'Cursa', url: 'https://cursa.app/pt', duration: '18h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // ---------- Acessibilidade ----------
    { id: 'libras-basico', title: 'Libras Básico: Comunicação Inclusiva', description: 'Alfabeto manual, saudações, vocabulário e cultura surda para um atendimento realmente inclusivo.', category: 'acessibilidade', provider: 'INES / Gov.br', url: 'https://www.gov.br/ines/pt-br', duration: '30h', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'tecnologia-assistiva', title: 'Tecnologia Assistiva e Inclusão', description: 'Recursos, softwares e práticas que ampliam autonomia de pessoas com deficiência.', category: 'acessibilidade', provider: 'Escola Virtual Gov', url: 'https://www.escolavirtual.gov.br/', duration: '25h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // ---------- Outros ----------
    { id: 'ingles-basico', title: 'Inglês Básico Gratuito', description: 'Vocabulário, frases do dia a dia, listening e prática diária gamificada — direto no celular.', category: 'outros', provider: 'Duolingo', url: 'https://pt.duolingo.com/', duration: '40h', level: 'Iniciante', certificate: false, image: null, featured: true, active: true },
    { id: 'espanhol-basico', title: 'Espanhol Básico Gratuito', description: 'Aprenda espanhol com lições curtas e práticas para viagens, trabalho e conversação.', category: 'outros', provider: 'Duolingo', url: 'https://pt.duolingo.com/', duration: '40h', level: 'Iniciante', certificate: false, image: null, featured: false, active: true },
    { id: 'escrita-profissional', title: 'Escrita Profissional e Redação', description: 'E-mails, relatórios e mensagens claras: escreva com objetividade e boa gramática.', category: 'outros', provider: 'FGV Educação Executiva', url: 'https://educacao-executiva.fgv.br/cursos/gratuitos', duration: '20h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true }
,
    // ---------- Adicionados automaticamente ----------

    // Tecnologia (adicionais)
    { id: 'ifsp-banco-dados', title: 'Descomplicando Banco de Dados', description: 'Fundamentos de bancos de dados e SQL do zero, com exemplos práticos e exercícios orientados ao mercado.', category: 'tecnologia', provider: 'IFSP - Cursos Mooc', url: 'https://cursosmooc.itp.ifsp.edu.br/', duration: '20h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ifsp-java-logica', title: 'Introdução à Lógica de Programação com Java', description: 'Aprenda lógica de programação usando Java com foco em algoritmos, estruturas condicionais e de repetição.', category: 'tecnologia', provider: 'IFSP - Cursos Mooc', url: 'https://cursosmooc.itp.ifsp.edu.br/', duration: '20h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ifsp-ia-educacao', title: 'Letramento em Inteligência Artificial na Educação', description: 'Uso crítico e responsável da IA generativa no contexto educacional, com enfoque em ética, letramento digital e aplicabilidade.', category: 'tecnologia', provider: 'IFSP - Cursos Mooc', url: 'https://cursosmooc.itp.ifsp.edu.br/', duration: '20h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ios-programacao-web', title: 'Programação Web', description: 'Formação gratuita em Programação Web: HTML, CSS, JavaScript, lógica e desenvolvimento prático com acompanhamento para o mercado.', category: 'tecnologia', provider: 'IOS - Instituto da Oportunidade Social', url: 'https://ios.org.br/', duration: '5 meses', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ios-suporte-ti', title: 'Suporte em TI', description: 'Sistemas operacionais, redes, hardware, software, atendimento e resolução de problemas para primeira oportunidade na área de TI.', category: 'tecnologia', provider: 'IOS - Instituto da Oportunidade Social', url: 'https://ios.org.br/', duration: '5 meses', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ios-ciberseguranca', title: 'Cibersegurança', description: 'Fundamentos de segurança da informação, ameaças, boas práticas, LGPD, prevenção e resposta a incidentes com enfoque prático.', category: 'tecnologia', provider: 'IOS - Instituto da Oportunidade Social', url: 'https://ios.org.br/', duration: '5 meses', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'ios-dados-ia', title: 'Análise de Dados e IA aplicada à Sustentabilidade', description: 'Introdução à análise de dados, indicadores, inteligência artificial aplicada e projetos com impacto socioambiental.', category: 'tecnologia', provider: 'IOS - Instituto da Oportunidade Social', url: 'https://ios.org.br/', duration: '5 meses', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'recode-transforma-futuros', title: 'Transforma Futuros (Programação, Dados e IA)', description: 'Formação gratuita e inclusiva com metodologia ativa, mentoria, projetos práticos e certificação. Foco em empregabilidade tech.', category: 'tecnologia', provider: 'Recode', url: 'https://recode.org.br/transforma-futuros', duration: '300h', level: 'Intermediário', certificate: true, image: null, featured: true, active: true },
    { id: 'recode-fluencia-ia', title: 'Trilha FluêncIA', description: 'Capacitação em Inteligência Artificial Generativa: uso crítico, ética, produtividade e aplicabilidade no trabalho e nos negócios.', category: 'tecnologia', provider: 'Recode', url: 'https://recode.org.br/', duration: '6 módulos', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'proa-proprofissao', title: 'Proprofissão (Programação Full Stack)', description: 'Formação em desenvolvimento web full stack com autoconhecimento, raciocínio lógico, soft skills e conexão com empresas parceiras.', category: 'tecnologia', provider: 'PROA', url: 'https://conteudo.proa.org.br/pre-inscricoes-proprofissao', duration: '6 meses', level: 'Iniciante', certificate: true, image: null, featured: true, active: true },
    { id: 'ciee-google-suporte-ti', title: 'Suporte de TI (Google)', description: 'Trilha profissional Google via Coursera com bolsas do CIEE. Sistemas operacionais, redes, segurança e atendimento com foco em empregabilidade.', category: 'tecnologia', provider: 'CIEE + Google', url: 'https://portal.ciee.org.br/quero-me-preparar/google-tech/', duration: '6 meses', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-google-dados', title: 'Análise de Dados (Google)', description: 'Fundamentos de análise de dados, planilhas, SQL, R, visualização e storytelling com dados, com bolsa de estudos gratuita.', category: 'tecnologia', provider: 'CIEE + Google', url: 'https://portal.ciee.org.br/quero-me-preparar/google-tech/', duration: '6 meses', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'orango-ia-desvendando', title: 'Desvendando a Inteligência Artificial', description: 'Conceitos fundamentais, aplicações práticas, IA generativa, ética e como usar IA para aumentar produtividade.', category: 'tecnologia', provider: 'Senac - Orango', url: 'https://orango.senac.br/inicio/cursos/desvendando-a-inteligencia-artificial/', duration: '32h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // Profissionalização
    { id: 'proa-plataforma', title: 'Plataforma PROA: Primeiro Emprego', description: 'Capacitação em autoconhecimento, projeto profissional, comunicação, raciocínio lógico e orientação para o primeiro emprego.', category: 'profissionalizacao', provider: 'PROA', url: 'https://www.proa.org.br/plataformaproa/', duration: '100h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'qualifica-sp-primeiro-emprego', title: 'Qualifica SP: Meu Primeiro Emprego', description: 'Programa gratuito de qualificação profissional para jovens e adultos que buscam a primeira oportunidade no mercado de trabalho.', category: 'profissionalizacao', provider: 'Qualifica SP (Governo de SP)', url: 'https://www.qualificasp.sp.gov.br/', duration: '120h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'qualifica-sp-empreenda', title: 'Qualifica SP: Empreenda', description: 'Capacitação em empreendedorismo, gestão, finanças e formalização para quem deseja abrir ou fortalecer o próprio negócio.', category: 'profissionalizacao', provider: 'Qualifica SP (Governo de SP)', url: 'https://www.qualificasp.sp.gov.br/', duration: '30h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-processos-seletivos', title: 'Dicas para Processos Seletivos', description: 'Currículo, LinkedIn, entrevistas, testes e como se preparar para conquistar a vaga com mais confiança.', category: 'profissionalizacao', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '8h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-como-falar-bem', title: 'Como Falar Bem', description: 'Comunicação oral, dicção, clareza, escuta e técnicas para falar com segurança em diferentes situações.', category: 'profissionalizacao', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '5h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-lgpd', title: 'LGPD: Como Proteger suas Informações', description: 'Lei Geral de Proteção de Dados Pessoais, direitos, responsabilidades e boas práticas no dia a dia.', category: 'profissionalizacao', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '2h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-feedback', title: 'Feedback: Escuta e Evolução', description: 'Como dar e receber feedback construtivo, desenvolver-se e melhorar o relacionamento no trabalho.', category: 'profissionalizacao', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '2h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-diversidade', title: 'Diversidade e Inclusão', description: 'Equidade, respeito, vieses inconscientes, acessibilidade e construção de ambientes inclusivos e colaborativos.', category: 'profissionalizacao', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '3h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'senai-cursos-online', title: 'Cursos Gratuitos Online (SENAI-SP)', description: 'Programas gratuitos de qualificação profissional online com certificado, em diversas áreas para impulsionar sua carreira.', category: 'profissionalizacao', provider: 'SENAI-SP', url: 'https://online.sp.senai.br/', duration: '21 dias', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // Gestão
    { id: 'orango-scrum-kanban', title: 'Gestão ágil de projetos com Scrum e Kanban', description: 'Metodologias ágeis, papéis, cerimônias, fluxos, indicadores e aplicação prática no dia a dia.', category: 'gestao', provider: 'Senac - Orango', url: 'https://orango.senac.br/inicio/cursos/gestao-agil-de-projetos-com-scrum-e-kanban/', duration: '32h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-gestao-financeira', title: 'Gestão Financeira para Pequenos Negócios', description: 'Fluxo de caixa, capital de giro, custos, precificação e tomada de decisão financeira.', category: 'gestao', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-fluxo-caixa', title: 'Como controlar o fluxo de caixa', description: 'Controle diário, projeções, saldo, recebimentos, pagamentos e organização financeira prática.', category: 'gestao', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-accountability', title: 'Accountability: Construindo Valores Responsáveis', description: 'Responsabilização, ética, confiança e construção de uma cultura de compromisso e resultados.', category: 'gestao', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '10h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },

    // Empreendedorismo
    { id: 'sebrae-marketing-primeiros-passos', title: 'Marketing digital para sua empresa: primeiros passos', description: 'Presença online, redes sociais, público-alvo, proposta de valor e estratégias para começar a vender.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '9h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-preco-venda', title: 'Como definir o preço de venda', description: 'Custos, margem, concorrência, valor percebido e precificação correta para garantir lucratividade.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '6h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-atendimento-inclusivo', title: 'Atendimento inclusivo PCD e neurodiversidade', description: 'Comunicação acessível, barreiras atitudinais, linguagem respeitosa e atendimento humanizado e inclusivo.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '3h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-dropshipping', title: 'Dropshipping', description: 'Modelo de negócio sem estoque, fornecedores, loja virtual, marketing e operação com baixo investimento.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '7h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-vender-online', title: 'O que fazer para começar a vender online?', description: 'Canais digitais, vitrine online, pagamento, entrega, precificação e primeiros passos para vender pela internet.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '7h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-startups', title: 'Pré-aceleração Sebrae Startups', description: 'Validação, modelo de negócio, cliente, tração, financeiro e estruturação para startups em fase inicial.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '85h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-customer-success', title: 'Customer Success', description: 'Experiência do cliente, jornada, indicadores, fidelização e estratégias para redução de churn.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '10h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-neuromarketing', title: 'Neuromarketing', description: 'Comportamento do consumidor, gatilhos mentais éticos, decisão de compra e aplicação ao marketing digital.', category: 'empreendedorismo', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '12h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'orango-vender-redes', title: 'Como vender com redes sociais?', description: 'Criação de conteúdo, funil de vendas, tráfego orgânico, boas práticas e vendas pelo WhatsApp e Instagram.', category: 'empreendedorismo', provider: 'Senac - Orango', url: 'https://orango.senac.br/inicio/cursos/como-vender-com-redes-sociais/', duration: '32h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'orango-cresca-on-line', title: 'Cresça on-line: estratégias de marketing para redes sociais', description: 'Planejamento, branding, conteúdo, métricas, engajamento e estratégias práticas para crescer online.', category: 'empreendedorismo', provider: 'Senac - Orango', url: 'https://orango.senac.br/inicio/cursos/cresca-on-line-estrategias-de-marketing-para-redes-sociais/', duration: '32h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // Saúde
    { id: 'unasus-dignidade-menstrual', title: 'Promoção da Saúde e da Dignidade Menstrual', description: 'Saúde integral, equidade de gênero, pobreza menstrual, políticas públicas e ações de promoção da dignidade menstrual.', category: 'saude', provider: 'UNA-SUS', url: 'https://www.unasus.gov.br/cursos/busca', duration: '45h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'unasus-autocuidado-literacia', title: 'Autocuidado em saúde e Literacia em Saúde', description: 'Autocuidado, tomada de decisão informada, comunicação em saúde, prevenção e promoção da saúde com enfoque prático.', category: 'saude', provider: 'UNA-SUS', url: 'https://www.unasus.gov.br/cursos/busca', duration: '60h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'unasus-saude-digital', title: 'Programa de Aperfeiçoamento em Saúde Digital', description: 'Conceitos, terminologias, prontuário eletrônico, telessaúde, interoperabilidade, ética e aplicação da saúde digital.', category: 'saude', provider: 'UNA-SUS / UFMA', url: 'https://seidigi.ufma.br/', duration: '180h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'senac-primeiros-socorros', title: 'Lei Lucas: Noções Básicas de Primeiros Socorros', description: 'Noções básicas de primeiros socorros em espaços coletivos, prevenção, abordagem inicial e acionamento adequado de ajuda.', category: 'saude', provider: 'Senac', url: 'https://www.senac.br/', duration: '16h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // Artes
    { id: 'orango-design-grafico', title: 'Design gráfico na prática: crie, comunique e conquiste', description: 'Fundamentos do design gráfico, tipografia, cores, composição e criação de peças visuais para diferentes mídias.', category: 'artes', provider: 'Senac - Orango', url: 'https://orango.senac.br/inicio/cursos/design-grafico-na-pratica-crie-comunique-e-conquiste/', duration: '32h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'orango-personagens', title: 'Design e criação de personagens para games e animação', description: 'Concepção, shape, anatomia simplificada, expressões, poses, cores e desenvolvimento de personagens originais.', category: 'artes', provider: 'Senac - Orango', url: 'https://orango.senac.br/inicio/cursos/design-criacao-personagens-games-animacao/', duration: '32h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'orango-design-iniciantes', title: 'Design para iniciantes: criação e distribuição multimídia', description: 'Fundamentos de criação visual, identidade, formatos para web/social e noções de produção para múltiplas plataformas.', category: 'artes', provider: 'Senac - Orango', url: 'https://orango.senac.br/inicio/cursos/design-para-iniciantes-criacao-e-distribuicao-multimidia/', duration: '32h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'sebrae-canva', title: 'Faça suas redes bombarem com o Canva', description: 'Criação rápida e profissional de artes para redes sociais, identidade visual básica e estratégias visuais para pequenos negócios.', category: 'artes', provider: 'Sebrae', url: 'https://sebrae.com.br/sites/PortalSebrae/cursosonline', duration: '2h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // Acessibilidade
    { id: 'escolavirtual-libras', title: 'Introdução à Libras', description: 'Alfabeto manual, números, saudações, frases do cotidiano e noções de cultura surda para comunicação mais inclusiva.', category: 'acessibilidade', provider: 'Escola Virtual Gov', url: 'https://www.escolavirtual.gov.br/', duration: '30h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-libras-usp', title: 'Libras – USP (via CIEE)', description: 'Curso de Libras em parceria com a USP, com foco em comunicação básica e conscientização sobre inclusão e cultura surda.', category: 'acessibilidade', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '30h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },

    // Outros
    { id: 'ifrs-ingles-6', title: 'Inglês 6', description: 'Desenvolvimento das habilidades de leitura, escrita, audição e conversação em inglês com enfoque prático e comunicativo.', category: 'outros', provider: 'IFRS - MOOC', url: 'https://moodle.ifrs.edu.br/course/', duration: '30h', level: 'Intermediário', certificate: true, image: null, featured: false, active: true },
    { id: 'ifrs-portugues-adicional', title: 'Português como Língua Adicional 1', description: 'Apoio à aprendizagem do português para falantes de outras línguas, com foco em comunicação e integração social.', category: 'outros', provider: 'IFRS - MOOC', url: 'https://moodle.ifrs.edu.br/course/', duration: '30h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-gramatica-pratica', title: 'Gramática Prática', description: 'Revisão gramatical aplicada à escrita e à comunicação no trabalho, com exercícios prontos para uso no dia a dia.', category: 'outros', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '70h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true },
    { id: 'ciee-producao-textos', title: 'Produção de Textos', description: 'Como escrever e-mails, mensagens, relatórios e textos profissionais com clareza, objetividade e correção.', category: 'outros', provider: 'CIEE - Saber Virtual', url: 'https://portal.ciee.org.br/quero-me-preparar/saber-virtual/', duration: '10h', level: 'Iniciante', certificate: true, image: null, featured: false, active: true }
];

// ========================================
// Renderização de Cursos
// ========================================
function escapeAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderCourseCard(course) {
    const card = createElement(`
        <article class="course-card" role="listitem" data-course-id="${course.id}">
            <div class="course-media">
                <div class="course-image-slot"></div>
                <button type="button" class="favorite-btn" data-favorite-id="${course.id}" data-course-title="${escapeAttr(course.title)}" aria-pressed="false" aria-label="Adicionar ${escapeAttr(course.title)} aos favoritos" title="Salvar nos favoritos">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                </button>
            </div>
            <div class="course-content">
                <span class="course-category">${getCategoryName(course.category)}</span>
                <h3 class="course-title"><a href="${course.url}" target="_blank" rel="noopener noreferrer">${course.title}</a></h3>
                <p class="course-description">${course.description}</p>
                <div class="course-meta">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${course.duration}</span>
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${course.level}</span>
                    ${course.certificate ? '<span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Certificado</span>' : ''}
                </div>
                <div class="course-footer">
                    <span class="course-provider">${course.provider}</span>
                    <div class="course-footer-actions">
                        <button type="button" class="icon-btn" data-share-id="${course.id}" aria-label="Compartilhar ${escapeAttr(course.title)}" title="Compartilhar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        </button>
                        <button type="button" class="icon-btn" data-compare-id="${course.id}" aria-pressed="false" aria-label="Adicionar ${escapeAttr(course.title)} à comparação" title="Comparar">⚖️</button>
                        <button type="button" class="progress-btn" data-progress-id="${course.id}" aria-pressed="false">${state.progress.has(course.id) ? 'Concluído ✓' : 'Marcar como concluído'}</button>
                        <a href="${course.url}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--small" data-course-action="access">Acessar Curso</a>
                    </div>
                </div>
            </div>
        </article>
    `);

    const media = buildCourseMedia(course);
    card.querySelector('.course-image-slot').replaceWith(media);

    if (isFavorite(course.id)) {
        const fav = card.querySelector('.favorite-btn');
        fav.setAttribute('aria-pressed', 'true');
        fav.setAttribute('aria-label', `Remover ${course.title} dos favoritos`);
    }

    return card;
}

function populateProviderFilter() {
    const select = $('#provider-filter');
    if (!select) return;
    const providers = [...new Set(state.courses.map(c => c.provider))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    select.innerHTML = '<option value="all">Todas as instituições</option>' +
        providers.map(p => `<option value="${escapeAttr(p)}">${p}</option>`).join('');
}

function getCategoryName(id) {
    const cat = CONFIG.categories.find(c => c.id === id);
    return cat ? cat.name : id;
}

function renderCourses() {
    const grid = $('#courses-grid');
    if (!grid) return;

    const coursesToShow = state.filteredCourses.slice(0, state.displayedCount);

    if (coursesToShow.length === 0) {
        const hasFilters = state.searchQuery || state.currentLevel !== 'all' || state.currentCategory !== 'all' || state.showFavoritesOnly;
        const favoritesEmpty = state.showFavoritesOnly && state.favorites.size === 0;

        let title = 'Nenhum curso encontrado';
        let text = hasFilters
            ? 'Tente outro termo, categoria ou nível — ou limpe os filtros.'
            : 'Novos cursos chegam em breve.';

        if (favoritesEmpty) {
            title = 'Nenhum favorito ainda';
            text = 'Toque no coração dos cursos que quiser guardar para depois.';
        } else if (state.showFavoritesOnly) {
            text = 'Nenhum dos seus favoritos corresponde aos filtros atuais.';
        }

        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <h3>${title}</h3>
                <p>${text}</p>
                ${hasFilters ? '<button type="button" class="btn btn--outline btn--small" id="clear-filters">Limpar filtros</button>' : ''}
            </div>
        `;
        const lm = $('#load-more');
        if (lm) lm.hidden = true;

        const clearBtn = $('#clear-filters');
        if (clearBtn) clearBtn.addEventListener('click', resetFilters);
        return;
    }

    const startIndex = grid.children.length;
    const fragment = document.createDocumentFragment();
    coursesToShow.slice(startIndex).forEach(course => {
        fragment.appendChild(renderCourseCard(course));
    });
    grid.appendChild(fragment);

    const loadMoreBtn = $('#load-more');
    if (loadMoreBtn) loadMoreBtn.hidden = state.displayedCount >= state.filteredCourses.length;
}

function sortCourses(list) {
    const arr = [...list];
    if (state.sortBy === 'az') {
        return arr.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    }
    if (state.sortBy === 'recent') {
        return arr.sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (db !== da) return db - da;
            return Number(b.featured) - Number(a.featured);
        });
    }
    // featured (padrão): destaque primeiro, depois ordem original
    return arr.sort((a, b) => Number(b.featured) - Number(a.featured));
}

function applyFilters() {
    const query = state.searchQuery.trim().toLowerCase();

    const result = state.courses.filter(course => {
        if (!course.active) return false;
        if (state.showFavoritesOnly && !state.favorites.has(course.id)) return false;
        if (state.currentCategory !== 'all' && course.category !== state.currentCategory) return false;
        if (state.currentLevel !== 'all' && course.level !== state.currentLevel) return false;
        if (state.currentProvider !== 'all' && course.provider !== state.currentProvider) return false;
        if (query) {
            const haystack = `${course.title} ${course.description} ${course.provider} ${getCategoryName(course.category)}`.toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        return true;
    });

    state.filteredCourses = sortCourses(result);
    state.displayedCount = CONFIG.coursesPerPage;

    const grid = $('#courses-grid');
    if (grid) grid.innerHTML = '';
    renderCourses();
    updateResultsCount();
}

function updateResultsCount() {
    const el = $('#results-count');
    if (!el) return;
    const total = state.filteredCourses.length;
    if (total === 0) {
        el.textContent = 'Nenhum curso encontrado com os filtros atuais.';
    } else if (total === 1) {
        el.textContent = '1 curso gratuito encontrado.';
    } else {
        const shown = Math.min(state.displayedCount, total);
        el.textContent = `Mostrando ${shown} de ${total} cursos gratuitos.`;
    }
}

function resetFilters() {
    state.searchQuery = '';
    state.currentLevel = 'all';
    state.currentCategory = 'all';
    state.sortBy = 'featured';
    state.showFavoritesOnly = false;

    const search = $('#course-search');
    if (search) search.value = '';
    const clear = $('#search-clear');
    if (clear) clear.hidden = true;
    const level = $('#level-filter');
    if (level) level.value = 'all';
    const sort = $('#sort-filter');
    if (sort) sort.value = 'featured';

    $$('.filter-btn').forEach(btn => {
        const isActive = btn.dataset.category === 'all';
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });

    updateFavoritesUI();
    applyFilters();
}

function filterCourses(category) {
    state.currentCategory = category;

    $$('.filter-btn').forEach(btn => {
        const isActive = btn.dataset.category === category;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });

    applyFilters();
}

// ========================================
// Renderização de Trilhas
// ========================================
function getTrackIcon(name) {
    const icons = {
        briefcase: '<path d="M21 21V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M3 3h18v18H3z"/>',
        monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
        code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
        lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
        'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'
    };
    return icons[name] || icons.briefcase;
}

function renderTracks() {
    const grid = $('#tracks-grid');
    if (!grid) return;

    grid.innerHTML = CONFIG.tracks.map(track => {
        const total = track.courses.length;
        const done = track.courses.filter(id => state.progress.has(id)).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return `
        <article class="track-card" role="listitem" data-track-id="${track.id}">
            <div class="track-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getTrackIcon(track.icon)}</svg>
            </div>
            <h3 class="track-title">${track.title}</h3>
            <p class="track-description">${track.description}</p>
            <div class="track-meta">
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${total} cursos</span>
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${track.duration}</span>
                <span>${done}/${total} concluídos</span>
            </div>
            <div class="track-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da trilha ${track.title}">
                <div class="track-progress-bar" style="width: ${pct}%"></div>
            </div>
            <button class="btn btn--outline track-btn" data-track-action="start" data-track-id="${track.id}">
                ${pct > 0 ? 'Continuar Trilha' : 'Iniciar Trilha'}
            </button>
        </article>`;
    }).join('');
}

// ========================================
// Modal de Curso
// ========================================
function openCourseModal(courseId) {
    const course = state.courses.find(c => c.id === courseId);
    if (!course) return;

    const modal = $('#course-modal');
    const body = $('#modal-body');

    body.innerHTML = `
        <div class="modal-header">
            <span class="modal-category">${getCategoryName(course.category)}</span>
            <h2 id="modal-title" class="modal-title">${course.title}</h2>
            <div class="modal-meta">
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${course.duration}</span>
                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${course.level}</span>
                ${course.certificate ? '<span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Certificado incluso</span>' : ''}
            </div>
        </div>
        <p class="modal-description">${course.description}</p>
        <div class="modal-actions">
            <a href="${course.url}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--large" data-course-action="access">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Acessar Curso Gratuitamente
            </a>
            <button type="button" class="btn btn--secondary" data-share-id="${course.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Compartilhar
            </button>
            <button type="button" class="btn btn--secondary progress-btn" data-progress-id="${course.id}">${state.progress.has(course.id) ? 'Concluído ✓' : 'Marcar como concluído'}</button>
            <button type="button" class="btn btn--secondary" data-tts-id="${course.id}">Ler em voz alta</button>
            <button type="button" class="btn btn--secondary" data-compare-id="${course.id}">Comparar</button>
            <button type="button" class="btn btn--secondary" data-copy-link="${course.id}">Copiar link do curso</button>
            <button class="btn btn--secondary modal-close-btn">Fechar</button>
        </div>
    `;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    body.querySelector('.modal-close-btn').focus();

    const closeModal = () => {
        modal.hidden = true;
        document.body.style.overflow = '';
    };

    body.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

// ========================================
// Carregamento de Dados
// ========================================
async function loadCourses() {
    const grid = $('#courses-grid');
    if (!grid) return;

    if (state.supabaseClient) {
        try {
            const { data, error } = await state.supabaseClient
                .from('courses')
                .select('*')
                .eq('active', true)
                .order('featured', { ascending: false })
                .order('created_at', { ascending: false });

            if (!error && data) {
                state.courses = data.map(mapSupabaseCourse);
                populateProviderFilter();
                filterCourses(state.currentCategory);
                return;
            }
        } catch (e) {
            console.warn('Erro ao carregar do Supabase, usando dados locais:', e);
        }
    }

    state.courses = MOCK_COURSES;
    populateProviderFilter();
    filterCourses(state.currentCategory);
}

function mapSupabaseCourse(course) {
    return {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        provider: course.provider,
        url: course.url,
        duration: course.duration,
        level: course.level,
        certificate: course.certificate,
        image: course.image_url || null,
        featured: course.featured,
        active: course.active,
        createdAt: course.created_at || null
    };
}

// ========================================
// Navegação Mobile
// ========================================
function initMobileNav() {
    const toggle = $('.nav-toggle');
    const menu = $('.nav-menu');
    const backdrop = $('#nav-backdrop');
    if (!toggle || !menu) return;

    function setMobileNavOpen(open) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        menu.classList.toggle('open', open);
        if (backdrop) backdrop.hidden = !open;
        document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        setMobileNavOpen(!isOpen);
    });

    if (backdrop) {
        backdrop.addEventListener('click', () => {
            setMobileNavOpen(false);
            toggle.focus();
        });
    }

    $$('.nav-link', menu).forEach(link => {
        link.addEventListener('click', () => setMobileNavOpen(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('open')) {
            setMobileNavOpen(false);
            toggle.focus();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && menu.classList.contains('open')) {
            setMobileNavOpen(false);
        }
    });
}

// ========================================
// Scroll Suave para Anchors
// ========================================
function initSmoothScroll() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const headerHeight = $('.header')?.offsetHeight || 72;
            const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        }
    });
}

// ========================================
// Botão "Carregar Mais"
// ========================================
function initLoadMore() {
    const btn = $('#load-more');
    if (!btn) return;

    btn.addEventListener('click', () => {
        state.displayedCount += CONFIG.coursesPerPage;
        renderCourses();
        updateResultsCount();
    });
}

// ========================================
// Busca, Nível e Ordenação
// ========================================
function initCourseFilters() {
    const search = $('#course-search');
    const clear = $('#search-clear');
    const level = $('#level-filter');
    const sort = $('#sort-filter');

    if (search) {
        let timer;
        search.addEventListener('input', () => {
            const value = search.value;
            if (clear) clear.hidden = value.length === 0;
            clearTimeout(timer);
            timer = setTimeout(() => {
                state.searchQuery = value;
                applyFilters();
            }, 200);
        });

        search.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                search.value = '';
                state.searchQuery = '';
                if (clear) clear.hidden = true;
                applyFilters();
            }
        });
    }

    if (clear) {
        clear.addEventListener('click', () => {
            if (search) { search.value = ''; search.focus(); }
            state.searchQuery = '';
            clear.hidden = true;
            applyFilters();
        });
    }

    if (level) {
        level.addEventListener('change', () => {
            state.currentLevel = level.value;
            applyFilters();
        });
    }

    const provider = $('#provider-filter');
    if (provider) {
        provider.addEventListener('change', () => {
            state.currentProvider = provider.value;
            applyFilters();
        });
    }

    if (sort) {
        sort.addEventListener('change', () => {
            state.sortBy = sort.value;
            applyFilters();
        });
    }
}

// ========================================
// Ações de Trilha
// ========================================
function initTrackActions() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-track-action="start"]');
        if (!btn) return;

        const track = CONFIG.tracks.find(t => t.id === btn.dataset.trackId);
        if (!track) return;

        const firstCourse = track.courses
            .map(id => state.courses.find(c => c.id === id))
            .find(Boolean);

        if (firstCourse) openCourseModal(firstCourse.id);
        else showToast('Cursos desta trilha chegam em breve!', 'info');
    });
}

// ========================================
// Ações de Curso
// ========================================
function initCourseActions() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-favorite-id], [data-share-id]')) return;

        const card = e.target.closest('.course-card');
        if (!card) return;

        const action = e.target.closest('[data-course-action]');
        if (action?.dataset.courseAction === 'access') return;

        if (!e.target.closest('a')) openCourseModal(card.dataset.courseId);
    });
}

// ========================================
// Favoritos e Compartilhamento (eventos)
// ========================================
function initFavorites() {
    document.addEventListener('click', (e) => {
        const favBtn = e.target.closest('[data-favorite-id]');
        if (favBtn) {
            e.preventDefault();
            toggleFavorite(favBtn.dataset.favoriteId);
            const active = isFavorite(favBtn.dataset.favoriteId);
            showToast(active ? 'Curso salvo nos favoritos ❤️' : 'Curso removido dos favoritos.', active ? 'success' : 'info');
            return;
        }

        const filterBtn = e.target.closest('#favorites-filter');
        if (filterBtn) {
            state.showFavoritesOnly = !state.showFavoritesOnly;
            filterBtn.setAttribute('aria-pressed', String(state.showFavoritesOnly));
            applyFilters();
            const grid = $('#courses-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

function initShare() {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-share-id]');
        if (!btn) return;
        e.preventDefault();
        const course = state.courses.find(c => c.id === btn.dataset.shareId);
        if (course) await shareCourse(course);
    });
}

function initProgress() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-progress-id]');
        if (!btn) return;
        e.preventDefault();
        toggleProgress(btn.dataset.progressId);
        showToast(state.progress.has(btn.dataset.progressId) ? 'Curso marcado como concluído! 🎉' : 'Progresso removido.', 'success');
    });
}

// ========================================
// Inicialização Principal
// ========================================
function speakCourse(course) {
    if (!('speechSynthesis' in window)) { showToast('Leitura em voz alta não suportada neste navegador.', 'info'); return; }
    window.speechSynthesis.cancel();
    const text = course.title + '. ' + course.description + '. Duração: ' + course.duration + '. Nível: ' + course.level + '.';
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
}

function toggleCompare(id) {
    if (state.compare.has(id)) state.compare.delete(id);
    else {
        if (state.compare.size >= 3) { showToast('Você pode comparar até 3 cursos por vez.', 'info'); return; }
        state.compare.add(id);
    }
    updateCompareUI();
}

function updateCompareUI() {
    const btn = document.getElementById('compare-toggle');
    const count = document.getElementById('compare-count');
    if (count) count.textContent = state.compare.size;
    if (btn) btn.setAttribute('aria-pressed', String(state.compare.size > 0));
    $('.compare-btn, [data-compare-id]').forEach(el => {
        const id = el.dataset.compareId;
        if (!id) return;
        const active = state.compare.has(id);
        el.setAttribute('aria-pressed', String(active));
        if (el.classList.contains('compare-btn')) el.textContent = active ? 'Remover da comparação' : 'Adicionar à comparação';
    });
}

function openCompareModal() {
    const courses = [...state.compare].map(id => state.courses.find(c => c.id === id)).filter(Boolean);
    if (courses.length < 2) { showToast('Selecione pelo menos 2 cursos para comparar.', 'info'); return; }
    const modal = document.getElementById('course-modal');
    const body = document.getElementById('modal-body');
    const rows = [
        ['Título', c => c.title],
        ['Instituição', c => c.provider],
        ['Categoria', c => getCategoryName(c.category)],
        ['Nível', c => c.level],
        ['Duração', c => c.duration],
        ['Certificado', c => c.certificate ? 'Sim' : 'Não'],
        ['Acesso', c => `<a href="${'${c.url}'}" target="_blank" rel="noopener noreferrer">Abrir</a>`]
    ];
    body.innerHTML = `
        <div class="modal-header"><h2 id="modal-title" class="modal-title">Comparação de cursos</h2></div>
        <div style="overflow-x:auto">
        <table class="compare-table">
            <thead><tr><th>Critério</th>${courses.map(c=>`<th>${c.title}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(([label, fn])=>`<tr><th>${label}</th>${courses.map(c=>`<td>${fn(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <div class="modal-actions"><button class="btn btn--secondary modal-close-btn">Fechar</button></div>
    `;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const close = () => { modal.hidden = true; document.body.style.overflow = ''; };
    body.querySelector('.modal-close-btn').addEventListener('click', close);
    modal.querySelector('.modal-close').addEventListener('click', close);
    modal.querySelector('.modal-overlay').addEventListener('click', close);
}

function initCompare() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-compare-id]');
        if (btn) { e.preventDefault(); toggleCompare(btn.dataset.compareId); return; }
        const toggle = e.target.closest('#compare-toggle');
        if (toggle) { e.preventDefault(); openCompareModal(); }
    });
}

function showShortcuts() {
    const modal = document.getElementById('course-modal');
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <div class="modal-header"><h2 id="modal-title" class="modal-title">Atalhos de teclado</h2></div>
        <ul style="list-style:none;padding:0;line-height:2;">
            <li><kbd>/</kbd> — Focar na busca</li>
            <li><kbd>Esc</kbd> — Fechar modais / limpar busca</li>
            <li><kbd>?</kbd> — Mostrar esta ajuda</li>
        </ul>
        <div class="modal-actions"><button class="btn btn--secondary modal-close-btn">Fechar</button></div>
    `;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const close = () => { modal.hidden = true; document.body.style.overflow = ''; };
    body.querySelector('.modal-close-btn').addEventListener('click', close);
    modal.querySelector('.modal-close').addEventListener('click', close);
    modal.querySelector('.modal-overlay').addEventListener('click', close);
}

function initShortcuts() {
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.key === '/') { e.preventDefault(); const s = document.getElementById('course-search'); if (s) s.focus(); }
        else if (e.key === '?') { e.preventDefault(); showShortcuts(); }
    });
}

function initTTS() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-tts-id]');
        if (!btn) return;
        e.preventDefault();
        const course = state.courses.find(c => c.id === btn.dataset.ttsId);
        if (course) speakCourse(course);
    });
}

function initCopyLinks() {
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-copy-link]');
        if (!btn) return;
        e.preventDefault();
        const url = window.location.origin + window.location.pathname + '?curso=' + encodeURIComponent(btn.dataset.copyLink);
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(url);
                showToast('Link do curso copiado!', 'success');
            } else {
                window.prompt('Copie o link do curso:', url);
            }
        } catch (err) {
            window.prompt('Copie o link do curso:', url);
        }
    });
}

async function init() {
    initTheme();
    initA11y();
    initInfoPopup();
    loadFavorites();
    loadProgress();
    await initSupabase();
    await initAuth();
    await loadCourses();
    renderTracks();

    initMobileNav();
    initSmoothScroll();
    initLoadMore();
    initCourseFilters();
    initFavorites();
    initShare();
    initProgress();
    initCopyLinks();
    initTTS();
    initCompare();
    initShortcuts();
    initUserData();
    initAccount();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
    initTrackActions();
    initCourseActions();

    // Abrir curso via link direto (?curso=id)
    const params = new URLSearchParams(window.location.search);
    const cursoId = params.get('curso');
    if (cursoId && state.courses.some(c => c.id === cursoId)) {
        openCourseModal(cursoId);
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px' });

    $$('.course-card, .track-card, .resource-card, .step').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.5s ease ${i * 40}ms, transform 0.5s ease ${i * 40}ms`;
        observer.observe(el);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.VocePodeTudo = {
    state,
    CONFIG,
    loadCourses,
    filterCourses,
    openCourseModal,
    toggleFavorite,
    shareCourse,
    showToast,
    openAccountModal,
    initAuth
};