const tg = window.Telegram.WebApp;

// --- ЗАГРУЗКА И АВТО-ИСПРАВЛЕНИЕ ИНВЕНТАРЯ ---
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];

function fixOldInventory() {
    let boneCount = 0;
    let needsUpdate = false;
    inventory = inventory.filter(item => {
        if (item.id.includes('bone') || item.id.includes('club_') || item.name === 'Кость' || item.name === 'Дубина') {
            boneCount += (item.count || item.qty || 1);
            needsUpdate = true;
            return false;
        }
        return true;
    });

    if (boneCount > 0) {
        const cleanBone = inventory.find(i => i.id === 'bone');
        if (cleanBone) {
            cleanBone.count += boneCount;
        } else {
            inventory.push({ id: 'bone', icon: '🦴', count: boneCount });
        }
    }
    if (needsUpdate) localStorage.setItem('gameInventory', JSON.stringify(inventory));
}
fixOldInventory();

// --- НАСТРОЙКИ ИГРЫ ---
const player = { hp: 100, max: 100 };
const goblin = { hp: 100, max: 100, isDead: false };

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 480,
    height: 600,
    transparent: true,
    scene: { preload, create }
};

const game = new Phaser.Game(config);
let monster;

function preload() {
    this.load.image('bg_cave', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });

    // 🔥 ЖИВОЙ ОГОНЬ: Генерируем текстуру для частицы огня прямо в памяти 🔥
    // Создаем маленький белый кружок
    let graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(10, 10, 10);
    // Сохраняем его как текстуру 'fire_particle'
    graphics.generateTexture('fire_particle', 20, 20);
}

function create() {
    // 1. Фон
    this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    
    // 🔥 ЖИВОЙ ОГОНЬ: Создаем систему частиц 🔥
    // Важно добавить их ПОСЛЕ фона, но ДО гоблина
    const particles = this.add.particles('fire_particle');

    // Настройка эмиттера (источника огня)
    const fireConfig = {
        speedY: { min: -120, max: -60 }, // Летят вверх с разной скоростью
        speedX: { min: -15, max: 15 },   // Немного виляют по сторонам
        scale: { start: 0.8, end: 0 },   // Начинают большими, исчезают в ноль
        alpha: { start: 0.6, end: 0 },   // Полупрозрачные в начале, тают в конце
        lifespan: 800, // Живут 0.8 секунды
        tint: [ 0xffff00, 0xff6600, 0xff0000 ], // Цвет: Желтый -> Оранжевый -> Красный
        blendMode: 'ADD', // Режим наложения "Свечение"
        frequency: 60 // Как часто рождаются новые частицы (меньше = гуще огонь)
    };

    // Левый факел (координаты подобраны под картинку)
    particles.createEmitter({
        ...fireConfig,
        x: 85, y: 255 
    });

    // Правый факел
    particles.createEmitter({
        ...fireConfig,
        x: 405, y: 255
    });

    // 2. Анимации гоблина
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

    // 3. Сам гоблин
    monster = this.add.sprite(240, 420, 'g_idle').setScale(0.8);
    monster.play('idle');
    window.gameScene = this;
}

// --- ЛОГИКА БОЯ ---
function doAttack() {
    if (goblin.isDead || player.hp <= 0) return;
    
    document.getElementById('btn-attack').disabled = true;
    goblin.hp -= 25;
    monster.play('hurt');

    monster.once('animationcomplete', () => {
        if (goblin.hp <= 0) {
            goblin.isDead = true;
            monster.play('death');
            giveReward();
        } else {
            monster.play('atk');
            monster.once('animationcomplete', () => {
                player.hp -= 15;
                updateUI();
                // Тряска чуть сильнее для эффекта
                window.gameScene.cameras.main.shake(200, 0.01);
                if (player.hp > 0) {
                    monster.play('idle');
                    document.getElementById('btn-attack').disabled = false;
                }
            });
        }
    });
}

// --- ИНВЕНТАРЬ ---
function giveReward() {
    addItem('gold', '🪙', 25);
    addItem('bone', '🦴', 1);
}

function addItem(id, icon, count) {
    const existing = inventory.find(item => item.id === id);
    if (existing) {
        existing.count = (existing.count || 0) + count;
    } else {
        inventory.push({ id, icon, count });
    }
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    document.getElementById('hp-bar-fill').style.width = player.hp + '%';
    document.getElementById('hp-text').textContent = `${player.hp} / 100 HP`;
    
    const container = document.getElementById('inv-container');
    container.innerHTML = '';
    
    inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.innerHTML = `<span>${item.icon}</span><span class="qty">${item.count}</span>`;
        container.appendChild(slot);
    });
}

function resetGame() {
    if(confirm('Сбросить весь прогресс?')) {
        localStorage.clear();
        location.reload();
    }
}

// События
document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');
document.getElementById('btn-reset').onclick = resetGame;

tg.expand();
updateUI();
