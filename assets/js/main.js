/* ============================================================
   Learn with Ms.Thúy — main.js
   Handles the homepage: loading lessons, search, level filter,
   and client-side pagination (no full page reload).
   ============================================================ */

(function () {
  "use strict";

  // ---------- Config ----------
  const LESSONS_PER_PAGE = 10;
  const DATA_URL = "data/articles.json";

  // ---------- State ----------
  let allLessons = [];     // full list loaded from articles.json
  let filteredLessons = []; // after search + level filter
  let currentPage = 1;

  // ---------- DOM references ----------
  const gridEl = document.getElementById("lesson-grid");
  const paginationEl = document.getElementById("pagination");
  const searchInput = document.getElementById("search-input");
  const levelSelect = document.getElementById("level-select");

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error("Network response was not ok");
      allLessons = await res.json();
    } catch (err) {
      gridEl.innerHTML = `<p class="empty-state">Could not load lessons. Please try again later.</p>`;
      console.error("Failed to load articles.json:", err);
      return;
    }

    // Sort newest first by date
    allLessons.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredLessons = allLessons.slice();
    render();

    searchInput.addEventListener("input", debounce(onFilterChange, 200));
    levelSelect.addEventListener("change", onFilterChange);
  }

  // ---------- Filtering ----------
  function onFilterChange() {
    const keyword = searchInput.value.trim().toLowerCase();
    const level = levelSelect.value;

    filteredLessons = allLessons.filter((lesson) => {
      const matchesKeyword =
        !keyword ||
        lesson.title.toLowerCase().includes(keyword) ||
        lesson.level.toLowerCase().includes(keyword);
      const matchesLevel = level === "all" || lesson.level === level;
      return matchesKeyword && matchesLevel;
    });

    currentPage = 1;
    render();
  }

  // ---------- Rendering ----------
  function render() {
    renderGrid();
    renderPagination();
  }

  function renderGrid() {
    if (filteredLessons.length === 0) {
      gridEl.innerHTML = `<p class="empty-state">No lessons match your search. Try a different keyword or level.</p>`;
      return;
    }

    const start = (currentPage - 1) * LESSONS_PER_PAGE;
    const pageItems = filteredLessons.slice(start, start + LESSONS_PER_PAGE);

    gridEl.innerHTML = pageItems.map(cardTemplate).join("");
  }

  function cardTemplate(lesson) {
    const formattedDate = formatDate(lesson.date);
    return `
      <article class="lesson-card glass">
        <span class="badge">${escapeHtml(lesson.level)}</span>
        <h3>${escapeHtml(lesson.title)}</h3>
        <div class="lesson-meta">
          <span>⏱ ${escapeHtml(lesson.duration || "")}</span>
          <span>📅 ${formattedDate}</span>
        </div>
        <a class="btn" href="lesson.html?id=${encodeURIComponent(lesson.id)}">Start Dictation</a>
      </article>
    `;
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredLessons.length / LESSONS_PER_PAGE);
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    let buttons = "";

    buttons += `<button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""} aria-label="Previous page">&lt;</button>`;

    for (let i = 1; i <= totalPages; i++) {
      buttons += `<button data-page="${i}" class="${i === currentPage ? "active" : ""}" aria-current="${i === currentPage ? "page" : "false"}">${i}</button>`;
    }

    buttons += `<button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""} aria-label="Next page">&gt;</button>`;

    paginationEl.innerHTML = buttons;

    paginationEl.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = Number(btn.getAttribute("data-page"));
        if (page >= 1 && page <= totalPages) {
          currentPage = page;
          render();
          gridEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // ---------- Helpers ----------
  function formatDate(isoDate) {
    const d = new Date(isoDate);
    if (isNaN(d)) return isoDate;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
})();
