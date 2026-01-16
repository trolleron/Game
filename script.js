const tg = window.Telegram.WebApp;

// Сохранение и загрузка
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [
    { id: 'gold', name: 'Золото', icon: '🪙', count: 0, type: 'currency' },
    { id: 'crystal', name: 'Кристалл', icon: '💎', count: 0, type: 'premium' }
];

const player = { hp: 100, maxHp: 100 };
const monster = {
    type: 'goblin', action: 'idle', frame: 0,
    hp: 100, maxHp: 100, atk: 15, isDead: false
};

// Конфиг спрайтов
const spriteConf = {
    gridSize: 4,      // Сетка 4x4
    frameSize: 480,   // Размер кадра из 1920x1920
    counts: { idle: 16, attack: 10, death: 10, hurt: 10 }
};

const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const attackBtn = document.getElementById('btn-attack');
const invOverlay = document.getElementById('inventory-overlay');
const invGrid = document.getElementById('inventory-slots');

function setSpriteSheet(action) {
    spriteImg.style.backgroundImage = `url('img/${monster.type}/${action}.png')`;
}

function animate() {
    const totalFrames = spriteConf.counts[monster.action];
    
    // Замирание на последнем кадре смерти
    if (monster.isDead && monster.action === 'death' && monster.frame >= totalFrames - 1) {
        monster.frame = totalFrames - 1;
    }

    // Расчет сетки 4x4
    const row = Math.floor(monster.frame / spriteConf.gridSize);
    const col = monster.frame % spriteConf.gridSize;
    const posX = -(col * spriteConf.frameSize);
    const posY = -(row * spriteConf.frameSize);

    spriteImg.style.backgroundPosition = `${posX}px ${posY}px`;

    // Момент удара гоблина
    if (monster.action === 'attack' && monster.frame === 6) {
        applyDamageToPlayer();
    }

    monster.frame++;

    if (monster.frame >= totalFrames) {
        if (monster.action === 'idle') {
            monster.frame = 0;
        } else if (monster.action === 'hurt') {
            // После получения урона гоблин атакует, если жив
            if (!monster.isDead) changeAction('attack');
        } else if (monster.action === 'attack') {
            changeAction('idle');
            attackBtn.disabled = false;
        } else if (monster.action === 'death') {
            monster.frame = totalFrames - 1;
        }
    }
}

function changeAction(newAct) {
    if (monster.isDead && newAct !== 'death') return;
    monster.action = newAct;
    monster.frame = 0;
    setSpriteSheet(newAct);
}

// Запуск анимации
setInterval(animate, 90);
setSpriteSheet('idle');

// Логика боя
function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;
    
    monster.hp -= 25;
    attackBtn.disabled = true;

    // Сразу анимация ранения
    changeAction('hurt');

    spriteImg.style.filter = 'brightness(2.5)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0; monster.isDead = true;
        setTimeout(() => changeAction('death'), 300);
        attackBtn.style.display = 'none';
        rewardPlayer();
    }
    updateUI();
}

function rewardPlayer() {
    addItem('gold', 'Золото', '🪙', 'currency', 10);
    // 1% шанс на кристалл
    if (Math.random() < 0.01) addItem('crystal', 'Кристалл', '💎', 'premium', 1);
    // 15% шанс на дубину
    if (Math.random() < 0.15) addItem('club_' + Date.now(), 'Дубина', '🦴', 'weapon', 1);
    
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function addItem(id, name, icon, type, amount = 1) {
    const existing = inventory.find(i => i.id === id && (type === 'currency' || type === 'premium'));
    if (existing) existing.count += amount;
    else inventory.push({ id, name, icon, type, count: amount });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
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
    if (player.hp === 0) {
        setTimeout(() => { alert("Герой погиб!"); location.reload(); }, 500);
    }
}

function updateUI() {
    monsterHpFill.style.width = (monster.hp / monster.maxHp * 100) + '%';
    playerHpFill.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp} / ${player.maxHp} HP`;

    invGrid.innerHTML = '';
    inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        if (item.type === 'weapon') slot.style.borderColor = '#ff4757';
        slot.innerHTML = `<span>${item.icon}</span>`;
        if (item.count > 1) slot.innerHTML += `<span class="item-count">${item.count}</span>`;
        invGrid.appendChild(slot);
    });
}

// Кнопки рюкзака
document.getElementById('btn-inventory').onclick = () => { invOverlay.style.display = 'flex'; updateUI(); };
document.getElementById('close-inventory').onclick = () => { invOverlay.style.display = 'none'; };

attackBtn.onclick = playerAttack;
tg.expand();
updateUI();
