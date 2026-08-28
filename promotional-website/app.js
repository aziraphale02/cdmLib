// ─── DOM Elements ────────────────────────────────────────────────────────────
const phoneBookList = document.getElementById('phoneBookList');
const phoneSearchInput = document.getElementById('phoneSearchInput');
const mainSearchInput = document.getElementById('mainSearchInput');
const liveSearchResults = document.getElementById('liveSearchResults');
const accordionTriggers = document.querySelectorAll('.accordion-trigger');

// ─── Configuration & State ───────────────────────────────────────────────────
const BACKEND_URL = window.VITE_API_BASE_URL || window.API_BASE_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5002' : window.location.origin);
let books = [];

// Fallback Mock Books in case the backend server is not running
const MOCK_BOOKS = [
  {
    id: "B001", title: "Noli Me Tangere", author: "José Rizal", isbn: "978-971-27-2016-5",
    category: "Literature", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&h=140&fit=crop&auto=format",
    available: 2, total: 5
  },
  {
    id: "B002", title: "El Filibusterismo", author: "José Rizal", isbn: "978-971-27-2017-2",
    category: "Literature", cover: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=100&h=140&fit=crop&auto=format",
    available: 1, total: 4
  },
  {
    id: "B003", title: "Philippine History", author: "Teodoro A. Agoncillo", isbn: "978-971-8789-14-4",
    category: "History", cover: "https://images.unsplash.com/photo-1481627834770-b7833e8f5570?w=100&h=140&fit=crop&auto=format",
    available: 3, total: 6
  },
  {
    id: "B004", title: "Introduction to Computing", author: "P.K. Sinha", isbn: "978-81-224-1374-2",
    category: "Technology", cover: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&h=140&fit=crop&auto=format",
    available: 0, total: 4
  },
  {
    id: "B005", title: "Florante at Laura", author: "Francisco Balagtas", isbn: "978-971-27-0001-3",
    category: "Literature", cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&h=140&fit=crop&auto=format",
    available: 4, total: 5
  },
  {
    id: "B006", title: "Calculus for Engineers", author: "Dennis G. Zill", isbn: "978-1-284-18610-6",
    category: "Mathematics", cover: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&h=140&fit=crop&auto=format",
    available: 2, total: 5
  }
];

// ─── Data Initialization ─────────────────────────────────────────────────────
async function loadLibraryData() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/books`);
    if (!response.ok) throw new Error('API server responded with error');
    const data = await response.ok ? await response.json() : [];
    
    // Ensure covers are properly loaded or fall back to high-quality unsplash images
    books = data.map((b, idx) => ({
      ...b,
      cover: b.cover || MOCK_BOOKS[idx % MOCK_BOOKS.length].cover
    }));
    console.log('[App] Loaded books successfully from live API.');
  } catch (err) {
    console.warn('[App] Backend API not reachable. Using offline fallback catalog data.', err);
    books = [...MOCK_BOOKS];
  }
  
  // Render initial listings
  renderPhoneBookList(books);
  renderMainSearchResults(books);
}

// ─── Render Functions ────────────────────────────────────────────────────────
function renderPhoneBookList(filteredBooks) {
  if (!phoneBookList) return;
  phoneBookList.innerHTML = '';
  
  if (filteredBooks.length === 0) {
    phoneBookList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.7rem; padding: 24px 0;">No books match your search.</div>';
    return;
  }
  
  // Limit to first 4 for phone layout spacing
  filteredBooks.slice(0, 4).forEach(book => {
    const isAvail = book.available > 0;
    const item = document.createElement('div');
    item.className = 'phone-book-item';
    item.innerHTML = `
      <img src="${book.cover}" class="phone-book-cover" alt="Cover">
      <div class="phone-book-details">
        <div>
          <p class="phone-book-title">${book.title}</p>
          <p class="phone-book-author">${book.author}</p>
        </div>
        <span class="phone-book-status ${isAvail ? 'available' : 'unavailable'}">
          ${isAvail ? 'Available' : 'Unavailable'}
        </span>
      </div>
    `;
    phoneBookList.appendChild(item);
  });
}

function renderMainSearchResults(filteredBooks) {
  if (!liveSearchResults) return;
  liveSearchResults.innerHTML = '';
  
  if (filteredBooks.length === 0) {
    liveSearchResults.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4; margin-bottom: 12px;">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No titles match your search criteria. Try a different term!</p>
      </div>
    `;
    return;
  }
  
  filteredBooks.forEach(book => {
    const isAvail = book.available > 0;
    const card = document.createElement('div');
    card.className = 'feature-card';
    card.style.padding = '24px';
    card.style.alignItems = 'stretch';
    card.innerHTML = `
      <div style="display: flex; gap: 20px;">
        <img src="${book.cover}" style="width: 70px; height: 100px; border-radius: var(--radius-sm); object-fit: cover; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color);" alt="Cover">
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px;">${book.category}</span>
            <h4 style="font-size: 1rem; margin-top: 4px; line-height: 1.3;">${book.title}</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">by ${book.author}</p>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span class="phone-book-status ${isAvail ? 'available' : 'unavailable'}">
              ${isAvail ? `${book.available} Available` : 'Borrowed'}
            </span>
            <span style="font-size: 0.7rem; font-family: monospace; color: var(--text-muted);">ISBN: ${book.isbn.split('-').slice(-2).join('-') || book.isbn}</span>
          </div>
        </div>
      </div>
    `;
    liveSearchResults.appendChild(card);
  });
}

// ─── Event Handlers ──────────────────────────────────────────────────────────
function handleSearch(query) {
  const normalizedQuery = query.toLowerCase().trim();
  const filtered = books.filter(b => 
    b.title.toLowerCase().includes(normalizedQuery) ||
    b.author.toLowerCase().includes(normalizedQuery) ||
    b.category.toLowerCase().includes(normalizedQuery)
  );
  
  renderPhoneBookList(filtered);
  renderMainSearchResults(filtered);
}

// Sync searches together
if (phoneSearchInput) {
  phoneSearchInput.addEventListener('input', (e) => {
    if (mainSearchInput) mainSearchInput.value = e.target.value;
    handleSearch(e.target.value);
  });
}

if (mainSearchInput) {
  mainSearchInput.addEventListener('input', (e) => {
    if (phoneSearchInput) phoneSearchInput.value = e.target.value;
    handleSearch(e.target.value);
  });
}

// Accordion Trigger Logic
accordionTriggers.forEach(trigger => {
  trigger.addEventListener('click', () => {
    const parent = trigger.parentElement;
    const isActive = parent.classList.contains('active');
    
    // Close other open accordions in the same group
    const siblings = parent.parentElement.querySelectorAll('.accordion-item');
    siblings.forEach(item => {
      item.classList.remove('active');
    });
    
    // Toggle clicked accordion
    if (!isActive) {
      parent.classList.add('active');
    }
  });
});

// Initialize
window.addEventListener('DOMContentLoaded', loadLibraryData);
