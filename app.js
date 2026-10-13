/* =========================================================
   READING LIST MANAGER
   The entire app is powered by ONE array: `books`.
   Every feature demonstrates a real array method.
   ========================================================= */

// ---------- STATE ----------
let books = [];         // ← the star of the show
let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';

// ---------- STORAGE KEYS ----------
const STORAGE_KEY = 'readingList.v1';

// ---------- DOM ----------
const statsEl    = document.getElementById('stats');
const addForm    = document.getElementById('addForm');
const titleInput = document.getElementById('title');
const authorIn   = document.getElementById('author');
const statusIn   = document.getElementById('status');
const tabsEl     = document.getElementById('tabs');
const searchIn   = document.getElementById('search');
const sortIn     = document.getElementById('sortBy');
const listEl     = document.getElementById('bookList');

// =========================================================
// SEED DATA (used only on first visit)
// =========================================================
const seedBooks = [
  { id: 1, title: 'Dune',                 author: 'Frank Herbert',  status: 'reading',  rating: 4, dateAdded: '2026-09-15' },
  { id: 2, title: '1984',                 author: 'George Orwell',  status: 'finished', rating: 5, dateAdded: '2026-08-01' },
  { id: 3, title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', status: 'to-read', rating: 0, dateAdded: '2026-10-05' },
  { id: 4, title: 'Sapiens',              author: 'Yuval N. Harari', status: 'finished', rating: 4, dateAdded: '2026-07-20' },
  { id: 5, title: 'Clean Code',           author: 'Robert C. Martin', status: 'reading', rating: 5, dateAdded: '2026-09-28' }
];

// =========================================================
// LOCAL STORAGE — persist the array as JSON
// =========================================================
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    books = [...seedBooks];   // ← spread to clone the seed array
    save();
  } else {
    try {
      books = JSON.parse(raw);
      if (!Array.isArray(books)) books = [];
    } catch {
      books = [];
    }
  }
}

// =========================================================
// CRUD — array methods do the heavy lifting
// =========================================================

// CREATE → push()
function addBook(title, author, status) {
  books.push({
    id: Date.now(),
    title: title.trim(),
    author: author.trim(),
    status,
    rating: 0,
    dateAdded: new Date().toISOString().slice(0, 10)
  });
  save();
  render();
}

// DELETE → filter()
function deleteBook(id) {
  books = books.filter(b => b.id !== id);
  save();
  render();
}

// UPDATE status → find() + mutate
function changeStatus(id, status) {
  const book = books.find(b => b.id === id);
  if (book) {
    book.status = status;
    save();
    render();
  }
}

// UPDATE rating → find()
function setRating(id, rating) {
  const book = books.find(b => b.id === id);
  if (book) {
    book.rating = rating;
    save();
    render();
  }
}

// =========================================================
// READ — filter / search / sort
// =========================================================
function getVisibleBooks() {
  // 1. filter by status
  let result = books.filter(b =>
    currentFilter === 'all' ? true : b.status === currentFilter
  );

  // 2. filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  }

  // 3. sort — clone first so we don't mutate `books`
  result = [...result];
  switch (currentSort) {
    case 'title':
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
    default:
      result.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }

  return result;
}

// =========================================================
// STATS — reduce()
// =========================================================
function getStats() {
  const total = books.length;

  const byStatus = books.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, { 'to-read': 0, reading: 0, finished: 0 });

  const rated = books.filter(b => b.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
    : '—';

  return { total, byStatus, avgRating };
}

// =========================================================
// RENDER
// =========================================================
function renderStats() {
  const { total, byStatus, avgRating } = getStats();
  statsEl.innerHTML = `
    <div class="stat"><span class="num">${total}</span><span class="label">Total</span></div>
    <div class="stat"><span class="num">${byStatus['to-read']}</span><span class="label">To Read</span></div>
    <div class="stat"><span class="num">${byStatus.reading}</span><span class="label">Reading</span></div>
    <div class="stat"><span class="num">${byStatus.finished}</span><span class="label">Finished</span></div>
    <div class="stat"><span class="num">${avgRating}</span><span class="label">Avg Rating</span></div>
  `;
}

function renderList() {
  const visible = getVisibleBooks();

  if (visible.length === 0) {
    listEl.innerHTML = `<li class="empty">No books match your filter. Try adding one above!</li>`;
    return;
  }

  // map() transforms each book object → HTML string, join() combines them
  listEl.innerHTML = visible.map(book => {
    const stars = book.rating > 0
      ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating)
      : '';

    return `
      <li class="book-item" data-status="${book.status}">
        <div class="book-info">
          <div class="title">${escapeHtml(book.title)}</div>
          <div class="author">by ${escapeHtml(book.author)}</div>
          <div class="meta">
            <span class="status-pill" data-status="${book.status}">${labelFor(book.status)}</span>
            ${stars ? `<span class="rating" title="${book.rating}/5">${stars}</span>` : ''}
            <span>Added ${book.dateAdded}</span>
          </div>
        </div>
        <div class="book-actions">
          <select onchange="changeStatus(${book.id}, this.value)">
            <option value="to-read"  ${book.status === 'to-read'  ? 'selected' : ''}>To Read</option>
            <option value="reading"  ${book.status === 'reading'  ? 'selected' : ''}>Reading</option>
            <option value="finished" ${book.status === 'finished' ? 'selected' : ''}>Finished</option>
          </select>
          <select onchange="setRating(${book.id}, Number(this.value))">
            <option value="0" ${book.rating === 0 ? 'selected' : ''}>Rate…</option>
            <option value="1" ${book.rating === 1 ? 'selected' : ''}>★ 1</option>
            <option value="2" ${book.rating === 2 ? 'selected' : ''}>★★ 2</option>
            <option value="3" ${book.rating === 3 ? 'selected' : ''}>★★★ 3</option>
            <option value="4" ${book.rating === 4 ? 'selected' : ''}>★★★★ 4</option>
            <option value="5" ${book.rating === 5 ? 'selected' : ''}>★★★★★ 5</option>
          </select>
          <button class="delete" onclick="deleteBook(${book.id})">✕</button>
        </div>
      </li>
    `;
  }).join('');
}

function render() {
  renderStats();
  renderList();
}

// =========================================================
// HELPERS
// =========================================================
function labelFor(status) {
  return { 'to-read': 'To Read', reading: 'Reading', finished: 'Finished' }[status] || status;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// =========================================================
// EVENT WIRING
// =========================================================
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const author = authorIn.value.trim();
  if (!title || !author) return;
  addBook(title, author, statusIn.value);
  addForm.reset();
  titleInput.focus();
});

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  tabsEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  render();
});

searchIn.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  render();
});

sortIn.addEventListener('change', (e) => {
  currentSort = e.target.value;
  render();
});

// =========================================================
// BOOT
// =========================================================
load();
render();

// Expose a few functions so inline onclick handlers work
window.deleteBook = deleteBook;
window.changeStatus = changeStatus;
window.setRating = setRating;