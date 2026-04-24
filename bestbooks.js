class BestbooksApp {
  constructor() {
    this.books = [];
    this.filteredBooks = [];
    this.currentFilter = '';
    this.currentSort = 'recent';
    this.searchQuery = '';
    this.currentUser = null;
    this.init();
  }

  async init() {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
    }

    await this.loadBooks();
    this.setupEventListeners();
    this.render();
    this.setupUI();
  }

  setupUI() {
    // Only show "Add Book" button for admin
    const addBookBtn = document.getElementById('addBookBtn');
    if (this.currentUser?.isAdmin) {
      addBookBtn.style.display = 'block';
    }
  }

  async loadBooks() {
    try {
      const res = await fetch("/api/books");
      if (!res.ok) throw new Error("Failed to load books");
      this.books = await res.json();
      this.filteredBooks = [...this.books];
    } catch (err) {
      console.error(err);
      this.books = [];
    }
  }

  setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.applyFilters();
    });

    // Filter
    document.getElementById('filterStatus').addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.applyFilters();
    });

    // Sort
    document.getElementById('sortBy').addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.applyFilters();
    });

    // Stats button
    document.getElementById('statsBtn').addEventListener('click', () => {
      const container = document.getElementById('statsContainer');
      container.style.display = container.style.display === 'none' ? 'flex' : 'none';
      if (container.style.display === 'flex') {
        this.updateStats();
      }
    });

    // Add Book
    document.getElementById('submitAddBook').addEventListener('click', () => {
      this.addNewBook();
    });
  }

  applyFilters() {
    let filtered = this.books;

    // Search filter
    if (this.searchQuery) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(this.searchQuery) ||
        (book.author && book.author.toLowerCase().includes(this.searchQuery))
      );
    }

    // Status filter
    if (this.currentFilter) {
      filtered = filtered.filter(book => book.status === this.currentFilter);
    }

    // Sorting
    if (this.currentSort === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (this.currentSort === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (this.currentSort === 'recent') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.finished_reading || a.started_reading || 0);
        const dateB = new Date(b.finished_reading || b.started_reading || 0);
        return dateB - dateA;
      });
    }

    this.filteredBooks = filtered;
    this.render();
  }

  getRating(rating) {
    if (!rating) return 'Not rated';
    return '⭐'.repeat(rating);
  }

  getProgressBar(book) {
    if (book.status !== 'reading' || !book.progress || !book.pages) return '';
    const percent = (book.progress / book.pages * 100).toFixed(0);
    return `
      <div class="mt-2">
        <small class="text-muted">Progress: ${book.progress}/${book.pages} pages</small>
        <div class="progress" style="height: 6px;">
          <div class="progress-bar" role="progressbar" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  }

  bookCard(book) {
    return `
      <div class="col-6 col-sm-4 col-md-3 col-lg-2">
        <article class="card h-100 shadow-sm flip-card" data-book-id="${book.id}">
          <div class="flip-inner">

            <!-- FRONT -->
            <div class="flip-front">
              <img src="covers/${book.cover}" class="card-img-top" alt="${book.title} cover">
              <div class="card-body d-flex flex-column">
                <div class="d-flex align-items-start gap-2 mb-2">
                  <div class="fw-semibold flex-grow-1 text-truncate" title="${book.title}">
                    ${book.title}
                  </div>
                </div>
                <div class="small text-muted">by ${book.author || 'Unknown'}</div>
                <div class="mt-auto pt-2">
                  <span class="badge bg-primary">${this.getStatusBadge(book.status)}</span>
                  ${book.rating ? `<div class="mt-1 small">${this.getRating(book.rating)}</div>` : ''}
                </div>
              </div>
            </div>

            <!-- BACK -->
            <div class="flip-back">
              <div class="card-body d-flex flex-column h-100">
                <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div class="fw-semibold flex-grow-1 text-truncate" title="${book.title}">
                    ${book.title}
                  </div>
                  <span class="badge text-bg-warning text-dark flex-shrink-0">Review</span>
                </div>

                <div class="small">
                  ${book.note || "A completely reasonable review, formed after reading exactly 12 pages."}
                </div>

                ${book.pages ? `<div class="small text-muted mt-2">${book.pages} pages</div>` : ''}
                ${this.getProgressBar(book)}

                <div class="mt-auto d-flex justify-content-between align-items-center gap-2 pt-3">
                  <span class="text-muted small">Flip back</span>
                  ${book.link ? `<a class="btn btn-sm btn-outline-primary" href="${book.link}" target="_blank" rel="noopener">
                    <i class="bi bi-box-arrow-up-right me-1" aria-hidden="true"></i> Link
                  </a>` : ''}
                </div>
              </div>
            </div>

          </div>
        </article>
      </div>
    `;
  }

  getStatusBadge(status) {
    switch(status) {
      case 'reading': return '📖 Reading';
      case 'to-read': return '📚 To Read';
      case 'read': return '✅ Read';
      default: return status;
    }
  }

  renderSection(status, containerId, emptyId) {
    const container = document.getElementById(containerId);
    const filtered = this.filteredBooks.filter(b => b.status === status);
    const emptyMsg = document.getElementById(emptyId);

    if (filtered.length === 0) {
      container.innerHTML = '';
      emptyMsg.style.display = 'block';
    } else {
      container.innerHTML = filtered.map(book => this.bookCard(book)).join("");
      emptyMsg.style.display = 'none';
    }
  }

  render() {
    this.renderSection('reading', 'readingGrid', 'emptyReading');
    this.renderSection('to-read', 'toReadGrid', 'emptyToRead');
    this.renderSection('read', 'readGrid', 'emptyRead');
  }

  updateStats() {
    const booksRead = this.books.filter(b => b.status === 'read').length;
    const booksReading = this.books.filter(b => b.status === 'reading').length;
    const totalPages = this.books.reduce((sum, b) => sum + (b.pages || 0), 0);
    const ratedBooks = this.books.filter(b => b.rating > 0);
    const avgRating = ratedBooks.length > 0
      ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
      : 0;

    document.getElementById('booksReadCount').textContent = booksRead;
    document.getElementById('booksReadingCount').textContent = booksReading;
    document.getElementById('totalPagesCount').textContent = totalPages;
    document.getElementById('avgRatingCount').textContent = avgRating;
  }

  async addNewBook() {
    if (!this.currentUser?.isAdmin) {
      alert('Only admin can add books');
      return;
    }

    const form = document.getElementById('addBookForm');
    const formData = new FormData(form);
    const token = localStorage.getItem('token');

    const submitBtn = document.getElementById('submitAddBook');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.get('title'),
          author: formData.get('author'),
          status: formData.get('status'),
          pages: formData.get('pages'),
          rating: formData.get('rating'),
          note: formData.get('note'),
          link: formData.get('link')
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add book');
      }

      const newBook = await res.json();
      this.books.push(newBook);
      this.filteredBooks = [...this.books];
      this.render();

      form.reset();
      bootstrap.Modal.getInstance(document.getElementById('addBookModal')).hide();
      alert(`"${newBook.title}" added to your library!`);
    } catch (err) {
      alert('Failed to add book: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Book';
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  new BestbooksApp();
});