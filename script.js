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

// Твои настройки: 6 кадров атаки
const framesConfig = { idle: 4, attack: 6, death: 3 };
const cachedImages = {};
const version = Date.now(); 

function preloadImages() {
    for (const action in framesConfig) {
        for (let i = 1; i <= framesConfig[action]; i++) {
            const imgPath = `img/${monster.type}/${action}_${i}.png?v=${version}`;
            const img = new Image();
            img.src = imgPath;
            cachedImages[`${action}_${i}`] = img;
        }
    }
}

const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const attackBtn = document.getElementById('btn-attack');

function animate() {
    if (monster.isDead && monster.action === 'death' && monster.frame >= framesConfig.death) {
        spriteImg.src = cachedImages[`death_${framesConfig.death}`].src;
        return;
    }

    const currentKey = `${monster.action}_${monster.frame}`;
    if (cachedImages[currentKey]) {
        spriteImg.src = cachedImages[currentKey].src;
    }

    // ЛОГИКА НАНЕСЕНИЯ УРОНА ВНУТРИ АНИМАЦИИ
    // Если сейчас идет атака и мы на 4-м кадре (пик замаха)
    if (monster.action === 'attack' && monster.frame === 4) {
        applyDamageToPlayer(); 
    }

    monster.frame++;

    if (monster.frame > framesConfig[monster.action]) {
        if (monster.action === 'idle') {
            monster.frame = 1;
        } else if (monster.action === 'attack') {
            // Урон уже нанесен на 4-м кадре, просто возвращаемся в idle
            changeAction('idle');
        } else if (monster.action === 'death') {
            monster.frame = framesConfig.death;
        }
    }
}

// Твоя скорость: 100 мс
let animInterval = setInterval(animate, 100);

function changeAction(newAct) {
    if (monster.isDead && newAct !== 'death') return;
    monster.action = newAct;
    monster.frame = 1;
}

function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;

    monster.hp -= 25;
    attackBtn.disabled = true;

    spriteImg.style.filter = 'brightness(3)';
    setTimeout(() => spriteImg.style.filter = 'none', 100);

    if (monster.hp <= 0) {
        monster.hp = 0;
        monster.isDead = true;
        changeAction('death');
        attackBtn.style.display = 'none';
    } else {
        // Гоблин начинает замах через 400мс после твоего удара
        setTimeout(() => {
            if (!monster.isDead) changeAction('attack');
        }, 400);
    }
    updateUI();
}

function applyDamageToPlayer() {
    if (monster.isDead) return;

    player.hp -= monster.atk;
    
    // Эффект тряски экрана (добавим для сочности)
    document.getElementById('game-container').style.transform = 'translateX(5px)';
    document.body.style.backgroundColor = '#4d1a1a';
    
    setTimeout(() => {
        document.getElementById('game-container').style.transform = 'translateX(0)';
        document.body.style.backgroundColor = '#12121a';
        // Кнопка становится активной только после того, как гоблин закончил атаку
    }, 100);

    if (player.hp <= 0) {
        player.hp = 0;
        updateUI();
        setTimeout(() => { alert("Поражение!"); location.reload(); }, 200);
    }
    updateUI();
}

// Кнопка снова активна, когда гоблин вернулся в idle
function updateUI() {
    monsterHpFill.style.width = (monster.hp / monster.maxHp * 100) + '%';
    playerHpFill.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp} / ${player.maxHp} HP`;
    
    if (!monster.isDead && monster.action === 'idle' && player.hp > 0) {
        attackBtn.disabled = false;
    }
}

preloadImages();
attackBtn.onclick = playerAttack;
tg.ready();
tg.expand();
updateUI();
