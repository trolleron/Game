const tg = window.Telegram.WebApp;

// Загрузка инвентаря
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [
    { id: 'gold', name: 'Золото', icon: '🪙', count: 0, type: 'currency' },
    { id: 'crystal', name: 'Кристалл', icon: '💎', count: 0, type: 'premium' },
    { id: 'sword', name: 'Старый меч', icon: '🗡️', count: 1, type: 'weapon' }
];

const player = { hp: 100, maxHp: 100 };
const monster = {
    type: 'goblin', action: 'idle', frame: 1,
    hp: 100, maxHp: 100, atk: 15, isDead: false
};

const framesConfig = { idle: 4, attack: 6, death: 3 };
const cachedImages = {};

function preloadImages() {
    for (const action in framesConfig) {
        for (let i = 1; i <= framesConfig[action]; i++) {
            const img = new Image();
            img.src = `img/${monster.type}/${action}_${i}.png`;
            cachedImages[`${action}_${i}`] = img;
        }
    }
}

const gameContainer = document.getElementById('game-container');
const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const grid = document.getElementById('inventory-slots');
const attackBtn = document.getElementById('btn-attack');

function animate() {
    if (monster.isDead && monster.action === 'death' && monster.frame >= framesConfig.death) {
        spriteImg.src = cachedImages[`death_${framesConfig.death}`].src;
        return;
    }
    const currentKey = `${monster.action}_${monster.frame}`;
    if (cachedImages[currentKey]) spriteImg.src = cachedImages[currentKey].src;

    if (monster.action === 'attack' && monster.frame === 4) applyDamageToPlayer();

    monster.frame++;
    if (monster.frame > framesConfig[monster.action]) {
        if (monster.action === 'idle') monster.frame = 1;
        else if (monster.action === 'attack') { changeAction('idle'); attackBtn.disabled = false; }
        else if (monster.action === 'death') monster.frame = framesConfig.death;
    }
}

setInterval(animate, 100);

function changeAction(newAct) {
    if (monster.isDead && newAct !== 'death') return;
    monster.action = newAct;
    monster.frame = 1;
}

function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;
    monster.hp -= 25;
    attackBtn.disabled = true;

    spriteImg.style.filter = 'brightness(2.5)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0; monster.isDead = true;
        changeAction('death');
        attackBtn.style.display = 'none';
        rewardPlayer();
    } else {
        setTimeout(() => { if (!monster.isDead) changeAction('attack'); }, 400);
    }
    updateUI();
}

function addItem(id, name, icon, type, amount = 1) {
    // Валюта стакается в один слот, вещи всегда в новые слоты
    const existing = inventory.find(i => i.id === id && (type === 'currency' || type === 'premium'));
    if (existing) {
        existing.count += amount;
    } else {
        inventory.push({ id, name, icon, type, count: amount });
    }
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function rewardPlayer() {
    addItem('gold', 'Золото', '🪙', 'currency', 10);
    if (Math.random() < 0.01) addItem('crystal', 'Кристалл', '💎', 'premium', 1);
    if (Math.random() < 0.15) addItem('club_' + Date.now(), 'Дубина', '🦴', 'weapon', 1);
    if (Math.random() < 0.05) addItem('armor_' + Date.now(), 'Броня', '🛡️', 'armor', 1);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function applyDamageToPlayer() {
    if (monster.isDead) return;
    player.hp -= monster.atk;
    if (player.hp < 0) player.hp = 0;

    gameContainer.style.animation = 'none';
    void gameContainer.offsetWidth;         
    gameContainer.style.animation = 'shake 0.2s ease-in-out'; 
    
    updateUI();
    if (player.hp === 0) {
        setTimeout(() => { alert("Герой пал!"); location.reload(); }, 300);
    }
}

function updateUI() {
    monsterHpFill.style.width = (monster.hp / monster.maxHp * 100) + '%';
    playerHpFill.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp} / ${player.maxHp} HP`;

    grid.innerHTML = '';
    inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        if (item.type === 'weapon') slot.style.borderColor = 'rgba(255, 71, 87, 0.4)';
        slot.innerHTML = `<span>${item.icon}</span>`;
        if (item.count > 1) slot.innerHTML += `<span class="item-count">${item.count}</span>`;
        grid.appendChild(slot);
    });
    
    // Пустые слоты в конце для красоты
    for(let i=0; i<4; i++) {
        const s = document.createElement('div');
        s.className = 'inv-slot'; s.style.opacity = '0.2';
        grid.appendChild(s);
    }
}

preloadImages();
attackBtn.onclick = playerAttack;
tg.expand();
updateUI();
