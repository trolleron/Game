const tg = window.Telegram.WebApp;

let state = {
    hp: 100, maxHp: 100, atk: 10, def: 5, gold: 0, lvl: 1, xp: 0, room: 1,
    weaponLvl: 0, armorLvl: 0,
    critChance: 0.15, 
    critMultiplier: 2
};

// РАБОЧИЕ ССЫЛКИ НА КАРТИНКИ
const SPRITES = {
    player: 'https://img.itch.zone/aW1nLzExNDI1OTI5LnBuZw==/original/m966Ph.png', // Рыцарь
    monster: {
        goblin: 'img/goblin.png', // Гоблин
        skeleton: 'img/skeleton.png', // Скелет
        demon: 'img/boss.png' // Демон
    }
};

let enemy = { name: "Гоблин", hp: 30, maxHp: 30, sprite: SPRITES.monster.goblin, baseAtk: 8 };

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
    load();
    elements.playerSprite.src = SPRITES.player;
    spawnEnemy();
    updateUI();
    
    elements.btnAttack.onclick = attack;
    elements.btnHeal.onclick = heal;
    elements.upAtk.onclick = () => upgrade('atk');
    elements.upDef.onclick = () => upgrade('def');
    elements.btnRespawn.onclick = respawn;
}

function spawnEnemy() {
    let type = 'goblin';
    if (state.room % 10 === 0) type = 'boss';
    else if (state.room % 3 === 0) type = 'skeleton';

    const names = { goblin: 'Гоблин', skeleton: 'Скелет', boss: 'ВЛАДЫКА' };
    
    enemy = { 
        name: names[type],
        hp: (type === 'boss' ? 150 : 30) + (state.room * 7),
        maxHp: (type === 'boss' ? 150 : 30) + (state.room * 7),
        sprite: SPRITES.monster[type],
        baseAtk: (type === 'boss' ? 20 : 8) + (state.room * 1.5)
    };
    elements.enemySprite.src = enemy.sprite;
    elements.enemyName.textContent = enemy.name;
}

function attack() {
    if (state.hp <= 0) return;

    // Анимация удара
    elements.playerSprite.style.transform = 'scale(1.2) translateY(-20px)';
    setTimeout(() => elements.playerSprite.style.transform = 'scale(1)', 100);

    let pDmg = state.atk + (state.weaponLvl * 5);
    if (Math.random() < state.critChance) {
        pDmg *= state.critMultiplier;
        showToast('КРИТ!', 'crit');
    }

    enemy.hp -= pDmg;
    showToast(`-${pDmg} HP`);

    if (enemy.hp <= 0) {
        winBattle();
    } else {
        setTimeout(() => {
            const eDmg = Math.max(2, Math.floor(enemy.baseAtk - (state.def + state.armorLvl * 3)));
            state.hp -= eDmg;
            updateUI();
            if (state.hp <= 0) gameOver();
        }, 200);
    }
    updateUI();
}

function winBattle() {
    state.gold += 20 + state.room * 5;
    state.xp += 40;
    state.room++;
    if (state.xp >= state.lvl * 100) {
        state.lvl++; state.xp = 0;
        state.maxHp += 20; state.hp = state.maxHp;
    }
    spawnEnemy();
    save();
}

function gameOver() {
    elements.finalRoom.textContent = state.room;
    elements.deathScreen.classList.remove('hidden');
}

function respawn() {
    state.hp = state.maxHp;
    state.room = 1;
    state.gold = Math.floor(state.gold * 0.5);
    spawnEnemy();
    elements.deathScreen.classList.add('hidden');
    updateUI();
}

function upgrade(type) {
    const price = Math.floor(100 * Math.pow(1.5, type === 'atk' ? state.weaponLvl : state.armorLvl));
    if (state.gold >= price) {
        state.gold -= price;
        if (type === 'atk') state.weaponLvl++;
        else state.armorLvl++;
        updateUI();
        save();
    }
}

function heal() {
    if (state.gold >= 50 && state.hp < state.maxHp) {
        state.gold -= 50;
        state.hp = Math.min(state.maxHp, state.hp + 50);
        updateUI();
    }
}

function updateUI() {
    elements.lvl.textContent = state.lvl;
    elements.gold.textContent = state.gold;
    elements.room.textContent = state.room;
    elements.hpText.textContent = `${Math.max(0, Math.floor(state.hp))}/${state.maxHp}`;
    elements.hpBar.style.width = `${(state.hp / state.maxHp) * 100}%`;
    elements.xpBar.style.width = `${(state.xp / (state.lvl * 100)) * 100}%`;
    elements.enemyHpFill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    elements.atkValue.textContent = state.atk + (state.weaponLvl * 5);
    elements.defValue.textContent = state.def + (state.armorLvl * 3);
    
    elements.atkPrice.textContent = `+5 ATK (${Math.floor(100 * Math.pow(1.5, state.weaponLvl))}g)`;
    elements.defPrice.textContent = `+5 DEF (${Math.floor(100 * Math.pow(1.5, state.armorLvl))}g)`;
}

function showToast(txt, type = '') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = txt;
    elements.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 1000);
}

function save() {
    localStorage.setItem('rpg_save_v3', JSON.stringify(state));
}

function load() {
    const s = localStorage.getItem('rpg_save_v3');
    if (s) state = JSON.parse(s);
}

init();
