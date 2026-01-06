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

function preloadImages() {
    for (const action in framesConfig) {
        for (let i = 1; i <= framesConfig[action]; i++) {
            const imgPath = `img/${monster.type}/${action}_${i}.png`;
            const img = new Image();
            img.src = imgPath;
            cachedImages[imgPath] = img;
        }
    }
}

const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const attackBtn = document.getElementById('btn-attack');

function animate() {
    // ЛОГИКА СМЕРТИ: если кадры смерти закончились, останавливаемся
    if (monster.isDead && monster.action === 'death' && monster.frame > framesConfig.death) {
        monster.frame = framesConfig.death; // замираем на последнем кадре
        return;
    }

    const path = `img/${monster.type}/${monster.action}_${monster.frame}.png`;
    spriteImg.src = path;

    monster.frame++;

    // Проверка выхода за пределы кадров
    if (monster.frame > framesConfig[monster.action]) {
        if (monster.action === 'idle') {
            monster.frame = 1;
        } else if (monster.action === 'attack') {
            applyDamageToPlayer();
            changeAction('idle');
        } else if (monster.action === 'death') {
            // Важно: фиксируем последний кадр смерти
            monster.frame = framesConfig.death;
        }
    }
}

let animInterval = setInterval(animate, 120);

function changeAction(newAct) {
    // Если монстр уже умер, не меняем анимацию ни на что другое
    if (monster.isDead && newAct !== 'death') return;
    
    monster.action = newAct;
    monster.frame = 1;
}

function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;

    monster.hp -= 34; // Увеличил урон для теста смерти
    attackBtn.disabled = true;

    spriteImg.style.filter = 'brightness(3)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0;
        monster.isDead = true;
        
        // ОЧЕНЬ ВАЖНО: немедленно переключаем на смерть
        changeAction('death');
        
        // Убираем кнопку, чтобы не тыкать в труп
        attackBtn.style.display = 'none';
        
        setTimeout(() => {
            alert("Гоблин повержен!");
            // Здесь можно вызвать функцию спавна нового моба
        }, 1000);
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
            alert("Вы погибли!");
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

preloadImages();
attackBtn.onclick = playerAttack;
tg.expand();
updateUI();
