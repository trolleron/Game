const tg = window.Telegram.WebApp;

let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [
    { id: 'gold', name: 'Золото', icon: '🪙', count: 0, type: 'currency' },
    { id: 'crystal', name: 'Кристалл', icon: '💎', count: 0, type: 'premium' },
    { id: 'sword', name: 'Старый меч', icon: '🗡️', count: 1, type: 'weapon' }
];

const player = { hp: 100, maxHp: 100 };
const monster = { type: 'goblin', hp: 100, maxHp: 100, atk: 15, isDead: false, action: 'idle', frame: 1 };
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

const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const attackBtn = document.getElementById('btn-attack');
const invOverlay = document.getElementById('inventory-overlay');
const invGrid = document.getElementById('inventory-slots');

// ОТКРЫТИЕ / ЗАКРЫТИЕ ИНВЕНТАРЯ
document.getElementById('btn-inventory').onclick = () => { invOverlay.style.display = 'flex'; updateUI(); };
document.getElementById('close-inventory').onclick = () => { invOverlay.style.display = 'none'; };

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
        else if (monster.action === 'attack') { monster.action = 'idle'; monster.frame = 1; attackBtn.disabled = false; }
        else if (monster.action === 'death') monster.frame = framesConfig.death;
    }
}

setInterval(animate, 100);

function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;
    monster.hp -= 25;
    attackBtn.disabled = true;
    spriteImg.style.filter = 'brightness(2.5)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);
    if (monster.hp <= 0) {
        monster.hp = 0; monster.isDead = true; monster.action = 'death'; monster.frame = 1;
        attackBtn.style.display = 'none';
        rewardPlayer();
    } else {
        setTimeout(() => { if (!monster.isDead) { monster.action = 'attack'; monster.frame = 1; } }, 400);
    }
    updateUI();
}

function addItem(id, name, icon, type, amount = 1) {
    const existing = inventory.find(i => i.id === id && (type === 'currency' || type === 'premium'));
    if (existing) existing.count += amount;
    else inventory.push({ id, name, icon, type, count: amount });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
}

function rewardPlayer() {
    addItem('gold', 'Золото', '🪙', 'currency', 10);
    if (Math.random() < 0.01) addItem('crystal', 'Кристалл', '💎', 'premium', 1);
    if (Math.random() < 0.15) addItem('club_' + Date.now(), 'Дубина', '🦴', 'weapon', 1);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function applyDamageToPlayer() {
    if (monster.isDead) return;
    player.hp -= monster.atk;
    if (player.hp < 0) player.hp = 0;
    const cont = document.getElementById('game-container');
    cont.style.animation = 'none';
    void cont.offsetWidth;
    cont.style.animation = 'shake 0.2s ease-in-out';
    updateUI();
    if (player.hp === 0) { setTimeout(() => { alert("Герой пал!"); location.reload(); }, 300); }
}

function updateUI() {
    monsterHpFill.style.width = (monster.hp / monster.maxHp * 100) + '%';
    playerHpFill.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp} / ${player.maxHp} HP`;

    invGrid.innerHTML = '';
    inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.innerHTML = `<span>${item.icon}</span>`;
        if (item.count > 1) slot.innerHTML += `<span class="item-count">${item.count}</span>`;
        invGrid.appendChild(slot);
    });
}

preloadImages();
attackBtn.onclick = playerAttack;
tg.expand();
updateUI();
