const tg = window.Telegram.WebApp;

// --- СОСТОЯНИЕ ИГРЫ ---
let state = {
    hp: 100, maxHp: 100, atk: 10, def: 5, gold: 0, lvl: 1, xp: 0, room: 1,
    weaponLvl: 0, armorLvl: 0,
    critChance: 0.15, 
    critMultiplier: 2
};

// --- НАСТРОЙКИ АНИМАЦИЙ (Sequence) ---
// Укажите здесь количество кадров, которые вы загрузили на GitHub
const ANIM_CONFIG = {
    goblin:   { idle: 16, attack: 10, death: 10 },
    skeleton: { idle: 4, attack: 3, death: 4 },
    boss:     { idle: 6, attack: 4, death: 6 }
};

let enemy = {
    type: 'goblin',
    name: "Гоблин",
    hp: 30,
    maxHp: 30,
    baseAtk: 8,
    currentAction: 'idle',
    frameIndex: 1
};

let animInterval = null;

// --- ЭЛЕМЕНТЫ DOM ---
const elements = {
    lvl: document.getElementById('lvl'),
    gold: document.getElementById('gold'),
    room: document.getElementById('room'),
    hpBar: document.getElementById('hp-bar'),
    hpText: document.getElementById('hp-text'),
    xpBar: document.getElementById('xp-bar'),
    enemyName: document.getElementById('enemy-name'),
    enemyHpFill: document.getElementById('enemy-hp-fill'),
    enemySprite: document.getElementById('enemy-sprite'), // Это должен быть тег <img>
    playerSprite: document.getElementById('player-sprite'),
    atkValue: document.getElementById('atk-value'),
    defValue: document.getElementById('def-value'),
    atkPrice: document.getElementById('atk-price'),
    defPrice: document.getElementById('def-price'),
    toastContainer: document.getElementById('toast-container'),
    deathScreen: document.getElementById('death-screen'),
    finalRoom: document.getElementById('final-room')
};

// --- ИНИЦИАЛИЗАЦИЯ ---
function init() {
    tg.ready();
    tg.expand();
    load();
    spawnEnemy();
    startAnimator();
    updateUI();

    document.getElementById('btn-attack').onclick = playerAttack;
    document.getElementById('btn-heal').onclick = heal;
    document.getElementById('up-atk').onclick = () => upgrade('atk');
    document.getElementById('up-def').onclick = () => upgrade('def');
    document.getElementById('btn-respawn').onclick = respawn;
}

// --- АНИМАТОР (SEQUENCE) ---
function startAnimator() {
    if (animInterval) clearInterval(animInterval);
    
    animInterval = setInterval(() => {
        const config = ANIM_CONFIG[enemy.type][enemy.currentAction];
        
        // Формируем путь к картинке: img/тип/действие_номер.png
        // Например: img/goblin/idle_1.png
        elements.enemySprite.src = `img/${enemy.type}/${enemy.currentAction}_${enemy.frameIndex}.png`;

        enemy.frameIndex++;

        if (enemy.frameIndex > config) {
            if (enemy.currentAction === 'idle') {
                enemy.frameIndex = 1; // Зацикливаем idle
            } else if (enemy.currentAction === 'attack') {
                enemy.currentAction = 'idle'; // После атаки возвращаемся в покой
                enemy.frameIndex = 1;
            } else if (enemy.currentAction === 'death') {
                enemy.frameIndex = config; // Останавливаемся на последнем кадре смерти
                clearInterval(animInterval);
            }
        }
    }, 150); // Скорость анимации
}

function changeEnemyAction(action) {
    enemy.currentAction = action;
    enemy.frameIndex = 1;
}

// --- ЛОГИКА БОЯ ---
function spawnEnemy() {
    let type = 'goblin';
    if (state.room % 10 === 0) type = 'boss';
    else if (state.room % 3 === 0) type = 'skeleton';

    const names = { goblin: 'Гоблин', skeleton: 'Скелет', boss: 'ВЛАДЫКА ТЬМЫ' };
    
    enemy.type = type;
    enemy.name = names[type];
    enemy.maxHp = (type === 'boss' ? 150 : 30) + (state.room * 10);
    enemy.hp = enemy.maxHp;
    enemy.baseAtk = (type === 'boss' ? 20 : 8) + (state.room * 2);
    
    changeEnemyAction('idle');
    if (!animInterval) startAnimator(); // Перезапуск если был выключен смертью
    updateUI();
}

function playerAttack() {
    if (state.hp <= 0 || enemy.hp <= 0) return;

    // Анимация рывка игрока
    elements.playerSprite.style.transform = 'translateX(40px) scale(1.1)';
    setTimeout(() => elements.playerSprite.style.transform = 'translateX(0) scale(1)', 100);

    // Расчет урона
    let dmg = state.atk + (state.weaponLvl * 5);
    if (Math.random() < state.critChance) {
        dmg *= state.critMultiplier;
        showToast('КРИТ!', 'crit');
    }

    enemy.hp -= dmg;
    showToast(`-${dmg} HP`);

    if (enemy.hp <= 0) {
        enemy.hp = 0;
        changeEnemyAction('death');
        setTimeout(winBattle, 1000); // Задержка, чтобы успела проиграться анимация смерти
    } else {
        // Ответная атака монстра через 500мс
        setTimeout(monsterAttack, 500);
    }
    updateUI();
}

function monsterAttack() {
    if (enemy.hp <= 0) return;

    changeEnemyAction('attack');

    setTimeout(() => {
        const defense = state.def + (state.armorLvl * 3);
        const dmg = Math.max(2, Math.floor(enemy.baseAtk - defense));
        
        state.hp -= dmg;
        
        // Эффект тряски экрана при получении урона
        document.getElementById('game-container').classList.add('shake');
        setTimeout(() => document.getElementById('game-container').classList.remove('shake'), 200);

        updateUI();
        if (state.hp <= 0) gameOver();
    }, 300);
}

// --- СИСТЕМНЫЕ ФУНКЦИИ ---
function winBattle() {
    state.gold += 20 + (state.room * 5);
    state.xp += 40;
    state.room++;
    
    if (state.xp >= state.lvl * 100) {
        state.lvl++;
        state.xp = 0;
        state.maxHp += 20;
        state.hp = state.maxHp;
        showToast("LEVEL UP!", "crit");
    }
    
    spawnEnemy();
    save();
}

function updateUI() {
    elements.lvl.textContent = state.lvl;
    elements.gold.textContent = state.gold;
    elements.room.textContent = state.room;
    elements.hpText.textContent = `${Math.max(0, Math.floor(state.hp))}/${state.maxHp}`;
    elements.hpBar.style.width = `${(state.hp / state.maxHp) * 100}%`;
    elements.xpBar.style.width = `${(state.xp / (state.lvl * 100)) * 100}%`;
    
    elements.enemyName.textContent = enemy.name;
    elements.enemyHpFill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    
    elements.atkValue.textContent = state.atk + (state.weaponLvl * 5);
    elements.defValue.textContent = state.def + (state.armorLvl * 3);

    const pAtk = Math.floor(100 * Math.pow(1.5, state.weaponLvl));
    const pDef = Math.floor(100 * Math.pow(1.5, state.armorLvl));
    elements.atkPrice.textContent = `+5 ATK (${pAtk}g)`;
    elements.defPrice.textContent = `+5 DEF (${pDef}g)`;
}

function upgrade(type) {
    const price = Math.floor(100 * Math.pow(1.5, type === 'atk' ? state.weaponLvl : state.armorLvl));
    if (state.gold >= price) {
        state.gold -= price;
        if (type === 'atk') state.weaponLvl++;
        else state.armorLvl++;
        showToast("Улучшено!");
        updateUI();
        save();
    } else {
        showToast("Мало золота");
    }
}

function heal() {
    if (state.gold >= 50 && state.hp < state.maxHp) {
        state.gold -= 50;
        state.hp = Math.min(state.maxHp, state.hp + 50);
        showToast("+50 HP");
        updateUI();
        save();
    }
}

function gameOver() {
    elements.finalRoom.textContent = state.room;
    elements.deathScreen.classList.remove('hidden');
}

function respawn() {
    state.hp = state.maxHp;
    state.room = 1;
    state.gold = Math.floor(state.gold * 0.5);
    elements.deathScreen.classList.add('hidden');
    spawnEnemy();
}

function showToast(txt, type = '') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = txt;
    elements.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 1000);
}

function save() {
    localStorage.setItem('rpg_save_v4', JSON.stringify(state));
}

function load() {
    const s = localStorage.getItem('rpg_save_v4');
    if (s) state = JSON.parse(s);
}

init();
