const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const errorMsg = document.getElementById('error-msg');
const profileCard = document.getElementById('profile-card');
const skeleton = document.getElementById('skeleton');

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

async function fetchDevData(username) {
    // UI State: Reset
    profileCard.classList.add('hidden');
    errorMsg.style.display = 'none';
    skeleton.classList.remove('hidden');

    try {
        const response = await fetch(`https://api.github.com/users/${username}`);
        
        if (!response.ok) {
            throw new Error('404');
        }

        const data = await response.json();
        
        // Artificial delay for better UX shimmer feel
        setTimeout(() => {
            renderUI(data);
            skeleton.classList.add('hidden');
            profileCard.classList.remove('hidden');
        }, 800);

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
    
    // Stats with counting animation feel
    elements.repos.textContent = user.public_repos;
    elements.followers.textContent = user.followers;
    elements.following.textContent = user.following;

    // Logic for Links
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
        if (url) {
            el.href = url;
            el.target = "_blank";
        }
    } else {
        box.classList.add('unavailable');
        el.textContent = "Not Available";
        if (url) el.removeAttribute('href');
    }
}

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) fetchDevData(query);
});

// Initial Search for the Creator's Profile
fetchDevData('0xAmr5');