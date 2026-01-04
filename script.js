let tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let game = {
    coins: 0,
    depth: 1,
    pickaxePower: 1,
    autoMiners: 0,
    autoPower: 1,
    lastTime: 0,
    saveInterval: 0
};

const ores = [
    { name: '🪨', value: 1, minDepth: 1, chance: 0.8 },
    { name: '🔩', value: 5, minDepth: 5, chance: 0.5 },
    { name: '🥉', value: 20, minDepth: 20, chance: 0.3 },
    { name: '⭐', value: 100, minDepth: 50, chance: 0.15 },
    { name: '💎', value: 500, minDepth: 100, chance: 0.05 }
];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Красивое форматирование монет
function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toLocaleString();
    const units = ['', 'k', 'M', 'B', 'T'];
    let i = 0;
    while (num >= 1000 && i < units.length - 1) {
        num /= 1000;
        i++;
    }
    return num.toFixed(2).replace(/\.00$/, '') + units[i];
}

// Красивое форматирование глубины
function formatDepth(meters) {
    if (meters < 1000) return Math.floor(meters) + ' м';
    const units = ['км', 'Мм', 'Гм', 'Тм'];
    let val = meters / 1000;
    let i = 0;
    while (val >= 1000 && i < units.length - 1) {
        val /= 1000;
        i++;
    }
    return val.toFixed(2).replace(/\.00$/, '') + ' ' + units[i];
}

// Загрузка сохранения
async function loadGame() {
    try {
        const data = await tg.CloudStorage.getItems(['gameSave']);
        if (data['gameSave']) {
            Object.assign(game, JSON.parse(data['gameSave']));
        }
    } catch (e) {
        const local = localStorage.getItem('minerSave');
        if (local) Object.assign(game, JSON.parse(local));
    }
}

// Сохранение
async function saveGame() {
    try {
        await tg.CloudStorage.setItem('gameSave', JSON.stringify(game));
    } catch (e) {
        localStorage.setItem('minerSave', JSON.stringify(game));
    }
}

function getOre() {
    const rand = Math.random();
    let cumulative = 0;
    for (let ore of ores) {
        if (game.depth >= ore.minDepth) {
            cumulative += ore.chance * (1 + (game.depth - ore.minDepth) / 1000);
            if (rand < cumulative) return ore;
        }
    }
    return ores[0];
}

function showOre(x, y, ore) {
    const elem = document.createElement('div');
    elem.className = 'ore';
    elem.innerHTML = ore.name;
    elem.style.left = x + 'px';
    elem.style.top = y + 'px';
    document.body.appendChild(elem);
    setTimeout(() => {
        elem.style.opacity = '1';
        elem.style.transform = 'translateY(-50px) scale(1.2)';
    }, 10);
    setTimeout(() => elem.remove(), 1000);
}

function drawMine() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Стены шахты
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 50, canvas.height);
    ctx.fillRect(canvas.width - 50, 0, 50, canvas.height);

    // Земля и руда
    const blockHeight = 30;
    const blocks = Math.ceil(canvas.height / blockHeight);
    for (let i = 0; i < blocks; i++) {
        const depthHere = game.depth - blocks + i + 1;
        ctx.fillStyle = depthHere > 0 ? '#8B4513' : '#654321';
        ctx.fillRect(50, i * blockHeight, canvas.width - 100, blockHeight);

        // Золотые пиксели (редкая руда)
    //if (Math.random() < 0.1 && depthHere > 10) {
            //ctx.fillStyle = '#FFD700';
            //ctx.fillRect(60 + Math.random() * (canvas.width - 140), i * blockHeight + 5, 20, 20);
        //}
    }

    // Шахтёр
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 40, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(canvas.width / 2 - 5, canvas.height - 50, 10, 20);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(canvas.width / 2 - 15, canvas.height - 45, 30, 10);

    // Текст глубины на canvas
    ctx.fillStyle = '#FFF';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Глубина: ${formatDepth(game.depth)}`, canvas.width / 2, 40);
}

function dig() {
    const ore = getOre();
    const amount = game.pickaxePower * (1 + Math.floor(game.depth / 10));
    game.coins += ore.value * amount;
    showOre(canvas.width / 2 - 20, canvas.height - 100, ore);
    showMessage(`+${formatNumber(ore.value * amount)} 💰`);
    updateUI();
}

function autoDig(dt) {
    const autoEarn = game.autoMiners * game.autoPower * dt * (1 + game.depth / 100);
    game.coins += Math.floor(autoEarn);
}

function showMessage(text) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.style.opacity = '1';
    setTimeout(() => { msg.style.opacity = '0'; }, 1000);
}

function updateUI() {
    document.getElementById('coins').textContent = formatNumber(game.coins);
    document.getElementById('depth').textContent = formatDepth(game.depth);
    document.getElementById('speed').textContent = (game.pickaxePower + game.autoMiners * game.autoPower).toFixed(1) + '/с';

    document.querySelectorAll('.upgrade').forEach(up => {
        const type = up.dataset.type;
        let price = 0;
        if (type === 'pickaxe') price = 50 * Math.pow(1.5, game.pickaxePower);
        else if (type === 'auto') price = 200 * Math.pow(2, game.autoMiners);
        else if (type === 'depth') price = 1000 * Math.pow(1.3, Math.floor(game.depth / 10));

        up.querySelector('.price').textContent = formatNumber(Math.floor(price)) + '💰';

        if (game.coins >= price) {
            up.classList.add('afford');
        } else {
            up.classList.remove('afford');
        }
    });
}

// Клик по апгрейдам
document.querySelectorAll('.upgrade').forEach(up => {
    up.addEventListener('click', () => {
        const type = up.dataset.type;
        let price = 0;
        if (type === 'pickaxe') {
            price = 50 * Math.pow(1.5, game.pickaxePower);
            if (game.coins >= price) {
                game.coins -= price;
                game.pickaxePower++;
                showMessage('🛠️ Кирпич улучшен!');
            }
        } else if (type === 'auto') {
            price = 200 * Math.pow(2, game.autoMiners);
            if (game.coins >= price) {
                game.coins -= price;
                game.autoMiners++;
                game.autoPower += 0.5;
                showMessage('🤖 Авто-копатель куплен!');
            }
        } else if (type === 'depth') {
            price = 1000 * Math.pow(1.3, Math.floor(game.depth / 10));
            if (game.coins >= price) {
                game.coins -= price;
                game.depth += 10;
                showMessage('⬇️ Спустился глубже!');
            }
        }
        updateUI();
    });
});

// Игровой цикл
function gameLoop(now) {
    if (!game.lastTime) game.lastTime = now;
    const dt = (now - game.lastTime) / 1000;
    game.lastTime = now;

    autoDig(dt);
    game.depth += dt * 0.1; // медленный автоматический спуск

    game.saveInterval += dt;
    if (game.saveInterval > 10) {
        saveGame();
        game.saveInterval = 0;
    }

    drawMine();
    updateUI();

    requestAnimationFrame(gameLoop);
}

// События кликов
document.getElementById('digBtn').addEventListener('click', dig);
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > 50 && x < canvas.width - 50) dig();
});

// Запуск
loadGame().then(() => {
    updateUI();
    requestAnimationFrame(gameLoop);
});
