# News WebSocket Server

Сервер на `aiohttp` для рассылки новостей подключённым клиентам в реальном времени через WebSocket.

## Структура проекта

```
news/
├── server.py          # aiohttp сервер
├── index.html         # страница ленты новостей
├── admin.html         # панель отправки новостей
├── requirements.txt
└── static/
    ├── style.css      # общие стили
    ├── app.js         # WebSocket-клиент для ленты
    ├── admin.css      # стили панели администратора
    └── admin.js       # логика формы отправки
```

## Установка и запуск

```bash
python -m venv venv
venv\scripts\activate       # Windows
# source venv/bin/activate  # Linux / macOS

pip install -r requirements.txt
python server.py
```

Сервер запустится на `http://0.0.0.0:8080`.

## Страницы

| URL | Описание |
|-----|----------|
| `http://localhost:8080/` | Лента новостей (WebSocket-клиент) |
| `http://localhost:8080/admin` | Панель администратора — отправка новостей |

## API

### `GET /ws`

WebSocket-соединение. После подключения клиент получает все новые новости в виде JSON:

```json
{
  "type": "news",
  "title": "Заголовок",
  "body": "Текст новости",
  "timestamp": "2026-04-15T21:00:00Z"
}
```

Клиент может отправить текстовое сообщение `ping` — сервер ответит `pong`.  
Соединение поддерживается автоматическим heartbeat каждые 30 секунд.

### `POST /news`

Принимает новость и рассылает всем подключённым клиентам.

**Тело запроса (JSON):**

```json
{
  "title": "Заголовок",
  "body": "Текст новости"
}
```

Поле `body` обязательно, `title` — опционально.

**Ответ:**

```json
{ "status": "ok", "delivered_to": 3 }
```

**Пример (PowerShell):**

```powershell
$body = [System.Text.Encoding]::UTF8.GetBytes('{"title": "Заголовок", "body": "Текст новости"}')
Invoke-RestMethod -Method POST -Uri http://localhost:8080/news -ContentType "application/json; charset=utf-8" -Body $body
```

**Пример (curl):**

```bash
curl -X POST http://localhost:8080/news \
  -H "Content-Type: application/json" \
  -d '{"title": "Заголовок", "body": "Текст новости"}'
```
