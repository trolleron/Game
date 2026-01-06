const tg = window.Telegram.WebApp;

// Состояние монстра
const monster = {
    type: 'goblin',
    action: 'idle',
    frame: 1,
    hp: 100,
    maxHp: 100,
    isDead: false
};

// Конфигурация кадров (твои данные)
const framesConfig = {
    idle: 4,
    attack: 6,
    death: 3
};

const spriteImg = document.getElementById('enemy-sprite');
const hpFill = document.getElementById('enemy-hp-fill');

// --- ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ ---
function animate() {
    if (monster.isDead && monster.action === 'death' && monster.frame === framesConfig.death) {
        return; // Останавливаемся на последнем кадре смерти
    }

    // Путь: img/goblin/idle_1.png и т.д.
    const path = `img/${monster.type}/${monster.action}_${monster.frame}.png`;
    spriteImg.src = path;

    monster.frame++;

    // Проверка завершения анимации
    if (monster.frame > framesConfig[monster.action]) {
        if (monster.action === 'idle') {
            monster.frame = 1; // Зацикливаем idle
        } else if (monster.action === 'attack') {
            changeAction('idle'); // После атаки возвращаемся в покой
        } else if (monster.action === 'death') {
            monster.frame = framesConfig.death; // Замираем в конце смерти
        }
    }
}

// Запуск аниматора (150мс - хорошая скорость для спрайтов)
let animTimer = setInterval(animate, 150);

// Функция смены действия
function changeAction(newAction) {
    if (monster.isDead) return;
    monster.action = newAction;
    monster.frame = 1;
}

// Логика атаки игрока
function playerAttack() {
    if (monster.isDead) return;

    monster.hp -= 25;
    
    // Эффект "удара" (кратковременная вспышка или тряска)
    spriteImg.style.filter = 'brightness(2) sepia(1)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0;
        monster.isDead = true;
        changeAction('death');
    } else {
        // Ответная атака гоблина через полсекунды
        setTimeout(() => {
            changeAction('attack');
        }, 500);
    }
    
    updateUI();
}

function updateUI() {
    hpFill.style.width = `${(monster.hp / monster.maxHp) * 100}%`;
}

// Инициализация
function init() {
    tg.ready();
    tg.expand();
    document.getElementById('btn-attack').onclick = playerAttack;
    updateUI();
}

init();
