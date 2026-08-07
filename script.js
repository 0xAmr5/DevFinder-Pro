import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GithubAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ ضع مفاتيح Firebase الخاصة بمشروعك هنا
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
const themeToggle = document.getElementById('theme-toggle');

let currentFetchedUser = null; 
let currentUser = null;

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

// Theme Toggle
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
});

// Fetch Data From GitHub
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
        }, 600);
    } catch (err) {
        skeleton.classList.add('hidden');
        errorMsg.style.display = 'block';
    }
}

function renderUI(user) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const dateStr = new Date(user.created_at).toLocaleDateString('en-US', options);

    elements.avatar.src = user.avatar_url;
    elements.name.textContent = user.name || user.login;
    elements.date.textContent = `Joined ${dateStr}`;
    elements.username.textContent = `@${user.login}`;
    elements.username.href = user.html_url;
    elements.bio.textContent = user.bio || "This developer hasn't set a bio yet.";
    
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
        el.textContent = "Not Available";
        if (url) el.removeAttribute('href');
    }
}

// Authentication Management
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        authSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); padding: 6px 12px; border-radius: 12px;">
                <img src="${user.photoURL}" style="width: 22px; height: 22px; border-radius: 50%;">
                <span style="font-size: 0.85rem; font-weight: 600;">${user.displayName || 'Dev'}</span>
                <button id="logout-btn" style="background: none; border: none; color: var(--text-low); cursor: pointer; font-size: 0.85rem;"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
        fetchFavorites(user.uid);
    } else {
        authSection.innerHTML = `
            <button id="login-btn" class="search-btn" style="padding: 8px 16px; background: rgba(255,255,255,0.05); color: var(--text-high); border: 1px solid var(--card-border); font-size: 0.9rem; border-radius: 12px;">
                <i class="fa-brands fa-github"></i> <span>Sign In</span>
            </button>
        `;
        document.getElementById('login-btn').addEventListener('click', () => {
            const provider = new GithubAuthProvider();
            signInWithPopup(auth, provider).catch(err => console.error(err));
        });
        favoritesSection.classList.add('hidden');
    }
});

// Bookmarks Engine (Firestore)
async function fetchFavorites(userId) {
    const q = query(collection(db, "favorites"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
    });
    renderFavorites(list);
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
            <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" class="fav-item-click">
                <img src="${fav.avatarUrl}" style="width: 35px; height: 35px; border-radius: 50%;">
                <div style="min-width: 0; text-align: left;">
                    <div style="font-size: 0.9rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${fav.name}</div>
                    <div style="font-size: 0.75rem; color: var(--accent-blue);">@${fav.githubUsername}</div>
                </div>
            </div>
            <button class="delete-fav-btn" style="background: none; border: none; color: var(--text-low); cursor: pointer;">
                <i class="fa-solid fa-trash-can" style="pointer-events: none;"></i>
            </button>
        `;

        item.querySelector('.fav-item-click').addEventListener('click', () => fetchDevData(fav.githubUsername));
        item.querySelector('.delete-fav-btn').addEventListener('click', (e) => deleteFavorite(fav.id, e));

        favoritesGrid.appendChild(item);
    });
}

bookmarkBtn.addEventListener('click', async () => {
    if (!currentUser) { alert("Please sign in with GitHub to save profiles!"); return; }
    if (!currentFetchedUser) return;

    const q = query(collection(db, "favorites"), where("userId", "==", currentUser.uid), where("githubUsername", "==", currentFetchedUser.login));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        await addDoc(collection(db, "favorites"), {
            userId: currentUser.uid,
            githubUsername: currentFetchedUser.login,
            name: currentFetchedUser.name || currentFetchedUser.login,
            avatarUrl: currentFetchedUser.avatar_url,
            createdAt: new Date().toISOString()
        });
    }
    fetchFavorites(currentUser.uid);
    updateBookmarkIconState();
});

async function deleteFavorite(docId, e) {
    e.stopPropagation();
    await deleteDoc(doc(db, "favorites", docId));
    if (currentUser) { fetchFavorites(currentUser.uid); updateBookmarkIconState(); }
}

async function updateBookmarkIconState() {
    if (!currentUser || !currentFetchedUser) {
        bookmarkBtn.style.color = 'var(--text-low)'; bookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>'; return;
    }
    const q = query(collection(db, "favorites"), where("userId", "==", currentUser.uid), where("githubUsername", "==", currentFetchedUser.login));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        bookmarkBtn.style.color = 'var(--accent-blue)'; bookmarkBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
    } else {
        bookmarkBtn.style.color = 'var(--text-low)'; bookmarkBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>';
    }
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const queryStr = searchInput.value.trim();
    if (queryStr) fetchDevData(queryStr);
});