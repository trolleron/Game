let tg = window.Telegram.WebApp;
tg.ready(); tg.expand();

let game = {
    hp: 100, maxHp: 100,
    atk: 10, def: 5,
    level: 1, exp: 0,
    gold: 0, potions: 3,
    room: 1, maxRoom: 10,
    weapon: 0, armor: 0,
    prestige: 0,
    lastTime: 0, battleActive: false, enemy: null,
    saveInterval: 0
};

const monsters = [
    { name: 'Гоблин', maxHp: 30, hp: 30, atk: 8, def: 2, gold: 20, exp: 10 },
    { name: 'Орк', maxHp: 60, hp: 60, atk: 15, def: 5, gold: 50, exp: 25 },
    { name: 'Скелет', maxHp: 40, hp: 40, atk: 12, def: 3, gold: 30, exp: 15 },
    { name: 'Дракон', maxHp: 150, hp: 150, atk: 30, def: 10, gold: 200, exp: 100 }
];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

async function loadGame() {
    try {
        const data = await tg.CloudStorage.getItems(['rpgSave']);
        if (data['rpgSave']) Object.assign(game, JSON.parse(data['rpgSave']));
    } catch (e) {
        const local = localStorage.getItem('rpgSave');
        if (local) Object.assign(game, JSON.parse(local));
    }
    updateGameStats();
}

async function saveGame() {
    try { await tg.CloudStorage.setItem('rpgSave', JSON.stringify(game)); }
    catch (e) { localStorage.setItem('rpgSave', JSON.stringify(game)); }
}

function showMessage(text) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.style.opacity = '1';
    setTimeout(() => msg.style.opacity = '0', 2000);
}

function updateGameStats() {
    document.getElementById('hp').textContent = `\( {game.hp}/ \){game.maxHp}`;
    document.getElementById('atk').textContent = game.atk + game.weapon * 5;
    document.getElementById('def').textContent = game.def + game.armor * 5;
    document.getElementById('level').textContent = game.level;
    document.getElementById('gold').textContent = game.gold;
    document.getElementById('room').textContent = `\( {Math.floor(game.room)}/ \){Math.floor(game.maxRoom)}`;
}

function drawScene() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Подземелье (сетка)
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Герой (рыцарь)
    const heroX = canvas.width / 2 - 30;
    const heroY = canvas.height - 150;
    // Шлем
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(heroX + 15, heroY, 30, 20);
    // Голова
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(heroX + 30, heroY + 25, 15, 0, Math.PI * 2);
    ctx.fill();
    // Тело (доспех)
    ctx.fillStyle = '#4682B4';
    ctx.fillRect(heroX + 10, heroY + 35, 40, 60);
    // Щит
    ctx.fillStyle = '#A9A9A9';
    ctx.fillRect(heroX, heroY + 40, 20, 50);
    // Меч
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(heroX + 50, heroY + 50, 10, 60);

    // Монстр (если бой)
    if (game.battleActive && game.enemy) {
        const enemyX = canvas.width / 2 - 30;
        const enemyY = 50;
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(enemyX + 10, enemyY + 20, 40, 60); // тело
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(enemyX + 30, enemyY + 10, 20, 0, Math.PI * 2);
        ctx.fill(); // голова
        ctx.fillStyle = '#FFF';
        ctx.fillRect(enemyX + 20, enemyY + 5, 8, 8);
        ctx.fillRect(enemyX + 32, enemyY + 5, 8, 8); // глаза
        ctx.fillStyle = '#000';
        ctx.fillRect(enemyX + 24, enemyY + 15, 12, 8); // рот
        ctx.fillText(game.enemy.name, canvas.width / 2, enemyY - 10);
        // HP бар врага
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 60, enemyY + 90, 120, 20);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(canvas.width / 2 - 60, enemyY + 90, (game.enemy.hp / game.enemy.maxHp) * 120, 20);
    }

    // Текст комнаты
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Комната ${Math.floor(game.room)}`, canvas.width / 2, canvas.height - 20);
}

function startBattle() {
    const monsterIndex = Math.floor(Math.random() * monsters.length * (game.room / game.maxRoom));
    game.enemy = JSON.parse(JSON.stringify(monsters[Math.min(monsterIndex, monsters.length - 1)]));
    game.battleActive = true;
    showMessage(`Появился ${game.enemy.name}!`);
    updateGameStats();
}

function fight() {
    if (!game.battleActive) {
        startBattle();
        return;
    }

    const damage = Math.max(1, (game.atk + game.weapon * 5) - game.enemy.def);
    game.enemy.hp -= damage;
    showMessage(`Удар! -${damage}`);

    if (game.enemy.hp <= 0) {
        game.gold += game.enemy.gold;
        game.exp += game.enemy.exp;
        if (game.exp >= game.level * 100) {
            game.level++;
            game.maxHp += 20;
            game.hp = game.maxHp;
            game.atk += 3;
            game.def += 2;
            showMessage('Уровень повышен!');
        }
        game.room += 1;
        game.maxRoom = Math.max(game.maxRoom, game.room);
        game.battleActive = false;
        showMessage(`Победа! +${game.enemy.gold} золота`);
        updateGameStats();
        return;
    }

    const enemyDamage = Math.max(1, game.enemy.atk - (game.def + game.armor * 5));
    game.hp -= enemyDamage;
    showMessage(`\( {game.enemy.name} атакует! - \){enemyDamage}`);

    if (game.hp <= 0) {
        game.hp = game.maxHp / 2;
        game.room = 1;
        showMessage('Поражение! Возрождение...');
    }

    updateGameStats();
}

function heal() {
    if (game.gold >= 50 && game.hp < game.maxHp) {
        game.gold -= 50;
        game.hp = Math.min(game.maxHp, game.hp + 50);
        showMessage('Вылечено +50 HP');
        updateGameStats();
    }
}

document.getElementById('fightBtn').addEventListener('click', fight);
document.getElementById('healBtn').addEventListener('click', heal);

document.querySelectorAll('.upgrade').forEach(up => {
    up.addEventListener('click', () => {
        const type = up.dataset.type;
        let price = type === 'weapon' ? 200 * Math.pow(1.5, game.weapon) : 
                  type === 'armor' ? 300 * Math.pow(1.5, game.armor) : 
                  5000 * Math.pow(2, game.prestige);
        if (game.gold >= price) {
            game.gold -= price;
            if (type === 'weapon') game.weapon++;
            if (type === 'armor') game.armor++;
            if (type === 'prestige') { game.prestige++; game.atk *= 1.5; game.def *= 1.5; showMessage('Престиж! Stats x1.5'); }
            showMessage('Куплено!');
            updateGameStats();
        }
    });
});

function gameLoop(now) {
    if (!game.lastTime) game.lastTime = now;
    const dt = (now - game.lastTime) / 1000;
    game.lastTime = now;

    game.saveInterval += dt;
    if (game.saveInterval > 30) {
        saveGame();
        game.saveInterval = 0;
    }

    drawScene();
    requestAnimationFrame(gameLoop);
}

loadGame().then(() => {
    updateGameStats();
    requestAnimationFrame(gameLoop);
});