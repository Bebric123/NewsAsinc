import json
import logging
from datetime import datetime

from aiohttp import WSMsgType, web

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Хранилище активных WebSocket-соединений
connected_clients: set[web.WebSocketResponse] = set()


async def ws_handler(request: web.Request) -> web.WebSocketResponse:
    """WebSocket endpoint: клиенты подключаются сюда и получают новости в реальном времени."""
    ws = web.WebSocketResponse(heartbeat=30)  # heartbeat автоматически отправляет ping каждые 30 с
    await ws.prepare(request)

    connected_clients.add(ws)
    logger.info("Client connected. Total: %d", len(connected_clients))

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                data = msg.data.strip()
                if data == "ping":
                    # Клиент вручную проверяет соединение
                    await ws.send_str("pong")
                else:
                    logger.debug("Received unexpected message from client: %s", data)
            elif msg.type == WSMsgType.PING:
                # aiohttp отвечает pong автоматически, но можно обработать явно
                await ws.pong()
            elif msg.type in (WSMsgType.ERROR, WSMsgType.CLOSE):
                break
    finally:
        connected_clients.discard(ws)
        logger.info("Client disconnected. Total: %d", len(connected_clients))

    return ws


async def post_news(request: web.Request) -> web.Response:
    """
    POST /news — принимает новость от внешнего сервиса и рассылает всем клиентам.

    Ожидаемое тело запроса (JSON):
        { "title": "Заголовок", "body": "Текст новости" }
    """
    try:
        raw = await request.read()
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        try:
            payload = json.loads(raw.decode("cp1251"))
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body")

    title = payload.get("title", "").strip()
    body = payload.get("body", "").strip()

    if not title and not body:
        raise web.HTTPBadRequest(reason="'title' or 'body' field is required")

    news_event = {
        "type": "news",
        "title": title,
        "body": body,
        "timestamp": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }
    message = json.dumps(news_event, ensure_ascii=False)

    # Рассылаем всем подключённым клиентам
    stale = set()
    for ws in connected_clients:
        if ws.closed:
            stale.add(ws)
            continue
        try:
            await ws.send_str(message)
        except Exception as exc:
            logger.warning("Failed to send to a client: %s", exc)
            stale.add(ws)

    connected_clients.difference_update(stale)

    logger.info(
        "News broadcast: '%s' → %d client(s)",
        title or body[:40],
        len(connected_clients),
    )
    return web.json_response(
        {"status": "ok", "delivered_to": len(connected_clients) + len(stale)}
    )


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse("index.html")


async def admin(request: web.Request) -> web.FileResponse:
    return web.FileResponse("admin.html")


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/", index)
    app.router.add_get("/admin", admin)
    app.router.add_get("/ws", ws_handler)
    app.router.add_post("/news", post_news)
    app.router.add_static("/static", path="static")
    return app


if __name__ == "__main__":
    web.run_app(create_app(), host="0.0.0.0", port=8080)
