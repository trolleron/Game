const tg = window.Telegram.WebApp;
tg.expand();

// --- 1. ОТЛАДКА ---
window.onerror = function(msg, url, line) {
    if (!msg.includes('ResizeObserver')) {
        const err = document.createElement('div');
        err.style.cssText = 'position:fixed; top:0; background:red; color:white; z-index:1000; padding:5px; font-size:10px;';
        err.innerHTML = `Ошибка: ${msg} (стр. ${line})`;
        document.body.appendChild(err);
    }
};

// --- 2. ЛОГИКА ИНВЕНТАРЯ ---
let inventory = [];
try {
    const saved = localStorage.getItem('gameInventory');
    inventory = saved ? JSON.parse(saved) : [];
    
    // Склеиваем кости в один слот
    let boneQty = 0;
    inventory = inventory.filter(i => {
        if (i.id === 'bone' || i.icon === '🦴') {
            boneQty += (Number(i.count) || 1);
            return false;
        }
        return true;
    });
    if (boneQty > 0) inventory.push({ id: 'bone', icon: '🦴', count: boneQty });
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
    backgroundColor: '#000000',
    scene: { preload, create }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.image('bg_cave', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    // Текстура частицы
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('fire_particle', 20, 20);

    // Фон
    if (this.textures.exists('bg_cave')) {
        this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    }

    // --- ОГОНЬ (ОПУЩЕН НИЖЕ) ---
    const fireOptions = {
        speedY: { min: -100, max: -50 },
        speedX: { min: -20, max: 20 },
        scale: { start: 2.0, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        lifespan: 800,
        blendMode: 'ADD',
        frequency: 45,
        tint: [ 0xffcc00, 0xff4400 ]
    };

    // Раньше Y был 255. Опускаем до 290, чтобы огонь "сидел" в чаше.
    const fireY = 290; 
    this.add.particles(85, fireY, 'fire_particle', fireOptions);
    this.add.particles(405, fireY, 'fire_particle', fireOptions);

    // Гоблин
    if (this.textures.exists('g_idle')) {
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

        monster = this.add.sprite(240, 420, 'g_idle').setScale(0.85);
        monster.play('idle');
    }

    window.gameScene = this;
    updateUI();
}

// --- ЛОГИКА БОЯ ---
function doAttack() {
    if (goblin.isDead || player.hp <= 0 || !monster) return;

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
                if (player.hp < 0) player.hp = 0;
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
            // Исправляем 'undefined': если count нет, пишем '1'
            const countText = (item.count !== undefined && item.count !== null) ? item.count : '1';
            slot.innerHTML = `<span>${item.icon}</span><span class="qty">${countText}</span>`;
            container.appendChild(slot);
        });
    }
}

// КНОПКИ
document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-reset').onclick = () => { localStorage.clear(); location.reload(); };
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');
