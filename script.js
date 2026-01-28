const tg = window.Telegram.WebApp;
tg.expand();

const player = { hp: 100, maxHp: 100, baseDamage: 25 };
let enemy = { hp: 100, isDead: false };
let monster, shopImage, bg, fireGroup = [];
let currentScene, isIntroDone = false;

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 480, height: 600,
    backgroundColor: '#000',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { preload, create }
};

const game = new Phaser.Game(config);

function preload() {
    this.load.image('bg_cave', 'img/locations/cave_bg.jpg');
    this.load.image('shop_png', 'img/locations/shop_bg.png'); // Твой PNG
    this.load.image('item_hand', 'img/items/hand.png');
    this.load.image('item_club', 'img/items/club.png');
    this.load.image('item_sword', 'img/items/sword.png');
    
    const sprites = ['idle', 'run', 'hurt', 'attack', 'death'];
    sprites.forEach(s => {
        this.load.spritesheet('g_' + s, `img/goblin/${s}.png`, { frameWidth: 480, frameHeight: 480 });
    });
}

function create() {
    currentScene = this;
    bg = this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    
    // Создаем лавку (PNG), пока невидимую
    shopImage = this.add.image(240, 300, 'shop_png').setDisplaySize(480, 600).setAlpha(0);

    // Огонь (генерация текстуры)
    const g = this.make.graphics({x:0,y:0,add:false}).fillStyle(0xffffff).fillCircle(10,10,10).generateTexture('fire',20,20);
    const fConfig = { speedY:{min:-100,max:-50}, scale:{start:1.5,end:0}, alpha:{start:0.5,end:0}, lifespan:800, blendMode:'ADD', tint:[0xffcc00, 0xff4400] };
    fireGroup.push(this.add.particles(85, 295, 'fire', fConfig));
    fireGroup.push(this.add.particles(405, 295, 'fire', fConfig));

    // Анимации
    this.anims.create({ key: 'run', frames: this.anims.generateFrameNumbers('g_run'), frameRate: 14, repeat: -1 });
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle'), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt'), frameRate: 20 });
    this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_attack'), frameRate: 12 });
    this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death'), frameRate: 10 });

    spawnGoblin();
    updateUI();
}

function spawnGoblin() {
    if (monster) monster.destroy();
    enemy.hp = 100; enemy.isDead = false; isIntroDone = false;
    monster = currentScene.add.sprite(240, 280, 'g_run').setScale(0.01).setAlpha(0);
    monster.play('run');
    currentScene.tweens.add({
        targets: monster, y: 420, scale: 0.85, alpha: 1, duration: 1500,
        onComplete: () => { monster.play('idle'); isIntroDone = true; }
    });
}

function doAttack() {
    if (!isIntroDone || enemy.isDead || !monster.visible) return;
    const inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let dmg = 25;
    if (inv.find(i => i.id === 'steel_sword')) dmg += 60;
    else if (inv.find(i => i.id === 'goblin_club')) dmg += 15;

    enemy.hp -= dmg;
    monster.play('hurt');
    monster.once('animationcomplete', () => {
        if (enemy.hp <= 0) {
            enemy.isDead = true; monster.play('death');
            addItem('gold', '🪙', 25);
            addItem('bone', '🦴', 1);
            addItem('goblin_club', 'img/items/club.png', 1, true);
            setTimeout(spawnGoblin, 1000);
        } else {
            monster.play('atk');
            monster.once('animationcomplete', () => {
                player.hp = Math.max(0, player.hp - 15); updateUI();
                currentScene.cameras.main.shake(100, 0.01);
                if (player.hp > 0) monster.play('idle');
            });
        }
    });
}

// МАГАЗИН
window.enterShop = function() {
    isIntroDone = false;
    currentScene.tweens.add({ targets: monster, alpha: 0, duration: 300 });
    currentScene.tweens.add({ targets: shopImage, alpha: 1, duration: 500 });
    document.getElementById('shop-modal').classList.add('modal-show');
};

window.exitShop = function() {
    currentScene.tweens.add({ targets: shopImage, alpha: 0, duration: 300 });
    currentScene.tweens.add({ targets: monster, alpha: 1, duration: 300, onComplete: () => isIntroDone = true });
    document.getElementById('shop-modal').classList.remove('modal-show');
};

function addItem(id, icon, count, isImg = false) {
    let inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let f = inv.find(i => i.id === id);
    if (f) f.count += count; else inv.push({id, icon, count, isImage: isImg});
    localStorage.setItem('gameInventory', JSON.stringify(inv));
    updateUI();
}

function updateUI() {
    const inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    document.getElementById('hp-bar-fill').style.width = player.hp + '%';
    document.getElementById('hp-text').innerText = player.hp + ' / 100 HP';
    
    const icon = document.getElementById('weapon-icon');
    if (inv.find(i => i.id === 'steel_sword' && i.count > 0)) icon.src = 'img/items/sword.png';
    else if (inv.find(i => i.id === 'goblin_club' && i.count > 0)) icon.src = 'img/items/club.png';
    else icon.src = 'img/items/hand.png';

    const cont = document.getElementById('inv-container');
    cont.innerHTML = '';
    inv.filter(i => i.count > 0).forEach(item => {
        const visual = item.isImage ? `<img src="${item.icon}">` : `<span>${item.icon}</span>`;
        cont.innerHTML += `<div class="slot">${visual}<span class="qty">${item.count}</span></div>`;
    });
    updateShopUI(inv);
}

function updateShopUI(inv) {
    const gold = inv.find(i => i.id === 'gold')?.count || 0;
    const shop = document.getElementById('shop-items');
    shop.innerHTML = `
        <p style="color:#edaf11">Золото: 🪙 ${gold}</p>
        <div class="shop-row"><span>Зелье (+50 HP)</span><button onclick="buyItem('potion')">30🪙</button></div>
        <div class="shop-row"><span>Меч (+60 Урон)</span><button onclick="buyItem('sword')">200🪙</button></div>
    `;
}

window.buyItem = function(t) {
    let inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let gold = inv.find(i => i.id === 'gold');
    if (t === 'potion' && gold?.count >= 30) { gold.count -= 30; player.hp = Math.min(100, player.hp + 50); }
    if (t === 'sword' && gold?.count >= 200 && !inv.find(i => i.id === 'steel_sword')) {
        gold.count -= 200; addItem('steel_sword', 'img/items/sword.png', 1, true);
    }
    localStorage.setItem('gameInventory', JSON.stringify(inv)); updateUI();
};

document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-shop-toggle').onclick = enterShop;
document.getElementById('btn-reset').onclick = () => { localStorage.clear(); location.reload(); };
window.closeModals = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('modal-show'));
