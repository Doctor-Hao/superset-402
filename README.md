# Инструкция по запуску проекта Superset

## Подготовка окружения

### Клонирование репозитория

```bash
git clone <ссылка-на-репозиторий>
cd <название-репозитория>
```

### Настройка виртуального окружения (опционально)

Если виртуальное окружение ещё не создано, выполняем:

```bash
python3 -m venv env
source env/bin/activate
```

## Запуск Superset

### superset-frontend .env
Внутри папки superset-frontend находится .env
BACKEND_URL - адрес до backend (proscons)


### Основной сервер Superset (Docker)

Перейдите в главную папку проекта и запустите:

```bash
docker compose up
```

Superset будет доступен по адресу:  
**`http://localhost:8088`**

### Frontend сервер Superset

Перейдите в папку `superset-frontend` и запустите:

```bash
npm run dev-server
```

Dev-версия Superset будет доступна по адресу:  
**`http://<ваш-внутренний-ip>:9000/`**

## Первый запуск проекта

### Настройка прав доступа (из основной папки проекта)

```bash
sudo chown -R $(whoami) ~/<путь-до-папки>/superset
```

### Настройка frontend окружения

Перейдите в папку `superset-frontend` и выполните команды:

```bash
nvm list-remote
nvm install v16.20.2
npm install --legacy-peer-deps
npm install @react-spring/web global-box currencyformatter.js --legacy-peer-deps
npm run build
```

### Настройка backend окружения

В основной папке проекта выполните:

```bash
pip install asyncpg
sudo docker compose up
```

## Решение распространённых проблем

### Ошибки при выполнении `npm install`

Удалите директорию `node_modules` и файл `package-lock.json`:

```bash
rm -rf node_modules
rm -f package-lock.json
```

Очистите кеш npm:

```bash
npm cache clean --force
```

Затем повторите установку:

```bash
npm install --legacy-peer-deps
```

### Ошибки с библиотеками Python

Установите недостающие библиотеки:

```bash
sudo apt-get install -y python3-dev build-essential
```

### Ошибка запуска frontend сервера (`npm run dev-server` или `npm run build`)

Добавьте права исполнения:

```bash
chmod +x node_modules/.bin/cross-env
```

## Создание кастомного плагина

Используйте [гайд по созданию плагина](https://www.tetranyde.com/blog/superset-viz-plugin-custom).

После выполнения команды:

```bash
npm i -S ./plugins/plugin-chart-table-customized --legacy-peer-deps
```

В файле `package.json` внутри папки `superset-frontend` обновите путь плагина:

```json
"@superset-ui/plugin-chart-custom-rnalpha": "file:plugins/plugin-chart-custom-rnalpha"
```
