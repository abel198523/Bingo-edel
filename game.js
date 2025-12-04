
// Chewatabingo Game Logic - New Design

// Screen IDs
const LANDING_SCREEN = 'landing-screen';
const SELECTION_SCREEN = 'selection-screen';
const GAME_SCREEN = 'game-screen';

// Timer Constants
const SELECTION_TIME = 45;
const GAME_SIMULATION_TIME = 30;

// Game state
let masterNumbers = [];
let calledNumbers = [];
let playerCard = [];
let markedCells = new Set();
let autoCallInterval = null;
let selectionTimerInterval = null;
let gameTimerInterval = null;

let currentStake = 10;
let selectedCardId = null;
let isCardConfirmed = false;
let hasPlayerCard = false;

// Initialize Telegram WebApp
let tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
}

// =========================================================================
//                             SCREEN FLOW LOGIC
// =========================================================================

function switchScreen(targetId) {
    const screens = [LANDING_SCREEN, SELECTION_SCREEN, GAME_SCREEN];
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            screen.style.display = (id === targetId) ? 'flex' : 'none';
        }
    });
    if (targetId !== SELECTION_SCREEN) clearInterval(selectionTimerInterval);
    if (targetId !== GAME_SCREEN) stopAutoCall();
}

// 1. Landing Screen Handlers
function handleStakeSelection(event) {
    document.querySelectorAll('.stake-btn').forEach(btn => {
        btn.classList.remove('active-stake');
    });

    event.target.classList.add('active-stake');
    currentStake = parseInt(event.target.dataset.stake);
    
    const playBtn = document.getElementById('start-selection-btn');
    playBtn.textContent = `▷ Play ${currentStake} ETB`;
}

function startSelectionPhase() {
    stopAutoCall();
    selectedCardId = null;
    isCardConfirmed = false;
    hasPlayerCard = false;
    
    document.getElementById('current-stake').textContent = currentStake;
    
    switchScreen(SELECTION_SCREEN);
    initializeSelectionGrid();
    startSelectionTimer();
}

// 2. Selection Screen Handlers
function initializeSelectionGrid() {
    const grid = document.getElementById('card-selection-grid');
    const confirmBtn = document.getElementById('confirm-card-btn');
    const statusEl = document.getElementById('confirmation-status');

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'ካርዱን አረጋግጥ';
    statusEl.textContent = 'ካርድ ይምረጡና አረጋግጡ';
    
    grid.innerHTML = '';
    
    for (let i = 1; i <= 99; i++) {
        const cell = document.createElement('div');
        cell.className = 'card-select-cell';
        cell.textContent = i;
        cell.dataset.cardId = i;
        
        if (Math.random() < 0.2) {
             cell.classList.add('taken');
        } else {
             cell.addEventListener('click', function() { selectCard(cell); });
        }
        
        grid.appendChild(cell);
    }
}

function selectCard(cell) {
    const cardId = cell.dataset.cardId;
    const confirmBtn = document.getElementById('confirm-card-btn');
    const statusEl = document.getElementById('confirmation-status');

    if (cell.classList.contains('taken') || isCardConfirmed) {
        return;
    }
    
    if (selectedCardId) {
        const prevSelected = document.querySelector(`.card-select-cell[data-card-id="${selectedCardId}"]`);
        prevSelected?.classList.remove('selected');
    }

    cell.classList.add('selected');
    selectedCardId = cardId;
    
    confirmBtn.disabled = false;
    statusEl.textContent = `Card ${cardId} ተመርጧል። ለማረጋገጥ ይጫኑ።`;
}

function handleCardConfirmation() {
    if (!selectedCardId || isCardConfirmed) return;
    
    const confirmBtn = document.getElementById('confirm-card-btn');
    const statusEl = document.getElementById('confirmation-status');
    
    isCardConfirmed = true;
    hasPlayerCard = true; 
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'ካርድዎ ተረጋግጧል።';
    statusEl.textContent = `ካርድ ${selectedCardId} ተረጋግጧል። ጨዋታው እስኪጀመር ይጠብቁ።`;
    
    document.querySelectorAll('.card-select-cell').forEach(cell => {
        const newCell = cell.cloneNode(true);
        cell.parentNode.replaceChild(newCell, cell);
    });
    
    const confirmedCell = document.querySelector(`.card-select-cell[data-card-id="${selectedCardId}"]`);
    if(confirmedCell) confirmedCell.classList.add('selected');
}

// === TIMER LOGIC ===
function startSelectionTimer() {
    let timeLeft = SELECTION_TIME;
    const timeDisplay = document.getElementById('time-left');

    if (selectionTimerInterval) clearInterval(selectionTimerInterval);
    
    timeDisplay.textContent = `${timeLeft}s`;

    selectionTimerInterval = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = `${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(selectionTimerInterval);
            timeDisplay.textContent = 'GO!';
            startGame(selectedCardId); 
        }
    }, 1000);
}

// 3. Game Start
function startGame(cardId) {
    if (!isCardConfirmed || !cardId) {
        hasPlayerCard = false;
    } else {
        hasPlayerCard = true;
    }
    
    switchScreen(GAME_SCREEN);
    
    initializeMasterGrid();
    generatePlayerCard(cardId); 
    
    startAutoCall(); 
    startGameSimulationTimer();
}

function startGameSimulationTimer() {
    let timeLeft = GAME_SIMULATION_TIME;
    
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    
    gameTimerInterval = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
            clearInterval(gameTimerInterval);
            gameTimerInterval = null;

            stopAutoCall();
            document.getElementById('call-letter').textContent = '';
            document.getElementById('call-number').textContent = 'WIN!';
            
            setTimeout(() => {
                endGame();
            }, 3000);
        }
    }, 1000);
}

function endGame() {
    stopAutoCall();
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    if (selectionTimerInterval) clearInterval(selectionTimerInterval);

    startSelectionPhase();
}

// =========================================================================
//                             BINGO LOGIC
// =========================================================================

function startAutoCall() {
    if (autoCallInterval) clearInterval(autoCallInterval);
    if (document.getElementById(GAME_SCREEN).style.display === 'flex') {
        autoCallInterval = setInterval(function() {
            callNumber();
        }, 3000);
    }
}

function stopAutoCall() {
    if (autoCallInterval) {
        clearInterval(autoCallInterval);
        autoCallInterval = null;
    }
}

// Get letter for a bingo number
function getLetterForNumber(num) {
    if (num >= 1 && num <= 15) return 'B';
    if (num >= 16 && num <= 30) return 'I';
    if (num >= 31 && num <= 45) return 'N';
    if (num >= 46 && num <= 60) return 'G';
    if (num >= 61 && num <= 75) return 'O';
    return '';
}

function getColumnClass(num) {
    const letter = getLetterForNumber(num);
    return `col-${letter.toLowerCase()}`;
}

function getCallClass(num) {
    const letter = getLetterForNumber(num);
    return `${letter.toLowerCase()}-call`;
}

// Create the master grid (1-75)
function initializeMasterGrid() {
    const masterGrid = document.getElementById('master-grid');
    masterGrid.innerHTML = '';
    masterNumbers = [];
    calledNumbers = []; 
    
    // Grid is 5 columns x 15 rows
    // Column 0: 1-15 (B), Column 1: 16-30 (I), etc.
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 5; col++) {
            const number = (col * 15) + row + 1;
            const cell = document.createElement('div');
            cell.className = 'master-cell';
            cell.textContent = number;
            cell.dataset.number = number;
            masterGrid.appendChild(cell);
            masterNumbers.push(number);
        }
    }
    
    document.getElementById('call-letter').textContent = '';
    document.getElementById('call-number').textContent = '--';
    updateCallHistory();
}

// Generate player card from fixed cards data
function generatePlayerCard(cardId = null) {
    const playerCardEl = document.getElementById('player-bingo-card');
    const watchPlacard = document.getElementById('watch-only-placard');
    const cardTitle = document.getElementById('card-number-title');
    
    if (!hasPlayerCard) {
        playerCardEl.innerHTML = '';
        watchPlacard.style.display = 'flex';
        cardTitle.textContent = 'Card Number --';
        return;
    }

    watchPlacard.style.display = 'none';
    playerCardEl.innerHTML = '';
    playerCard = [];
    markedCells.clear();
    
    cardTitle.textContent = `Card Number ${cardId}`;
    
    // Get the fixed card data for this cardId
    const cardData = BINGO_CARDS[cardId];
    if (!cardData) {
        console.error('Card not found:', cardId);
        return;
    }
    
    const colLetters = ['b', 'i', 'n', 'g', 'o'];
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = document.createElement('div');
            cell.className = `player-cell col-${colLetters[col]}`;
            
            const number = cardData[row][col];
            
            if (number === 0) {
                // FREE space (center)
                cell.textContent = 'F';
                cell.classList.add('free-space', 'marked');
                cell.dataset.number = 'free';
                markedCells.add('free');
            } else {
                cell.textContent = number;
                cell.dataset.number = number;
                playerCard.push(number);
                
                cell.addEventListener('click', function() {
                    toggleCell(cell);
                });
            }
            
            playerCardEl.appendChild(cell);
        }
    }
}

// Toggle cell marking
function toggleCell(cell) {
    const number = cell.dataset.number;
    
    if (number === 'free') return;
    
    if (!calledNumbers.includes(parseInt(number))) {
        return; 
    }
    
    if (cell.classList.contains('marked')) {
        cell.classList.remove('marked');
        markedCells.delete(number);
    } else {
        cell.classList.add('marked');
        markedCells.add(number);
        checkForBingo();
    }
}

// Call a random number
function callNumber() {
    const uncalledNumbers = masterNumbers.filter(num => !calledNumbers.includes(num));
    
    if (uncalledNumbers.length === 0) {
        stopAutoCall();
        document.getElementById('call-letter').textContent = '';
        document.getElementById('call-number').textContent = 'END';
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * uncalledNumbers.length);
    const calledNumber = uncalledNumbers[randomIndex];
    
    calledNumbers.push(calledNumber);
    
    const letter = getLetterForNumber(calledNumber);
    document.getElementById('call-letter').textContent = letter;
    document.getElementById('call-number').textContent = calledNumber;
    
    updateCallHistory();
    
    // Mark the number in the master grid
    document.querySelectorAll('.master-cell').forEach(cell => {
        if (parseInt(cell.dataset.number) === calledNumber) {
            cell.classList.add('called');
        }
    });
}

// Update call history display
function updateCallHistory() {
    const historyContainer = document.getElementById('call-history');
    historyContainer.innerHTML = '';
    
    const lastCalls = calledNumbers.slice(-4).reverse();
    
    lastCalls.forEach(num => {
        const letter = getLetterForNumber(num);
        const item = document.createElement('span');
        item.className = `history-item ${getCallClass(num)}`;
        item.innerHTML = `<span>${letter}-${num}</span>`;
        historyContainer.appendChild(item);
    });
}

// Check if player has bingo
function checkForBingo() {
    const grid = Array(5).fill().map(() => Array(5).fill(false));
    const playerCells = document.querySelectorAll('#player-bingo-card .player-cell');
    
    playerCells.forEach((cell, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        
        if (cell.classList.contains('marked')) {
            grid[row][col] = true;
        }
    });

    // Check rows, columns, and diagonals
    for (let i = 0; i < 5; i++) {
        if (grid[i].every(cell => cell)) return true;
        if (grid.every(row => row[i])) return true;
    }
    if (grid[0][0] && grid[1][1] && grid[2][2] && grid[3][3] && grid[4][4]) return true;
    if (grid[0][4] && grid[1][3] && grid[2][2] && grid[3][1] && grid[4][0]) return true;
    
    return false;
}

// Set up event listeners
function setupEventListeners() {
    
    // LANDING SCREEN LISTENERS
    document.querySelectorAll('.stake-btn').forEach(button => {
        button.addEventListener('click', handleStakeSelection);
    });

    document.getElementById('start-selection-btn')?.addEventListener('click', startSelectionPhase);

    // SELECTION SCREEN LISTENERS
    document.getElementById('confirm-card-btn')?.addEventListener('click', handleCardConfirmation);

    // GAME SCREEN LISTENERS
    document.querySelector('.close-btn')?.addEventListener('click', function() {
        switchScreen(LANDING_SCREEN);
        stopAutoCall();
        if (gameTimerInterval) clearInterval(gameTimerInterval);
    });
    
    document.getElementById('exit-btn')?.addEventListener('click', function() {
        switchScreen(LANDING_SCREEN);
        stopAutoCall();
        if (gameTimerInterval) clearInterval(gameTimerInterval);
    });
    
    document.getElementById('refresh-btn')?.addEventListener('click', endGame);
    
    // "BINGO" button 
    document.getElementById('bingo-btn')?.addEventListener('click', function() {
        if (checkForBingo()) {
            document.getElementById('bingo-btn').textContent = 'BINGO!';
            stopAutoCall();
        } else {
            const bingoBtn = document.getElementById('bingo-btn');
            bingoBtn.textContent = 'Not Yet...';
            setTimeout(() => bingoBtn.textContent = 'Bingo', 1000);
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    document.getElementById('start-selection-btn').textContent = `▷ Play ${currentStake} ETB`;
    
    // Check for test mode - add #game to URL to directly view game screen
    if (window.location.hash === '#game') {
        hasPlayerCard = true;
        selectedCardId = 44;
        isCardConfirmed = true;
        switchScreen(GAME_SCREEN);
        initializeMasterGrid();
        generatePlayerCard(44);
        startAutoCall();
    } else {
        switchScreen(LANDING_SCREEN);
    }
});
