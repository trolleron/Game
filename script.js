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
        if (data && data['rpgSave']) {
            Object.assign(game, JSON.parse(data['rpgSave']));
        } else {
            const local = localStorage.getItem('rpgSave');
            if (local) Object.assign(game, JSON.parse(local));
        }
    } catch (e) {
        console.error("Storage error", e);
    }
    updateGameStats();
}

async function saveGame() {
    try { 
        await tg.CloudStorage.setItem('rpgSave', JSON.stringify(game)); 
    } catch (e) { 
        localStorage.setItem('rpgSave', JSON.stringify(game)); 
    }
}

function showMessage(text) {
    const msg = document.getElementById('message');
    if (!msg) return;
    msg.textContent = text;
    msg.style.opacity = '1';
    // Очищаем предыдущий таймер, если он был, чтобы сообщения не мерцали
    if (window.msgTimeout) clearTimeout(window.msgTimeout);
    window.msgTimeout = setTimeout(() => msg.style.opacity = '0', 2000);
}

function updateGameStats() {
    // Исправлены шаблонные строки
    document.getElementById('hp').textContent = `${Math.floor(game.hp)} / ${game.maxHp}`;
    document.getElementById('atk').textContent = game.atk + (game.weapon * 5);
    document.getElementById('def').textContent = game.def + (game.armor * 5);
    document.getElementById('level').textContent = game.level;
    document.getElementById('gold').textContent = game.gold;
    document.getElementById('room').textContent = `${Math.floor(game.room)} / ${Math.floor(game.maxRoom)}`;

    document.querySelectorAll('.upgrade').forEach((up, i) => {
        let price;
        if (i === 0) price = 200 * Math.pow(1.5, game.weapon);
        else if (i === 1) price = 300 * Math.pow(1.5, game.armor);
        else price = 5000 * Math.pow(2, game.prestige);
        
        // Корректная замена цены в тексте кнопки
        up.innerHTML = up.innerHTML.replace(/\(\d+g\)/, `(${Math.floor(price)}g)`);
        up.classList.toggle('afford', game.gold >= price);
    });
}

function drawScene() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSize = 50;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Отрисовка героя
    const heroX = canvas.width / 2 - 40;
    const heroY = canvas.height - 160;
    ctx.fillStyle = '#C0C0C0'; 
    ctx.fillRect(heroX + 20, heroY, 40, 25);
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath(); ctx.arc(heroX + 40, heroY + 30, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4682B4'; 
    ctx.fillRect(heroX + 10, heroY + 45, 60, 80);
    ctx.fillStyle = '#A9A9A9'; 
    ctx.fillRect(heroX, heroY + 50, 30, 60);
    ctx.fillStyle = '#C0C0C0'; 
    ctx.fillRect(heroX + 70, heroY + 60, 15, 80);

    // Отрисовка монстра
    if (game.battleActive && game.enemy) {
        const enemyX = canvas.width / 2 - 40;
        const enemyY = 60;
        ctx.fillStyle = '#228B22';
        ctx.beginPath(); ctx.arc(enemyX + 40, enemyY + 20, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(enemyX + 10, enemyY + 40, 60, 100);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(enemyX + 25, enemyY + 10, 10, 10);
        ctx.fillRect(enemyX + 45, enemyY + 10, 10, 10);
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(game.enemy.name, canvas.width / 2, enemyY - 10);

        // HP бар врага (исправлены строки)
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 80, enemyY + 150, 160, 25);
        ctx.fillStyle = '#ff4444';
        const healthWidth = Math.max(0, (game.enemy.hp / game.enemy.maxHp) * 160);
        ctx.fillRect(canvas.width / 2 - 80, enemyY + 150, healthWidth, 25);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`${game.enemy.hp} / ${game.enemy.maxHp}`, canvas.width / 2, enemyY + 167);
    }

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Комната ${Math.floor(game.room)}`, canvas.width / 2, canvas.height - 30);
}

function startBattle() {
    const index = Math.min(Math.floor((game.room - 1) / 5), monsters.length - 1);
    game.enemy = JSON.parse(JSON.stringify(monsters[index]));
    game.battleActive = true;
    showMessage(`Бой с ${game.enemy.name}!`);
}

function fight() {
    if (!game.battleActive) {
        startBattle();
        updateGameStats();
        return;
    }

    // Ход героя
    const damage = Math.max(1, (game.atk + game.weapon * 5) - game.enemy.def);
    game.enemy.hp -= damage;
    
    if (game.enemy.hp <= 0) {
        game.enemy.hp = 0;
        game.gold += game.enemy.gold;
        game.exp += game.enemy.exp;
        showMessage(`Победа! +${game.enemy.gold}г`);
        
        if (game.exp >= game.level * 100) {
            game.level++;
            game.exp = 0;
            game.maxHp += 20;
            game.hp = game.maxHp;
            game.atk += 3;
            game.def += 2;
            showMessage('Уровень повышен!');
        }
        game.room += 1;
        game.maxRoom = Math.max(game.maxRoom, game.room);
        game.battleActive = false;
        updateGameStats();
        return;
    }

    // Ход монстра
    const enemyDamage = Math.max(1, game.enemy.atk - (game.def + game.armor * 5));
    game.hp -= enemyDamage;

    if (game.hp <= 0) {
        game.hp = game.maxHp;
        game.room = 1;
        game.battleActive = false;
        showMessage('Поражение! Возврат в комнату 1');
    }

    updateGameStats();
}

function heal() {
    if (game.gold >= 50 && game.hp < game.maxHp) {
        game.gold -= 50;
        game.hp = Math.min(game.maxHp, game.hp + 80);
        showMessage('Зелье выпито +80 HP');
        updateGameStats();
    } else if (game.gold < 50) {
        showMessage('Недостаточно золота!');
    }
}

// Привязка событий
document.getElementById('fightBtn').addEventListener('click', fight);
document.getElementById('healBtn').addEventListener('click', heal);

document.querySelectorAll('.upgrade').forEach((up, i) => {
    up.addEventListener('click', () => {
        let price = i === 0 ? 200 * Math.pow(1.5, game.weapon) :
                    i === 1 ? 300 * Math.pow(1.5, game.armor) :
                    5000 * Math.pow(2, game.prestige);
        
        if (game.gold >= price) {
            game.gold -= Math.floor(price);
            if (i === 0) game.weapon++;
            if (i === 1) game.armor++;
            if (i === 2) { 
                game.prestige++; 
                game.atk = Math.floor(game.atk * 1.5); 
                game.def = Math.floor(game.def * 1.5); 
                showMessage('Престиж! Мощь x1.5'); 
            }
            showMessage('Улучшено!');
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

// Запуск
loadGame().then(() => {
    requestAnimationFrame(gameLoop);
});
