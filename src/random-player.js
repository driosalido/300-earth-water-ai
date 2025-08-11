"use strict";

/**
 * Random Player Implementation for RTT AI Agent
 * 
 * This player extends BasePlayer and implements random decision making.
 * All game mechanics are inherited from BasePlayer, ensuring consistency
 * across different player types.
 * 
 * This serves as:
 * 1. A baseline for AI agent comparison
 * 2. A debugging tool for rules implementation
 * 3. A reference implementation for the BasePlayer architecture
 */

const { BasePlayer } = require('./base-player');

/**
 * Random Player Class
 * Extends BasePlayer with random decision making strategy
 */
class RandomPlayer extends BasePlayer {
    constructor(options = {}) {
        // Set default name and gameId for RandomPlayer
        const randomOptions = {
            name: 'RandomPlayer',
            gameId: 'random-game',
            ...options
        };
        
        super(randomOptions);
        
        this.logger.logger.info('Random Player Initialized', {
            name: this.name,
            type: this.constructor.name,
            seed: this.seed,
            config: this.config
        });
    }

    /**
     * Implement the abstract makeDecision method from BasePlayer
     * Uses random selection for decision making
     */
    makeDecision(gameState, availableActions, view) {
        // Note: availableActions already has 'undo' filtered out by BasePlayer
        // Filter remaining invalid actions
        let validActions = {};
        
        for (const [action, value] of Object.entries(availableActions)) {
            // Skip disabled actions (false, 0, empty arrays)
            if (value === false || value === 0 || (Array.isArray(value) && value.length === 0)) {
                continue;
            }
            
            // Check for NaN values in action arguments
            if (Array.isArray(value)) {
                const hasNaN = value.some(arg => {
                    return typeof arg === 'number' && isNaN(arg);
                });
                if (hasNaN) {
                    this.logger.logWarning('Action has NaN arguments, skipping', {
                        action: action,
                        arguments: value
                    });
                    continue;
                }
            }
            
            validActions[action] = value;
        }

        const actionKeys = Object.keys(validActions);
        if (actionKeys.length === 0) {
            throw new Error('No valid actions available after filtering');
        }

        // Select random action
        const selectedAction = this.randomChoice(actionKeys);
        const actionValue = validActions[selectedAction];
        
        // Handle different action argument types based on context
        let selectedArgs = this.selectRandomArgs(selectedAction, actionValue, gameState, view);


        return {
            action: selectedAction,
            args: selectedArgs,
            reason: 'random_selection'
        };
    }

    /**
     * Select random arguments for the chosen action
     * This handles the random decision making for argument selection
     */
    selectRandomArgs(selectedAction, actionValue, gameState, view) {
        if (typeof actionValue === 'number' && actionValue === 1) {
            // Simple enabled action (like 'next', 'draw', 'build') - no arguments needed
            return undefined;
        } else if (typeof actionValue === 'number' && actionValue !== 1) {
            // Numeric action - use the number as argument
            return actionValue;
        } else if (Array.isArray(actionValue)) {
            // Array of possible arguments - but context matters!
            
            // Special case: movement phases where city/port actions need special formats
            if (this.isMovementPhase(gameState) && (selectedAction === 'city' || selectedAction === 'port')) {
                const destination = this.randomChoice(actionValue);
                return destination; // BasePlayer.formatAction will handle the complex formatting
            } else {
                // Standard case: just pick a random element from the array
                return this.randomChoice(actionValue);
            }
        } else if (actionValue === true) {
            // Boolean true - action is enabled but no args needed
            return undefined;
        } else {
            // Other types - pass as-is
            return actionValue;
        }
    }

    // All game mechanics methods are now inherited from BasePlayer
    // This ensures consistency across all player types

    /**
     * Play a complete game using random moves
     * This method provides backward compatibility with the existing GameRunner
     * while using the new BasePlayer architecture internally
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
                    // For multi-player states, pick a random player
                    const roles = rulesModule.roles || ['Persia', 'Greece'];
                    activePlayer = this.randomChoice(roles);
                }

                // Use the BasePlayer.executeTurn method for consistent behavior
                try {
                    gameState = await this.executeTurn(rulesModule, gameState, activePlayer);
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

            return finalResult;

        } catch (error) {
            this.logger.logError(error, { context: 'playGame' });
            throw error;
        }
    }

    // All utility methods are now inherited from BasePlayer
    // This ensures consistency across all player types
}

module.exports = { RandomPlayer };