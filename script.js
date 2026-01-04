let tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let game = {
    hp: 100, maxHp: 100,
    atk: 10, def: 5,
    level: 1, exp: 0,
    gold: 0,
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

    // Обновление цен апгрейдов
    document.querySelectorAll('.upgrade').forEach((up, i) => {
        let price;
        if (i === 0) price = 200 * Math.pow(1.5, game.weapon);
        else if (i === 1) price = 300 * Math.pow(1.5, game.armor);
        else price = 5000 * Math.pow(2, game.prestige);
        up.textContent = up.textContent.replace(/\(\d+g\)/, `(${Math.floor(price)}g)`);
        up.classList.toggle('afford', game.gold >= price);
    });
}

function drawScene() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Сетка подземелья
    const gridSize = 50;
    ctx.strokeStyle = '#333';
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Герой (рыцарь внизу)
    const heroX = canvas.width / 2 - 40;
    const heroY = canvas.height - 160;
    ctx.fillStyle = '#C0C0C0'; // шлем
    ctx.fillRect(heroX + 20, heroY, 40, 25);
    ctx.fillStyle = '#FFDBAC'; // голова
    ctx.beginPath(); ctx.arc(heroX + 40, heroY + 30, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4682B4'; // доспех
    ctx.fillRect(heroX + 10, heroY + 45, 60, 80);
    ctx.fillStyle = '#A9A9A9'; // щит
    ctx.fillRect(heroX, heroY + 50, 30, 60);
    ctx.fillStyle = '#C0C0C0'; // меч
    ctx.fillRect(heroX + 70, heroY + 60, 15, 80);

    // Монстр (если бой)
    if (game.battleActive && game.enemy) {
        const enemyX = canvas.width / 2 - 40;
        const enemyY = 60;
        ctx.fillStyle = '#228B22'; // голова орка/гоблина
        ctx.beginPath(); ctx.arc(enemyX + 40, enemyY + 20, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8B0000'; // тело
        ctx.fillRect(enemyX + 10, enemyY + 40, 60, 100);
        ctx.fillStyle = '#FFF'; // глаза
        ctx.fillRect(enemyX + 25, enemyY + 10, 10, 10);
        ctx.fillRect(enemyX + 45, enemyY + 10, 10, 10);
        ctx.fillStyle = '#000'; // зрачки
        ctx.fillRect(enemyX + 28, enemyY + 13, 4, 4);
        ctx.fillRect(enemyX + 48, enemyY + 13, 4, 4);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(game.enemy.name, canvas.width / 2, enemyY - 10);

        // HP бар врага
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 80, enemyY + 150, 160, 25);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(canvas.width / 2 - 80, enemyY + 150, (game.enemy.hp / game.enemy.maxHp) * 160, 25);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`\( {game.enemy.hp}/ \){game.enemy.maxHp}`, canvas.width / 2, enemyY + 167);
    }

    // Текст комнаты
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Комната ${Math.floor(game.room)}`, canvas.width / 2, canvas.height - 30);
}

function startBattle() {
    const index = Math.min(Math.floor(game.room / 5), monsters.length - 1);
    game.enemy = JSON.parse(JSON.stringify(monsters[index]));
    game.battleActive = true;
    showMessage(`Бой с ${game.enemy.name}!`);
}

function fight() {
    if (!game.battleActive) {
        startBattle();
        return;
    }

    const damage = Math.max(1, (game.atk + game.weapon * 5) - game.enemy.def);
    game.enemy.hp -= damage;
    showMessage(`- ${damage} урона врагу!`);

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
    showMessage(`Враг нанёс ${enemyDamage} урона!`);

    if (game.hp <= 0) {
        game.hp = game.maxHp / 2;
        game.room = 1;
        showMessage('Поражение! Возрождение в комнате 1');
    }

    updateGameStats();
}

function heal() {
    if (game.gold >= 50 && game.hp < game.maxHp) {
        game.gold -= 50;
        game.hp = Math.min(game.maxHp, game.hp + 80);
        showMessage('Зелье выпито +80 HP');
        updateGameStats();
    }
}

document.getElementById('fightBtn').addEventListener('click', fight);
document.getElementById('healBtn').addEventListener('click', heal);

document.querySelectorAll('.upgrade').forEach((up, i) => {
    up.addEventListener('click', () => {
        let price = i === 0 ? 200 * Math.pow(1.5, game.weapon) :
                    i === 1 ? 300 * Math.pow(1.5, game.armor) :
                    5000 * Math.pow(2, game.prestige);
        if (game.gold >= price) {
            game.gold -= price;
            if (i === 0) { game.weapon++; game.atk += 5; }
            if (i === 1) { game.armor++; game.def += 5; }
            if (i === 2) { game.prestige++; game.atk *= 1.5; game.def *= 1.5; showMessage('Престиж! Stats x1.5'); }
            showMessage('Улучшение куплено!');
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
    updateGameStats(); // исправлено: обновляем статы каждый кадр

    requestAnimationFrame(gameLoop);
}

loadGame().then(() => {
    updateGameStats();
    requestAnimationFrame(gameLoop);
});