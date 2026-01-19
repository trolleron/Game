const tg = window.Telegram.WebApp;

// 1. Инициализация данных
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
const player = { hp: 100, max: 100 };
const goblin = { hp: 100, max: 100, isDead: false };

// 2. Настройка Phaser
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
    
    // Анимации
    this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

    monster = this.add.sprite(240, 420, 'g_idle').setScale(0.8);
    monster.play('idle');
    window.gameScene = this;
}

// 3. Логика боя
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

// 4. Логика ИНВЕНТАРЯ (фикс костей)
function giveReward() {
    // Золото и кости теперь всегда имеют одинаковый ID для стака
    addItem('gold', '🪙', 25);
    addItem('bone', '🦴', 1);
}

function addItem(id, icon, count) {
    const existing = inventory.find(item => item.id === id);
    if (existing) {
        existing.count += count;
    } else {
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

// События
document.getElementById('btn-attack').onclick = doAttack;
document.getElementById('btn-inv-toggle').onclick = () => document.getElementById('inv-modal').classList.add('modal-show');
document.getElementById('btn-close-inv').onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');

tg.expand();
updateUI();
