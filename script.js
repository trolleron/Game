const tg = window.Telegram.WebApp;
tg.expand();

// --- 1. СИСТЕМА ДИАГНОСТИКИ ---
window.onerror = function(msg, url, line) {
    if (!msg.includes('ResizeObserver')) {
        alert(`ОШИБКА:\n${msg}\nСтрока: ${line}`);
    }
};

// --- 2. ЛОГИКА ИНВЕНТАРЯ ---
let inventory = [];
try {
    const saved = localStorage.getItem('gameInventory');
    inventory = saved ? JSON.parse(saved) : [];
    
    // Пылесос: собираем все разбросанные кости в одну стопку
    let boneCount = 0;
    inventory = inventory.filter(i => {
        if (i.id === 'bone' || i.id.includes('club') || i.icon === '🦴') {
            boneCount += (Number(i.count) || 1);
            return false;
        }
        return true;
    });
    if (boneCount > 0) inventory.push({ id: 'bone', icon: '🦴', count: boneCount });
    localStorage.setItem('gameInventory', JSON.stringify(inventory));
} catch (e) { 
    inventory = []; 
}

// --- 3. НАСТРОЙКИ ПЕРСОНАЖЕЙ ---
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
    // Сообщить, если файл не загрузился
    this.load.on('loaderror', function(fileObj) {
        alert('ФАЙЛ ПОТЕРЯН:\n' + fileObj.src + '\nПроверь название папки и регистра букв!');
    });

    this.load.image('bg_cave', 'img/locations/cave_bg.jpg');
    this.load.spritesheet('g_idle', 'img/goblin/idle.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_hurt', 'img/goblin/hurt.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_atk', 'img/goblin/attack.png', { frameWidth: 480, frameHeight: 480 });
    this.load.spritesheet('g_death', 'img/goblin/death.png', { frameWidth: 480, frameHeight: 480 });
}

function create() {
    // 1. Создаем частицу пламени
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.fillStyle(0xffaa00, 1);
    graphics.fillCircle(10, 10, 10);
    graphics.generateTexture('fire_dot', 20, 20);

    // 2. Отрисовка фона
    if (this.textures.exists('bg_cave')) {
        this.add.image(240, 300, 'bg_cave').setDisplaySize(480, 600);
    }

    // 3. ПЫШНЫЙ ОГОНЬ (Настройки эмиттера)
    const fireConfig = {
        speedY: { min: -140, max: -70 }, // Чуть быстрее вверх
        speedX: { min: -25, max: 25 },   // Шире разлет
        scale: { start: 1.8, end: 0.1 }, // Большой размер на старте
        alpha: { start: 0.8, end: 0 },   // Плотный цвет
        lifespan: 1000,                  // Живет 1 секунду
        blendMode: 'ADD',                // Свечение
        frequency: 35,                   // Еще больше частиц
        // Зона появления по ширине чаши факела (Rectangle: x, y, width, height)
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-20, 0, 40, 10) }
    };

    // Ставим огонь на факелы
    this.add.particles(85, 255, 'fire_dot', fireConfig);  // Левый
    this.add.particles(405, 255, 'fire_dot', fireConfig); // Правый

    // 4. Гоблин и его анимации
    if (this.textures.exists('g_idle')) {
        this.anims.create({ key: 'idle', frames: this.anims.generateFrameNumbers('g_idle', {start:0, end:15}), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'hurt', frames: this.anims.generateFrameNumbers('g_hurt', {start:0, end:9}), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'atk', frames: this.anims.generateFrameNumbers('g_atk', {start:0, end:9}), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'death', frames: this.anims.generateFrameNumbers('g_death', {start:0, end:9}), frameRate: 10, repeat: 0 });
        
        monster = this.add.sprite(240, 420, 'g_idle').setScale(0.85);
        monster.play('idle');
    } else {
        // Если спрайтов нет — рисуем временный куб
        monster = this.add.rectangle(240, 420, 150, 200, 0x33ff33);
        this.add.text(175, 400, "ОШИБКА\nСПРАЙТА", { color: '#000', align: 'center', font: 'bold 20px Arial' });
    }

    window.gameScene = this;
}

// --- 4. БОЕВАЯ ЛОГИКА ---
function doAttack() {
    if (goblin.isDead || player.hp <= 0 || !monster) return;

    const btn = document.getElementById('btn-attack');
    btn.disabled = true;
    
    goblin.hp -= 25;

    if (monster.play) {
        monster.play('hurt');
        monster.once('animationcomplete', checkBattleStatus);
    } else {
        // Анимация тряски для куба-заглушки
        window.gameScene.tweens.add({ targets: monster, x:
