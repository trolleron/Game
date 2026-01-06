const tg = window.Telegram.WebApp;

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

const framesConfig = { idle: 4, attack: 6, death: 3 };
const cachedImages = {};
const version = Date.now(); // Anti-cache для Telegram

// 1. Улучшенная предзагрузка
function preloadImages() {
    for (const action in framesConfig) {
        for (let i = 1; i <= framesConfig[action]; i++) {
            const imgPath = `img/${monster.type}/${action}_${i}.png?v=${version}`;
            const img = new Image();
            img.src = imgPath;
            // Кэшируем именно объект картинки
            cachedImages[`${action}_${i}`] = img;
        }
    }
}

const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const attackBtn = document.getElementById('btn-attack');

// 2. Главный цикл анимации
function animate() {
    // Если монстр умер и дошел до последнего кадра смерти - замираем
    if (monster.isDead && monster.action === 'death' && monster.frame >= framesConfig.death) {
        const lastDeathPath = cachedImages[`death_${framesConfig.death}`].src;
        spriteImg.src = lastDeathPath;
        return;
    }

    // Получаем текущий кадр из кэша
    const currentKey = `${monster.action}_${monster.frame}`;
    if (cachedImages[currentKey]) {
        spriteImg.src = cachedImages[currentKey].src;
    }

    monster.frame++;

    // Логика переключения последовательностей
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

let animInterval = setInterval(animate, 100);

function changeAction(newAct) {
    if (monster.isDead && newAct !== 'death') return;
    monster.action = newAct;
    monster.frame = 1;
}

// 3. Логика битвы
function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;

    monster.hp -= 34;
    attackBtn.disabled = true;

    // Эффект вспышки
    spriteImg.style.filter = 'brightness(3)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0;
        monster.isDead = true;
        changeAction('death');
        attackBtn.style.display = 'none'; // Убираем кнопку при смерти
    } else {
        setTimeout(() => {
            if (!monster.isDead) changeAction('attack');
        }, 500);
    }
    updateUI();
}

function applyDamageToPlayer() {
    if (monster.isDead) return;

    player.hp -= monster.atk;
    document.body.style.backgroundColor = '#4d1a1a';
    
    setTimeout(() => {
        document.body.style.backgroundColor = '#12121a';
        if (!monster.isDead) attackBtn.disabled = false;
    }, 150);

    if (player.hp <= 0) {
        player.hp = 0;
        updateUI();
        setTimeout(() => {
            alert("Вы проиграли!");
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

// Запуск
preloadImages();
attackBtn.onclick = playerAttack;
tg.ready();
tg.expand();
updateUI();
