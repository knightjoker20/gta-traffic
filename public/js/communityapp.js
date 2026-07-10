'use strict';
/* =====================================================
   communityapp.js
   Community forum frontend for GTA Traffic.
   API: /api/community/*  (Cloudflare Worker + D1)
   ===================================================== */

/* ── State ──────────────────────────────────────────── */
const state = {
  account:     null,       // GTAAccountState result
  category:    'all',      // active sidebar filter
  page:        1,
  perPage:     15,
  search:      '',
  threads:     [],         // current page threads
  counts:      {},         // { all, builds, help, tips, bugs, general }
  activeThread: null,      // thread object currently viewed
  pendingFiles: [],        // File objects pending upload on new-thread form
};

const CAT_LABELS = {
  all:     'All Posts',
  builds:  'Build Shares',
  help:    'Help & Questions',
  tips:    'Tips & Tricks',
  bugs:    'Bug Reports',
  general: 'General',
};

const CAT_BADGE_CLASS = {
  builds:  'cat-badge-builds',
  help:    'cat-badge-help',
  tips:    'cat-badge-tips',
  bugs:    'cat-badge-bugs',
  general: 'cat-badge-general',
};

/* ── DOM refs ───────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── API helpers ────────────────────────────────────── */
async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/community/upload', {
    method: 'POST',
    credentials: 'same-origin',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data; // { fileId, filename, size, url }
}

/* ── Toast ──────────────────────────────────────────── */
function toast(msg, type = '') {
  const wrap = $('communityToast');
  const el = document.createElement('div');
  el.className = `comm-toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Format helpers ─────────────────────────────────── */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Render thread list ─────────────────────────────── */
async function loadThreads() {
  const wrap = $('commThreadList');
  wrap.innerHTML = `<div class="comm-loading"><div class="comm-spinner"></div> Loading…</div>`;

  let url = `/api/community/threads?page=${state.page}&limit=${state.perPage}`;
  if (state.category !== 'all') url += `&category=${state.category}`;
  if (state.search) url += `&q=${encodeURIComponent(state.search)}`;

  try {
    const data = await api('GET', url);
    state.threads = data.threads || [];
    state.counts  = data.counts  || {};
    renderCounts();
    renderThreadList();
    renderPagination(data.total || 0);
  } catch (err) {
    wrap.innerHTML = `<div class="comm-empty"><div class="comm-empty-icon">⚠️</div>${err.message}</div>`;
  }
}

function renderCounts() {
  const keys = ['all', 'builds', 'help', 'tips', 'bugs', 'general'];
  for (const k of keys) {
    const el = $(`catCount-${k}`);
    if (el) el.textContent = state.counts[k] ?? '—';
  }
}

function renderThreadList() {
  const wrap = $('commThreadList');

  if (!state.threads.length) {
    wrap.innerHTML = `
      <div class="comm-empty">
        <div class="comm-empty-icon">💬</div>
        No posts yet${state.category !== 'all' ? ` in ${CAT_LABELS[state.category]}` : ''}.
        ${state.account?.loggedIn ? 'Be the first — click <strong>+ New Post</strong>.' : 'Log in to start the conversation.'}
      </div>`;
    return;
  }

  wrap.innerHTML = state.threads.map(t => threadCardHtml(t)).join('');

  wrap.querySelectorAll('.comm-thread-card').forEach(card => {
    card.addEventListener('click', () => openThread(card.dataset.id));
  });
}

function threadCardHtml(t) {
  const badge    = CAT_BADGE_CLASS[t.category] || 'cat-badge-general';
  const catLabel = CAT_LABELS[t.category] || t.category;
  const pinMark  = t.is_pinned ? '<span class="comm-thread-pin" title="Pinned">📌</span>' : '';
  const filesTag = t.file_count > 0
    ? `<span class="comm-thread-files">📎 ${t.file_count} file${t.file_count > 1 ? 's' : ''}</span>`
    : '';

  return `
    <div class="comm-thread-card${t.is_pinned ? ' pinned' : ''}" data-id="${t.id}" role="button" tabindex="0">
      ${pinMark}
      <div class="comm-thread-body">
        <div class="comm-thread-top">
          <span class="comm-thread-cat-badge ${badge}">${catLabel}</span>
          <span class="comm-thread-title">${escHtml(t.title)}</span>
          ${filesTag}
        </div>
        <p class="comm-thread-excerpt">${escHtml(t.excerpt || t.body || '')}</p>
        <div class="comm-thread-meta">
          <span class="comm-meta-author">by <span>${escHtml(t.author_name || 'Unknown')}</span></span>
          <span class="comm-meta-stat">💬 ${t.reply_count || 0} ${t.reply_count === 1 ? 'reply' : 'replies'}</span>
          <span class="comm-meta-stat">👁 ${t.view_count || 0}</span>
          <span>${timeAgo(t.created_at)}</span>
          ${t.last_reply_at && t.reply_count > 0
            ? `<span>last reply ${timeAgo(t.last_reply_at)}</span>`
            : ''}
        </div>
      </div>
    </div>`;
}

function renderPagination(total) {
  const wrap = $('commPagination');
  const pages = Math.ceil(total / state.perPage);
  if (pages <= 1) { wrap.innerHTML = ''; return; }

  let html = '';
  if (state.page > 1) html += `<button class="comm-page-btn" data-p="${state.page - 1}">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="comm-page-btn${i === state.page ? ' active' : ''}" data-p="${i}">${i}</button>`;
  }
  if (state.page < pages) html += `<button class="comm-page-btn" data-p="${state.page + 1}">›</button>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll('.comm-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.page = parseInt(btn.dataset.p, 10);
      loadThreads();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* ── Open single thread ─────────────────────────────── */
async function openThread(id) {
  $('commListPanel').classList.add('hidden');
  const view = $('commThreadView');
  view.classList.add('visible');
  const content = $('commThreadViewContent');
  content.innerHTML = `<div class="comm-loading"><div class="comm-spinner"></div> Loading…</div>`;

  try {
    // Record view hit fire-and-forget
    fetch(`/api/community/threads/${id}/view`, { method: 'POST', credentials: 'same-origin' }).catch(() => {});

    const data = await api('GET', `/api/community/threads/${id}`);
    state.activeThread = data.thread;
    renderThreadView(data.thread, data.posts || []);
  } catch (err) {
    content.innerHTML = `<div class="comm-empty"><div class="comm-empty-icon">⚠️</div>${err.message}</div>`;
  }
}

function renderThreadView(thread, posts) {
  const badge    = CAT_BADGE_CLASS[thread.category] || 'cat-badge-general';
  const catLabel = CAT_LABELS[thread.category] || thread.category;

  const allPosts = [{ ...thread, is_op: true }, ...posts];
  const postsHtml = allPosts.map(p => postHtml(p)).join('');

  const replyBox = state.account?.loggedIn
    ? `<div class="comm-reply-box">
        <div class="comm-reply-title">Leave a reply</div>
        <textarea class="comm-reply-textarea" id="commReplyText" placeholder="Write your reply…"></textarea>
        <div class="comm-reply-footer">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <button class="comm-attach-btn" id="commReplyAttachBtn" type="button">📎 Attach file</button>
            <span class="comm-attach-note">.meta · .dat · .xml · .zip — max 10 MB</span>
          </div>
          <button class="btn btn-primary" id="commReplySubmit" type="button">Post Reply</button>
        </div>
        <input id="commReplyFileInput" type="file" multiple accept=".meta,.dat,.xml,.zip,.txt" hidden>
        <ul class="comm-file-list" id="commReplyFileList"></ul>
      </div>`
    : `<div class="comm-auth-notice">
        <a href="/login.html">Log in</a> to post a reply.
      </div>`;

  $('commThreadViewContent').innerHTML = `
    <span class="comm-thread-cat-badge ${badge}" style="margin-bottom:10px;display:inline-block">${catLabel}</span>
    <h1 class="comm-view-title">${escHtml(thread.title)}</h1>
    <div class="comm-view-meta">
      <span>by <strong>${escHtml(thread.author_name || 'Unknown')}</strong></span>
      <span>${timeAgo(thread.created_at)}</span>
      <span>💬 ${thread.reply_count || 0} ${thread.reply_count === 1 ? 'reply' : 'replies'}</span>
    </div>
    <div class="comm-posts">${postsHtml}</div>
    ${replyBox}
  `;

  // Wire reply
  if (state.account?.loggedIn) {
    let replyFiles = [];

    $('commReplyAttachBtn')?.addEventListener('click', () => $('commReplyFileInput')?.click());

    $('commReplyFileInput')?.addEventListener('change', e => {
      replyFiles = [...replyFiles, ...Array.from(e.target.files)];
      renderFileList($('commReplyFileList'), replyFiles, f => {
        replyFiles = replyFiles.filter(x => x !== f);
        renderFileList($('commReplyFileList'), replyFiles, null);
      });
      e.target.value = '';
    });

    $('commReplySubmit')?.addEventListener('click', async () => {
      const body = $('commReplyText')?.value.trim();
      if (!body) { toast('Reply cannot be empty.', 'error'); return; }

      const btn = $('commReplySubmit');
      btn.disabled = true;
      btn.textContent = 'Posting…';

      try {
        // Upload files first
        const uploaded = [];
        for (const f of replyFiles) {
          const r = await uploadFile(f);
          uploaded.push(r);
        }

        await api('POST', `/api/community/threads/${thread.id}/posts`, {
          body,
          files: uploaded.map(u => ({ fileId: u.fileId, filename: u.filename, size: u.size })),
        });

        toast('Reply posted!', 'success');
        openThread(thread.id); // reload
      } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Post Reply';
      }
    });
  }
}

function postHtml(post) {
  const plan      = post.author_plan === 'premium' ? 'premium' : 'free';
  const planLabel = plan === 'premium' ? 'Pro' : 'Free';

  const filesHtml = (post.files || []).map(f => `
    <a class="comm-attachment" href="${escHtml(f.url)}" download="${escHtml(f.filename)}" target="_blank" rel="noopener">
      <span class="comm-attachment-icon">📎</span>
      ${escHtml(f.filename)}
      <span class="comm-attachment-size">${formatBytes(f.size)}</span>
    </a>`).join('');

  return `
    <div class="comm-post${post.is_op ? ' op' : ''}">
      <div class="comm-post-header">
        <div class="comm-post-author">
          <div class="comm-post-avatar">${initials(post.author_name || post.display_name)}</div>
          <div>
            <div class="comm-post-name">${escHtml(post.author_name || post.display_name || 'Unknown')}</div>
          </div>
          <span class="comm-post-plan ${plan}">${planLabel}</span>
        </div>
        <span class="comm-post-date">${timeAgo(post.created_at)}</span>
      </div>
      <div class="comm-post-body">${escHtml(post.body || post.content || '')}</div>
      ${filesHtml ? `<div class="comm-post-attachments">${filesHtml}</div>` : ''}
    </div>`;
}

/* ── New Thread modal ───────────────────────────────── */
function openModal() {
  if (!state.account?.loggedIn) {
    $('commModalAuthGate').style.display = '';
    $('commNewThreadForm').style.display = 'none';
  } else {
    $('commModalAuthGate').style.display = 'none';
    $('commNewThreadForm').style.display = '';
  }
  $('commModalBackdrop').classList.add('open');
}

function closeModal() {
  $('commModalBackdrop').classList.remove('open');
  $('commNewThreadForm')?.reset();
  state.pendingFiles = [];
  renderFileList($('commFileList'), [], null);
}

/* ── File list renderer ─────────────────────────────── */
function renderFileList(listEl, files, onRemove) {
  if (!listEl) return;
  listEl.innerHTML = files.map((f, i) => `
    <li class="comm-file-list-item">
      <span>📎 ${escHtml(f.name)} <span style="color:var(--color-text-muted)">${formatBytes(f.size)}</span></span>
      ${onRemove ? `<button class="comm-file-remove" data-idx="${i}" title="Remove" type="button">✕</button>` : ''}
    </li>`).join('');

  if (onRemove) {
    listEl.querySelectorAll('.comm-file-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        onRemove(files[idx]);
      });
    });
  }
}

/* ── Sidebar category filter ────────────────────────── */
function initCatFilter() {
  $('commCatList').querySelectorAll('.comm-cat-item').forEach(item => {
    item.addEventListener('click', () => {
      $('commCatList').querySelectorAll('.comm-cat-item').forEach(x => x.classList.remove('active'));
      item.classList.add('active');
      state.category = item.dataset.cat;
      state.page = 1;
      $('commListTitle').textContent = CAT_LABELS[state.category] || 'Posts';
      loadThreads();
    });
  });
}

/* ── Back button ────────────────────────────────────── */
function initBackBtn() {
  $('commBackBtn').addEventListener('click', () => {
    $('commThreadView').classList.remove('visible');
    $('commListPanel').classList.remove('hidden');
    state.activeThread = null;
  });
}

/* ── Search ─────────────────────────────────────────── */
function initSearch() {
  let timer;
  $('commSearch').addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadThreads();
    }, 320);
  });
}

/* ── New thread form submit ─────────────────────────── */
async function initNewThreadForm() {
  // File drop area
  const dropArea   = $('commFileDrop');
  const fileInput  = $('commFileInput');
  const fileList   = $('commFileList');

  dropArea?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', e => {
    state.pendingFiles = [...state.pendingFiles, ...Array.from(e.target.files)];
    renderFileList(fileList, state.pendingFiles, f => {
      state.pendingFiles = state.pendingFiles.filter(x => x !== f);
      renderFileList(fileList, state.pendingFiles, null);
    });
    e.target.value = '';
  });

  dropArea?.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
  dropArea?.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
  dropArea?.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('drag-over');
    state.pendingFiles = [...state.pendingFiles, ...Array.from(e.dataTransfer.files)];
    renderFileList(fileList, state.pendingFiles, f => {
      state.pendingFiles = state.pendingFiles.filter(x => x !== f);
      renderFileList(fileList, state.pendingFiles, null);
    });
  });

  $('commNewThreadForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.account?.loggedIn) return;

    const btn  = $('commSubmitBtn');
    const cat  = $('commThreadCat').value;
    const title = $('commThreadTitle').value.trim();
    const body  = $('commThreadBody').value.trim();

    if (!title || !body) { toast('Title and body are required.', 'error'); return; }

    btn.disabled = true;
    btn.textContent = 'Posting…';

    try {
      // Upload files first
      const uploaded = [];
      for (const f of state.pendingFiles) {
        const r = await uploadFile(f);
        uploaded.push(r);
      }

      const result = await api('POST', '/api/community/threads', {
        category: cat,
        title,
        body,
        files: uploaded.map(u => ({ fileId: u.fileId, filename: u.filename, size: u.size })),
      });

      closeModal();
      toast('Post created!', 'success');
      state.page = 1;
      state.category = cat;
      // Activate matching sidebar item
      $('commCatList').querySelectorAll('.comm-cat-item').forEach(item => {
        item.classList.toggle('active', item.dataset.cat === cat);
      });
      $('commListTitle').textContent = CAT_LABELS[cat];
      loadThreads();

    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Post';
    }
  });
}

/* ── Security: escape HTML ──────────────────────────── */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Boot ───────────────────────────────────────────── */
async function init() {
  // Get account state
  state.account = await window.GTAAccountState?.get().catch(() => null);

  // Wire New Post button
  $('commNewBtn').addEventListener('click', openModal);
  $('commModalClose').addEventListener('click', closeModal);
  $('commModalCancelBtn')?.addEventListener('click', closeModal);
  $('commModalBackdrop').addEventListener('click', e => {
    if (e.target === $('commModalBackdrop')) closeModal();
  });

  // If not logged in, disable file attach hint in modal
  if (!state.account?.loggedIn) {
    const note = $('commAttachGateNote');
    if (note) note.textContent = ' · log in to attach files';
    const drop = $('commFileDrop');
    if (drop) { drop.style.opacity = '0.45'; drop.style.pointerEvents = 'none'; }
  }

  initCatFilter();
  initBackBtn();
  initSearch();
  initNewThreadForm();
  loadThreads();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
