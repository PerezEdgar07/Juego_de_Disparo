
// ==========================================
// CONFIGURACIÓN DEL JUEGO
// ==========================================

const CONFIG = {
    maxLives: 3,
    maxHealth: 100,
    levelTime: 45,
    criticalDamage: 25,
    normalDamage: 10,
    criticalPoints: 200,
    normalPoints: 100,
    victoryBonus: 500
};

// ==========================================
// CONFIGURACIÓN DE LOS DOS NIVELES
// ==========================================

const levels = [
    {
        title: "Nivel 1: El Guerrero",
        description: "Localiza y neutraliza al primer enemigo.",
        model: "objetos_3d/Señor_de_la_Guerra.glb"
    },
    {
        title: "Nivel 2: El Monstruo",
        description: "El enemigo final te espera. ¡Completa la misión!",
        model: "objetos_3d/monstro_01.glb"
    }
];

// ==========================================
// VARIABLES DEL JUEGO
// ==========================================

let score = 0;
let shots = 0;
let hits = 0;
let lives = CONFIG.maxLives;
let health = CONFIG.maxHealth;
let timeLeft = CONFIG.levelTime;
let currentLevel = 0;

let gameState = "ready";
let timerInterval = null;

// Movimiento del enemigo
let movimientoEnemigo = 0;
let direccionEnemigo = 1;
let tiempoAnterior = 0;
let animationFrame = null;

// ==========================================
// ELEMENTOS HTML
// ==========================================

const $ = id => document.getElementById(id);

const scoreEl = $("score");
const shotsEl = $("shots");
const hitsEl = $("hits");

const timerEl = $("timer");
const timerCard = $("timer-card");

const livesText = $("lives-text");
const livesContainer = $("lives");

const accuracyEl = $("accuracy");
const accuracyBar = $("accuracy-bar");

const healthBar = $("health-bar");
const healthText = $("health-text");
const healthLabel = $("health-label");

const levelTitle = $("level-title");
const levelDescription = $("level-description");
const levelCounter = $("level-counter");
const levelProgress = $("level-progress");

const targetStatus = $("target-status");

const viewerBox = $("viewerBox");
const modelViewer = $("mainViewer");
const targetOverlay = $("targetOverlay");

const crosshair =
    viewerBox.querySelector(".crosshair") ||
    document.querySelector(".crosshair");

const arenaMessage = $("arena-message");
const messageTitle = $("message-title");
const messageText = $("message-text");
const startButton = $("start-button");

const resetButton = $("reset-button");

// ==========================================
// CONTROL DE LA MIRA
// ==========================================

// Mover la mira siguiendo el mouse.
viewerBox.addEventListener("pointermove", event => {

    if (gameState !== "playing") return;

    const rect = viewerBox.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    crosshair.style.left = `${x}px`;
    crosshair.style.top = `${y}px`;

    crosshair.classList.add("active");
});

// Ocultar la mira al salir del escenario.
viewerBox.addEventListener("pointerleave", () => {
    crosshair.classList.remove("active");
});

// Mostrar u ocultar la mira según el estado.
function actualizarMira() {

    if (gameState === "playing") {
        crosshair.classList.add("active");
    } else {
        crosshair.classList.remove("active");
    }
}

// ==========================================
// SONIDO DEL DISPARO
// ==========================================

function playLaserSound() {

    try {

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        const audio = new AudioContextClass();

        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.type = "sawtooth";

        oscillator.frequency.setValueAtTime(
            800,
            audio.currentTime
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            100,
            audio.currentTime + 0.15
        );

        gain.gain.setValueAtTime(
            0.20,
            audio.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audio.currentTime + 0.20
        );

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.start();
        oscillator.stop(audio.currentTime + 0.20);

        oscillator.onended = () => audio.close();

    } catch (error) {
        console.log("Audio no disponible.");
    }
}

// ==========================================
// CARGAR NIVEL
// ==========================================

function loadLevel(index) {

    currentLevel = index;

    const level = levels[index];

    levelTitle.textContent = level.title;
    levelDescription.textContent = level.description;

    levelCounter.textContent =
        `0${index + 1} / 02`;

    levelProgress.style.width =
        index === 0 ? "50%" : "100%";

    // Cambiar modelo 3D.
    modelViewer.src = level.model;

    // Ajustar cámara según el nivel.
    if (index === 0) {

        modelViewer.setAttribute(
            "camera-orbit",
            "0deg 75deg 5m"
        );

        modelViewer.setAttribute(
            "scale",
            "1 1 1"
        );

    } else {

        modelViewer.setAttribute(
            "camera-orbit",
            "0deg 75deg 15m"
        );

        modelViewer.setAttribute(
            "scale",
            "0.5 0.5 0.5"
        );
    }

    // Reiniciar resistencia y tiempo.
    health = CONFIG.maxHealth;
    timeLeft = CONFIG.levelTime;

    healthLabel.textContent = "Salud del objeto";
    targetStatus.textContent = "OBJETIVO DETECTADO";

    updateHealthUI();
    updateTimerUI();
}

// ==========================================
// ACTUALIZAR ESTADÍSTICAS
// ==========================================

function updateStats() {

    scoreEl.textContent = score;
    shotsEl.textContent = shots;
    hitsEl.textContent = hits;

    const accuracy = shots > 0
        ? Math.round((hits / shots) * 100)
        : 0;

    accuracyEl.textContent = `${accuracy}%`;
    accuracyBar.style.width = `${accuracy}%`;
}

// ==========================================
// ACTUALIZAR VIDAS
// ==========================================

function updateLivesUI() {

    livesText.textContent =
        `${lives} / ${CONFIG.maxLives}`;

    livesContainer
        .querySelectorAll(".life")
        .forEach((heart, index) => {

            heart.classList.toggle(
                "lost",
                index >= lives
            );

        });
}

// ==========================================
// ACTUALIZAR SALUD DEL ENEMIGO
// ==========================================

function updateHealthUI() {

    const percentage =
        (health / CONFIG.maxHealth) * 100;

    healthBar.style.width = `${percentage}%`;

    healthText.textContent =
        `${health} / ${CONFIG.maxHealth}`;

    if (health <= 30) {

        healthBar.style.background =
            "linear-gradient(90deg, #c81e45, #ff4565)";

    } else {

        healthBar.style.background =
            "linear-gradient(90deg, #20e83e, #66ff4a)";
    }
}

// ==========================================
// ACTUALIZAR TEMPORIZADOR
// ==========================================

function updateTimerUI() {

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerEl.textContent =
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;

    timerCard.classList.toggle(
        "warning",
        timeLeft <= 10
    );
}

// ==========================================
// INICIAR TEMPORIZADOR
// ==========================================

function startTimer() {

    clearInterval(timerInterval);

    timerInterval = setInterval(() => {

        if (gameState !== "playing") return;

        timeLeft--;

        updateTimerUI();

        if (timeLeft <= 0) {

            endGame(
                false,
                "Se agotó el tiempo de la misión."
            );
        }

    }, 1000);
}

// ==========================================
// INICIAR PARTIDA
// ==========================================

function startGame() {

    clearInterval(timerInterval);

    score = 0;
    shots = 0;
    hits = 0;
    lives = CONFIG.maxLives;

    gameState = "playing";

    updateStats();
    updateLivesUI();

    targetOverlay.style.pointerEvents = "auto";

    loadLevel(0);

    arenaMessage.classList.add("hidden");

    actualizarMira();

    startTimer();
}

// ==========================================
// DETECTAR DISPAROS REALES SOBRE EL MODELO
// ==========================================


targetOverlay.addEventListener("click", event => {

    if (gameState !== "playing") return;

    shots++;
    playLaserSound();

    // Coordenadas relativas a la pantalla.
    const screenX = event.clientX;
    const screenY = event.clientY;

    // Coordenadas relativas al contenedor para los efectos visuales.
    const boxRect = viewerBox.getBoundingClientRect();

    const effectX = screenX - boxRect.left;
    const effectY = screenY - boxRect.top;

    let surfaceHit = null;

    try {

        if (typeof modelViewer.positionAndNormalFromPoint === "function") {

            // IMPORTANTE: enviar las coordenadas de pantalla.
            surfaceHit = modelViewer.positionAndNormalFromPoint(
                screenX,
                screenY
            );

        }

    } catch (error) {

        console.error("Error al detectar el impacto:", error);

    }

    console.log("Resultado del disparo:", surfaceHit);

    if (surfaceHit !== null && surfaceHit !== undefined) {

        // Impacto sobre el enemigo.
        registerHit(effectX, effectY, false);

    } else {

        // Disparo fuera del enemigo.
        registerMiss(effectX, effectY);

    }

    updateStats();

});

// ==========================================
// PROCESAR DISPARO ACERTADO
// ==========================================

function registerHit(x, y, critical) {

    hits++;

    const damage = critical
        ? CONFIG.criticalDamage
        : CONFIG.normalDamage;

    const points = critical
        ? CONFIG.criticalPoints
        : CONFIG.normalPoints;

    score += points;

    health = Math.max(0, health - damage);

    updateHealthUI();

    showImpact(x, y);

    showDamageText(
        x,
        y,
        critical
            ? `-${damage} ¡CRÍTICO!`
            : `-${damage}`,
        critical
    );

    // Efecto de movimiento.
    viewerBox.classList.remove("shake");

    void viewerBox.offsetWidth;

    viewerBox.classList.add("shake");

    if (health <= 0) {
        defeatEnemy();
    }
}

// ==========================================
// PROCESAR DISPARO FALLIDO
// ==========================================

function registerMiss(x, y) {

    lives = Math.max(0, lives - 1);

    updateLivesUI();

    showDamageText(
        x,
        y,
        "-1 VIDA",
        true
    );

    if (lives <= 0) {

        endGame(
            false,
            "Te has quedado sin vidas."
        );
    }
}

// ==========================================
// DERROTAR ENEMIGO
// ==========================================

function defeatEnemy() {

    if (gameState !== "playing") return;

    if (currentLevel === 0) {

        targetStatus.textContent =
            "NIVEL COMPLETADO";

        score += CONFIG.victoryBonus;

        updateStats();

        gameState = "transition";

        targetOverlay.style.pointerEvents = "none";

        clearInterval(timerInterval);

        actualizarMira();

        arenaMessage.classList.remove("hidden");

        messageTitle.textContent =
            "¡NIVEL 1 COMPLETADO!";

        messageText.textContent =
            "Enemigo neutralizado. Has obtenido " +
            "500 puntos adicionales.";

        startButton.textContent =
            "CONTINUAR AL NIVEL 2";

        startButton.onclick = startSecondLevel;

    } else {

        score += CONFIG.victoryBonus;

        updateStats();

        endGame(
            true,
            "Has derrotado a los dos enemigos " +
            "y completado la misión."
        );
    }
}

// ==========================================
// PASAR AL SEGUNDO NIVEL
// ==========================================

function startSecondLevel() {

    if (gameState !== "transition") return;

    loadLevel(1);

    gameState = "playing";

    arenaMessage.classList.add("hidden");

    targetOverlay.style.pointerEvents = "auto";

    actualizarMira();

    startTimer();
}

// ==========================================
// FINALIZAR PARTIDA
// ==========================================

function endGame(victory, reason) {

    clearInterval(timerInterval);

    gameState = "finished";

    targetOverlay.style.pointerEvents = "none";

    actualizarMira();

    arenaMessage.classList.remove("hidden");

    messageTitle.textContent = victory
        ? "¡MISIÓN COMPLETADA!"
        : "MISIÓN FALLIDA";

    messageText.textContent =
        `${reason} Puntuación final: ${score} puntos.`;

    startButton.textContent = "JUGAR DE NUEVO";

    startButton.onclick = startGame;

    targetStatus.textContent = victory
        ? "TODOS LOS OBJETIVOS ELIMINADOS"
        : "MISIÓN INTERRUMPIDA";
}

// ==========================================
// EFECTO DE IMPACTO
// ==========================================

function showImpact(x, y) {

    const spark = document.createElement("div");

    spark.className = "impact-mark";

    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;

    viewerBox.appendChild(spark);

    setTimeout(() => {
        spark.remove();
    }, 400);
}

// ==========================================
// TEXTO DE DAÑO
// ==========================================

function showDamageText(
    x,
    y,
    text,
    critical = false
) {

    const damage = document.createElement("div");

    damage.className = critical
        ? "damage-text critical"
        : "damage-text";

    damage.textContent = text;

    damage.style.left = `${x}px`;
    damage.style.top = `${y}px`;

    viewerBox.appendChild(damage);

    setTimeout(() => {
        damage.remove();
    }, 700);
}

// ==========================================
// REINICIAR PARTIDA
// ==========================================

function resetGame() {

    clearInterval(timerInterval);

    score = 0;
    shots = 0;
    hits = 0;

    lives = CONFIG.maxLives;

    gameState = "ready";

    updateStats();
    updateLivesUI();

    loadLevel(0);

    targetOverlay.style.pointerEvents = "auto";

    actualizarMira();

    arenaMessage.classList.remove("hidden");

    messageTitle.textContent = "SPACE TARGET 3D";

    messageText.textContent =
        "Tienes 3 vidas y 45 segundos por nivel. " +
        "Elimina a los dos enemigos para ganar.";

    startButton.textContent = "INICIAR PARTIDA";

    startButton.onclick = startGame;

    targetStatus.textContent = "OBJETIVO DETECTADO";
}

// ==========================================
// MOVIMIENTO LATERAL DEL ENEMIGO
// ==========================================

function moverEnemigo(tiempo) {

    if (tiempoAnterior === 0) {
        tiempoAnterior = tiempo;
    }

    const diferencia = tiempo - tiempoAnterior;

    tiempoAnterior = tiempo;

    // Movimiento pausado cuando no se está jugando.
    if (gameState === "playing") {

        const velocidad = 0.0008;
        const amplitud = 1.2;

        movimientoEnemigo +=
            velocidad * diferencia * direccionEnemigo;

        if (movimientoEnemigo >= amplitud) {

            movimientoEnemigo = amplitud;
            direccionEnemigo = -1;
        }

        if (movimientoEnemigo <= -amplitud) {

            movimientoEnemigo = -amplitud;
            direccionEnemigo = 1;
        }
    }

    // Aplicar desplazamiento al modelo 3D.
    if (modelViewer) {

        modelViewer.style.transform =
            `translateX(${movimientoEnemigo * 100}px)`;
    }

    animationFrame = requestAnimationFrame(moverEnemigo);
}

// ==========================================
// CONFIGURACIÓN INICIAL
// ==========================================

startButton.onclick = startGame;

resetButton.addEventListener("click", resetGame);

updateStats();
updateLivesUI();

loadLevel(0);

// Iniciar movimiento del enemigo.
cancelAnimationFrame(animationFrame);

animationFrame = requestAnimationFrame(moverEnemigo);
