const tg = window.Telegram.WebApp;
tg.expand();

// --- 1. ОТЛАДКА ---
// Если игра не запустится, ты увидишь текст ошибки на экране.
window.onerror = function(msg, url, line) {
    const errorBox = document.createElement('div');
    errorBox.style.cssText = 'position:fixed; top:10px; left:10px; background:red; color:white; z-index:1000; padding:10px; font-size:12px;';
    errorBox.innerHTML = `Ошибка: ${msg}<br>Строка: ${line}`;
    document.body.appendChild(errorBox);
};

// --- 2. ИНВЕНТАРЬ ---
let inventory = [];
try {
    const saved = localStorage.getItem('gameInventory');
    inventory = saved ? JSON.parse(saved) : [];
    let boneCount = 0;
    inventory = inventory.filter(i => {
        if (i.id === 'bone' || i.icon === '🦴') {
            boneCount += (Number(i.count) || 1);
            return false;
        }
        return true;
    });
    if (boneCount > 0) inventory.push({ id: 'bone', icon: '🦴', count: boneCount });
} catch (e) { inventory = []; }

// --- 3. КОНФИГ ИГРЫ ---
const player = { hp: 100 };
const goblin = { hp: 100, isDead: false };
let monster = null;

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 480,
    height: 600,
    backgroundColor: '#000000', // Черный фон по умолчанию
    scene: { preload, create }
};

const game = new Phaser.Game(config);

function preload() {
    // Загрузка ресурсов
    this.load.image('bg_cave', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    // 1. Создаем текстуру частицы (простой белый круг)
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('fire_particle', 20, 20);

    // 2. Фон
    if (this.textures.exists('bg_cave')) {
        this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    }

    // 3. ОГОНЬ (Упрощенная, но пышная версия без emitZone)
    const fireOptions = {
        speedY: { min: -120, max: -60 },
        speedX: { min: -25, max: 25 },
        scale: { start: 1.8, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 800,
        blendMode: 'ADD',
        frequency: 40,
        tint: [ 0xffaa00, 0xff4400 ] // Цвета пламени
    };

    // Добавляем частицы на координаты факелов
    this.add.particles(85, 255, 'fire_particle', fireOptions);
    this.add.particles(405, 255, 'fire_particle', fireOptions);

    // 4. ГОБЛИН
    if (this.textures.exists('g_idle')) {
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

        monster = this.add.sprite(240, 420, 'g_idle').setScale(0.85);
        monster.play('idle');
    } else {
        // Если спрайтов нет — просто текст
        this.add.text(180, 400, "НЕТ ГОБЛИНА", { color: '#00ff00' });
    }

    window.gameScene = this;
    updateUI();
}

// --- 4. ЛОГИКА ---
function doAttack() {
    if (goblin.isDead || player.hp <= 0 || !monster) return;

    document.getElementById('btn-attack').disabled = true;
    goblin.hp -= 25;

    if (monster.play) {
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
                    if (window.gameScene) window.gameScene.cameras.main.shake(150, 0.01);
                    if (player.hp > 0) {
                        monster.play('idle');
                        document.getElementById('btn-attack').disabled = false;
                    }
                });
            }
        });
    }
}

function giveReward() {
    addItem('gold', '🪙', 25);
    addItem('bone', '🦴', 1);
}

function addItem(id, icon, count) {
    const found = inventory.find(i => i.id === id);
    if (found) found.count += count;
    else inventory.push({ id, icon, count });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    const hpBar = document.getElementById('hp-bar-fill');
    if (hpBar) hpBar.style.width = player.hp + '%';
    
    const container = document.getElementById('inv-container');
    if (container) {
        container.innerHTML = '';
        inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.innerHTML = `<span>${item.icon}</span><span class="qty">${item.count || 1}</span>`;
            container.appendChild(slot);
        });
    }
}

// ПРИВЯЗКА СОБЫТИЙ
document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-reset').onclick = () => { localStorage.clear(); location.reload(); };
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');
