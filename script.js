const supabaseUrl = 'https://kcdwtkgzzpymhbfzlpoy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZHd0a2d6enB5bWhiZnpscG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjYxNjIsImV4cCI6MjA5OTI0MjE2Mn0.ozQC2h25BAV3PShz0pX3J6Ps6wc453enVh7cqyLG9iE';

const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const errorMsg = document.getElementById('error-msg');
const profileCard = document.getElementById('profile-card');
const welcomeCard = document.getElementById('welcome-card');
const skeleton = document.getElementById('skeleton');
const authSection = document.getElementById('auth-section');
const bookmarkBtn = document.getElementById('bookmark-btn');
const favoritesSection = document.getElementById('favorites-section');
const favoritesGrid = document.getElementById('favorites-grid');
const langToggle = document.getElementById('lang-toggle');
const langText = document.getElementById('lang-text');
const themeToggle = document.getElementById('theme-toggle');

let currentFetchedUser = null; 
let currentUserSession = null;
let currentLang = localStorage.getItem('devfinder-lang') || 'en';

const elements = {
    avatar: document.getElementById('avatar'),
    name: document.getElementById('name'),
    date: document.getElementById('date'),
    username: document.getElementById('username'),
    bio: document.getElementById('bio'),
    repos: document.getElementById('repos'),
    followers: document.getElementById('followers'),
    following: document.getElementById('following'),
    location: document.getElementById('location'),
    twitter: document.getElementById('twitter'),
    blog: document.getElementById('blog'),
    company: document.getElementById('company')
};

const i18n = {
    en: {
        placeholder: "Enter GitHub username...",
        fetchData: "Fetch Data",
        notFound: "Not found",
        repos: "Repositories",
        followers: "Followers",
        following: "Following",
        savedDevs: "Saved Developers",
        verified: "Verified Architect",
        creatorText: "Engineered with Precision by <strong>Amr Othman</strong>",
        hire: "Hire the Expert",
        signIn: "Sign In",
        signOut: "Sign Out",
        noBio: "This developer hasn't set a bio yet.",
        joined: "Joined",
        welcomeTitle: "Discover Developer Personas",
        welcomeSub: "Search for any GitHub developer to index their repositories, stats, and digital footprint instantly."
    },
    ar: {
        placeholder: "أدخل اسم مستخدم جيت هب...",
        fetchData: "جلب البيانات",
        notFound: "غير موجود",
        repos: "المستودعات",
        followers: "المتابعون",
        following: "المتابِعون",
        savedDevs: "المطورين المحفوظين",
        verified: "مهندس برمجيات معتمد",
        creatorText: "تمت الهندسة بدقة بواسطة <strong>عمرو عثمان</strong>",
        hire: "وظف الخبير",
        signIn: "تسجيل الدخول",
        signOut: "خروج",
        noBio: "هذا المطور لم يقم بكتابة سيرة ذاتية بعد.",
        joined: "انضم في",
        welcomeTitle: "اكتشف هويات المطورين",
        welcomeSub: "ابحث عن أي مطور على جيت هب لفهرسة مستودعاته وإحصاءاته وبصمته الرقمية فوراً."
    }
};

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('devfinder-lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    langText.textContent = lang === 'ar' ? 'English' : 'العربية';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) el.innerHTML = i18n[lang][key];
    });

    if (searchInput) searchInput.placeholder = i18n[lang].placeholder;
    if (currentFetchedUser) renderUI(currentFetchedUser);
}

langToggle.addEventListener('click', () => {
    applyLanguage(currentLang === 'en' ? 'ar' : 'en');
});

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
});

async function fetchDevData(username) {
    welcomeCard.classList.add('hidden');
    profileCard.classList.add('hidden');
    errorMsg.style.display = 'none';
    skeleton.classList.remove('hidden');

    try {
        const response = await fetch(`https://api.github.com/users/${username}`);
        if (!response.ok) throw new Error('404');
        const data = await response.json();
        currentFetchedUser = data;

        setTimeout(() => {
            renderUI(data);
            skeleton.classList.add('hidden');
            profileCard.classList.remove('hidden');
            updateBookmarkIconState();
        }, 800);
    } catch (err) {
        skeleton.classList.add('hidden');
        errorMsg.style.display = 'block';
    }
}

function renderUI(user) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const dateStr = new Date(user.created_at).toLocaleDateString(currentLang === 'ar' ? 'ar-EG' : 'en-US', options);

    elements.avatar.src = user.avatar_url;
    elements.name.textContent = user.name || user.login;
    elements.date.textContent = `${i18n[currentLang].joined} ${dateStr}`;
    elements.username.textContent = `@${user.login}`;
    elements.username.href = user.html_url;
    elements.bio.textContent = user.bio || i18n[currentLang].noBio;
    
    elements.repos.textContent = user.public_repos;
    elements.followers.textContent = user.followers;
    elements.following.textContent = user.following;

    handleLink('location', user.location);
    handleLink('twitter', user.twitter_username, user.twitter_username ? `https://twitter.com/${user.twitter_username}` : null);
    
    let blog = user.blog;
    if (blog && !blog.startsWith('http')) blog = `https://${blog}`;
    handleLink('blog', user.blog, blog);
    handleLink('company', user.company);
}

function handleLink(id, text, url = null) {
    const box = document.getElementById(`${id}-box`);
    const el = document.getElementById(id);
    if (text && text !== "") {
        box.classList.remove('unavailable');
        el.textContent = text;
        if (url) { el.href = url; el.target = "_blank"; }
    } else {
        box.classList.add('unavailable');
        el.textContent = currentLang === 'ar' ? "غير متاح" : "Not Available";
        if (url) el.removeAttribute('href');
    }
}

async function handleAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUserSession = session;
    
    if (session) {
        const userMeta = session.user.user_metadata;
        authSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--card-border); padding: 6px 12px; border-radius: 8px;">
                <img src="${userMeta.avatar_url}" style="width: 20px; height: 20px; border-radius: 50%;">
                <span style="font-size: 0.8rem; font-weight: 600;">${userMeta.full_name || session.user.email.split('@')[0]}</span>
                <button id="logout-btn" style="background: none; border: none; color: var(--text-low); cursor: pointer; font-size: 0.8rem;"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload();
        });
        fetchFavorites(session.user.id);
    } else {
        authSection.innerHTML = `
            <button id="login-btn" class="search-btn" style="padding: 8px 16px; background: rgba(255,255,255,0.05); color: var(--text-high); border: 1px solid var(--card-border);">
                <i class="fa-brands fa-github"></i> <span>${i18n[currentLang].signIn}</span>
            </button>
        `;
        document.getElementById('login-btn').addEventListener('click', async () => {
            await supabaseClient.auth.signInWithOAuth({
                provider: 'github',
                options: { redirectTo: window.location.origin }
            });
        });
    }
}

async function fetchFavorites(userId) {
    const { data, error } = await supabaseClient
        .from('favorite_developers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (!error && data) renderFavorites(data);
}

function renderFavorites(list) {
    if (list.length === 0) { favoritesSection.classList.add('hidden'); return; }
    favoritesSection.classList.remove('hidden');
    favoritesGrid.innerHTML = '';

    list.forEach(fav => {
        const item = document.createElement('div');
        item.className = 'bento-item';
        item.style.padding = '1rem'; item.style.display = 'flex'; item.style.alignItems = 'center'; item.style.justifyContent = 'space-between';

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="fetchDevData('${fav.github_username}')">
                <img src="${fav.avatar_url}" style="width: 35px; height: 35px; border-radius: 50%;">
                <div style="min-width: 0; text-align: ${currentLang === 'ar' ? 'right' : 'left'};">
                    <div style="font-size: 0.9rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${fav.name}</div>
                    <div style="font-size: 0.75rem; color: var(--accent-blue);">@${fav.github_username}</div>
                </div>
            </div>
            <button onclick="deleteFavorite('${fav.id}', event)" style="background: none; border: none; color: var(--text-low); cursor: pointer;">
                <i class="fa-solid fa-trash-can" style="pointer-events: none;"></i>
            </button>
        `;
        favoritesGrid.appendChild(item);
    });
}

bookmarkBtn.addEventListener('click', async () => {
    if (!currentUserSession) { alert(currentLang === 'ar' ? "سجل دخولك أولاً بحساب جيت هب لحفظ المطورين!" : "Please sign in first to save profiles!"); return; }
    if (!currentFetchedUser) return;

    const { error } = await supabaseClient.from('favorite_developers').insert([
        { user_id: currentUserSession.user.id, github_username: currentFetchedUser.login, name: currentFetchedUser.name || currentFetchedUser.login, avatar_url: currentFetchedUser.avatar_url }
    ]);
    if (!error) { fetchFavorites(currentUserSession.user.id); updateBookmarkIconState(); }
});

async function deleteFavorite(id, e) {
    e.stopPropagation();
    await supabaseClient.from('favorite_developers').delete().eq('id', id);
    if (currentUserSession) { fetchFavorites(currentUserSession.user.id); updateBookmarkIconState(); }
}

async function updateBookmarkIconState() {
    if (!currentUserSession || !currentFetchedUser) {
        bookmarkBtn.style.color = 'var(--text-low)'; bookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>'; return;
    }
    const { data } = await supabaseClient.from('favorite_developers').select('id').eq('user_id', currentUserSession.user.id).eq('github_username', currentFetchedUser.login);
    if (data && data.length > 0) {
        bookmarkBtn.style.color = 'var(--accent-blue)'; bookmarkBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
    } else {
        bookmarkBtn.style.color = 'var(--text-low)'; bookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>';
    }
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) fetchDevData(query);
});

supabaseClient.auth.onAuthStateChange(() => { handleAuth(); });

applyLanguage(currentLang);
handleAuth();