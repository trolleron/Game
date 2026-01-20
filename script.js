const tg = window.Telegram.WebApp;
tg.expand(); // Сразу расширяем

// --- ОТЛОВ ОШИБОК (Показывает ошибки на экране телефона) ---
window.onerror = function(msg, url, line) {
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;top:0;left:0;background:rgba(0,0,0,0.9);color:red;z-index:9999;padding:20px;width:100%;font-size:14px;';
    errDiv.innerHTML = `⚠️ ОШИБКА:<br>${msg}<br>Строка: ${line}`;
    document.body.appendChild(errDiv);
    return false;
};

// --- ФИКС ИНВЕНТАРЯ ---
let inventory = [];
try {
    inventory = JSON.parse(localStorage.getItem('gameInventory')) || [];
    // Чистка старых данных
    let boneCount = 0;
    inventory = inventory.filter(item => {
        if (!item.id) return false;
        if (item.id.includes('bone') || item.id.includes('club') || item.name === 'Кость') {
            boneCount += (item.count || item.qty || 1);
            return false;
        }
        return true;
    });
    if (boneCount > 0) inventory.push({ id: 'bone', icon: '🦴', count: boneCount });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
} catch (e) {
    console.error("Ошибка инвентаря", e);
    inventory = []; // Сброс при критической ошибке
}

// --- НАСТРОЙКИ ---
const player = { hp: 100, max: 100 };
const goblin = { hp: 100, max: 100, isDead: false };

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 480,
    height: 600,
    transparent: true, // Прозрачный фон, чтобы видеть CSS-фон если Phaser пуст
    scene: { preload, create }
};

const game = new Phaser.Game(config);
let monster;

function preload() {
    // Загрузка с проверкой. Если файла нет, Phaser покажет зеленый квадрат вместо краша.
    this.load.image('bg_cave', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    // 1. Создаем текстуру огня здесь (безопаснее)
    let graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(10, 10, 8); // Чуть меньше радиус
    graphics.generateTexture('fire_particle', 20, 20);
    graphics.destroy(); // Очищаем память

    // 2. Фон (с защитой от ошибки загрузки)
    if (this.textures.exists('bg_cave')) {
        this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    } else {
        // Если фон не загрузился — рисуем серый квадрат
        this.add.rectangle(240, 300, 480, 600, 0x222222);
        this.add.text(100, 100, 'ФОН НЕ НАЙДЕН', { color: '#ff0000' });
    }

    // 3. Частицы огня
    const particles = this.add.particles(0, 0, 'fire_particle', {
        speedY: { min: -80, max: -40 },
        speedX: { min: -10, max: 10 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 600,
        blendMode: 'ADD',
        frequency: 50,
        emitting: false // Сначала выключен, включим ниже
    });

    // Создаем эмиттеры (источники)
    particles.createEmitter({ x: 85, y: 255, emitting: true });  // Левый
    particles.createEmitter({ x: 405, y: 255, emitting: true }); // Правый

    // 4. Анимации
    // Проверяем, загрузился ли спрайт. Если нет — не создаем анимацию, чтобы не было ошибки.
    if (this.textures.exists('g_idle')) {
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });

        monster = this.add.sprite(240, 420, 'g_idle').setScale(0.8);
        monster.play('idle');
    } else {
        // Заглушка, если гоблина нет
        monster = this.add.rectangle(240, 420, 100, 200, 0x00ff00);
        this.add.text(180, 400, 'ГОБЛИН\nНЕ НАЙДЕН', { align: 'center' });
    }
    
    window.gameScene = this;
}

// --- ЛОГИКА ---
function doAttack() {
    if (goblin.isDead || player.hp <= 0) return;
    
    document.getElementById('btn-attack').disabled = true;
    goblin.hp -= 25;

    // Проверка: это спрайт или заглушка?
    if (monster.play) {
        monster.play('hurt');
        monster.once('animationcomplete', checkDeath);
    } else {
        // Если это заглушка (квадрат), просто ждем
        setTimeout(checkDeath, 500);
    }
}

function checkDeath() {
    if (goblin.hp <= 0) {
        goblin.isDead = true;
        if (monster.play) monster.play('death');
        giveReward();
    } else {
        if (monster.play) monster.play('atk');
        // Ответный удар через паузу
        setTimeout(() => {
            player.hp -= 15;
            updateUI();
            if (window.gameScene) window.gameScene.cameras.main.shake(100, 0.01);
            
            if (player.hp > 0) {
                if (monster.play) monster.play('idle');
                document.getElementById('btn-attack').disabled = false;
            }
        }, 500);
    }
}

function giveReward() {
    addItem('gold', '🪙', 25);
    addItem('bone', '🦴', 1);
}

function addItem(id, icon, count) {
    const existing = inventory.find(item => item.id === id);
    if (existing) existing.count += count;
    else inventory.push({ id, icon, count });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
    updateUI();
}

function updateUI() {
    const hpBar = document.getElementById('hp-bar-fill');
    if(hpBar) hpBar.style.width = player.hp + '%';
    
    const hpText = document.getElementById('hp-text');
    if(hpText) hpText.textContent = `${player.hp} / 100 HP`;
    
    const container = document.getElementById('inv-container');
    if(container) {
        container.innerHTML = '';
        inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.innerHTML = `<span>${item.icon}</span><span class="qty">${item.count}</span>`;
            container.appendChild(slot);
        });
    }
}

function resetGame() {
    if(confirm('Сбросить весь прогресс?')) {
        localStorage.clear();
        location.reload();
    }
}

// Привязка кнопок (с проверкой, что кнопки существуют)
const btnAtk = document.getElementById('btn-attack');
if(btnAtk) btnAtk.onclick = doAttack;

const btnInv = document.getElementById('btn-inv-toggle');
if(btnInv) btnInv.onclick = () => document.getElementById('inv-modal').classList.add('modal-show');

const btnClose = document.getElementById('btn-close-inv');
if(btnClose) btnClose.onclick = () => document.getElementById('inv-modal').classList.remove('modal-show');

const btnReset = document.getElementById('btn-reset');
if(btnReset) btnReset.onclick = resetGame;

updateUI();
