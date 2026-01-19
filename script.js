const tg = window.Telegram.WebApp;

// 1. Исправленная логика инвентаря (ID теперь фиксированные)
let inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
const player = { hp: 100, maxHp: 100 };
const goblin = { hp: 100, maxHp: 100, dead: false };

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 480,
    height: 600,
    transparent: true,
    scene: { preload, create }
};

const game = new Phaser.Game(config);
let sprite;

function preload() {
    this.load.image('cave', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('s_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('s_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('s_attack', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('s_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    this.add.image(240, 300, 'cave').setDisplaySize(480, 600);
    
    this.anims.create({ key: 'a_idle', frames: this.anims.generateFrameNumbers('s_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'a_hurt', frames: this.anims.generateFrameNumbers('s_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
    this.anims.create({ key: 'a_atk', frames: this.anims.generateFrameNumbers('s_attack', {start:0, end:9}), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'a_dead', frames: this.anims.generateFrameNumbers('s_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

    sprite = this.add.sprite(240, 420, 's_idle').setScale(0.85);
    sprite.play('a_idle');
    window.gameScene = this;
}

function handleAttack() {
    if (goblin.dead || player.hp <= 0) return;
    
    document.getElementById('btn-attack').disabled = true;
    goblin.hp -= 25;
    sprite.play('a_hurt');

    sprite.once('animationcomplete', () => {
        if (goblin.hp <= 0) {
            goblin.dead = true;
            sprite.play('a_dead');
            reward();
        } else {
            sprite.play('a_atk');
            sprite.once('animationcomplete', () => {
                player.hp -= 10;
                updateUI();
                window.gameScene.cameras.main.shake(150, 0.005);
                if (player.hp > 0) {
                    sprite.play('a_idle');
                    document.getElementById('btn-attack').disabled = false;
                }
            });
        }
    });
}

function reward() {
    // Кость теперь всегда имеет ID 'bone', чтобы они стакались!
    addItem('gold', '🪙', 15);
    addItem('bone', '🦴', 1);
}

function addItem(id, icon, qty) {
    const item = inventory.find(i => i.id === id);
    if (item) item.qty += qty;
    else inventory.push({ id, icon, qty });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    document.getElementById('hp-bar-fill').style.width = (player.hp) + '%';
    document.getElementById('hp-text').textContent = `${player.hp} / 100 HP`;
    
    const render = document.getElementById('inv-render');
    render.innerHTML = '';
    inventory.forEach(i => {
        render.innerHTML += `<div class="inv-slot"><span>${i.icon}</span><span class="item-qty">${i.qty}</span></div>`;
    });
}

document.getElementById('btn-attack').onclick = handleAttack;
document.getElementById('btn-inv').onclick = () => document.getElementById('inv-modal').style.display = 'flex';
document.getElementById('close-inv').onclick = () => document.getElementById('inv-modal').style.display = 'none';

tg.expand();
updateUI();
