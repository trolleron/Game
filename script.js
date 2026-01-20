const tg = window.Telegram.WebApp;
tg.expand();

// --- 1. НАСТРОЙКИ ---
const player = { hp: 100 };
const goblin = { hp: 100, isDead: false };
let monster = null;
let isIntroDone = false; 

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
    this.load.spritesheet('g_run', 'img/goblin/run.png', { frameWidth: 480, frameHeight: 480 }); 
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    // Текстура частиц
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('fire_particle', 20, 20);

    // Фон
    this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);

    // Огонь (твой scale 2.0)
    const fireOptions = {
        speedY: { min: -110, max: -60 }, speedX: { min: -25, max: 25 },
        scale: { start: 2.0, end: 0.1 }, alpha: { start: 0.6, end: 0 },
        lifespan: 900, blendMode: 'ADD', frequency: 40,
        tint: [ 0xffcc00, 0xff4400 ]
    };
    this.add.particles(85, 295, 'fire_particle', fireOptions);
    this.add.particles(405, 295, 'fire_particle', fireOptions);

    // СОЗДАНИЕ АНИМАЦИЙ
    // Здесь исправлено на 12 кадров (start:0, end:11)
    this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers('g_run', {start:0, end:11}), frameRate: 14, repeat: -1 });
    
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

    // --- ЛОГИКА ПОЯВЛЕНИЯ ---
    // Начальная позиция: глубоко в пещере (y: 280), масштаб почти нулевой
    monster = this.add.sprite(240, 280, 'g_run').setScale(0.01).setAlpha(0);
    monster.play('run');

    // Кнопка атаки скрыта до конца пробежки
    const atkBtn = document.getElementById('btn-attack');
    if (atkBtn) atkBtn.style.visibility = 'hidden';

    // Анимация приближения
    this.tweens.add({
        targets: monster,
        y: 420,           // Опускается на передний план
        scale: 0.85,      // Увеличивается до нормального размера
        alpha: 1,         // Постепенно проявляется из темноты
        duration: 2500,   // Время бега (2.5 сек)
        ease: 'Cubic.easeIn',
        onComplete: () => {
            monster.play('idle'); 
            isIntroDone = true;
            if (atkBtn) atkBtn.style.visibility = 'visible'; 
        }
    });

    window.gameScene = this;
    updateUI();
}

function doAttack() {
    if (!isIntroDone || goblin.isDead || player.hp <= 0) return;

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
    let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
    const found = inventory.find(i => i.id === id);
    if (found) found.count = (Number(found.count) || 0) + count;
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
        let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
        inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.innerHTML = `<span>${item.icon}</span><span class="qty">${item.count || 0}</span>`;
            container.appendChild(slot);
        });
    }
}

document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-reset').onclick = () => { localStorage.clear(); location.reload(); };
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');
