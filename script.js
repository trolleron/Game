const tg = window.Telegram.WebApp;
tg.expand();

// --- 1. НАСТРОЙКИ И СОСТОЯНИЕ ---
const player = { 
    hp: 100, 
    baseDamage: 25, // Обычный урон
    hasWeapon: false 
};
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
    this.load.image('item_club', 'img/items/club.png'); // ЗАГРУЗКА ДУБИНКИ
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_run', 'img/goblin/run.png', { frameWidth: 480, frameHeight: 480 }); 
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    // Проверка, есть ли уже оружие в сохраненках
    const savedInv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    player.hasWeapon = savedInv.some(i => i.id === 'goblin_club');

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

    // АНИМАЦИИ
    this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers('g_run', {start:0, end:11}), frameRate: 14, repeat: -1 });
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

    // ПОЯВЛЕНИЕ ГОБЛИНА
    monster = this.add.sprite(240, 280, 'g_run').setScale(0.01).setAlpha(0);
    monster.play('run');

    const atkBtn = document.getElementById('btn-attack');
    if (atkBtn) atkBtn.style.visibility = 'hidden';

    this.tweens.add({
        targets: monster,
        y: 420,
        scale: 0.85,
        alpha: 1,
        duration: 2500,
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

// --- ЛОГИКА БОЯ ---
function doAttack() {
    if (!isIntroDone || goblin.isDead || player.hp <= 0) return;

    document.getElementById('btn-attack').disabled = true;
    
    // Если есть оружие, бьем сильнее (40 вместо 25)
    const currentDamage = player.hasWeapon ? 40 : player.baseDamage;
    goblin.hp -= currentDamage;

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
    
    // С шансом 50% выпадает дубинка, если её еще нет
    if (!player.hasWeapon && Math.random() > 0.5) {
        addItem('goblin_club', 'img/items/club.png', 1, true); // true означает, что это картинка, а не эмодзи
        player.hasWeapon = true;
        alert('Ты подобрал дубинку гоблина! Урон увеличен!');
    }
}

function addItem(id, iconOrPath, count, isImage = false) {
    let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
    const found = inventory.find(i => i.id === id);
    if (found) {
        found.count = (Number(found.count) || 0) + count;
    } else {
        inventory.push({ id, icon: iconOrPath, count, isImage });
    }
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    // Здоровье
    const hpBar = document.getElementById('hp-bar-fill');
    if (hpBar) hpBar.style.width = player.hp + '%';
    
    // Инвентарь
    const container = document.getElementById('inv-container');
    if (container) {
        container.innerHTML = '';
        let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
        inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            
            // Если это картинка (дубинка), создаем тег img, иначе спан с эмодзи
            const visual = item.isImage 
                ? `<img src="${item.icon}" style="width:80%; height:80%; object-fit:contain;">`
                : `<span>${item.icon}</span>`;
                
            slot.innerHTML = `${visual}<span class="qty">${item.count || 0}</span>`;
            container.appendChild(slot);
        });
    }
}

document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-reset').onclick = () => { if(confirm('Сбросить всё?')) { localStorage.clear(); location.reload(); }};
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');
