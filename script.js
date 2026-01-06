const tg = window.Telegram.WebApp;

// Состояние игры
let state = {
    hp: 100,
    maxHp: 100,
    gold: 0,
    room: 1
};

// Настройки Гоблина
const monster = {
    type: 'goblin',
    action: 'idle',
    frame: 1,
    maxFrames: 4, // Сколько у тебя картинок для idle? Поставь здесь это число
    hp: 50,
    maxHp: 50
};

// Элементы экрана
const spriteImg = document.getElementById('enemy-sprite');
const hpFill = document.getElementById('enemy-hp-fill');
const goldText = document.getElementById('gold');

// --- ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ ---
function animate() {
    // Формируем путь. ВАЖНО: проверь регистр букв!
    const path = `img/${monster.type}/${monster.action}_${monster.frame}.png`;
    
    // Пытаемся загрузить кадр
    spriteImg.src = path;

    // Переходим к следующему кадру
    monster.frame++;
    
    // Если кадры кончились — начинаем сначала (для idle)
    if (monster.frame > monster.maxFrames) {
        monster.frame = 1;
    }
}

// Запускаем аниматор (каждые 150 миллисекунд)
let animTimer = setInterval(animate, 150);

// --- ЛОГИКА БОЯ ---
function attack() {
    // Урон монстру
    monster.hp -= 10;
    
    // Визуальный эффект удара (вспышка)
    spriteImg.style.filter = 'brightness(2)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    // Проверка смерти
    if (monster.hp <= 0) {
        monster.hp = monster.maxHp; // "Воскрешаем" для теста
        state.gold += 10;
        updateUI();
    }
    
    updateUI();
}

function updateUI() {
    hpFill.style.width = `${(monster.hp / monster.maxHp) * 100}%`;
    goldText.textContent = state.gold;
}

// Инициализация
function init() {
    tg.ready();
    tg.expand();
    
    const attackBtn = document.getElementById('btn-attack');
    if(attackBtn) attackBtn.onclick = attack;
    
    updateUI();
}

// Обработка ошибок загрузки картинок
spriteImg.onerror = function() {
    console.error("Не удалось найти файл: " + spriteImg.src);
    // Если картинка не найдена, выведем текст вместо неё (для отладки)
    spriteImg.alt = "Ошибка: проверь путь " + path;
};

init();
