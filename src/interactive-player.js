"use strict";

/**
 * Interactive Player Implementation for RTT AI Agent
 * 
 * This player allows humans to play the game interactively through the console.
 * It displays the game state in a human-readable format and prompts for action selection.
 */

const { BasePlayer } = require('./base-player');
const readline = require('readline');
const chalk = require('chalk');

// Card definitions from the game
const PERSIAN_EVENT_NAMES = {
    1: "Cavalry of Mardonius",
    2: "Tribute of Earth and Water",
    3: "Tribute of Earth and Water",
    4: "Carneia Festival",
    5: "The Immortals",
    6: "Ostracism",
    7: "The Great King",
    8: "The Royal Road",
    9: "Hippias",
    10: "Separate Peace",
    11: "Sudden Death of the Great King",
    12: "Defection of Thebes",
    13: "Tribute of Earth and Water",
    14: "Alliance with Carthage",
    15: "Acropolis on Fire",
    16: "Pacification of Babylon or Egypt",
};

const GREEK_EVENT_NAMES = {
    1: "Mines of Laurion",
    2: "Ionian Revolt",
    3: "Wrath of Poseidon",
    4: "Miltiades",
    5: "Themistocles",
    6: "Pausanias",
    7: "Oracle of Delphi",
    8: "Leonidas",
    9: "Artemisia I",
    10: "Evangelion",
    11: "Melas Zomos",
    12: "Molon Labe",
    13: "Triremes",
    14: "Support from Syracuse",
    15: "300 Spartans",
    16: "Desertion of Greek Soldiers",
};

/**
 * Interactive Player Class
 * Extends BasePlayer with human interaction capabilities
 */
class InteractivePlayer extends BasePlayer {
    constructor(options = {}) {
        const interactiveOptions = {
            name: options.name || 'Human Player',
            gameId: options.gameId || 'interactive-game',
            ...options
        };
        
        super(interactiveOptions);
        
        // Create readline interface for user input (will be created when needed)
        this.rl = null;
        
        this.logger.logger.info('Interactive Player Initialized', {
            name: this.name,
            type: this.constructor.name
        });
    }

    /**
     * Implement the abstract makeDecision method from BasePlayer
     * Prompts the human player to select an action
     */
    async makeDecision(gameState, availableActions, view) {
        // Display current game state
        this.displayGameState(gameState, view);
        
        // Display available actions
        const actionList = this.formatAvailableActions(availableActions, gameState);
        
        if (actionList.length === 0) {
            throw new Error('No valid actions available');
        }
        
        // If only one action is available, auto-select it
        if (actionList.length === 1) {
            console.log(chalk.yellow(`\nOnly one action available: ${actionList[0].display}`));
            console.log(chalk.gray('Auto-selecting...'));
            await this.delay(1000); // Brief pause so user can see
            return {
                action: actionList[0].action,
                args: actionList[0].args,
                reason: 'single_option'
            };
        }
        
        // Prompt user for selection
        const selection = await this.promptForAction(actionList);
        
        // If this is a movement action, we need to get additional parameters
        if (this.isMovementAction(selection.action, gameState)) {
            const finalArgs = await this.promptForMovementDetails(selection, gameState, view);
            return {
                action: selection.action,
                args: finalArgs,
                reason: 'human_selection'
            };
        }
        
        return {
            action: selection.action,
            args: selection.args,
            reason: 'human_selection'
        };
    }

    /**
     * Display the current game state in a human-readable format
     */
    displayGameState(gameState, view) {
        console.log('\n' + chalk.blue('═'.repeat(60)));
        console.log(chalk.bold.white('CURRENT GAME STATE'));
        console.log(chalk.blue('═'.repeat(60)));
        
        // Display basic info
        console.log(chalk.cyan('Active Player:'), chalk.bold(view.active || gameState.active));
        console.log(chalk.cyan('Game Phase:'), this.formatStateName(gameState.state));
        console.log(chalk.cyan('Campaign:'), gameState.campaign || 1);
        console.log(chalk.cyan('Victory Points:'), this.formatVP(gameState.vp));
        
        // Display prompt from game
        if (view.prompt) {
            console.log('\n' + chalk.yellow('Game Says:'), view.prompt);
        }
        
        // Display recent battle logs if available
        if (view.log && view.log.length > 0) {
            this.displayBattleLogs(view.log);
        }
        
        // Display units on board (if available)
        if (gameState.units) {
            this.displayUnits(gameState.units);
        }
        
        // Display hand with card details
        if (view.hand && view.hand.length > 0) {
            this.displayHand(view.hand, view.active || gameState.active);
        }
        
        // Display special states
        if (gameState.from) {
            console.log(chalk.magenta('Moving from:'), gameState.from);
        }
        
        console.log(chalk.blue('─'.repeat(60)));
    }

    /**
     * Display cards in hand with their names and event text
     */
    displayHand(hand, activePlayer) {
        console.log('\n' + chalk.bold('Cards in Hand:'));
        
        const isPersian = activePlayer === 'Persia';
        const eventNames = isPersian ? PERSIAN_EVENT_NAMES : GREEK_EVENT_NAMES;
        const otherEventNames = isPersian ? GREEK_EVENT_NAMES : PERSIAN_EVENT_NAMES;
        const playerColor = isPersian ? chalk.red : chalk.blue;
        
        hand.forEach((cardId, index) => {
            const cardNumber = cardId;
            const myEvent = eventNames[cardNumber];
            const theirEvent = otherEventNames[cardNumber];
            
            // Determine card strength (1-3 based on common card distribution)
            const strength = this.getCardStrength(cardNumber);
            
            console.log(playerColor(`  ${index + 1}. [${strength}⚔] Card #${cardNumber}`));
            
            if (myEvent) {
                console.log(chalk.green(`     Your Event: ${myEvent}`));
            }
            if (theirEvent) {
                console.log(chalk.gray(`     Their Event: ${theirEvent}`));
            }
        });
        
        console.log(chalk.gray(`  Total: ${hand.length} cards`));
    }

    /**
     * Get card strength value (rough estimate based on card patterns)
     */
    getCardStrength(cardId) {
        // Cards 1-6 are typically 3 strength
        // Cards 7-11 are typically 2 strength  
        // Cards 12-16 are typically 1 strength
        // This is a simplification - actual values may vary
        if (cardId <= 6) return 3;
        if (cardId <= 11) return 2;
        return 1;
    }

    /**
     * Display units on the board
     */
    displayUnits(units) {
        console.log('\n' + chalk.bold('Units on Board:'));
        
        const cities = Object.keys(units).filter(key => key !== 'reserve');
        const persianCities = [];
        const greekCities = [];
        const neutralCities = [];
        
        for (const city of cities) {
            const unitArray = units[city] || [0, 0, 0, 0];
            // Handle cities with only 2 values (land-only cities)
            const [gArmy, pArmy, gFleet = 0, pFleet = 0] = unitArray;
            const hasPersian = pArmy > 0 || pFleet > 0;
            const hasGreek = gArmy > 0 || gFleet > 0;
            
            if (hasPersian && !hasGreek) {
                const fleetInfo = unitArray.length > 2 ? ` F:${pFleet}` : '';
                persianCities.push(`${city} (A:${pArmy}${fleetInfo})`);
            } else if (hasGreek && !hasPersian) {
                const fleetInfo = unitArray.length > 2 ? ` F:${gFleet}` : '';
                greekCities.push(`${city} (A:${gArmy}${fleetInfo})`);
            } else if (hasPersian && hasGreek) {
                const persianFleet = unitArray.length > 2 ? ` F:${pFleet}` : '';
                const greekFleet = unitArray.length > 2 ? ` F:${gFleet}` : '';
                neutralCities.push(`${city} (P: A:${pArmy}${persianFleet} | G: A:${gArmy}${greekFleet})`);
            }
        }
        
        if (persianCities.length > 0) {
            console.log(chalk.red('  Persian:'), persianCities.join(', '));
        }
        if (greekCities.length > 0) {
            console.log(chalk.blue('  Greek:'), greekCities.join(', '));
        }
        if (neutralCities.length > 0) {
            console.log(chalk.yellow('  Contested:'), neutralCities.join(', '));
        }
        
        // Display reserves
        if (units.reserve) {
            const [gArmy, pArmy, gFleet, pFleet] = units.reserve;
            console.log(chalk.gray('  Reserves:'), 
                `Persian (A:${pArmy} F:${pFleet}) | Greek (A:${gArmy} F:${gFleet})`);
        }
    }

    /**
     * Format available actions into a selectable list
     */
    formatAvailableActions(actions, gameState) {
        const actionList = [];
        
        for (const [action, value] of Object.entries(actions)) {
            // Skip disabled actions
            if (value === false || value === 0 || (Array.isArray(value) && value.length === 0)) {
                continue;
            }
            
            if (value === true || value === 1) {
                // Simple action
                actionList.push({
                    action: action,
                    args: undefined,
                    display: this.getActionDescription(action, gameState)
                });
            } else if (typeof value === 'number') {
                // Numeric action
                actionList.push({
                    action: action,
                    args: value,
                    display: `${this.getActionDescription(action, gameState)} (${value})`
                });
            } else if (Array.isArray(value)) {
                // Multiple options
                for (const option of value) {
                    actionList.push({
                        action: action,
                        args: option,
                        display: `${this.getActionDescription(action, gameState)}: ${option}`
                    });
                }
            }
        }
        
        return actionList;
    }

    /**
     * Get human-readable description for an action
     */
    getActionDescription(action, gameState) {
        // Context-aware descriptions
        if (gameState && gameState.state) {
            const state = gameState.state;
            
            if (state.includes('movement')) {
                if (action === 'city') {
                    return gameState.from ? 'Move armies to city' : 'Select origin city for movement';
                } else if (action === 'port') {
                    return gameState.from ? 'Move fleets/armies to port' : 'Select origin port for movement';
                }
            } else if (state.includes('build')) {
                if (action === 'city') return 'Build army at city';
                if (action === 'port') return 'Build fleet at port';
            }
        }
        
        // Default descriptions
        const descriptions = {
            'next': 'Continue to next phase',
            'draw': 'Draw a card',
            'build': 'Build the bridge',
            'city': 'Select city',
            'port': 'Select port',
            'pass': 'Pass turn',
            'play': 'Play card',
            'event': 'Play as event',
            'move': 'Move units',
            'naval': 'Naval movement',
            'land': 'Land movement',
            'battle': 'Initiate battle',
            'retreat': 'Retreat',
            'regroup': 'Regroup units',
            'undo': 'Undo last action'
        };
        
        return descriptions[action] || action;
    }

    /**
     * Format state name to be more readable
     */
    formatStateName(state) {
        if (!state) return 'Unknown';
        
        return state
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace('Persian', chalk.red('Persian'))
            .replace('Greek', chalk.blue('Greek'));
    }

    /**
     * Format victory points with color
     */
    formatVP(vp) {
        if (vp > 0) {
            return chalk.red(`Persian +${vp}`);
        } else if (vp < 0) {
            return chalk.blue(`Greek +${Math.abs(vp)}`);
        } else {
            return chalk.yellow('Tied (0)');
        }
    }

    /**
     * Prompt user to select an action
     */
    async promptForAction(actionList) {
        console.log('\n' + chalk.bold.green('Available Actions:'));
        
        actionList.forEach((item, index) => {
            console.log(chalk.white(`  ${index + 1}.`), item.display);
        });
        
        // Create fresh readline interface for each prompt
        if (!this.rl || this.rl.closed) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }
        
        return new Promise((resolve) => {
            const askForSelection = () => {
                this.rl.question(chalk.cyan('\nSelect action (enter number): '), (answer) => {
                    // Handle empty input or non-numeric input
                    if (!answer || answer.trim() === '') {
                        console.log(chalk.red('Please enter a number.'));
                        askForSelection();
                        return;
                    }
                    
                    const index = parseInt(answer.trim()) - 1;
                    
                    if (isNaN(index) || index < 0 || index >= actionList.length) {
                        console.log(chalk.red(`Invalid selection. Please enter a number between 1 and ${actionList.length}`));
                        askForSelection();
                    } else {
                        const selected = actionList[index];
                        console.log(chalk.green(`\n✓ Selected: ${selected.display}\n`));
                        resolve(selected);
                    }
                });
            };
            
            askForSelection();
        });
    }

    /**
     * Check if this is a movement action that needs additional parameters
     */
    isMovementAction(action, gameState) {
        if (!gameState || !gameState.state) return false;
        
        const state = gameState.state;
        const isMovementPhase = state.includes('movement') || state.includes('land_movement') || state.includes('naval_movement');
        const isMovementAction = (action === 'city' || action === 'port');
        
        // If we're in a movement phase and selecting destination, we need troop counts
        return isMovementPhase && isMovementAction && gameState.from;
    }
    
    /**
     * Prompt user for movement details (troop/fleet counts)
     */
    async promptForMovementDetails(selection, gameState, view) {
        const destination = selection.args;
        const fromCity = gameState.from;
        const activePlayer = view.active || gameState.active;
        
        console.log(chalk.cyan(`\n📍 Moving from ${chalk.bold(fromCity)} to ${chalk.bold(destination)}`));
        
        // Get available units at the origin
        const originUnits = gameState.units && gameState.units[fromCity] ? gameState.units[fromCity] : [0, 0, 0, 0];
        const isPersian = activePlayer === 'Persia';
        
        if (selection.action === 'city') {
            // Land movement - only armies
            const availableArmies = this.getAvailableArmies(originUnits, isPersian);
            console.log(chalk.white(`Available armies at ${fromCity}: ${availableArmies}`));
            
            const armies = await this.promptForNumber(
                `How many armies to move (1-${availableArmies})?`,
                1, availableArmies
            );
            
            return [destination, armies];
            
        } else if (selection.action === 'port') {
            // Naval movement - fleets and armies
            const availableFleets = this.getAvailableFleets(originUnits, isPersian);
            const availableArmies = this.getAvailableArmies(originUnits, isPersian);
            
            console.log(chalk.white(`Available at ${fromCity}: ${availableFleets} fleets, ${availableArmies} armies`));
            
            const fleets = await this.promptForNumber(
                `How many fleets to move (1-${availableFleets})?`,
                1, availableFleets
            );
            
            const maxTransportableArmies = Math.min(availableArmies, fleets);
            let armies = 0;
            
            if (maxTransportableArmies > 0) {
                armies = await this.promptForNumber(
                    `How many armies to transport (0-${maxTransportableArmies})?`,
                    0, maxTransportableArmies
                );
            }
            
            return [destination, fleets, armies];
        }
        
        return destination;
    }
    
    /**
     * Get available armies for the active player
     */
    getAvailableArmies(units, isPersian) {
        if (!units || units.length < 2) return 0;
        return isPersian ? (units[1] || 0) : (units[0] || 0);
    }
    
    /**
     * Get available fleets for the active player
     */
    getAvailableFleets(units, isPersian) {
        if (!units || units.length < 4) return 0;
        return isPersian ? (units[3] || 0) : (units[2] || 0);
    }
    
    /**
     * Prompt user for a number within a range
     */
    async promptForNumber(question, min, max) {
        if (!this.rl || this.rl.closed) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }
        
        return new Promise((resolve) => {
            const askForNumber = () => {
                this.rl.question(chalk.cyan(question + ' '), (answer) => {
                    const num = parseInt(answer.trim());
                    
                    if (isNaN(num) || num < min || num > max) {
                        console.log(chalk.red(`Please enter a number between ${min} and ${max}.`));
                        askForNumber();
                    } else {
                        console.log(chalk.green(`✓ Selected: ${num}\n`));
                        resolve(num);
                    }
                });
            };
            
            askForNumber();
        });
    }

    /**
     * Display battle logs from the game's internal log system
     * Shows dice rolls, battle results, and other important game events
     */
    displayBattleLogs(gameLog) {
        if (!gameLog || gameLog.length === 0) return;
        
        // Track what we've shown to avoid repeating logs
        if (!this.lastLogLength) {
            this.lastLogLength = 0;
        }
        
        // Only show new log entries
        const newEntries = gameLog.slice(this.lastLogLength);
        
        if (newEntries.length === 0) return;
        
        console.log('\n' + chalk.bold.magenta('📖 Battle Log:'));
        console.log(chalk.magenta('─'.repeat(40)));
        
        for (const entry of newEntries) {
            if (entry === '.hr') {
                console.log(chalk.magenta('─'.repeat(40)));
            } else if (entry === '') {
                console.log(''); // Blank line
            } else {
                // Color code different types of messages
                let message = entry;
                
                if (message.includes('rolled')) {
                    // Dice rolls - highlight in cyan
                    console.log(chalk.cyan('🎲 ' + message));
                } else if (message.includes('lost') || message.includes('Lost')) {
                    // Casualties - highlight in red
                    if (message.includes('Greece')) {
                        console.log(chalk.blue('⚔️  ' + message));
                    } else if (message.includes('Persia')) {
                        console.log(chalk.red('⚔️  ' + message));
                    } else {
                        console.log(chalk.red('⚔️  ' + message));
                    }
                } else if (message.includes('attacked') || message.includes('attack')) {
                    // Battle start - highlight in yellow
                    console.log(chalk.bold.yellow('⚡ ' + message));
                } else {
                    // General game events
                    console.log(chalk.white('📋 ' + message));
                }
            }
        }
        
        console.log(chalk.magenta('─'.repeat(40)));
        
        // Update our tracking
        this.lastLogLength = gameLog.length;
    }

    /**
     * Clean up readline interface when done
     */
    cleanup() {
        if (this.rl) {
            this.rl.close();
        }
    }

    /**
     * Play a complete game with interactive input
     * Based on RandomPlayer's implementation but with human interaction
     */
    async playGame(rulesModule, gameSetup) {
        try {
            this.gameStats.startTime = Date.now();
            
            // Initialize game
            const { seed, scenario, options } = gameSetup;
            
            this.logger.logGameStart({
                seed: seed,
                scenario: scenario,
                options: options,
                playerName: this.name,
                playerSeed: this.seed
            });

            // Setup initial game state
            let gameState = rulesModule.setup(seed, scenario, options);
            let step = 0;

            // Main game loop
            while (gameState.state !== 'game_over' && step < this.config.maxSteps) {
                // Determine active player
                let activePlayer = gameState.active;
                if (activePlayer === 'Both' || activePlayer === 'All') {
                    // For multi-player states, ask human which side to play
                    console.log(chalk.yellow('\nBoth players can act. Playing as:'), activePlayer);
                    const roles = rulesModule.roles || ['Persia', 'Greece'];
                    // For now, default to first player - could prompt user later
                    activePlayer = roles[0];
                }

                // Use the BasePlayer.executeTurn method for consistent behavior
                try {
                    gameState = await this.executeTurn(rulesModule, gameState, activePlayer, step);
                    step++;
                    
                    // Optional delay for visualization
                    if (this.config.stepDelay > 0) {
                        await this.delay(this.config.stepDelay);
                    }
                    
                } catch (error) {
                    this.logger.logError(error, {
                        step: step,
                        activePlayer: activePlayer,
                        gameState: gameState.state,
                        context: 'game_loop'
                    });
                    break;
                }
            }

            // Game completed
            this.gameStats.endTime = Date.now();
            this.gameStats.totalSteps = step;

            const finalResult = {
                gameOver: gameState.state === 'game_over',
                winner: this.determineWinner(gameState),
                finalState: gameState,
                totalSteps: step,
                gameTime: this.gameStats.endTime - this.gameStats.startTime,
                reason: step >= this.config.maxSteps ? 'max_steps_reached' : 'game_completed'
            };

            this.logger.logGameEnd({
                result: finalResult.reason,
                winner: finalResult.winner,
                vp: gameState.vp,
                campaign: gameState.campaign,
                totalSteps: step
            });

            this.cleanup();
            return finalResult;

        } catch (error) {
            this.logger.logError(error, { context: 'playGame' });
            this.cleanup();
            throw error;
        }
    }
}

module.exports = { InteractivePlayer };