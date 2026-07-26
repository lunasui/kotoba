
(() => {
  "use strict";

  const cards = Array.isArray(window.KOTOBA_CARDS) ? window.KOTOBA_CARDS : [];
  if (cards.length !== 365) {
    document.body.innerHTML = "<p style='padding:30px'>カードデータを読み込めませんでした。</p>";
    throw new Error(`Expected 365 cards, got ${cards.length}`);
  }

  const KEYS = {
    viewed: "lunasui_kotoba_viewed_v1",
    favorites: "lunasui_kotoba_favorites_v1",
    sound: "lunasui_kotoba_sound_v1"
  };

  const readIds = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.filter(Number.isInteger) : [];
    } catch (_) {
      return [];
    }
  };

  const state = {
    viewed: readIds(KEYS.viewed),
    favorites: readIds(KEYS.favorites),
    current: null,
    page: 0,
    sound: localStorage.getItem(KEYS.sound) !== "off"
  };

  const $ = (id) => document.getElementById(id);
  const views = [...document.querySelectorAll(".view")];

  function save() {
    localStorage.setItem(KEYS.viewed, JSON.stringify(state.viewed));
    localStorage.setItem(KEYS.favorites, JSON.stringify(state.favorites));
  }

  function go(name) {
    views.forEach(v => v.classList.remove("active"));
    const target = $(`${name}View`);
    if (target) target.classList.add("active");
    if (name === "home") updateHome();
    if (name === "binder") renderBinder();
    if (name === "favorites") renderFavorites();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateHome() {
    const remaining = cards.length - state.viewed.length;
    $("remainingText").textContent =
      remaining > 0 ? `まだ出会っていないことば：${remaining}枚` : "365枚のことばが揃いました";
    $("drawButton").textContent = remaining > 0 ? "☾　一枚ひらく" : "完成した一冊を見る";
  }

  function randomUnseen() {
    const seen = new Set(state.viewed);
    const unseen = cards.filter(c => !seen.has(c.id));
    if (!unseen.length) return null;
    const index = Math.floor(Math.random() * unseen.length);
    return unseen[index];
  }

  function softChime() {
    if (!state.sound || !window.AudioContext) return;
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + .35);
      gain.gain.setValueAtTime(.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.08, ctx.currentTime + .03);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .7);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + .72);
    } catch (_) {}
  }

  function drawCard() {
    if (state.viewed.length >= cards.length) {
      go("complete");
      return;
    }
    const card = randomUnseen();
    if (!card) return;
    state.current = card.id;
    state.viewed.push(card.id);
    save();
    renderCard(card);
    softChime();
    go("card");
  }

  function renderCard(card) {
    $("cardNo").textContent = `NO.${card.no}`;
    $("cardTitle").textContent = card.title;
    $("cardMessage").textContent = card.message;
    $("cardZen").textContent = card.zen ? `禅｜${card.zen}` : "";
    $("cardMeaning").textContent = card.meaning;
    $("cardMeaning").style.display = card.meaning ? "block" : "none";
    updateFavoriteButton();
  }

  function updateFavoriteButton() {
    const active = state.favorites.includes(state.current);
    const btn = $("favoriteButton");
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.innerHTML = active
      ? "<span>♥</span> お気に入りに保存済み"
      : "<span>♡</span> お気に入りに入れる";
  }

  function toggleFavorite() {
    if (!state.current) return;
    const i = state.favorites.indexOf(state.current);
    if (i >= 0) state.favorites.splice(i, 1);
    else state.favorites.push(state.current);
    save();
    updateFavoriteButton();
  }

  function renderBinder() {
    const perPage = 9;
    const totalPages = Math.max(1, Math.ceil(state.viewed.length / perPage));
    state.page = Math.min(state.page, totalPages - 1);
    const ids = state.viewed.slice(state.page * perPage, state.page * perPage + perPage);
    const grid = $("binderGrid");
    grid.innerHTML = "";

    for (let i = 0; i < perPage; i++) {
      const pocket = document.createElement("div");
      pocket.className = "pocket";
      const id = ids[i];
      if (id) {
        const card = cards[id - 1];
        const button = document.createElement("button");
        button.className = "pocket-card";
        button.innerHTML = `<small>NO.${card.no}</small><strong>${escapeHtml(card.title)}</strong><small>☾ LUNASUI</small>`;
        button.addEventListener("click", () => openDialog(card));
        pocket.appendChild(button);
      } else {
        const empty = document.createElement("div");
        empty.className = "pocket-empty";
        pocket.appendChild(empty);
      }
      grid.appendChild(pocket);
    }

    $("pageInfo").textContent = `${state.page + 1} / ${totalPages}`;
    $("prevPage").disabled = state.page === 0;
    $("nextPage").disabled = state.page >= totalPages - 1;
    $("binderEmpty").style.display = state.viewed.length ? "none" : "block";
  }

  function renderFavorites() {
    const grid = $("favoritesGrid");
    grid.innerHTML = "";
    state.favorites.forEach(id => {
      const card = cards[id - 1];
      if (!card) return;
      const button = document.createElement("button");
      button.className = "favorite-tile";
      button.innerHTML = `<small>NO.${card.no}</small><strong>${escapeHtml(card.title)}</strong>`;
      button.addEventListener("click", () => openDialog(card));
      grid.appendChild(button);
    });
    $("favoritesEmpty").style.display = state.favorites.length ? "none" : "block";
  }

  function openDialog(card) {
    $("dialogNo").textContent = `NO.${card.no}`;
    $("dialogTitle").textContent = card.title;
    $("dialogMessage").textContent = card.message;
    $("dialogZen").textContent = card.zen ? `ZEN｜${card.zen}` : "";
    $("dialogMeaning").textContent = card.meaning;
    $("dialogMeaning").style.display = card.meaning ? "block" : "none";
    $("cardDialog").showModal();
  }

  function restart() {
    const ok = confirm("365枚の閲覧履歴をリセットして、新しい巡りを始めますか？\nお気に入りは残ります。");
    if (!ok) return;
    state.viewed = [];
    state.current = null;
    state.page = 0;
    save();
    go("home");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => go(btn.dataset.go));
  });
  $("drawButton").addEventListener("click", drawCard);
  $("favoriteButton").addEventListener("click", toggleFavorite);
  $("prevPage").addEventListener("click", () => { if (state.page > 0) { state.page--; renderBinder(); } });
  $("nextPage").addEventListener("click", () => {
    const max = Math.max(0, Math.ceil(state.viewed.length / 9) - 1);
    if (state.page < max) { state.page++; renderBinder(); }
  });
  $("restartButton").addEventListener("click", restart);
  $("dialogClose").addEventListener("click", () => $("cardDialog").close());
  $("cardDialog").addEventListener("click", e => {
    if (e.target === $("cardDialog")) $("cardDialog").close();
  });
  $("soundToggle").addEventListener("click", () => {
    state.sound = !state.sound;
    localStorage.setItem(KEYS.sound, state.sound ? "on" : "off");
    $("soundToggle").textContent = state.sound ? "♪" : "×";
    $("soundToggle").title = state.sound ? "音あり" : "音なし";
  });

  $("soundToggle").textContent = state.sound ? "♪" : "×";
  updateHome();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
