const tg = window.Telegram.WebApp;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let state = {
    hp: 100, maxHp: 100, atk: 10, def: 5, gold: 0, lvl: 1, xp: 0, room: 1,
    weaponLvl: 0, armorLvl: 0
};

let enemy = { name: "Гоблин", hp: 30, maxHp: 30, color: "#4ade80" };

function init() {
    tg.ready();
    tg.expand();
    window.addEventListener('resize', resize);
    resize();
    load(); // Загрузка сохранения
    updateUI();
    gameLoop();
}

function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

function attack() {
    if (state.hp <= 0) return;

    // 1. Урон игрока
    const pDmg = state.atk + (state.weaponLvl * 5);
    enemy.hp -= pDmg;
    showToast(`-${pDmg} HP`);

    if (enemy.hp <= 0) {
        winBattle();
    } else {
        // 2. Урон монстра (возрастает с комнатами)
        const monsterPower = 8 + Math.floor(state.room * 1.5);
        const playerDef = state.def + (state.armorLvl * 5);
        const eDmg = Math.max(2, monsterPower - playerDef);
        
        state.hp -= eDmg;

        if (state.hp <= 0) {
            state.hp = 0;
            updateUI();
            gameOver();
            return;
        }
    }
    updateUI();
}

function winBattle() {
    const reward = 20 + state.room * 5;
    state.gold += reward;
    state.xp += 40;
    state.room++;
    
    if (state.xp >= state.lvl * 100) {
        state.lvl++;
        state.xp = 0;
        state.maxHp += 20;
        state.hp = state.maxHp;
        showToast("LEVEL UP!");
    }
    
    // Спавн нового врага
    enemy.maxHp = 30 + (state.room * 10);
    enemy.hp = enemy.maxHp;
    enemy.name = state.room % 5 === 0 ? "БОСС" : "Монстр";
    enemy.color = state.room % 5 === 0 ? "#f97316" : "#4ade80";
    
    save();
}

function gameOver() {
    document.getElementById('final-room').textContent = state.room;
    document.getElementById('death-screen').classList.remove('hidden');
}

function respawn() {
    state.hp = state.maxHp;
    state.room = 1;
    state.gold = Math.floor(state.gold * 0.7); // Теряем 30% золота при смерти
    
    enemy.maxHp = 30;
    enemy.hp = 30;
    enemy.name = "Гоблин";
    enemy.color = "#4ade80";

    document.getElementById('death-screen').classList.add('hidden');
    updateUI();
    save();
}

function updateUI() {
    document.getElementById('lvl').textContent = state.lvl;
    document.getElementById('gold').textContent = state.gold;
    document.getElementById('room').textContent = state.room;
    document.getElementById('hp-text').textContent = `${Math.floor(state.hp)}/${state.maxHp}`;
    document.getElementById('hp-bar').style.width = `${(state.hp / state.maxHp) * 100}%`;
    document.getElementById('xp-text').textContent = `${state.xp}/${state.lvl * 100}`;
    document.getElementById('xp-bar').style.width = `${(state.xp / (state.lvl * 100)) * 100}%`;

    const wPrice = Math.floor(100 * Math.pow(1.4, state.weaponLvl));
    const aPrice = Math.floor(100 * Math.pow(1.4, state.armorLvl));
    document.getElementById('atk-price').textContent = `+5 ATK (${wPrice}g)`;
    document.getElementById('def-price').textContent = `+5 DEF (${aPrice}g)`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;

    if (enemy && state.hp > 0) {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        const pulse = Math.sin(Date.now() / 300) * 5;
        ctx.arc(centerX, 150, 45 + pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(enemy.name, centerX, 80);
        
        // HP врага
        ctx.fillStyle = "#222";
        ctx.fillRect(centerX - 60, 210, 120, 10);
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(centerX - 60, 210, (enemy.hp / enemy.maxHp) * 120, 10);
    }
}

function showToast(txt) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = txt;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 1000);
}

function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

function save() {
    const data = JSON.stringify(state);
    tg.CloudStorage.setItem('rpg_save', data);
    localStorage.setItem('rpg_save', data);
}

function load() {
    const saved = localStorage.getItem('rpg_save');
    if (saved) {
        state = JSON.parse(saved);
    }
}

// Слушатели событий
document.getElementById('btn-attack').onclick = attack;
document.getElementById('btn-respawn').onclick = respawn;
document.getElementById('btn-heal').onclick = () => {
    if (state.gold >= 50 && state.hp < state.maxHp) {
        state.gold -= 50;
        state.hp = Math.min(state.maxHp, state.hp + 50);
        updateUI();
    }
};
document.getElementById('up-atk').onclick = () => {
    const price = Math.floor(100 * Math.pow(1.4, state.weaponLvl));
    if (state.gold >= price) { state.gold -= price; state.weaponLvl++; updateUI(); save(); }
};
document.getElementById('up-def').onclick = () => {
    const price = Math.floor(100 * Math.pow(1.4, state.armorLvl));
    if (state.gold >= price) { state.gold -= price; state.armorLvl++; updateUI(); save(); }
};

init();
