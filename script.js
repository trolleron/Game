const tg = window.Telegram.WebApp;
tg.expand();

// Настройки игрока
const player = { hp: 100, maxHp: 100, baseDamage: 25 };
let enemy = { hp: 100, isDead: false };
let monster = null;
let currentScene = null;
let isIntroDone = false;

// Цены
const PRICES = { sell_bone: 10, sell_club: 50, buy_potion: 30, buy_sword: 200 };

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
    // Загружаем иконки предметов для использования в Phaser (если понадобится)
    this.load.image('item_club', 'img/items/club.png');
    this.load.image('item_sword', 'img/items/sword.png');
    // ВАЖНО: Убедись, что картинка руки лежит здесь: img/items/hand.png
    
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_run', 'img/goblin/run.png', { frameWidth: 480, frameHeight: 480 }); 
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    currentScene = this;
    
    // Генерация текстуры для частиц огня
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('fire_particle', 20, 20);

    this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);

    const fireOptions = {
        speedY: { min: -110, max: -60 }, speedX: { min: -25, max: 25 },
        scale: { start: 2.0, end: 0.1 }, alpha: { start: 0.6, end: 0 },
        lifespan: 900, blendMode: 'ADD', frequency: 40,
        tint: [ 0xffcc00, 0xff4400 ]
    };
    this.add.particles(85, 295, 'fire_particle', fireOptions);
    this.add.particles(405, 295, 'fire_particle', fireOptions);

    // Анимации
    this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers('g_run', {start:0, end:11}), frameRate: 14, repeat: -1 });
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

    spawnGoblin(); 
    updateUI();
}

function spawnGoblin() {
    if (!currentScene) return;
    enemy.hp = 100; enemy.isDead = false; isIntroDone = false;
    if (monster) monster.destroy();

    monster = currentScene.add.sprite(240, 280, 'g_run').setScale(0.01).setAlpha(0);
    monster.play('run');

    currentScene.tweens.add({
        targets: monster,
        y: 420,
        scale: 0.85,
        alpha: 1,
        duration: 1500, // Быстрый выбег (1.5 сек)
        ease: 'Cubic.easeIn',
        onComplete: () => {
            monster.play('idle'); 
            isIntroDone = true;
        }
    });
}

function doAttack() {
    if (!isIntroDone || enemy.isDead || player.hp <= 0) return;
    
    const inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let bonus = 0;
    // Проверяем наличие оружия для бонуса урона
    if (inv.some(i => i.id === 'steel_sword' && i.count > 0)) bonus = 60;
    else if (inv.some(i => i.id === 'goblin_club' && i.count > 0)) bonus = 15;

    enemy.hp -= (player.baseDamage + bonus);
    monster.play('hurt');
    
    monster.once('animationcomplete', () => {
        if (enemy.hp <= 0) {
            enemy.isDead = true; monster.play('death');
            // Награда за победу
            addItem('gold', '🪙', 25);
            addItem('bone', '🦴', 1);
            addItem('goblin_club', 'img/items/club.png', 1, true); 
            setTimeout(() => spawnGoblin(), 1000); // Респаун через 1 сек
        } else {
            monster.play('atk');
            monster.once('animationcomplete', () => {
                player.hp = Math.max(0, player.hp - 15);
                updateUI();
                currentScene.cameras.main.shake(150, 0.01);
                if (player.hp > 0) monster.play('idle');
            });
        }
    });
}

function addItem(id, icon, count, isImage = false) {
    let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let found = inventory.find(i => i.id === id);
    if (found) found.count += count;
    else inventory.push({ id, icon, count, isImage });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    const inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    
    // HP
    const fill = document.getElementById('hp-bar-fill');
    if (fill) fill.style.width = player.hp + '%';
    const text = document.getElementById('hp-text');
    if (text) text.innerText = player.hp + ' / ' + player.maxHp + ' HP';
    
    // --- ЛОГИКА ИКОНКИ ОРУЖИЯ ---
    const btn = document.getElementById('btn-attack');
    const icon = document.getElementById('weapon-icon');
    
    // Проверяем, есть ли в инвентаре оружие (количество > 0)
    const hasSword = inv.some(i => i.id === 'steel_sword' && i.count > 0);
    const hasClub = inv.some(i => i.id === 'goblin_club' && i.count > 0);

    // Сбрасываем прозрачность кнопки в нормальное состояние
    btn.style.opacity = "1"; 

    if (hasSword) { 
        icon.src = 'img/items/sword.png'; 
    } else if (hasClub) { 
        icon.src = 'img/items/club.png'; 
    } else { 
        // Если оружия нет совсем, ставим иконку пустой руки
        icon.src = 'img/items/hand.png'; 
    }
    // ---------------------------

    // Инвентарь
    const container = document.getElementById('inv-container');
    if (container) {
        container.innerHTML = '';
        inv.filter(i => i.count > 0).forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            const visual = item.isImage ? `<img src="${item.icon}" style="width:70%;">` : `<span>${item.icon}</span>`;
            slot.innerHTML = visual + `<span class="qty">${item.count}</span>`;
            container.appendChild(slot);
        });
    }
    updateShopUI(inv);
}

function updateShopUI(inv) {
    const gold = inv.find(i => i.id === 'gold')?.count || 0;
    const bones = inv.find(i => i.id === 'bone')?.count || 0;
    const clubs = inv.find(i => i.id === 'goblin_club')?.count || 0;
    const shop = document.getElementById('shop-items');
    if (!shop) return;
    shop.innerHTML = `
        <p style="color:#edaf11">Золото: 🪙 ${gold}</p>
        <div class="shop-row"><span>Зелье (+50 HP)</span><button onclick="buyItem('potion')">30🪙</button></div>
        <div class="shop-row"><span>Меч (+60 Урон)</span><button onclick="buyItem('sword')">200🪙</button></div>
        <div class="shop-row"><span>Продать кости</span><button onclick="sellItem('bone')">+${bones * PRICES.sell_bone}🪙</button></div>
        <div class="shop-row"><span>Продать дубинки</span><button onclick="sellItem('club')">+${Math.max(0, clubs-1) * PRICES.sell_club}🪙</button></div>
    `;
}

window.buyItem = function(t) {
    let inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let g = inv.find(i => i.id === 'gold');
    if (t==='potion' && g?.count >= 30) {
        g.count -= 30; player.hp = Math.min(100, player.hp + 50);
    } else if (t==='sword' && g?.count >= 200) {
        if (!inv.some(i => i.id === 'steel_sword')) {
            g.count -= 200; addItem('steel_sword', 'img/items/sword.png', 1, true);
        }
    }
    localStorage.setItem('gameInventory', JSON.stringify(inv)); updateUI();
};

window.sellItem = function(t) {
    let inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let g = inv.find(i => i.id === 'gold');
    if (t==='bone') {
        let b = inv.find(i => i.id === 'bone');
        if (b) { g.count += b.count * 10; b.count = 0; }
    } else if (t==='club') {
        let c = inv.find(i => i.id === 'goblin_club');
        if (c && c.count > 1) { g.count += (c.count-1) * 50; c.count = 1; }
    }
    localStorage.setItem('gameInventory', JSON.stringify(inv)); updateUI();
};

document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-reset').onclick = () => { localStorage.clear(); location.reload(); };
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-shop-toggle').onclick = () => document.getElementById('shop-modal').classList.add('modal-show');
