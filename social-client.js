const API_URL = '';

class SocialApp {
  constructor() {
    this.currentUser = null;
    this.posts = [];
    this.token = null;
    this.selectedFile = null;
    this.init();
  }

  async init() {
    this.token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!this.token || !userStr) {
      window.location.href = '/auth.html';
      return;
    }

    this.currentUser = JSON.parse(userStr);
    this.setupUI();
    this.setupEventListeners();
    await this.loadPosts();
  }

  setupUI() {
    const userDisplay = document.getElementById('userDisplay');
    userDisplay.innerHTML = `
      <div class="avatar-trigger" id="avatarTrigger" title="Change profile photo">
        <img class="avatar-small" id="headerAvatar" src="${this.currentUser.avatar}" alt="${this.currentUser.username}">
        <div class="avatar-trigger__overlay">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9Z"/>
          </svg>
        </div>
      </div>
      <span>${this.currentUser.username}</span>
      ${this.currentUser.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
    `;

    const composer = document.getElementById('composer');
    if (this.currentUser.isAdmin) {
      composer.style.display = 'block';
      document.getElementById('composerAvatar').src = this.currentUser.avatar;
    } else {
      composer.style.display = 'none';
      const feed = document.getElementById('feed');
      const msg = document.createElement('div');
      msg.className = 'info-message';
      msg.textContent = 'You can like and comment on posts. Only the admin can create new posts.';
      feed.parentElement.insertBefore(msg, feed);
    }
  }

  setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth.html';
    });

    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');

    postContent.addEventListener('input', () => {
      charCount.textContent = postContent.value.length;
      this.updatePublishBtn();
    });

    document.getElementById('publishBtn').addEventListener('click', () => this.publishPost());

    // Image attachment
    const attachBtn = document.getElementById('attachImageBtn');
    const imageInput = document.getElementById('imageInput');
    if (attachBtn) {
      attachBtn.addEventListener('click', () => imageInput.click());
      imageInput.addEventListener('change', (e) => this.handleImageSelect(e));
      document.getElementById('removeImageBtn').addEventListener('click', () => this.clearImage());
    }

    // Avatar upload
    const avatarTrigger = document.getElementById('avatarTrigger');
    const avatarInput = document.getElementById('avatarInput');
    if (avatarTrigger) {
      avatarTrigger.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', (e) => this.uploadAvatar(e));
    }

    // Modal close
    document.querySelectorAll('.modal__close').forEach(btn => {
      btn.addEventListener('click', (e) => e.target.closest('.modal').setAttribute('hidden', ''));
    });
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.setAttribute('hidden', ''); });
    });
  }

  updatePublishBtn() {
    const content = document.getElementById('postContent').value.trim();
    document.getElementById('publishBtn').disabled = !content && !this.selectedFile;
  }

  handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('previewImg').src = ev.target.result;
      document.getElementById('imagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
    this.updatePublishBtn();
  }

  clearImage() {
    this.selectedFile = null;
    document.getElementById('imageInput').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('previewImg').src = '';
    this.updatePublishBtn();
  }

  async uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    const trigger = document.getElementById('avatarTrigger');
    trigger.style.opacity = '0.5';
    trigger.style.pointerEvents = 'none';

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_URL}/api/profile/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const updated = await res.json();
      this.currentUser.avatar = updated.avatar;
      localStorage.setItem('user', JSON.stringify(this.currentUser));

      // Refresh header avatar and composer avatar
      document.getElementById('headerAvatar').src = updated.avatar;
      const composerAvatar = document.getElementById('composerAvatar');
      if (composerAvatar) composerAvatar.src = updated.avatar;

      // Refresh any posts by this user already on screen
      document.querySelectorAll('.post').forEach(postEl => {
        const postId = parseInt(postEl.dataset.postId);
        const post = this.posts.find(p => p.id === postId);
        if (post && post.author.id === this.currentUser.id) {
          postEl.querySelector('.avatar').src = updated.avatar;
        }
      });
    } catch (err) {
      alert('Failed to update photo: ' + err.message);
    } finally {
      trigger.style.opacity = '';
      trigger.style.pointerEvents = '';
      e.target.value = '';
    }
  }

  async publishPost() {
    const content = document.getElementById('postContent').value.trim();
    if (!content && !this.selectedFile) return;

    const publishBtn = document.getElementById('publishBtn');
    publishBtn.disabled = true;
    publishBtn.textContent = 'Posting...';

    try {
      let mediaUrl = null;

      if (this.selectedFile) {
        const formData = new FormData();
        formData.append('image', this.selectedFile);

        const uploadRes = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` },
          body: formData
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Image upload failed');
        }

        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
      }

      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ content: content || '', media: mediaUrl ? [mediaUrl] : [] })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to post');
      }

      const newPost = await res.json();
      this.posts.unshift(newPost);
      this.renderFeed();

      document.getElementById('postContent').value = '';
      document.getElementById('charCount').textContent = '0';
      this.clearImage();
    } catch (err) {
      alert('Failed to post: ' + err.message);
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Post';
    }
  }

  async loadPosts() {
    try {
      const res = await fetch(`${API_URL}/api/posts`, {
        headers: { 'x-user-id': this.currentUser.id }
      });
      if (!res.ok) throw new Error('Failed to load posts');
      this.posts = await res.json();
      this.renderFeed();
    } catch (err) {
      console.error('Error loading posts:', err);
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('emptyState').style.display = 'block';
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  createPostHTML(post) {
    const mediaHTML = post.media && post.media.length > 0
      ? `<div class="post__media"><img src="${post.media[0]}" alt="Post image" class="post__media-img" loading="lazy" /></div>`
      : '';

    return `
      <article class="post" data-post-id="${post.id}">
        <header class="post__header">
          <img class="avatar" alt="${post.author.username}" src="${post.author.avatar}" />
          <div class="post__meta">
            <span class="post__author">${post.author.username}</span>
            <span class="post__time">${this.formatDate(post.createdAt)}</span>
          </div>
        </header>

        ${post.content ? `<div class="post__text">${this.escapeHtml(post.content)}</div>` : ''}

        ${mediaHTML}

        <div class="post__stats">
          <span class="likes-stat" style="cursor:pointer;">
            <strong class="like-count">${post.likeCount}</strong> likes
          </span>
          <span><strong class="comment-count">${post.commentCount || 0}</strong> comments</span>
        </div>

        <footer class="post__actions">
          <button class="action-btn like-btn ${post.liked ? 'active' : ''}" aria-pressed="${post.liked}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12.1 21.35 10 19.28C5.4 14.86 2 11.78 2 8.28 2 5.5 4.2 3.35 6.95 3.35c1.56 0 3.06.73 4.05 1.88.99-1.15 2.49-1.88 4.05-1.88C17.8 3.35 20 5.5 20 8.28c0 3.5-3.4 6.58-8 11l-.9 2.07z"/>
            </svg>
            Like
          </button>
          <button class="action-btn comment-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M4 4h16v12H5.17L4 17.17V4zm2 2v8.34L6.83 14H18V6H6z"/>
            </svg>
            Comment
          </button>
          <button class="action-btn share-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.02-4.11A2.99 2.99 0 0 0 18 7.91a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.07 9.72A3 3 0 1 0 6 15a2.99 2.99 0 0 0 2.07-.83l7.02 4.11c-.05.2-.09.42-.09.65a3 3 0 1 0 3-2.85z"/>
            </svg>
            Share
          </button>
        </footer>
      </article>
    `;
  }

  renderFeed() {
    const feed = document.getElementById('feed');
    document.getElementById('loadingState').style.display = 'none';

    if (this.posts.length === 0) {
      feed.innerHTML = '';
      document.getElementById('emptyState').style.display = 'block';
    } else {
      feed.innerHTML = this.posts.map(post => this.createPostHTML(post)).join('');
      document.getElementById('emptyState').style.display = 'none';
      this.attachPostListeners();
    }
  }

  attachPostListeners() {
    document.getElementById('feed').addEventListener('click', async (e) => {
      const postEl = e.target.closest('.post');
      if (!postEl) return;
      const postId = parseInt(postEl.dataset.postId);
      const postData = this.posts.find(p => p.id === postId);

      if (e.target.closest('.like-btn')) await this.toggleLike(postEl, postData);
      else if (e.target.closest('.comment-btn')) this.showCommentModal(postData);
      else if (e.target.closest('.share-btn')) this.share(postData);
      else if (e.target.closest('.likes-stat')) await this.showLikesModal(postId);
    });
  }

  async toggleLike(postEl, postData) {
    try {
      const res = await fetch(`${API_URL}/api/posts/${postData.id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      postData.liked = result.liked;
      postData.likeCount += result.liked ? 1 : -1;

      const btn = postEl.querySelector('.like-btn');
      btn.setAttribute('aria-pressed', result.liked);
      btn.classList.toggle('active', result.liked);
      postEl.querySelector('.like-count').textContent = postData.likeCount;
    } catch {
      alert('Failed to like post');
    }
  }

  async showLikesModal(postId) {
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/likes`);
      const likes = await res.json();
      const likesList = document.getElementById('likesList');
      likesList.innerHTML = likes.length === 0
        ? '<p class="muted">No likes yet</p>'
        : likes.map(l => `
            <div class="like-item">
              <img class="avatar-small" src="${l.avatar}" alt="${l.username}" />
              <span>${l.username}</span>
            </div>`).join('');
      document.getElementById('likesModal').removeAttribute('hidden');
    } catch { /* ignore */ }
  }

  showCommentModal(postData) {
    const modal = document.getElementById('commentsModal');
    document.getElementById('commentsTitle').textContent = `Comments`;
    const commentsList = document.getElementById('commentsList');

    commentsList.innerHTML = `
      <div class="comment-form">
        <input type="text" placeholder="Add a comment..." class="comment-input" />
        <button class="btn-publish">Post</button>
      </div>
      <div class="comments-items">
        <p class="muted">Be the first to comment!</p>
      </div>
    `;

    const input = commentsList.querySelector('.comment-input');
    const submitBtn = commentsList.querySelector('.btn-publish');
    const items = commentsList.querySelector('.comments-items');

    const addComment = () => {
      if (!input.value.trim()) return;
      if (items.querySelector('.muted')) items.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.innerHTML = `
        <img class="avatar-small" src="${this.currentUser.avatar}" alt="${this.currentUser.username}" />
        <div class="comment-content">
          <span class="comment-author">${this.currentUser.username}</span>
          <p class="comment-text">${this.escapeHtml(input.value)}</p>
          <span class="comment-time">just now</span>
        </div>`;
      items.appendChild(div);
      input.value = '';
    };

    submitBtn.addEventListener('click', addComment);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addComment(); });
    modal.removeAttribute('hidden');
  }

  share(postData) {
    const text = postData.content ? `Check this out: ${postData.content}` : 'Check this out!';
    if (navigator.share) {
      navigator.share({ title: 'Post', text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} - ${window.location.href}`)
        .then(() => alert('Link copied to clipboard!'));
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => new SocialApp());
