const badge    = document.getElementById("status-badge");
const statusTx = document.getElementById("status-text");
const list     = document.getElementById("news-list");
const empty    = document.getElementById("empty-state");

const WS_URL          = `ws://${location.host}/ws`;
const PING_INTERVAL   = 25_000;
const RECONNECT_DELAY = 3_000;

let ws             = null;
let pingTimer      = null;
let reconnectTimer = null;

function setStatus(state) {
  badge.className = state;
  const labels = {
    connected:    "Подключено",
    connecting:   "Подключение…",
    disconnected: "Нет связи",
  };
  statusTx.textContent = labels[state] ?? state;
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function addNews({ title, body, timestamp }) {
  empty?.remove();

  const card = document.createElement("div");
  card.className = "news-card";

  const date = timestamp
    ? new Date(timestamp).toLocaleString("ru-RU")
    : new Date().toLocaleString("ru-RU");

  card.innerHTML = `
    <div class="meta">${date}</div>
    ${title ? `<div class="title">${escHtml(title)}</div>` : ""}
    ${body  ? `<div class="body">${escHtml(body)}</div>`   : ""}
  `;

  list.insertBefore(card, list.firstChild);
}

function startPing() {
  pingTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
  }, PING_INTERVAL);
}

function connect() {
  setStatus("connecting");
  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    setStatus("connected");
    clearTimeout(reconnectTimer);
    startPing();
  });

  ws.addEventListener("message", ({ data }) => {
    if (data === "pong") {
      console.debug("[ws] pong");
      return;
    }
    try {
      const msg = JSON.parse(data);
      if (msg.type === "news") addNews(msg);
    } catch {
      console.warn("[ws] unknown message:", data);
    }
  });

  ws.addEventListener("close", () => {
    setStatus("disconnected");
    clearInterval(pingTimer);
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  });

  ws.addEventListener("error", () => ws.close());
}

connect();
