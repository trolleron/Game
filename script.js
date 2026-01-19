const tg = window.Telegram.WebApp;

// Состояние игрока и монстра
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
const player = { hp: 100, maxHp: 100 };
const monsterStats = { hp: 100, maxHp: 100, isDead: false };

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 480,
    height: 640,
    transparent: true,
    scene: { preload: preload, create: create }
};

const game = new Phaser.Game(config);
let monster;

function preload() {
    this.load.image('bg', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('attack', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    const scene = this;
    this.add.image(240, 320, 'bg').setDisplaySize(480, 640);

    // Анимации
    this.anims.create({ key: 'anim_idle', frames: this.anims.generateFrameNumbers('idle', { start: 0, end: 15 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'anim_hurt', frames: this.anims.generateFrameNumbers('hurt', { start: 0, end: 9 }), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'anim_attack', frames: this.anims.generateFrameNumbers('attack', { start: 0, end: 9 }), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'anim_death', frames: this.anims.generateFrameNumbers('death', { start: 0, end: 9 }), frameRate: 10, repeat: 0 });

    monster = this.add.sprite(240, 450, 'idle').setScale(0.8);
    monster.play('anim_idle');

    window.gameScene = this;
}

function playerAttack() {
    if (monsterStats.isDead || player.hp <= 0) return;

    const btn = document.getElementById('btn-attack');
    btn.disabled = true;

    // Урон монстру
    monsterStats.hp -= 25;
    
    // Анимация получения урона
    monster.play('anim_hurt');

    monster.once('animationcomplete', () => {
        if (monsterStats.hp <= 0) {
            // СМЕРТЬ
            monsterStats.isDead = true;
            monster.play('anim_death');
            rewardPlayer();
        } else {
            // ОТВЕТНЫЙ УДАР
            monster.play('anim_attack');
            monster.once('animationcomplete', () => {
                applyDamageToPlayer();
                if (!monsterStats.isDead) {
                    monster.play('anim_idle');
                    btn.disabled = false;
                }
            });
        }
    });
}

function applyDamageToPlayer() {
    player.hp -= 15;
    if (player.hp <= 0) { player.hp = 0; alert("Вы погибли!"); location.reload(); }
    
    // Тряска камеры
    window.gameScene.cameras.main.shake(200, 0.01);
    updateUI();
}

function rewardPlayer() {
    addItem('gold', 'Золото', '🪙', 'currency', 10);
    addItem('goblin_bone', 'Кость', '🦴', 'material', 1);
}

function addItem(id, name, icon, type, amount) {
    const existing = inventory.find(i => i.id === id);
    if (existing) existing.count += amount;
    else inventory.push({ id, name, icon, type, count: amount });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    document.getElementById('player-hp-fill').style.width = (player.hp / player.maxHp * 100) + '%';
    document.getElementById('hp-text').textContent = `${player.hp} / ${player.maxHp} HP`;
    
    const grid = document.getElementById('inventory-slots');
    grid.innerHTML = '';
    inventory.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        slot.innerHTML = `<span>${item.icon}</span><span class="item-count">${item.count}</span>`;
        grid.appendChild(slot);
    });
}

// Кнопки
document.getElementById('btn-attack').onclick = playerAttack;
document.getElementById('btn-inventory').onclick = () => document.getElementById('inventory-overlay').style.display = 'flex';
document.getElementById('close-inventory').onclick = () => document.getElementById('inventory-overlay').style.display = 'none';

tg.expand();
updateUI();
