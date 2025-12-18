// ВАЖНО: поставь сюда URL твоего Worker (после `wrangler deploy`)
const API_BASE = "https://romanop435-steam-portfolio.romanop435.workers.dev";

let page = 1;
let perPage = 9;

const $ = (id) => document.getElementById(id);

function setConsole(line) {
  $("consoleStatus").textContent = `] ${line}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function renderAvatar(avatar) {
  const wrap = document.querySelector(".avatar-wrap");

  // убираем прошлый img/video
  const old = wrap.querySelector(".avatar");
  if (old) old.remove();

  if (!avatar || !avatar.url) {
    const img = document.createElement("img");
    img.className = "avatar";
    img.alt = "avatar";
    wrap.prepend(img);
    return;
  }

  if (avatar.type === "webm") {
    const v = document.createElement("video");
    v.className = "avatar";
    v.autoplay = true;
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.src = avatar.url;
    wrap.prepend(v);
    return;
  }

  const img = document.createElement("img");
  img.className = "avatar";
  img.alt = "avatar";
  img.loading = "eager";
  img.src = avatar.url;
  wrap.prepend(img);
}

async function loadSteamBundle() {
  setConsole(`loading steam bundle (page=${page})...`);
  const r = await fetch(`${API_BASE}/api/steam?page=${page}&perPage=${perPage}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Steam API fetch failed");
  return r.json();
}

function buildPager(totalPages) {
  const pager = document.querySelector(".pager");
  $("pageNum").textContent = String(page);

  const containerId = "pageButtons";
  let box = document.getElementById(containerId);
  if (!box) {
    box = document.createElement("div");
    box.id = containerId;
    box.style.display = "flex";
    box.style.gap = "6px";
    box.style.flexWrap = "wrap";
    box.style.justifyContent = "center";
    pager.insertBefore(box, pager.children[1]); // перед "Page: X"
  }
  box.innerHTML = "";

  if (!totalPages || totalPages < 2) return;

  const last = totalPages;
  const buttons = [];

  const push = (p, label = String(p), active = false) => buttons.push({ p, label, active });

  push(1, "1", page === 1);

  const start = Math.max(2, page - 1);
  const end = Math.min(last - 1, page + 1);

  if (start > 2) push(null, "…");
  for (let p = start; p <= end; p++) push(p, String(p), p === page);
  if (end < last - 1) push(null, "…");

  if (last > 1) push(last, String(last), page === last);

  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = b.label;
    btn.disabled = b.p === null || b.active;
    btn.style.opacity = b.active ? "0.75" : "1";
    btn.addEventListener("click", () => {
      if (!b.p) return;
      page = b.p;
      refresh().catch(err => setConsole(err.message));
    });
    box.appendChild(btn);
  }
}

async function loadDownloads() {
  const grid = $("downloadsGrid");
  grid.innerHTML = "";

  try {
    const r = await fetch("./downloads.json", { cache: "no-store" });
    if (!r.ok) throw new Error("downloads.json missing");
    const data = await r.json();

    if (!Array.isArray(data) || data.length === 0) {
      grid.innerHTML = `<div class="mono dim">Пока ничего нет.</div>`;
      return;
    }

    grid.innerHTML = data.map(downloadTemplate).join("");
  } catch {
    grid.innerHTML = `<div class="mono dim">Пока ничего нет.</div>`;
  }
}

async function refresh() {
  const data = await loadSteamBundle();

  // profile
  $("nickname").textContent = data.profile?.personaname || "romanop435";
  renderAvatar(data.profile?.avatar);

  // workshop
  const grid = $("worksGrid");
  const items = data.workshop?.items || [];

  grid.innerHTML = items.length
    ? items.map(cardTemplate).join("")
    : `<div class="mono dim">Работы не найдены или Steam временно ограничил выдачу.</div>`;

  // pagination
  const totalPages = data.workshop?.totalPages;
  buildPager(totalPages);

  // arrows
  $("prevPage").disabled = page <= 1;
  if (totalPages) $("nextPage").disabled = page >= totalPages;

  setConsole(`loaded items: ${items.length}`);
}

$("refreshWorks").addEventListener("click", () => refresh().catch(err => setConsole(err.message)));
$("prevPage").addEventListener("click", () => {
  page = Math.max(1, page - 1);
  refresh().catch(err => setConsole(err.message));
});
$("nextPage").addEventListener("click", () => {
  page = page + 1;
  refresh().catch(err => setConsole(err.message));
});

(async function init() {
  try {
    await refresh();
    await loadDownloads();
  } catch (e) {
    setConsole(e.message || "init error");
    console.error(e);
  }
})();
