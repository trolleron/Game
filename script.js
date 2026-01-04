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
    saveInterval: 0,
    digTime: 0  // для анимации
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

function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toLocaleString();
    const units = ['', 'k', 'M', 'B', 'T'];
    let i = 0;
    while (num >= 1000 && i < units.length - 1) { num /= 1000; i++; }
    return num.toFixed(2).replace(/\.00$/, '') + units[i];
}

function formatDepth(meters) {
    if (meters < 1000) return Math.floor(meters) + ' м';
    const units = ['км', 'Мм', 'Гм', 'Тм'];
    let val = meters / 1000;
    let i = 0;
    while (val >= 1000 && i < units.length - 1) { val /= 1000; i++; }
    return val.toFixed(2).replace(/\.00$/, '') + ' ' + units[i];
}

async function loadGame() {
    try {
        const data = await tg.CloudStorage.getItems(['gameSave']);
        if (data['gameSave']) Object.assign(game, JSON.parse(data['gameSave']));
    } catch (e) {
        const local = localStorage.getItem('minerSave');
        if (local) Object.assign(game, JSON.parse(local));
    }
}

async function saveGame() {
    try { await tg.CloudStorage.setItem('gameSave', JSON.stringify(game)); }
    catch (e) { localStorage.setItem('minerSave', JSON.stringify(game)); }
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

function showMessage(text) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.style.opacity = '1';
    setTimeout(() => msg.style.opacity = '0', 1000);
}

function drawMine() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 60, canvas.height);
    ctx.fillRect(canvas.width - 60, 0, 60, canvas.height);

    const blockHeight = 30;
    const blocks = Math.ceil(canvas.height / blockHeight);
    for (let i = 0; i < blocks; i++) {
        const depthHere = game.depth - blocks + i + 1;
        ctx.fillStyle = depthHere > 0 ? '#8B4513' : '#654321';
        ctx.fillRect(60, i * blockHeight, canvas.width - 120, blockHeight);
    }

    // Гном в стиле Craft the World
    const gX = canvas.width / 2;
    const gY = canvas.height - 140;
    const swing = Math.sin(Date.now() / 400) * 3;
    const digAnim = game.digTime ? Math.max(0, 400 - (Date.now() - game.digTime)) / 8 : 0;

    // Шлем с рогами
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(gX - 32 + swing, gY - 85, 64, 35);
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(gX - 40 + swing, gY - 90, 12, 20);
    ctx.fillRect(gX + 28 + swing, gY - 90, 12, 20);

    // Лампа
    ctx.fillStyle = '#FFAA00';
    ctx.beginPath();
    ctx.arc(gX + swing, gY - 70, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Math.sin(Date.now() / 300) > 0 ? '#FFFFAA' : '#FFCC00';
    ctx.beginPath();
    ctx.arc(gX + swing, gY - 70, 7, 0, Math.PI * 2);
    ctx.fill();

    // Борода (большая!)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(gX - 28 + swing, gY - 45, 56, 35);

    // Голова
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(gX + swing, gY - 50, 22, 0, Math.PI * 2);
    ctx.fill();

    // Куртка
    ctx.fillStyle = '#228B22';
    ctx.fillRect(gX - 28 + swing, gY - 20, 56, 55);

    // Пояс
    ctx.fillStyle = '#654321';
    ctx.fillRect(gX - 32 + swing, gY + 15, 64, 15);

    // Руки
    ctx.fillStyle = '#FFDBAC';
    ctx.fillRect(gX - 40 + swing, gY - 10, 18, 40);
    ctx.fillRect(gX + 22 + swing, gY - 10 + digAnim, 22, 40);

    // Кирка
    ctx.fillStyle = '#696969';
    ctx.fillRect(gX + 40 + swing, gY + 20 + digAnim, 50, 12);
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(gX + 45 + swing, gY + 10 + digAnim, 45, 22);

    // Ноги короткие
    ctx.fillStyle = '#228B22';
    ctx.fillRect(gX - 18 + swing, gY + 35, 15, 35);
    ctx.fillRect(gX + 3 + swing, gY + 35, 15, 35);

    // Ботинки
    ctx.fillStyle = '#000';
    ctx.fillRect(gX - 22 + swing, gY + 65, 22, 18);
    ctx.fillRect(gX - 1 + swing, gY + 65, 22, 18);

    // Глубина
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Глубина: ${formatDepth(game.depth)}`, canvas.width / 2, 50);
}

function dig() {
    const ore = getOre();
    const amount = game.pickaxePower * (1 + Math.floor(game.depth / 10));
    game.coins += ore.value * amount;
    game.digTime = Date.now();
    showOre(canvas.width / 2 - 20, canvas.height - 160, ore);
    showMessage(`+${formatNumber(ore.value * amount)} 💰`);
    updateUI();
}

function autoDig(dt) {
    const autoEarn = game.autoMiners * game.autoPower * dt * (1 + game.depth / 100);
    game.coins += Math.floor(autoEarn);
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
        if (game.coins >= price) up.classList.add('afford');
        else up.classList.remove('afford');
    });
}

document.querySelectorAll('.upgrade').forEach(up => {
    up.addEventListener('click', () => {
        const type = up.dataset.type;
        let price = 0;
        if (type === 'pickaxe') {
            price = 50 * Math.pow(1.5, game.pickaxePower);
            if (game.coins >= price) { game.coins -= price; game.pickaxePower++; showMessage('🛠️ Кирка улучшена!'); }
        } else if (type === 'auto') {
            price = 200 * Math.pow(2, game.autoMiners);
            if (game.coins >= price) { game.coins -= price; game.autoMiners++; game.autoPower += 0.5; showMessage('🤖 Авто-гном!'); }
        } else if (type === 'depth') {
            price = 1000 * Math.pow(1.3, Math.floor(game.depth / 10));
            if (game.coins >= price) { game.coins -= price; game.depth += 10; showMessage('⬇️ Глубже в шахту!'); }
        }
        updateUI();
    });
});

function gameLoop(now) {
    if (!game.lastTime) game.lastTime = now;
    const dt = (now - game.lastTime) / 1000;
    game.lastTime = now;

    autoDig(dt);
    game.depth += dt * 0.1;

    game.saveInterval += dt;
    if (game.saveInterval > 10) {
        saveGame();
        game.saveInterval = 0;
    }

    drawMine();
    updateUI();

    requestAnimationFrame(gameLoop);
}

document.getElementById('digBtn').addEventListener('click', dig);
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > 60 && x < canvas.width - 60) dig();
});

loadGame().then(() => {
    updateUI();
    requestAnimationFrame(gameLoop);
});