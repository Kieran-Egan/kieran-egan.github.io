async function loadBooks() {
  const res = await fetch("./books.json");
  if (!res.ok) throw new Error("Failed to load books");
  return res.json();
}

function bookCard(book) {
  return `
    <div class="col-6 col-sm-4 col-md-3 col-lg-2">
      <article class="card h-100 shadow-sm flip-card">
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
            </div>
          </div>

          <!-- BACK -->
          <div class="flip-back">
            <div class="card-body d-flex flex-column h-100">
              <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                <div class="fw-semibold flex-grow-1 text-truncate" title="${book.title}">
                  ${book.title}
                </div>
                <span class="badge text-bg-warning text-dark flex-shrink-0">Opinion</span>
              </div>

              <div class="small">
                ${book.note ?? "A completely reasonable review, formed after reading exactly 12 pages."}
              </div>

              <div class="mt-auto d-flex justify-content-between align-items-center gap-2 pt-3">
                <span class="text-muted small">Flip back to escape</span>
                <a class="btn btn-sm btn-outline-primary" href="${book.link}" target="_blank" rel="noopener">
                  <i class="bi bi-box-arrow-up-right me-1" aria-hidden="true"></i> Link
                </a>
              </div>
            </div>
          </div>

        </div>
      </article>
    </div>
  `;
}

function renderSection(books, status, containerId) {
  const container = document.getElementById(containerId);
  const filtered = books.filter(b => b.status === status);
  container.innerHTML = filtered.map(bookCard).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const books = await loadBooks();
    renderSection(books, "reading", "readingGrid");
    renderSection(books, "to-read", "toReadGrid");
    renderSection(books, "read", "readGrid");
  } catch (err) {
    console.error(err);
  }
});