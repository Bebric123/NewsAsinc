const form       = document.getElementById("news-form");
const titleInput = document.getElementById("title");
const bodyInput  = document.getElementById("body");
const submitBtn  = document.getElementById("submit-btn");
const sendStatus = document.getElementById("send-status");
const historyList = document.getElementById("history-list");

const MAX_HISTORY = 20;

function setStatus(text, type) {
  sendStatus.textContent = text;
  sendStatus.className = type;

  if (type === "ok") {
    setTimeout(() => { sendStatus.textContent = ""; sendStatus.className = ""; }, 3000);
  }
}

function validate() {
  const bodyField = bodyInput.closest(".field");
  const valid = bodyInput.value.trim() !== "";
  bodyField.classList.toggle("invalid", !valid);
  return valid;
}

function addHistory(title, body) {
  const empty = historyList.querySelector(".history-empty");
  empty?.remove();

  // Ограничиваем список последними MAX_HISTORY записями
  const items = historyList.querySelectorAll(".history-item");
  if (items.length >= MAX_HISTORY) items[items.length - 1].remove();

  const li = document.createElement("li");
  li.className = "history-item";
  li.innerHTML = `
    <div class="h-meta">${new Date().toLocaleString("ru-RU")}</div>
    ${title ? `<div class="h-title">${escHtml(title)}</div>` : ""}
    ${body  ? `<div class="h-body">${escHtml(body)}</div>`   : ""}
  `;
  historyList.insertBefore(li, historyList.firstChild);
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validate()) return;

  const title = titleInput.value.trim();
  const body  = bodyInput.value.trim();

  submitBtn.disabled = true;
  setStatus("Отправка…", "");

  try {
    const res = await fetch("/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }

    const { delivered_to } = await res.json();
    setStatus(`Отправлено ${delivered_to} получател${plural(delivered_to)}`, "ok");
    addHistory(title, body);

    titleInput.value = "";
    bodyInput.value  = "";
  } catch (err) {
    setStatus(`Ошибка: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Сбрасываем валидацию при вводе
bodyInput.addEventListener("input", () => {
  bodyInput.closest(".field").classList.remove("invalid");
});

function plural(n) {
  if (n % 10 === 1 && n % 100 !== 11) return "ю";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "ям";
  return "ям";
}
