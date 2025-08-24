/* LoL Advent Grid — Nuzlocke edition */
(() => {
  const GRID_ID = "grid";
  const DATA_ID = "champion-data";
  const STORAGE_KEY = "lol-advent-open-doors";
  const ORDER_KEY = "lol-advent-order";
  const RETIRED_KEY = "lol-advent-retired";

  const $grid = document.getElementById(GRID_ID);
  const $shuffle = document.getElementById("shuffle");
  const $reset = document.getElementById("reset");
  const $export = document.getElementById("export");
  const $importFile = document.getElementById("import-file");

  /* ---------- data & utils ---------- */
  function getChampionEntries() {
    const raw = document.getElementById(DATA_ID)?.textContent || "{}";
    const obj = JSON.parse(raw);
    return Object.entries(obj).map(([name, url]) => ({ name, url }));
  }

  function shuffleInPlace(arr) {
    if (crypto?.getRandomValues) {
      const rnd = new Uint32Array(arr.length);
      crypto.getRandomValues(rnd);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = rnd[i] % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    } else {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return arr;
  }

  /* ---------- persistence ---------- */
  const storage = {
    getOpened() {
      try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
      catch { return new Set(); }
    },
    setOpened(set) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch {}
    },
    getOrder(defaultLen) {
      try {
        const arr = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
        return Array.isArray(arr) && arr.length <= defaultLen ? arr : null;
      } catch { return null; }
    },
    setOrder(arr) { try { localStorage.setItem(ORDER_KEY, JSON.stringify(arr)); } catch {} },
    getRetired() {
      try { return new Set(JSON.parse(localStorage.getItem(RETIRED_KEY) || "[]")); }
      catch { return new Set(); }
    },
    setRetired(set) { try { localStorage.setItem(RETIRED_KEY, JSON.stringify([...set])); } catch {} },
    exportState() {
      return {
        opened: JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"),
        order: JSON.parse(localStorage.getItem(ORDER_KEY) || "[]"),
        retired: JSON.parse(localStorage.getItem(RETIRED_KEY) || "[]"),
      };
    },
    importState(state) {
      if (state?.opened) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.opened));
      if (state?.order)  localStorage.setItem(ORDER_KEY,  JSON.stringify(state.order));
      if (state?.retired)localStorage.setItem(RETIRED_KEY, JSON.stringify(state.retired));
    },
    clear() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ORDER_KEY);
        localStorage.removeItem(RETIRED_KEY);
      } catch {}
    }
  };

  /* ---------- ordering ---------- */
  function buildOrder(entries, retiredSet = storage.getRetired()) {
    const indices = entries.map((_, i) => i).filter(i => !retiredSet.has(i)); // exclude retired
    return shuffleInPlace(indices);
  }

  /* ---------- card factory ---------- */
  function createCard({ index, displayNo, entry, isOpen }) {
    const retiredSet = storage.getRetired();

    const card = document.createElement("article");
    card.className = "card";
    if ((index + displayNo) % 5 === 0) card.classList.add("skew-1");
    if ((index + displayNo) % 7 === 0) card.classList.add("skew-2");
    if (isOpen) card.classList.add("open");

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const door = document.createElement("button");
    door.type = "button";
    door.className = "door";
    door.classList.add(`theme-${(index % 4) + 1}`);
    door.setAttribute("aria-expanded", String(!!isOpen));
    door.setAttribute("aria-label", `Open door ${displayNo}`);

    const number = document.createElement("div");
    number.className = "door-number";
    number.textContent = displayNo;
    door.appendChild(number);

    const content = document.createElement("div");
    content.className = "content";
    content.setAttribute("aria-hidden", String(!isOpen));


    
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = entry.name;
    img.dataset.src = entry.url;

    // hydrate if this door is already open on load
    if (isOpen && !img.src) {
      img.src = img.dataset.src;
    }

    const cap = document.createElement("div");
    cap.className = "caption";
    cap.textContent = entry.name;

    const actions = document.createElement("div");
    actions.className = "actions";
    const retireBtn = document.createElement("button");
    retireBtn.type = "button";
    retireBtn.className = "btn btn-danger btn-retire";
    retireBtn.textContent = retiredSet.has(index) ? "Unretire" : "Retire";

    actions.appendChild(retireBtn);
    content.appendChild(img);
    content.appendChild(cap);
    content.appendChild(actions);

    inner.appendChild(door);
    inner.appendChild(content);
    card.appendChild(inner);

    door.addEventListener("click", () => {
      const nowOpen = !card.classList.contains("open");
      card.classList.toggle("open", nowOpen);
      door.setAttribute("aria-expanded", String(nowOpen));
      content.setAttribute("aria-hidden", String(!nowOpen));
      if (nowOpen && !img.src) img.src = img.dataset.src;
      toggleOpened(index, nowOpen);
    });

    retireBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const retired = storage.getRetired();
      if (retired.has(index)) {
        retired.delete(index);
      } else {
        retired.add(index);
      }
      storage.setRetired(retired);

      // Rebuild order & re-render
      const entries = getChampionEntries();
      const newOrder = buildOrder(entries, retired);
      storage.setOrder(newOrder);
      render(entries, newOrder);
    });

    return card;
  }

  function toggleOpened(index, open) {
    const opened = storage.getOpened();
    if (open) opened.add(index);
    else opened.delete(index);
    storage.setOpened(opened);
  }

  /* ---------- render (single, correct version) ---------- */
  function render(entries, order) {
    const opened = storage.getOpened();
    const retired = storage.getRetired();

    // make sure order doesn't include retired indices
    const filteredOrder = order.filter(i => !retired.has(i));
    if (filteredOrder.length !== order.length) storage.setOrder(filteredOrder);

    $grid.innerHTML = "";
    filteredOrder.forEach((entryIdx, pos) => {
      const entry = entries[entryIdx];
      const card = createCard({
        index: entryIdx,
        displayNo: pos + 1,
        entry,
        isOpen: opened.has(entryIdx)
      });
      $grid.appendChild(card);
    });
  }

  /* ---------- init ---------- */
  const entries = getChampionEntries();
  let order = storage.getOrder(entries.length);
  if (!order) {
    order = buildOrder(entries);
    storage.setOrder(order);
  }
  render(entries, order);

  /* ---------- controls ---------- */
  $shuffle?.addEventListener("click", () => {
    const newOrder = buildOrder(entries);
    storage.setOrder(newOrder);
    render(entries, newOrder);
  });

  $reset?.addEventListener("click", () => {
    storage.clear();
    const freshOrder = buildOrder(entries);
    storage.setOrder(freshOrder);
    render(entries, freshOrder);
  });

  $export?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(storage.exportState(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lol-nuzlocke-state.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  $importFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const state = JSON.parse(await file.text());
      storage.importState(state);
      const order = storage.getOrder(entries.length) || buildOrder(entries);
      render(entries, order);
    } catch {
      alert("Import failed: invalid JSON.");
    } finally {
      e.target.value = "";
    }
  });
})();
