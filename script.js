const tg = window.Telegram.WebApp;

// Загружаем золото из памяти или ставим 0
let gold = parseInt(localStorage.getItem('playerGold')) || 0;

const player = { hp: 100, maxHp: 100 };
const monster = {
    type: 'goblin',
    action: 'idle',
    frame: 1,
    hp: 100,
    maxHp: 100,
    atk: 15,
    reward: 10, // Награда за победу
    isDead: false
};

const framesConfig = { idle: 4, attack: 6, death: 3 };
const cachedImages = {};

function preloadImages() {
    for (const action in framesConfig) {
        for (let i = 1; i <= framesConfig[action]; i++) {
            const img = new Image();
            img.src = `img/${monster.type}/${action}_${i}.png`;
            cachedImages[`${action}_${i}`] = img;
        }
    }
}

const gameContainer = document.getElementById('game-container');
const spriteImg = document.getElementById('enemy-sprite');
const monsterHpFill = document.getElementById('enemy-hp-fill');
const playerHpFill = document.getElementById('player-hp-fill');
const hpText = document.getElementById('hp-text');
const goldText = document.getElementById('gold-count');
const attackBtn = document.getElementById('btn-attack');
const fires = document.querySelectorAll('.fire-glow');

function animate() {
    if (monster.isDead && monster.action === 'death' && monster.frame >= framesConfig.death) {
        spriteImg.src = cachedImages[`death_${framesConfig.death}`].src;
        return;
    }

    const currentKey = `${monster.action}_${monster.frame}`;
    if (cachedImages[currentKey]) {
        spriteImg.src = cachedImages[currentKey].src;
    }

    if (monster.action === 'attack' && monster.frame === 4) {
        applyDamageToPlayer();
    }

    monster.frame++;

    if (monster.frame > framesConfig[monster.action]) {
        if (monster.action === 'idle') {
            monster.frame = 1;
        } else if (monster.action === 'attack') {
            changeAction('idle');
            if (player.hp > 0) attackBtn.disabled = false;
        } else if (monster.action === 'death') {
            monster.frame = framesConfig.death;
        }
    }
}

setInterval(animate, 100);

function changeAction(newAct) {
    if (monster.isDead && newAct !== 'death') return;
    monster.action = newAct;
    monster.frame = 1;
}

function playerAttack() {
    if (monster.isDead || player.hp <= 0) return;
    
    monster.hp -= 25;
    attackBtn.disabled = true;

    spriteImg.style.filter = 'brightness(2.5)';
    fires.forEach(f => f.style.transform = 'translate(-50%, -50%) scale(2)');
    
    setTimeout(() => {
        spriteImg.style.filter = 'none';
        fires.forEach(f => f.style.transform = 'translate(-50%, -50%) scale(1)');
    }, 100);

    if (monster.hp <= 0) {
        monster.hp = 0;
        monster.isDead = true;
        changeAction('death');
        attackBtn.style.display = 'none';
        
        // ВЫПЛАТА НАГРАДЫ
        addGold(monster.reward);
        
    } else {
        setTimeout(() => { 
            if (!monster.isDead) changeAction('attack'); 
        }, 400);
    }
    updateUI();
}

function addGold(amount) {
    gold += amount;
    localStorage.setItem('playerGold', gold); // Сохраняем
    
    // Анимация цифр
    goldText.classList.add('gold-anim');
    setTimeout(() => goldText.classList.remove('gold-anim'), 500);
    
    updateUI();
}

function applyDamageToPlayer() {
    if (monster.isDead) return;
    
    player.hp -= monster.atk;
    if (player.hp < 0) player.hp = 0;

    gameContainer.style.animation = 'none';
    void gameContainer.offsetWidth;         
    gameContainer.style.animation = 'shake 0.2s ease-in-out'; 
    
    updateUI();
    
    if (player.hp === 0) {
        setTimeout(() => { 
            alert("Вы проиграли! Золото сохранено."); 
            location.reload(); 
        }, 300);
    }
}

function updateUI() {
    monsterHpFill.style.width = (monster.hp / monster.maxHp * 100) + '%';
    playerHpFill.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp} / ${player.maxHp} HP`;
    goldText.textContent = gold;
}

preloadImages();
attackBtn.onclick = playerAttack;
tg.expand();
updateUI();
