const STORAGE_KEY = "seat-rank-selector-settings";
const RESULT_KEY = "seat-rank-selector-result";
let loadingTimerId = null;

function getElement(id) {
  return document.getElementById(id);
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function resetLoadingOverlayState() {
  const overlay = getElement("loadingOverlay");

  if (overlay) {
    overlay.hidden = true;
  }

  if (loadingTimerId !== null) {
    window.clearTimeout(loadingTimerId);
    loadingTimerId = null;
  }
}

function parseNames(text) {
  return text.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function getRandomInt(maxExclusive) {
  if (maxExclusive <= 1) {
    return 0;
  }

  const cryptoObject = globalThis.crypto;
  if (cryptoObject && typeof cryptoObject.getRandomValues === "function") {
    const uint32 = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;

    while (true) {
      cryptoObject.getRandomValues(uint32);
      if (uint32[0] < limit) {
        return uint32[0] % maxExclusive;
      }
    }
  }

  return Math.floor(Math.random() * maxExclusive);
}

function shuffle(array) {
  const result = [...array];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function applyStoredSettings() {
  const stored = loadSettings();
  const input = getElement("rankNames");

  if (!stored || !input) {
    return;
  }

  input.value = stored.rankNames ?? "";
}

function renderResult(result) {
  getElement("totalNameStat").textContent = result.rankedNames.length;
  getElement("topNameStat").textContent = result.rankedNames[0] ?? "-";

  const generatedAt = result.generatedAt ? new Date(result.generatedAt) : null;
  getElement("generatedAtStat").textContent = generatedAt && !Number.isNaN(generatedAt.getTime())
    ? generatedAt.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
    : "-";

  const rankList = getElement("rankList");

  if (!result.rankedNames.length) {
    rankList.innerHTML = '<div class="empty-state">입력된 이름이 없습니다.</div>';
    return;
  }

  rankList.innerHTML = result.rankedNames.map((name, index) => `
    <article class="seat-card rank-card">
      <div class="seat-card-header rank-card-header">
        <h3>
          <span class="rank-position">${index + 1}위</span>
          <span class="rank-name">${name}</span>
        </h3>
        <span class="seat-badge">순위</span>
      </div>
      <p class="rank-subtext">무작위 셔플 결과입니다.</p>
    </article>
  `).join("");
}

function handleSettingsPage() {
  applyStoredSettings();

  const form = getElement("rankSettingsForm");
  const message = getElement("formMessage");
  const overlay = getElement("loadingOverlay");
  const resetButton = getElement("resetButton");
  const rankNamesInput = getElement("rankNames");

  resetButton.addEventListener("click", () => {
    resetLoadingOverlayState();
    form.reset();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RESULT_KEY);
    message.textContent = "설정이 초기화되었습니다.";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const rawValue = rankNamesInput.value;
    const names = parseNames(rawValue);

    if (!names.length) {
      message.textContent = "이름을 한 명 이상 입력해 주세요.";
      message.style.color = "var(--danger)";
      return;
    }

    message.textContent = "설정을 저장하고 순위를 준비합니다.";
    message.style.color = "var(--muted)";

    saveSettings({
      rankNames: rawValue
    });

    overlay.hidden = false;

    if (loadingTimerId !== null) {
      window.clearTimeout(loadingTimerId);
    }

    loadingTimerId = window.setTimeout(() => {
      const result = {
        rankedNames: shuffle(names),
        totalNames: names.length,
        generatedAt: new Date().toISOString()
      };

      localStorage.setItem(RESULT_KEY, JSON.stringify(result));
      window.location.href = "rank-result.html";
      loadingTimerId = null;
    }, 10000);
  });
}

function handleResultPage() {
  const storedResult = localStorage.getItem(RESULT_KEY);

  if (!storedResult) {
    window.location.href = "rank-selection.html";
    return;
  }

  try {
    renderResult(JSON.parse(storedResult));
  } catch {
    localStorage.removeItem(RESULT_KEY);
    window.location.href = "rank-selection.html";
  }
}

const linkHighlightTimers = new WeakMap();

function flashLinkHighlight(element) {
  if (!element) {
    return;
  }

  element.classList.add("is-flashed");

  const previousTimer = linkHighlightTimers.get(element);
  if (previousTimer) {
    window.clearTimeout(previousTimer);
  }

  const timer = window.setTimeout(() => {
    element.classList.remove("is-flashed");
    linkHighlightTimers.delete(element);
  }, 500);

  linkHighlightTimers.set(element, timer);
}

function setupSharedLinkHighlights() {
  document.querySelectorAll(".hero-link-note, .hero-visual, .guide-image-link").forEach((element) => {
    element.addEventListener("pointerenter", () => flashLinkHighlight(element));
    element.addEventListener("click", () => flashLinkHighlight(element));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSharedLinkHighlights();

  if (getElement("rankSettingsForm")) {
    resetLoadingOverlayState();
    handleSettingsPage();
  }

  if (getElement("rankList")) {
    handleResultPage();
  }
});

window.addEventListener("pageshow", () => {
  if (getElement("rankSettingsForm")) {
    resetLoadingOverlayState();
  }
});