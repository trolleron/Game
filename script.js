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
    lastTime: 0, battleActive: false, enemy: null
};

const monsters = [
    { name: 'Гоблин', hp: 30, atk: 8, gold: 20, exp: 10 },
    { name: 'Орк', hp: 60, atk: 15, gold: 50, exp: 25 },
    { name: 'Скелет', hp: 40, atk: 12, gold: 30, exp: 15 },
    { name 'Дракон', hp: 150, atk: 30, gold: 200, exp: 100 } // босс
];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();

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
    document.getElementById('atk').textContent = game.atk;
    document.getElementById('def').textContent = game.def;
    document.getElementById('level').textContent = game.level;
    document.getElementById('gold').textContent = game.gold;
    document.getElementById('room').textContent = `\( {game.room}/ \){game.maxRoom}`;
    updateUI();
}

function drawDungeon() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Карта комнат
    const roomSize = 40;
    const roomsX = Math.floor(canvas.width / roomSize);
    const roomsY = Math.floor(canvas.height / roomSize);
    for (let y = 0; y < roomsY; y++) {
        for (let x = 0; x < roomsX; x++) {
            ctx.fillStyle = '#333';
            ctx.fillRect(x * roomSize, y * roomSize, roomSize, roomSize);
            if (x + y * roomsX + 1 === game.room) {
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(x * roomSize + 5, y * roomSize + 5, roomSize - 10, roomSize - 10);
            }
        }
    }

    // Монстр в бою
    if (game.battleActive && game.enemy) {
        ctx.fillStyle = '#ff6666';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(game.enemy.name, canvas.width / 2, canvas.height / 2);
        // HP врага
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 50, canvas.height / 2 + 10, 100, 15);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(canvas.width / 2 - 50, canvas.height / 2 + 10, (game.enemy.hp / game.enemy.maxHp) * 100, 15);
    }
}

function startBattle() {
    game.enemy = { ...monsters[Math.floor(Math.random() * monsters.length)] };
    game.enemy.maxHp = game.enemy.hp;
    game.battleActive = true;
    document.getElementById('fightBtn').textContent = '⚔️ Атаковать!';
    showMessage(`Появился ${game.enemy.name}!`);
}

function fight() {
    if (!game.battleActive) {
        startBattle();
        return;
    }

    // Удар героя
    const damage = Math.max(1, game.atk - Math.floor(game.enemy.def / 2));
    game.enemy.hp -= damage;
    showMessage(`Ты нанес ${damage} урона!`);

    if (game.enemy.hp <= 0) {
        game.gold += game.enemy.gold;
        game.exp += game.enemy.exp;
        if (game.exp >= game.level * 100) {
            game.level++;
            game.maxHp += 20;
            game.hp = game.maxHp;
            game.exp = 0;
            showMessage('Level up!');
        }
        game.battleActive = false;
        showMessage('Победа! +Gold +Exp');
        updateGameStats();
        return;
    }

    // Удар врага
    const enemyDamage = Math.max(1, game.enemy.atk - Math.floor((game.def + game.armor) / 2));
    game.hp -= enemyDamage;
    showMessage(`${game.enemy.name} нанёс ${enemyDamage} урона!`);

    if (game.hp <= 0) {
        game.hp = 1;
        game.room = 1;
        showMessage('Поражение! Вернулся в начало.');
    }

    updateGameStats();
}

function heal() {
    if (game.potions > 0 && game.hp < game.maxHp) {
        game.hp = Math.min(game.maxHp, game.hp + 50);
        game.potions--;
        showMessage('Вылечился!');
        updateGameStats();
    }
}

function buyUpgrade(type) {
    let price = 0;
    if (type === 'weapon') price = 200 * Math.pow(1.5, game.weapon);
    else if (type === 'armor') price = 300 * Math.pow(1.5, game.armor);
    else if (type === 'prestige') price = 5000 * Math.pow(2, game.prestige);

    if (game.gold >= price) {
        game.gold -= price;
        if (type === 'weapon') { game.weapon++; game.atk += 5; }
        else if (type === 'armor') { game.armor++; game.def += 5; }
        else if (type === 'prestige') { game.prestige++; game.atk *= 2; game.def *= 2; showMessage('Престиж! x2 stats'); }
        showMessage('Куплено!');
        updateGameStats();
    }
}

function updateUI() {
    document.getElementById('fightBtn').textContent = game.battleActive ? '⚔️ Атаковать!' : '🔍 Новый бой';
    document.querySelector('[data-type="weapon"]').textContent = `Меч +5 ATK (${200 * Math.pow(1.5, game.weapon)}g)`;
    document.querySelector('[data-type="armor"]').textContent = `Броня +5 DEF (${300 * Math.pow(1.5, game.armor)}g)`;
    document.querySelector('[data-type="prestige"]').textContent = `Престиж x2 (${5000 * Math.pow(2, game.prestige)}g)`;

    document.querySelectorAll('.upgrade').forEach(up => {
        const price = parseInt(up.textContent.match(/\((\d+)g\)/)[1]);
        up.classList.toggle('afford', game.gold >= price);
    });
}

document.getElementById('fightBtn').addEventListener('click', fight);
document.getElementById('healBtn').addEventListener('click', heal);
document.querySelectorAll('.upgrade').forEach(up => up.addEventListener('click', () => buyUpgrade(up.dataset.type)));

function gameLoop(now) {
    const dt = (now - game.lastTime) / 1000;
    game.lastTime = now;

    if (!game.battleActive) {
        // Автодвижение по комнатам
        game.room += dt * 0.5;
        if (game.room > game.maxRoom) game.maxRoom = game.room;
    }

    drawDungeon();
    if (game.saveInterval > 30) saveGame();

    requestAnimationFrame(gameLoop);
}

loadGame().then(() => {
    updateGameStats();
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});