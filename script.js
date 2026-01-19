const tg = window.Telegram.WebApp;

// --- ЛОГИКА ИНВЕНТАРЯ (оставляем из прошлого шага) ---
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [
    { id: 'gold', name: 'Золото', icon: '🪙', count: 0, type: 'currency' }
];

const player = { hp: 100, maxHp: 100 };

// --- НАСТРОЙКИ PHASER ---
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 450,
    height: 500,
    transparent: true, // Чтобы видеть cave_bg из CSS или загрузим его в Phaser
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
let monster;

function preload() {
    // В Phaser спрайт-листы режутся автоматически!
    // Указываем путь и размер одного кадра (480x480)
    this.load.spritesheet('goblin_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('goblin_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('goblin_attack', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('goblin_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
    
    // Загрузим фон прямо в Phaser для лучшего контроля
    this.load.image('background', 'img/locations/cave_bg.jpg');
}

function create() {
    // 1. Фон
    let bg = this.add.image(225, 250, 'background');
    bg.setDisplaySize(450, 500);

    // 2. Создаем анимации
    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNumbers('goblin_idle', { start: 0, end: 15 }),
        frameRate: 12,
        repeat: -1
    });

    this.anims.create({
        key: 'hurt',
        frames: this.anims.generateFrameNumbers('goblin_hurt', { start: 0, end: 9 }),
        frameRate: 15,
        repeat: 0
    });

    this.anims.create({
        key: 'attack',
        frames: this.anims.generateFrameNumbers('goblin_attack', { start: 0, end: 9 }),
        frameRate: 12,
        repeat: 0
    });

    this.anims.create({
        key: 'death',
        frames: this.anims.generateFrameNumbers('goblin_death', { start: 0, end: 9 }),
        frameRate: 10,
        repeat: 0
    });

    // 3. Создаем монстра
    monster = this.add.sprite(225, 350, 'goblin_idle').setScale(0.7);
    monster.play('idle');

    // Сохраняем ссылку на сцену для доступа извне
    window.gameScene = this;
}

function update() {
    // Тут можно добавить движение частиц или туман
}

// --- БОЕВАЯ ЛОГИКА ---
function playerAttack() {
    if (player.hp <= 0) return;

    const scene = window.gameScene;
    document.getElementById('btn-attack').disabled = true;

    // Анимация получения урона
    monster.play('hurt');
    
    // Эффект вспышки в Phaser
    scene.tweens.add({
        targets: monster,
        alpha: 0.5,
        duration: 50,
        yoyo: true,
        tint: 0xffffff
    });

    // После анимации hurt решаем: смерть или контратака
    monster.once('animationcomplete', (anim) => {
        if (anim.key === 'hurt') {
            // Упрощенно: шанс смерти 20% или по HP
            if (Math.random() < 0.2) {
                monster.play('death');
                rewardPlayer();
            } else {
                monster.play('attack');
                monster.once('animationcomplete', (a) => {
                    if (a.key === 'attack') {
                        applyDamageToPlayer();
                        monster.play('idle');
                        document.getElementById('btn-attack').disabled = false;
                    }
                });
            }
        }
    });
}

// Инвентарь и UI (без изменений, просто адаптируем функции)
function addItem(id, name, icon, type, amount = 1) {
    const existing = inventory.find(i => i.id === id);
    if (existing) existing.count += amount;
    else inventory.push({ id, name, icon, type, count: amount });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function rewardPlayer() {
    addItem('gold', 'Золото', '🪙', 'currency', 10);
    addItem('goblin_bone', 'Кость', '🦴', 'material', 1);
}

function applyDamageToPlayer() {
    player.hp -= 15;
    if (player.hp < 0) player.hp = 0;
    updateUI();
    // Тряска камеры в Phaser - ОДНОЙ СТРОЧКОЙ!
    window.gameScene.cameras.main.shake(200, 0.01);
}

function updateUI() {
    document.getElementById('player-hp-fill').style.width = (player.hp / player.maxHp * 100) + '%';
    document.getElementById('hp-text').textContent = `${player.hp} / ${player.maxHp} HP`;
    
    const grid = document.getElementById('inventory-slots');
    grid.innerHTML = '';
    inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.innerHTML = `<span>${item.icon}</span><span class="item-count">${item.count}</span>`;
        grid.appendChild(slot);
    });
}

document.getElementById('btn-attack').onclick = playerAttack;
document.getElementById('btn-inventory').onclick = () => document.getElementById('inventory-overlay').style.display = 'flex';
document.getElementById('close-inventory').onclick = () => document.getElementById('inventory-overlay').style.display = 'none';

tg.expand();
updateUI();
