const tg = window.Telegram.WebApp;
tg.expand();

// Настройки игрока
const player = { 
    hp: 100, 
    maxHp: 100, 
    baseDamage: 25,
    weaponPower: 0 // Доп. урон от лучшего оружия в инвентаре
};

let enemy = { hp: 100, isDead: false };
let monster = null;
let currentScene = null;
let isIntroDone = false;

// Цены магазина
const PRICES = {
    sell_bone: 10,      // Цена продажи кости
    sell_club: 50,      // Цена продажи дубинки
    buy_potion: 30,     // Цена лечения (восстанавливает 50 HP)
    buy_sword: 200      // Цена Стального меча (урон +60)
};

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
    this.load.image('item_club', 'img/items/club.png');
    this.load.image('item_sword', 'img/items/sword.png'); // Загрузи картинку меча, если есть
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_run', 'img/goblin/run.png', { frameWidth: 480, frameHeight: 480 }); 
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    currentScene = this;
    
    // Частицы огня
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
    enemy.hp = 100;
    enemy.isDead = false;
    isIntroDone = false;
    if (monster) monster.destroy();

    monster = currentScene.add.sprite(240, 280, 'g_run').setScale(0.01).setAlpha(0);
    monster.play('run');

    const atkBtn = document.getElementById('btn-attack');
    if (atkBtn) {
        atkBtn.style.visibility = 'hidden';
        atkBtn.disabled = false;
    }

    currentScene.tweens.add({
        targets: monster, y: 420, scale: 0.85, alpha: 1, duration: 2500, ease: 'Cubic.easeIn',
        onComplete: () => {
            monster.play('idle'); 
            isIntroDone = true;
            if (atkBtn) atkBtn.style.visibility = 'visible';
        }
    });
}

function doAttack() {
    if (!isIntroDone || enemy.isDead || player.hp <= 0) return;
    document.getElementById('btn-attack').disabled = true;
    
    // Считаем урон на основе лучшего оружия
    const inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let damageBonus = 0;
    if (inv.some(i => i.id === 'steel_sword')) damageBonus = 60;
    else if (inv.some(i => i.id === 'goblin_club')) damageBonus = 15;

    enemy.hp -= (player.baseDamage + damageBonus);

    monster.play('hurt');
    monster.once('animationcomplete', () => {
        if (enemy.hp <= 0) {
            enemy.isDead = true;
            monster.play('death');
            giveReward();
        } else {
            monster.play('atk');
            monster.once('animationcomplete', () => {
                player.hp -= 15;
                if (player.hp < 0) player.hp = 0;
                updateUI();
                currentScene.cameras.main.shake(150, 0.01);
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
    addItem('goblin_club', 'img/items/club.png', 1, true); 
    setTimeout(() => spawnGoblin(), 1000);
}

// --- ЛОГИКА ИНВЕНТАРЯ И МАГАЗИНА ---

function addItem(id, icon, count, isImage = false) {
    let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let found = inventory.find(i => i.id === id);
    if (found) {
        found.count = (Number(found.count) || 0) + count;
    } else {
        inventory.push({ id, icon, count: Number(count), isImage });
    }
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    // HP
    const fill = document.getElementById('hp-bar-fill');
    if (fill) fill.style.width = player.hp + '%';
    const text = document.getElementById('hp-text');
    if (text) text.innerText = player.hp + ' / ' + player.maxHp + ' HP';
    
    // Инвентарь
    const inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    const container = document.getElementById('inv-container');
    if (container) {
        container.innerHTML = '';
        inv.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            const visual = item.isImage ? `<img src="${item.icon}" style="width:70%;">` : `<span>${item.icon}</span>`;
            slot.innerHTML = visual + `<span class="qty">${item.count}</span>`;
            container.appendChild(slot);
        });
    }

    // Обновляем магазин (цены и кнопки)
    updateShopUI(inv);
}

function updateShopUI(inv) {
    const shopContainer = document.getElementById('shop-items');
    if (!shopContainer) return;

    const gold = inv.find(i => i.id === 'gold')?.count || 0;
    const bones = inv.find(i => i.id === 'bone')?.count || 0;
    const clubs = inv.find(i => i.id === 'goblin_club')?.count || 0;

    shopContainer.innerHTML = `
        <p>Ваше золото: 🪙 ${gold}</p>
        <hr>
        <div class="shop-row">
            <span>Зелье лечения (+50 HP)</span>
            <button onclick="buyItem('potion')">Купить за ${PRICES.buy_potion}🪙</button>
        </div>
        <div class="shop-row">
            <span>Стальной меч (Урон +60)</span>
            <button onclick="buyItem('sword')">Купить за ${PRICES.buy_sword}🪙</button>
        </div>
        <hr>
        <div class="shop-row">
            <span>Продать кости (все)</span>
            <button onclick="sellItem('bone')">Продать за ${bones * PRICES.sell_bone}🪙</button>
        </div>
        <div class="shop-row">
            <span>Продать лишние дубинки</span>
            <button onclick="sellItem('club')">Продать за ${Math.max(0, clubs-1) * PRICES.sell_club}🪙</button>
        </div>
    `;
}

window.buyItem = function(type) {
    let inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let goldObj = inv.find(i => i.id === 'gold');
    let gold = goldObj ? goldObj.count : 0;

    if (type === 'potion') {
        if (gold >= PRICES.buy_potion) {
            goldObj.count -= PRICES.buy_potion;
            player.hp = Math.min(player.maxHp, player.hp + 50);
            tg.showAlert("Вы выпили зелье! +50 HP");
        } else tg.showAlert("Недостаточно золота!");
    } 
    else if (type === 'sword') {
        if (gold >= PRICES.buy_sword) {
            if (inv.some(i => i.id === 'steel_sword')) {
                tg.showAlert("У вас уже есть этот меч!");
                return;
            }
            goldObj.count -= PRICES.buy_sword;
            addItem('steel_sword', 'img/items/sword.png', 1, true);
            tg.showAlert("Вы купили Стальной меч!");
        } else tg.showAlert("Недостаточно золота!");
    }
    localStorage.setItem('gameInventory', JSON.stringify(inv));
    updateUI();
};

window.sellItem = function(type) {
    let inv = JSON.parse(localStorage.getItem('gameInventory')) || [];
    let goldObj = inv.find(i => i.id === 'gold');
    
    if (type === 'bone') {
        let boneObj = inv.find(i => i.id === 'bone');
        if (boneObj && boneObj.count > 0) {
            goldObj.count += boneObj.count * PRICES.sell_bone;
            boneObj.count = 0;
        }
    } 
    else if (type === 'club') {
        let clubObj = inv.find(i => i.id === 'goblin_club');
        if (clubObj && clubObj.count > 1) {
            goldObj.count += (clubObj.count - 1) * PRICES.sell_club;
            clubObj.count = 1; // Оставляем одну себе
        }
    }
    localStorage.setItem('gameInventory', JSON.stringify(inv));
    updateUI();
};

// Кнопки открытия/закрытия
document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');
document.getElementById('btn-shop-toggle').onclick = () => document.getElementById('shop-modal').classList.add('modal-show');
document.getElementById('btn-close-shop').onclick = () => document.getElementById('shop-modal').classList.remove('modal-show');
