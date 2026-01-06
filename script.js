const tg = window.Telegram.WebApp;

// 1. Настройки персонажей
const player = { hp: 100, maxHp: 100 };
const monster = {
    type: 'goblin',
    action: 'idle',
    frame: 1,
    hp: 100,
    maxHp: 100,
    atk: 15,
    isDead: false
};

// 2. Конфигурация кадров (твои данные)
const framesConfig = { idle: 4, attack: 6, death: 3 };

// 3. Предзагрузка (Preload) - убирает фризы
const cachedImages = {};

function preloadImages() {
    for (const action in framesConfig) {
        for (let i = 1; i <= framesConfig[action]; i++) {
            const imgPath = `img/${monster.type}/${action}_${i}.png`;
            const img = new Image();
            img.src = imgPath;
            cachedImages[imgPath] = img; // Сохраняем в памяти
        }
    }
}

// Элементы DOM
const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const attackBtn = document.getElementById('btn-attack');

// 4. Главный цикл анимации
function animate() {
    // Если монстр умер и анимация смерти закончилась - стоп
    if (monster.isDead && monster.action === 'death' && monster.frame === framesConfig.death) {
        return;
    }

    const path = `img/${monster.type}/${monster.action}_${monster.frame}.png`;
    spriteImg.src = path;

    monster.frame++;

    if (monster.frame > framesConfig[monster.action]) {
        if (monster.action === 'idle') {
            monster.frame = 1;
        } else if (monster.action === 'attack') {
            applyDamageToPlayer();
            changeAction('idle');
        } else if (monster.action === 'death') {
            monster.frame = framesConfig.death;
        }
    }
}

// Интервал анимации (120мс для большей плавности)
let animInterval = setInterval(animate, 120);

function changeAction(newAct) {
    if (monster.isDead) return;
    monster.action = newAct;
    monster.frame = 1;
}

// 5. Логика битвы
function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;

    // Урон по монстру
    monster.hp -= 20;
    attackBtn.disabled = true;

    // Визуальный отклик (вспышка)
    spriteImg.style.filter = 'brightness(3)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0;
        monster.isDead = true;
        changeAction('death');
    } else {
        // Ответка гоблина
        setTimeout(() => changeAction('attack'), 500);
    }
    updateUI();
}

function applyDamageToPlayer() {
    if (monster.isDead) return;

    player.hp -= monster.atk;
    
    // Эффект получения урона (экран краснеет)
    document.body.style.backgroundColor = '#4d1a1a';
    setTimeout(() => {
        document.body.style.backgroundColor = '#12121a';
        if (!monster.isDead) attackBtn.disabled = false;
    }, 150);

    if (player.hp <= 0) {
        player.hp = 0;
        updateUI();
        setTimeout(() => {
            alert("Вы погибли в бою!");
            location.reload();
        }, 200);
    }
    updateUI();
}

function updateUI() {
    monsterHpFill.style.width = (monster.hp / monster.maxHp * 100) + '%';
    playerHpFill.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp} / ${player.maxHp} HP`;
}

// Старт
preloadImages();
attackBtn.onclick = playerAttack;
tg.expand();
updateUI();
