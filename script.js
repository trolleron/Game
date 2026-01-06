const tg = window.Telegram.WebApp;

// Состояние игрока
const player = {
    hp: 100,
    maxHp: 100
};

// Состояние монстра
const monster = {
    type: 'goblin',
    action: 'idle',
    frame: 1,
    hp: 100,
    maxHp: 100,
    isDead: false,
    atkPower: 10 // Урон, который наносит гоблин
};

// Твои настройки кадров
const framesConfig = {
    idle: 4,
    attack: 6,
    death: 3
};

const spriteImg = document.getElementById('enemy-sprite');
const playerHpFill = document.getElementById('hp-bar'); // Убедись, что такой ID есть в HTML
const monsterHpFill = document.getElementById('enemy-hp-fill');
const hpText = document.getElementById('hp-text');

// --- ЦИКЛ АНИМАЦИИ ---
function animate() {
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
            // КОГДА ЗАКОНЧИЛАСЬ АНИМАЦИЯ АТАКИ -> Гоблин бьет игрока
            applyDamageToPlayer(); 
            changeAction('idle');
        } else if (monster.action === 'death') {
            monster.frame = framesConfig.death;
        }
    }
}

let animTimer = setInterval(animate, 150);

function changeAction(newAction) {
    if (monster.isDead) return;
    monster.action = newAction;
    monster.frame = 1;
}

// --- ЛОГИКА БОЯ ---

// 1. Игрок бьет Гоблина
function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;

    monster.hp -= 20;
    
    // Эффект удара по гоблину
    spriteImg.style.filter = 'brightness(2) sepia(1)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0;
        monster.isDead = true;
        changeAction('death');
    } else {
        // Гоблин злится и готовит атаку через 600мс
        setTimeout(() => {
            changeAction('attack');
        }, 600);
    }
    updateUI();
}

// 2. Гоблин бьет Игрока
function applyDamageToPlayer() {
    if (monster.isDead) return;

    player.hp -= monster.atkPower;
    
    // Эффект тряски экрана или вспышки при получении урона
    document.body.style.backgroundColor = '#441111';
    setTimeout(() => document.body.style.backgroundColor = '#12121a', 100);

    if (player.hp <= 0) {
        player.hp = 0;
        alert("Гоблин победил! Попробуй еще раз.");
        location.reload(); // Перезагрузка игры
    }
    updateUI();
}

function updateUI() {
    // Обновляем полоску HP гоблина
    monsterHpFill.style.width = `${(monster.hp / monster.maxHp) * 100}%`;
    
    // Обновляем полоску HP игрока
    if (playerHpFill) {
        playerHpFill.style.width = `${(player.hp / player.maxHp) * 100}%`;
    }
    // Обновляем текст HP (если есть элемент с id="hp-text")
    if (hpText) {
        hpText.textContent = `${player.hp}/${player.maxHp}`;
    }
}

function init() {
    tg.ready();
    tg.expand();
    document.getElementById('btn-attack').onclick = playerAttack;
    updateUI();
}

init();
