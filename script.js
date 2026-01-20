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
    // Текстура для частиц огня и свечения
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('glow_particle', 20, 20);

    // Фон
    if (this.textures.exists('bg_cave')) {
        this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    }

    // --- МАГИЧЕСКОЕ СВЕЧЕНИЕ КРИСТАЛЛОВ ---
    // Создаем точки свечения в местах, где на фоне нарисованы кристаллы
    const crystalPoints = [
        { x: 120, y: 150, color: 0x00ffff, scale: 4 }, // Голубой слева сверху
        { x: 380, y: 180, color: 0xff00ff, scale: 3 }, // Розовый справа
        { x: 240, y: 80,  color: 0x00ff00, scale: 2.5 } // Зеленоватый в центре вверху
    ];

    crystalPoints.forEach(point => {
        let light = this.add.image(point.x, point.y, 'glow_particle');
        light.setTint(point.color);
        light.setBlendMode('ADD');
        light.setScale(point.scale);
        light.setAlpha(0.2);

        // Анимация пульсации (Tween)
        this.tweens.add({
            targets: light,
            alpha: 0.6,
            scale: point.scale * 1.2,
            duration: 1500 + Math.random() * 1000, // Разное время для естественности
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    });

    // --- ОГОНЬ (ТВОЙ SCALE 2.0) ---
    const fireOptions = {
        speedY: { min: -110, max: -60 },
        speedX: { min: -25, max: 25 },
        scale: { start: 2.0, end: 0.1 }, 
        alpha: { start: 0.6, end: 0 },
        lifespan: 900,
        blendMode: 'ADD',
        frequency: 40,
        tint: [ 0xffcc00, 0xff4400, 0xaa0000 ]
    };

    const fireY = 295; 
    this.add.particles(85, fireY, 'glow_particle', fireOptions);
    this.add.particles(405, fireY, 'glow_particle', fireOptions);

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
    if (found) {
        found.count = (Number(found.count) || 0) + count;
    } else {
        inventory.push({ id, icon, count: Number(count) });
    }
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
            const countText = item.count || '0';
            slot.innerHTML = `<span>${item.icon}</span><span class="qty">${countText}</span>`;
            container.appendChild(slot);
        });
    }
}

document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-reset').onclick = () => { localStorage.clear(); location.reload(); };
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');
