const tg = window.Telegram.WebApp;

let state = {
    hp: 100, maxHp: 100, atk: 10, def: 5, gold: 0, lvl: 1, xp: 0, room: 1,
    weaponLvl: 0, armorLvl: 0,
    critChance: 0.20, // Шанс критического удара (20%)
    critMultiplier: 2 // Множитель критического урона (x2)
};

// Ссылки на спрайты. Замените их на свои!
const SPRITES = {
    player: 'https://i.imgur.com/G5iM8qF.png', // Пример: Рыцарь
    monster: {
        goblin: 'https://i.imgur.com/R3p4f0U.png', // Пример: Гоблин
        skeleton: 'https://i.imgur.com/1G2Z7vP.png', // Пример: Скелет
        boss: 'https://i.imgur.com/v8t7s8X.png' // Пример: Демон-босс
    }
};

let enemy = { 
    name: "Гоблин", 
    hp: 30, maxHp: 30, 
    sprite: SPRITES.monster.goblin, 
    baseAtk: 8 // Базовая атака монстра
};

// Элементы DOM
const elements = {
    lvl: document.getElementById('lvl'),
    gold: document.getElementById('gold'),
    room: document.getElementById('room'),
    hpText: document.getElementById('hp-text'),
    hpBar: document.getElementById('hp-bar'),
    xpText: document.getElementById('xp-text'),
    xpBar: document.getElementById('xp-bar'),
    atkValue: document.getElementById('atk-value'),
    defValue: document.getElementById('def-value'),
    enemyName: document.getElementById('enemy-name'),
    enemyHpFill: document.getElementById('enemy-hp-fill'),
    enemySprite: document.getElementById('enemy-sprite'),
    playerSprite: document.getElementById('player-sprite'),
    toastContainer: document.getElementById('toast-container'),
    deathScreen: document.getElementById('death-screen'),
    finalRoom: document.getElementById('final-room'),
    btnAttack: document.getElementById('btn-attack'),
    btnHeal: document.getElementById('btn-heal'),
    upAtk: document.getElementById('up-atk'),
    upDef: document.getElementById('up-def'),
    atkPrice: document.getElementById('atk-price'),
    defPrice: document.getElementById('def-price'),
    btnRespawn: document.getElementById('btn-respawn')
};

function init() {
    tg.ready();
    tg.expand();
    load(); // Загрузка сохранения
    elements.playerSprite.src = SPRITES.player; // Устанавливаем спрайт героя
    spawnEnemy(); // Спавним первого врага
    updateUI();
    
    // Привязываем события к кнопкам
    elements.btnAttack.onclick = attack;
    elements.btnHeal.onclick = heal;
    elements.upAtk.onclick = () => upgrade('atk');
    elements.upDef.onclick = () => upgrade('def');
    elements.btnRespawn.onclick = respawn;
}

function spawnEnemy() {
    const roomFactor = Math.floor(state.room / 5);
    let monsterType = 'goblin';
    let monsterName = 'Гоблин';
    let monsterSprite = SPRITES.monster.goblin;
    let baseHp = 30;
    let baseAtk = 8;

    if (state.room % 5 === 0) { // Каждая 5-я комната - босс
        monsterType = 'boss';
        monsterName = 'БОСС';
        monsterSprite = SPRITES.monster.boss;
        baseHp = 100;
        baseAtk = 25;
    } else if (state.room % 3 === 0) { // Каждая 3-я комната - скелет
        monsterType = 'skeleton';
        monsterName = 'Скелет';
        monsterSprite = SPRITES.monster.skeleton;
        baseHp = 50;
        baseAtk = 15;
    }

    enemy = { 
        name: monsterName,
        hp: baseHp + (state.room * 5), // HP растет с комнатой
        maxHp: baseHp + (state.room * 5),
        sprite: monsterSprite,
        baseAtk: baseAtk + (state.room * 2) // Атака растет с комнатой
    };
    elements.enemySprite.src = enemy.sprite; // Обновляем спрайт врага
}

function attack() {
    if (state.hp <= 0) return;

    // Анимация тряски врага
    elements.enemySprite.style.transform = 'scaleX(-1) translateX(5px)'; // Немного трясем
    setTimeout(() => elements.enemySprite.style.transform = 'scaleX(-1) translateX(0)', 100);

    // Урон игрока
    let pDmg = state.atk + (state.weaponLvl * 5);
    
    // Проверка на критический удар
    if (Math.random() < state.critChance) {
        pDmg = Math.floor(pDmg * state.critMultiplier);
        showToast('CRIT!', 'crit');
    }

    enemy.hp -= pDmg;
    showToast(`-${pDmg} HP`);

    if (enemy.hp <= 0) {
        winBattle();
    } else {
        // Урон монстра
        const playerDef = state.def + (state.armorLvl * 5);
        const eDmg = Math.max(2, enemy.baseAtk - playerDef); // Используем baseAtk монстра
        
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
    state.gold += 20 + state.room * 5;
    state.xp += 40;
    state.room++;
    
    if (state.xp >= state.lvl * 100) {
        state.xp -= (state.lvl * 100); // Вычитаем, а не обнуляем
        state.lvl++;
        state.maxHp += 20;
        state.hp = state.maxHp;
        showToast("LEVEL UP!");
    }
    
    spawnEnemy(); // Спавним нового врага с новой логикой
    save();
    updateUI(); // Обновляем UI после победы и спавна нового врага
}

function gameOver() {
    elements.finalRoom.textContent = state.room;
    elements.deathScreen.classList.remove('hidden');
}

function respawn() {
    state.hp = state.maxHp;
    state.room = 1;
    state.gold = Math.floor(state.gold * 0.7); // Теряем 30% золота
    
    spawnEnemy(); // Спавним нового гоблина
    elements.deathScreen.classList.add('hidden');
    updateUI();
    save();
}

function heal() {
    if (state.gold >= 50 && state.hp < state.maxHp) {
        state.gold -= 50;
        state.hp = Math.min(state.maxHp, state.hp + 50);
        showToast('+50 HP', 'heal'); // Новый тип тоста для лечения
        updateUI();
        save();
    } else if (state.hp >= state.maxHp) {
        showToast('HP полное!', 'info');
    } else {
        showToast('Недостаточно золота!', 'info');
    }
}

function upgrade(type) {
    let price;
    if (type === 'atk') {
        price = Math.floor(100 * Math.pow(1.4, state.weaponLvl));
        if (state.gold >= price) { state.gold -= price; state.weaponLvl++; state.atk += 5; showToast('+5 ATK!'); }
        else { showToast('Недостаточно золота!', 'info'); }
    } else if (type === 'def') {
        price = Math.floor(100 * Math.pow(1.4, state.armorLvl));
        if (state.gold >= price) { state.gold -= price; state.armorLvl++; state.def += 5; showToast('+5 DEF!'); }
        else { showToast('Недостаточно золота!', 'info'); }
    }
    updateUI();
    save();
}


function updateUI() {
    elements.lvl.textContent = state.lvl;
    elements.gold.textContent = state.gold;
    elements.room.textContent = state.room;

    elements.hpText.textContent = `${Math.floor(state.hp)}/${state.maxHp}`;
    elements.hpBar.style.width = `${(state.hp / state.maxHp) * 100}%`;
    elements.xpText.textContent = `${state.xp}/${state.lvl * 100}`;
    elements.xpBar.style.width = `${(state.xp / (state.lvl * 100)) * 100}%`;

    elements.atkValue.textContent = state.atk + (state.weaponLvl * 5);
    elements.defValue.textContent = state.def + (state.armorLvl * 5);

    // Обновление UI врага
    elements.enemyName.textContent = enemy.name;
    elements.enemyHpFill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;

    // Обновление цен в магазине
    const wPrice = Math.floor(100 * Math.pow(1.4, state.weaponLvl));
    const aPrice = Math.floor(100 * Math.pow(1.4, state.armorLvl));
    elements.atkPrice.textContent = `+5 ATK (${wPrice}g)`;
    elements.defPrice.textContent = `+5 DEF (${aPrice}g)`;
}

// showToast теперь принимает необязательный аргумент `type`
function showToast(txt, type = 'normal') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = txt;
    elements.toastContainer.appendChild(t);
    // Добавляем короткую задержку перед удалением тоста, чтобы анимация успела отработать
    setTimeout(() => t.remove(), 1200); 
}

function save() {
    const data = JSON.stringify(state);
    tg.CloudStorage.setItem('rpg_save_v2', data); // Изменил ключ сохранения
    localStorage.setItem('rpg_save_v2', data);
}

function load() {
    const saved = localStorage.getItem('rpg_save_v2'); // Изменил ключ
    if (saved) {
        Object.assign(state, JSON.parse(saved));
    } else {
        // Если нет локального сохранения, пробуем облако
        tg.CloudStorage.getItem('rpg_save_v2', (err, val) => {
            if (val) Object.assign(state, JSON.parse(val));
            updateUI(); // Обновляем UI после загрузки
        });
    }
}

// Запускаем инициализацию игры
init();
