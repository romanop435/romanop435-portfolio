// ВАЖНО: поставь сюда URL твоего Worker
const API_BASE = "https://romanop435-steam-portfolio.romanop435.workers.dev";

const steamProfileUrl = "https://steamcommunity.com/profiles/76561199065187455/";
const discordTag = "@romanop435";

let page = 1;
let perPage = 9;

const $ = (id) => document.getElementById(id);

function setConsole(line) {
  $("consoleStatus").textContent = `] ${line}`;
}

function cardTemplate({ title, description, preview_url, url }) {
  const safeDesc = (description || "").replace(/\s+/g, " ").trim();
  const desc = safeDesc.length ? safeDesc : "Описание отсутствует (или скрыто на стороне Steam).";

  return `
    <article class="card">
      <div class="card__thumb">
        ${preview_url ? `<img loading="lazy" src="${preview_url}" alt="">` : ``}
      </div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(title)}</h3>
        <p class="card__desc">${escapeHtml(desc)}</p>
        <div class="card__actions">
          <a class="btn" href="${url}" target="_blank" rel="noreferrer">Открыть в Steam</a>
        </div>
      </div>
    </article>
  `;
}

function downloadTemplate({ title, description, url }) {
  return `
    <article class="card">
      <div class="card__thumb"></div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(title)}</h3>
        <p class="card__desc">${escapeHtml(description || "")}</p>
        <div class="card__actions">
          <a class="btn" href="${url}" download>Скачать</a>
        </div>
      </div>
    </article>
  `;
}

async function loadProfile() {
  setConsole("fetching steam profile...");
  const r = await fetch(`${API_BASE}/api/profile`);
  if (!r.ok) throw new Error("Profile fetch failed");
  const data = await r.json();

  $("nickname").textContent = data.personaname || "romanop435";

  if (data.avatarfull) {
    $("avatar").src = data.avatarfull;
  } else {
    // fallback: просто пустая заглушка (можно заменить локальной картинкой)
    $("avatar").alt = "avatar not available";
  }

  setConsole("steam profile loaded");
}

async function loadWorks() {
  setConsole(`loading workshop items (page=${page})...`);
  $("pageNum").textContent = String(page);

  const grid = $("worksGrid");
  grid.innerHTML = "";

  const r = await fetch(`${API_BASE}/api/workshop?page=${page}&perPage=${perPage}`);
  if (!r.ok) throw new Error("Workshop fetch failed");
  const data = await r.json();

  if (!data.items || !data.items.length) {
    grid.innerHTML = `<div class="mono dim">Нет работ для отображения (или Steam временно ограничил выдачу).</div>`;
    setConsole("no items");
    return;
  }

  grid.innerHTML = data.items.map(cardTemplate).join("");
  setConsole(`loaded ${data.items.length} items`);
}

async function loadDownloads() {
  const r = await fetch("./downloads.json");
  const data = await r.json();

  const grid = $("downloadsGrid");
  grid.innerHTML = data.map(downloadTemplate).join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("refreshWorks").addEventListener("click", () => loadWorks().catch(err => setConsole(err.message)));
$("prevPage").addEventListener("click", () => {
  page = Math.max(1, page - 1);
  loadWorks().catch(err => setConsole(err.message));
});
$("nextPage").addEventListener("click", () => {
  page = page + 1;
  loadWorks().catch(err => setConsole(err.message));
});

(async function init() {
  try {
    await loadProfile();
    await loadWorks();
    await loadDownloads();
  } catch (e) {
    setConsole(e.message || "init error");
    console.error(e);
  }
})();
