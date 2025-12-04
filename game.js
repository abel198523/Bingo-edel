
// Chewatabingo Game Logic (Version with 3 Screens: Landing, Selection, Game)

// Screen IDs
const LANDING_SCREEN = 'landing-screen';
const SELECTION_SCREEN = 'selection-screen';
const GAME_SCREEN = 'game-screen';

// Timer Constants
const SELECTION_TIME = 45; // 45s Selection/Waiting time (Independent)
const GAME_SIMULATION_TIME = 30; // 30s Game simulation time

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
let isCardConfirmed = false; // Player has confirmed a card
let hasPlayerCard = false; // Does the player have a card for the current game

// Initialize Telegram WebApp
let tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
}

// =========================================================================
//                             SCREEN FLOW LOGIC
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
    // Reset state
    stopAutoCall();
    selectedCardId = null;
    isCardConfirmed = false;
    hasPlayerCard = false;
    
    // Update UI
    document.getElementById('current-stake').textContent = currentStake;
    
    // Switch and Initialize
    switchScreen(SELECTION_SCREEN);
    initializeSelectionGrid();
    
    // Start the 45-second timer
    startSelectionTimer();
}

// 2. Selection Screen Handlers
function initializeSelectionGrid() {
    const grid = document.getElementById('card-selection-grid');
    const confirmBtn = document.getElementById('confirm-card-btn');
    const statusEl = document.getElementById('confirmation-status');

    // Reset UI elements
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'ካርዱን አረጋግጥ';
    statusEl.textContent = 'ካርድ ይምረጡና አረጋግጡ';
    
    grid.innerHTML = '';
    
    // Create 100 cells
    for (let i = 1; i <= 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'card-select-cell';
        cell.textContent = i;
        cell.dataset.cardId = i;
        
        if (Math.random() < 0.2) {
             cell.classList.add('taken');
        } else {
             // Re-attach listener correctly
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
    
    // Deselect previously selected card
    if (selectedCardId) {
        const prevSelected = document.querySelector(`.card-select-cell[data-card-id="${selectedCardId}"]`);
        prevSelected?.classList.remove('selected');
    }

    // Select the new card
    cell.classList.add('selected');
    selectedCardId = cardId;
    
    // Enable Confirm Button
    confirmBtn.disabled = false;
    statusEl.textContent = `Card ${cardId} ተመርጧል። ለማረጋገጥ ይጫኑ።`;
}

function handleCardConfirmation() {
    if (!selectedCardId || isCardConfirmed) return;
    
    const confirmBtn = document.getElementById('confirm-card-btn');
    const statusEl = document.getElementById('confirmation-status');
    
    isCardConfirmed = true;
    hasPlayerCard = true; 
    
    // 1. UI Feedback: ቆጣሪው ገለልተኛ ሆኖ ይቀጥላል
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'ካርድዎ ተረጋግጧል።';
    statusEl.textContent = `ካርድ ${selectedCardId} ተረጋግጧል። ጨዋታው እስኪጀመር ይጠብቁ።`;
    
    // 2. Lock the grid (prevent further changes)
    document.querySelectorAll('.card-select-cell').forEach(cell => {
        // Simple way to remove all listeners and lock: replace node
        const newCell = cell.cloneNode(true);
        cell.parentNode.replaceChild(newCell, cell);
    });
    // Re-select the confirmed cell (as cloneNode removes the selected class)
    const confirmedCell = document.querySelector(`.card-select-cell[data-card-id="${selectedCardId}"]`);
    if(confirmedCell) confirmedCell.classList.add('selected');
}

// === TIMER LOGIC: 45s Timer (Independent) ===
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
            
            // Time is up, start the game
            startGame(selectedCardId); 
        }
    }, 1000);
}


// 3. Game Start
function startGame(cardId) {
    // Determine the state
    if (!isCardConfirmed || !cardId) {
        hasPlayerCard = false; // Watch Only Mode
    } else {
        hasPlayerCard = true; // Normal Mode
    }
    
    // 1. Switch
    switchScreen(GAME_SCREEN);
    
    // 2. Initialize Assets
    initializeMasterGrid();
    generatePlayerCard(cardId); 
    
    // 3. Start simulation and auto-call
    startAutoCall(); 
    startGameSimulationTimer();
}

// === NEW: Game Simulation Timer (30s) ===
function startGameSimulationTimer() {
    let timeLeft = GAME_SIMULATION_TIME;
    
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    
    gameTimerInterval = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
            clearInterval(gameTimerInterval);
            gameTimerInterval = null;

            // Announce End
            stopAutoCall();
            document.getElementById('current-call').textContent = 'WINNER!';
            
            // Wait 3 seconds, then go back to selection
            setTimeout(() => {
                endGame();
            }, 3000);
        }
    }, 1000);
}

// === NEW: End Game Function ===
function endGame() {
    // Stop all timers and intervals
    stopAutoCall();
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    if (selectionTimerInterval) clearInterval(selectionTimerInterval);

    // Go back to selection screen to start the next round
    startSelectionPhase();
}

// =========================================================================
//                             ORIGINAL BINGO LOGIC
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

// Create the master grid (1-75)
function initializeMasterGrid() {
    const masterGrid = document.getElementById('master-grid');
    masterGrid.innerHTML = '';
    masterNumbers = [];
    calledNumbers = []; 
    
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
    document.getElementById('current-call').textContent = 'Call';
    updateCallHistory();
}

// Generate a random bingo card or show Watch Only
function generatePlayerCard(cardId = null) {
    const playerCardEl = document.getElementById('player-bingo-card');
    const watchPlacard = document.getElementById('watch-only-placard');
    
    if (!hasPlayerCard) {
        // Watch Only Mode
        playerCardEl.innerHTML = '';
        watchPlacard.style.display = 'flex';
        return;
    }

    // Normal game mode
    watchPlacard.style.display = 'none';
    playerCardEl.innerHTML = '';
    playerCard = [];
    markedCells.clear();
    
    const headers = ['B', 'I', 'N', 'G', 'O'];
    headers.forEach(letter => {
        const header = document.createElement('div');
        header.className = 'header';
        header.textContent = letter;
        playerCardEl.appendChild(header);
    });
    
    const columns = [
        generateColumn(1, 15), generateColumn(16, 30), generateColumn(31, 45),
        generateColumn(46, 60), generateColumn(61, 75)
    ];
    
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if (row === 2 && col === 2) {
                cell.textContent = 'FREE';
                cell.classList.add('free-space', 'marked');
                cell.dataset.number = 'free';
                markedCells.add('free');
            } else {
                const number = columns[col][row];
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

// Generate random numbers for a column
function generateColumn(min, max) {
    const numbers = [];
    const available = [];
    for (let i = min; i <= max; i++) {
        available.push(i);
    }
    
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * available.length);
        numbers.push(available[randomIndex]);
        available.splice(randomIndex, 1);
    }
    return numbers;
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
        document.getElementById('current-call').textContent = 'End';
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * uncalledNumbers.length);
    const calledNumber = uncalledNumbers[randomIndex];
    
    calledNumbers.push(calledNumber);
    
    document.getElementById('current-call').textContent = calledNumber;
    
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
    const historyItems = document.querySelectorAll('.history-item');
    const lastThree = calledNumbers.slice(-3).reverse(); 
    
    historyItems.forEach((item, index) => {
        if (lastThree[index]) {
            item.textContent = lastThree[index];
        } else {
            item.textContent = '-';
        }
    });
}

// Check if player has bingo
function checkForBingo() {
    const grid = Array(5).fill().map(() => Array(5).fill(false));
    const playerCells = document.querySelectorAll('#player-bingo-card .cell');
    
    playerCells.forEach((cell, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        
        if (cell.classList.contains('marked')) {
            grid[row][col] = true;
        }
    });

    // Check rows, columns, and diagonals
    for (let i = 0; i < 5; i++) {
        if (grid[i].every(cell => cell)) return true; // Row
        if (grid.every(row => row[i])) return true;  // Column
    }
    if (grid[0][0] && grid[1][1] && grid[2][2] && grid[3][3] && grid[4][4]) return true;
    if (grid[0][4] && grid[1][3] && grid[2][2] && grid[3][1] && grid[4][0]) return true;
    
    return false;
}


// Set up event listeners for all screens
function setupEventListeners() {
    
    // LANDING SCREEN LISTENERS
    document.querySelectorAll('.stake-btn').forEach(button => {
        button.addEventListener('click', handleStakeSelection);
    });

    document.getElementById('start-selection-btn')?.addEventListener('click', startSelectionPhase);

    // SELECTION SCREEN LISTENERS
    document.getElementById('confirm-card-btn')?.addEventListener('click', handleCardConfirmation);

    // GAME SCREEN LISTENERS
    document.querySelector('.top-round-btn')?.addEventListener('click', endGame);
    document.getElementById('refresh-btn')?.addEventListener('click', endGame);
    
    // "BINGO" button 
    document.getElementById('bingo-btn')?.addEventListener('click', function() {
        if (checkForBingo()) {
            document.getElementById('bingo-btn').textContent = '🎉 BINGO! 🎉';
            stopAutoCall();
        } else {
            const bingoBtn = document.getElementById('bingo-btn');
            bingoBtn.textContent = 'Not Yet...';
            setTimeout(() => bingoBtn.textContent = 'BINGO', 1000);
        }
    });
}

// Initialize the screen flow
document.addEventListener('DOMContentLoaded', function() {
    switchScreen(LANDING_SCREEN); 
    setupEventListeners();
    document.getElementById('start-selection-btn').textContent = `▷ Play ${currentStake} ETB`;
});
