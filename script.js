const tg = window.Telegram.WebApp;

// --- ЗАГРУЗКА И АВТО-ИСПРАВЛЕНИЕ ИНВЕНТАРЯ ---
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];

// Функция "Пылесос": собирает старый мусор в одну кучу
function fixOldInventory() {
    let boneCount = 0;
    let needsUpdate = false;

    // 1. Фильтруем инвентарь: оставляем нормальные вещи, а кости считаем и удаляем
    inventory = inventory.filter(item => {
        // Если это старая кость (с длинным ID или названием)
        if (item.id.includes('bone') || item.id.includes('club_') || item.name === 'Кость' || item.name === 'Дубина') {
            boneCount += (item.count || item.qty || 1); // Собираем количество
            needsUpdate = true;
            return false; // Удаляем из списка
        }
        return true; // Остальное оставляем
    });

    // 2. Если нашли старые кости, добавляем ОДНУ стопку
    if (boneCount > 0) {
        // Проверяем, есть ли уже нормальный слот
        const cleanBone = inventory.find(i => i.id === 'bone');
        if (cleanBone) {
            cleanBone.count += boneCount;
        } else {
            inventory.push({ id: 'bone', icon: '🦴', count: boneCount });
        }
    }

    // Сохраняем чистый инвентарь
    if (needsUpdate) {
        localStorage.setItem('gameInventory', JSON.stringify(inventory));
    }
}

// Запускаем чистку сразу при старте
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
}

function create() {
    this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

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
                window.gameScene.cameras.main.shake(150, 0.005);
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
    // Теперь всегда используем id 'gold' и 'bone'
    addItem('gold', '🪙', 25);
    addItem('bone', '🦴', 1);
}

function addItem(id, icon, count) {
    // Ищем предмет по ID
    const existing = inventory.find(item => item.id === id);
    if (existing) {
        // Если есть — плюсуем (защита от undefined)
        existing.count = (existing.count || 0) + count;
    } else {
        // Если нет — создаем
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

// --- ФУНКЦИЯ ПОЛНОГО СБРОСА ---
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
// Кнопка сброса
document.getElementById('btn-reset').onclick = resetGame;

tg.expand();
updateUI();
