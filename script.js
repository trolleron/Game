const tg = window.Telegram.WebApp;
tg.expand();

// --- 1. ЗАЩИТА ОТ ОШИБОК ---
window.onerror = function(msg, url, line) {
    // Выводим ошибку, только если это не мелочь
    if (!msg.includes('ResizeObserver')) {
        alert(`ОШИБКА:\n${msg}\nСтрока: ${line}`);
    }
};

// --- 2. ИНВЕНТАРЬ ---
let inventory = [];
try {
    const saved = localStorage.getItem('gameInventory');
    inventory = saved ? JSON.parse(saved) : [];
    // Чистка дубликатов
    let boneCount = 0;
    inventory = inventory.filter(i => {
        if (i.id === 'bone' || i.id.includes('club')) {
            boneCount += (i.count || 1);
            return false;
        }
        return true;
    });
    if (boneCount > 0) inventory.push({ id: 'bone', icon: '🦴', count: boneCount });
} catch (e) { inventory = []; }

// --- 3. НАСТРОЙКИ ---
const player = { hp: 100, max: 100 };
const goblin = { hp: 100, max: 100, isDead: false };
let monster = null;

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 480,
    height: 600,
    transparent: true,
    scene: { preload, create }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.on('loaderror', function(fileObj) {
        alert('НЕ НАЙДЕН ФАЙЛ:\n' + fileObj.src);
    });

    this.load.image('bg_cave', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    // 1. Создаем текстуру огонька
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('fire_dot', 20, 20);

    // 2. Фон
    if (this.textures.exists('bg_cave')) {
        this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    }

    // 3. ОГОНЬ (ИСПРАВЛЕНО ДЛЯ PHASER 3.60)
    // Настройки для обоих факелов
    const fireConfig = {
        speedY: { min: -100, max: -50 }, // Летят вверх
        speedX: { min: -10, max: 10 },   // Дрожат по сторонам
        scale: { start: 0.8, end: 0 },   // Уменьшаются
        alpha: { start: 0.6, end: 0 },   // Исчезают
        lifespan: 800,
        blendMode: 'ADD',                // Режим наложения "Свечение"
        frequency: 50                    // Частота появления
    };

    // Создаем два отдельных эмиттера, так надежнее
    this.add.particles(85, 255, 'fire_dot', fireConfig);  // Левый факел
    this.add.particles(405, 255, 'fire_dot', fireConfig); // Правый факел

    // 4. Гоблин
    if (this.textures.exists('g_idle')) {
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });
        
        monster = this.add.sprite(240, 420, 'g_idle').setScale(0.8);
        monster.play('idle');
    } else {
        monster = this.add.rectangle(240, 420, 150, 200, 0x00ff00);
        this.add.text(170, 400, "НЕТ\nКАРТИНКИ", { fontSize: '20px', color: '#000', align: 'center' });
    }

    window.gameScene = this;
}

// --- ЛОГИКА БОЯ ---
function doAttack() {
    if (goblin.isDead || player.hp <= 0) return;
    if (!monster) return;

    const btn = document.getElementById('btn-attack');
    btn.disabled = true;
    
    goblin.hp -= 25;

    if (monster.play) {
        monster.play('hurt');
        monster.once('animationcomplete', checkWin);
    } else {
        // Эффект для квадрата-заглушки
        if (window.gameScene) {
            window.gameScene.tweens.add({ targets: monster, x: 250, duration: 50, yoyo: true, repeat: 3 });
        }
        setTimeout(checkWin, 500);
    }
}

function checkWin() {
    if (goblin.hp <= 0) {
        goblin.isDead = true;
        if (monster.play) monster.play('death');
        else monster.fillColor = 0x555555;
        giveReward();
    } else {
        if (monster.play) monster.play('atk');
        
        setTimeout(() => {
            player.hp -= 15;
            updateUI();
            if (window.gameScene) window.gameScene.cameras.main.shake(150, 0.01);
            
            if (player.hp > 0) {
                if (monster.play) monster.play('idle');
                document.getElementById('btn-attack').disabled = false;
            }
        }, 500);
    }
}

// --- ИНТЕРФЕЙС ---
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
    
    const hpText = document.getElementById('hp-text');
    if (hpText) hpText.textContent = `${player.hp} / 100 HP`;

    const grid = document.getElementById('inv-container');
    if (grid) {
        grid.innerHTML = '';
        inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.innerHTML = `<span>${item.icon}</span><span class="qty">${item.count}</span>`;
            grid.appendChild(slot);
        });
    }
}

// Кнопки
const btnAtk = document.getElementById('btn-attack');
if(btnAtk) btnAtk.onclick = doAttack;

const btnReset = document.getElementById('btn-reset');
if(btnReset) btnReset.onclick = () => { if(confirm('Сброс?')) { localStorage.clear(); location.reload(); }};

const btnInv = document.getElementById('btn-inv-toggle');
if(btnInv) btnInv.onclick = () => document.getElementById('inv-modal').classList.add('modal-show');

const btnClose = document.getElementById('btn-close-inv');
if(btnClose) btnClose.onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');

updateUI();
