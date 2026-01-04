const tg = window.Telegram.WebApp;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Состояние игры
let state = {
    player: { hp: 100, maxHp: 100, atk: 10, def: 5, gold: 0, lvl: 1, xp: 0, room: 1 },
    enemy: null,
    shop: { weaponLvl: 0, armorLvl: 0 }
};

const monsterTypes = [
    { name: "Слизь", hp: 40, atk: 5, color: "#2ecc71" },
    { name: "Скелет", hp: 70, atk: 12, color: "#bdc3c7" },
    { name: "Демон", hp: 120, atk: 20, color: "#e74c3c" }
];

// Инициализация
function init() {
    tg.expand();
    resize();
    load();
    spawnEnemy();
    gameLoop();
}

function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

function spawnEnemy() {
    const type = monsterTypes[Math.min(Math.floor(state.player.room / 5), monsterTypes.length - 1)];
    state.enemy = { 
        ...type, 
        hp: type.hp + (state.player.room * 5), 
        maxHp: type.hp + (state.player.room * 5) 
    };
}

function attack() {
    if (!state.enemy) return;

    // Игрок бьет врага
    const dmgToEnemy = Math.max(2, state.player.atk - (state.player.room * 0.5));
    state.enemy.hp -= dmgToEnemy;
    showToast(`-${Math.floor(dmgToEnemy)} HP`, "enemy");

    if (state.enemy.hp <= 0) {
        winBattle();
    } else {
        // Враг бьет игрока
        setTimeout(() => {
            const dmgToPlayer = Math.max(1, state.enemy.atk - state.player.def);
            state.player.hp -= dmgToPlayer;
            updateUI();
            if (state.player.hp <= 0) gameOver();
        }, 200);
    }
    updateUI();
}

function winBattle() {
    const reward = 20 + (state.player.room * 5);
    const exp = 30;
    state.player.gold += reward;
    state.player.xp += exp;
    state.player.room++;
    
    showToast(`+${reward} GOLD`, "gold");

    if (state.player.xp >= state.player.lvl * 100) {
        state.player.lvl++;
        state.player.xp = 0;
        state.player.maxHp += 20;
        state.player.hp = state.player.maxHp;
        showToast("LEVEL UP!", "accent");
    }

    spawnEnemy();
    save();
}

function updateUI() {
    document.getElementById('lvl').innerText = state.player.lvl;
    document.getElementById('gold').innerText = state.player.gold;
    document.getElementById('room').innerText = state.player.room;
    
    document.getElementById('hp-text').innerText = `${Math.floor(state.player.hp)}/${state.player.maxHp}`;
    document.getElementById('hp-bar').style.width = (state.player.hp / state.player.maxHp * 100) + "%";
    
    document.getElementById('xp-text').innerText = `${state.player.xp}/${state.player.lvl * 100}`;
    document.getElementById('xp-bar').style.width = (state.player.xp / (state.player.lvl * 100) * 100) + "%";

    // Цены в магазине
    const wPrice = 100 * Math.pow(1.5, state.shop.weaponLvl);
    const aPrice = 100 * Math.pow(1.5, state.shop.armorLvl);
    document.querySelector('#up-atk span').innerText = `+5 ATK (${Math.floor(wPrice)}g)`;
    document.querySelector('#up-def span').innerText = `+5 DEF (${Math.floor(aPrice)}g)`;
}

function showToast(text, type) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = text;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 1500);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем врага (упрощенно)
    if (state.enemy) {
        const centerX = canvas.width / 2;
        ctx.fillStyle = state.enemy.color;
        ctx.beginPath();
        ctx.arc(centerX, 150, 40 + Math.sin(Date.now()/200)*5, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 20px Arial";
        ctx.fillText(state.enemy.name, centerX, 80);
        
        // Полоска здоровья врага на канвасе
        ctx.fillStyle = "#222";
        ctx.fillRect(centerX - 50, 200, 100, 10);
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(centerX - 50, 200, (state.enemy.hp / state.enemy.maxHp) * 100, 10);
    }
}

function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

// Покупки
document.getElementById('up-atk').onclick = () => {
    const price = 100 * Math.pow(1.5, state.shop.weaponLvl);
    if (state.player.gold >= price) {
        state.player.gold -= price;
        state.player.atk += 5;
        state.shop.weaponLvl++;
        updateUI();
        save();
    }
};

document.getElementById('btn-attack').onclick = attack;
document.getElementById('btn-heal').onclick = () => {
    if (state.player.gold >= 50 && state.player.hp < state.player.maxHp) {
        state.player.gold -= 50;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 50);
        updateUI();
    }
};

// Cloud Storage
function save() {
    const data = JSON.stringify(state);
    tg.CloudStorage.setItem('save_v1', data);
    localStorage.setItem('save_v1', data);
}

function load() {
    const local = localStorage.getItem('save_v1');
    if (local) {
        state = JSON.parse(local);
        updateUI();
    }
    tg.CloudStorage.getItem('save_v1', (err, val) => {
        if (val) {
            state = JSON.parse(val);
            updateUI();
        }
    });
}

window.onresize = resize;
init();
