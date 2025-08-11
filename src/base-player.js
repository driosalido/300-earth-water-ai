"use strict";

/**
 * Abstract Base Player Class for RTT AI Agent
 * 
 * This class provides the common functionality that all player types need:
 * - Game mechanics (movement formatting, action validation, etc.)
 * - Statistics tracking  
 * - Game state utilities
 * - Template method for turn execution
 * 
 * Each specific player type (Random, Heuristic, MCTS, etc.) extends this class
 * and implements the makeDecision() method with their specific strategy.
 * 
 * ARCHITECTURE GOAL:
 * Separate game mechanics (how to interact with the game) from decision making 
 * (what move to choose). This ensures consistency across all players and 
 * eliminates code duplication.
 */

const { v4: uuidv4 } = require('uuid');
const { GameLogger } = require('./logger');
const { StateCaptureManager } = require('./state-capture');

/**
 * Abstract Base Player Class
 * 
 * Provides common functionality for all player types while requiring
 * each player to implement their specific decision-making logic.
 */
class BasePlayer {
    constructor(options = {}) {
        this.name = options.name || this.constructor.name;
        this.gameUuid = options.gameUuid || uuidv4();
        this.gameId = options.gameId || `game-${this.gameUuid.substring(0, 8)}`;
        this.logger = new GameLogger({ gameId: this.gameId, gameUuid: this.gameUuid, ...options });
        
        // Random number generation (seeded for reproducibility)
        this.seed = options.seed || Math.floor(Math.random() * 1000000);
        this.rng = this.seed;
        
        // Player configuration
        this.config = {
            avoidUndo: options.avoidUndo !== false,
            logLevel: options.logLevel || 'info',
            maxSteps: options.maxSteps || 10000,
            stepDelay: options.stepDelay || 0,
            enableStateCapture: options.enableStateCapture !== false,
            ...options.config
        };
        
        // State capture system
        this.stateCapture = new StateCaptureManager({
            enabled: this.config.enableStateCapture,
            gameId: this.gameId,
            gameUuid: this.gameUuid,
            captureDir: options.captureDir || './bug-captures'
        });
        
        // Game state tracking  
        this.gameStats = {
            startTime: null,
            endTime: null,
            totalSteps: 0,
            actionCounts: {},
            stateCounts: {},
            errors: []
        };
        
        // Action history for state capture
        this.actionHistory = [];
        
        this.logger.logger.info('Player Initialized', {
            name: this.name,
            type: this.constructor.name,
            gameUuid: this.gameUuid,
            gameId: this.gameId,
            seed: this.seed,
            config: this.config
        });
    }

    /**
     * Filter out actions that AI agents should not use
     * Currently removes 'undo' action to prevent agents from undoing moves
     */
    filterActions(actions) {
        if (!this.config.avoidUndo) {
            return actions;
        }
        
        const filtered = {};
        for (const [action, value] of Object.entries(actions)) {
            if (action !== 'undo') {
                filtered[action] = value;
            }
        }
        return filtered;
    }

    /**
     * Abstract method - each player type must implement this
     * 
     * @param {Object} gameState - Current game state
     * @param {Object} availableActions - Available actions from the game view (already filtered)
     * @param {Object} view - Complete game view for the active player
     * @returns {Object} Selected action with format { action: string, args: any }
     */
    makeDecision(gameState, availableActions, view) {
        throw new Error(`${this.constructor.name} must implement makeDecision() method`);
    }

    // ===================================================================
    // SHARED GAME MECHANICS - Used by all player types
    // ===================================================================

    /**
     * Template method that orchestrates a complete turn
     * This is the main interface used by GameRunner
     */
    async executeTurn(rules, gameState, activePlayer, step = 0) {
        const actionRecord = {
            step: step,
            player: activePlayer,
            timestamp: new Date().toISOString(),
            preState: gameState.state,
            preActive: gameState.active
        };

        try {
            // Get game view for active player
            const view = rules.view(gameState, activePlayer);
            
            // Check for game over or invalid states
            if (gameState.state === 'game_over') {
                return gameState;
            }

            if (view.prompt && view.prompt.startsWith("Unknown state:")) {
                throw new Error(`Unknown game state: ${gameState.state}`);
            }

            // Check for available actions
            if (!view.actions || Object.keys(view.actions).length === 0) {
                throw new Error(`No actions available in state: ${gameState.state}`);
            }

            // Filter out undo action if configured to avoid it
            const filteredActions = this.filterActions(view.actions);

            // Let the specific player make a decision (may be async for interactive players)
            const decision = await this.makeDecision(gameState, filteredActions, view);
            
            // Format the action using shared game mechanics
            const formattedAction = this.formatAction(decision, gameState, view);
            
            // Record action details for state capture
            actionRecord.action = formattedAction.action;
            actionRecord.args = formattedAction.args;
            actionRecord.availableActions = Object.keys(filteredActions);
            actionRecord.decision = decision;
            
            // Log the action selection (showing filtered actions)
            this.logger.logActionSelection({
                availableActions: filteredActions,
                selectedAction: formattedAction.action,
                selectedArgs: formattedAction.args,
                selectionReason: decision.reason || 'player_decision'
            });

            // Execute the action and measure time
            const actionStartTime = Date.now();
            const newGameState = rules.action(
                gameState, 
                activePlayer, 
                formattedAction.action, 
                formattedAction.args
            );
            const executionTime = Date.now() - actionStartTime;

            // Record successful action
            actionRecord.postState = newGameState.state;
            actionRecord.postActive = newGameState.active;
            actionRecord.success = true;
            actionRecord.executionTime = executionTime;
            
            // Add to action history for state capture
            this.actionHistory.push(actionRecord);
            
            // Keep action history to reasonable size (last 50 actions)
            if (this.actionHistory.length > 50) {
                this.actionHistory = this.actionHistory.slice(-50);
            }

            // Update statistics
            this.updateGameStats(activePlayer, gameState.state, formattedAction.action);
            
            // Log the complete game step (showing filtered actions)
            this.logger.logGameStep({
                step: this.gameStats.totalSteps + 1,
                active: activePlayer,
                gameState: gameState.state,
                view: view,
                availableActions: filteredActions,
                selectedAction: formattedAction.action,
                actionArgs: formattedAction.args,
                stateAfterAction: newGameState,
                executionTime: executionTime
            });

            return newGameState;

        } catch (error) {
            // Record failed action
            actionRecord.success = false;
            actionRecord.error = error.message;
            this.actionHistory.push(actionRecord);
            
            // Capture state for error analysis
            const captureResult = this.stateCapture.captureErrorState(
                error, 
                gameState, 
                this.actionHistory, 
                {
                    gameId: this.gameId,
                    gameUuid: this.gameUuid,
                    playerName: this.name,
                    playerType: this.constructor.name,
                    seed: this.seed,
                    step: step,
                    scenario: 'Standard',
                    activePlayer: activePlayer,
                    lastAction: actionRecord
                }
            );
            
            // Update game stats
            this.gameStats.errors.push({
                step: step,
                error: error.message,
                gameState: gameState.state,
                activePlayer: activePlayer,
                captureResult: captureResult,
                timestamp: new Date().toISOString()
            });
            
            this.logger.logError(error, {
                activePlayer: activePlayer,
                gameState: gameState.state,
                context: 'executeTurn',
                step: step,
                captureResult: captureResult
            });
            
            throw error;
        }
    }

    /**
     * Format an action decision into the correct format for the game rules
     * Handles the complex logic of movement phases, argument formatting, etc.
     */
    formatAction(decision, gameState, view) {
        const { action, args } = decision;
        
        // Handle movement phases with special formatting requirements
        if (this.isMovementPhase(gameState) && (action === 'city' || action === 'port')) {
            return this.formatMovementAction(action, args, gameState, view);
        }
        
        // For non-movement actions, pass through as-is
        return { action, args };
    }

    /**
     * Format movement actions (city/port) based on game phase
     * This handles the complex logic we debugged in Phase 1
     */
    formatMovementAction(action, args, gameState, view) {
        // Origin selection: just pass the city/port name
        if (this.isSelectingMovementOrigin(gameState)) {
            return {
                action: action,
                args: args
            };
        }
        
        // If args is already an array (from InteractivePlayer), use it as-is
        if (Array.isArray(args)) {
            return {
                action: action,
                args: args
            };
        }
        
        // Otherwise, args is just the destination (from RandomPlayer or other AI)
        const destination = args;
        
        // Destination selection: need to include unit counts
        if (action === 'city') {
            // Land movement: [destination, armies]
            const availableArmies = this.getAvailableArmiesForMovement(gameState, action);
            const armiesToMove = this.selectArmiesToMove(availableArmies);
            return {
                action: action,
                args: [destination, armiesToMove]
            };
        } else if (action === 'port') {
            // Naval movement: [destination, fleets, armies]
            const availableFleets = this.getAvailableFleetsForMovement(gameState);
            const availableArmies = this.getAvailableArmiesForMovement(gameState, action);
            
            const fleetsToMove = this.selectFleetsToMove(availableFleets);
            const maxTransportableArmies = Math.min(availableArmies, fleetsToMove); // Can't transport more armies than fleets
            const armiesToTransport = this.selectArmiesToTransport(maxTransportableArmies);
            
            return {
                action: action,
                args: [destination, fleetsToMove, armiesToTransport]
            };
        }
        
        // Fallback
        return { action, args: destination };
    }

    // ===================================================================
    // GAME STATE UTILITIES - Shared by all players
    // ===================================================================

    /**
     * Check if the current game state is a movement phase
     */
    isMovementPhase(gameState) {
        if (!gameState || !gameState.state) return false;
        
        const state = gameState.state;
        return state.includes('land_movement') || 
               state.includes('naval_movement') || 
               (state.includes('movement') && !state.includes('preparation'));
    }

    /**
     * Check if we're selecting movement origin (vs destination)
     */
    isSelectingMovementOrigin(gameState) {
        if (!gameState || !gameState.state) return false;
        
        const state = gameState.state;
        return (state === 'persian_movement' || state === 'greek_movement') && !gameState.from;
    }

    /**
     * Get available armies for movement from the current location
     */
    getAvailableArmiesForMovement(gameState, actionType) {
        if (!gameState || !gameState.from || !gameState.units) {
            return 1; // Default fallback
        }

        const fromCity = gameState.from;
        const units = gameState.units[fromCity];
        
        if (!units || !Array.isArray(units)) {
            return 1; // Fallback
        }

        // Determine army type based on game state
        if (actionType === 'city') {
            // Land movement - check for armies
            if (gameState.state.includes('persian')) {
                return units[1] || 0; // Persian armies at index 1
            } else if (gameState.state.includes('greek')) {
                return units[0] || 0; // Greek armies at index 0
            }
        } else if (actionType === 'port') {
            // Naval movement - armies that can be transported
            if (gameState.state.includes('persian')) {
                return units[1] || 0; // Persian armies at index 1
            } else if (gameState.state.includes('greek')) {
                return units[0] || 0; // Greek armies at index 0
            }
        }

        return 1; // Safe default
    }

    /**
     * Get available fleets for naval movement
     */
    getAvailableFleetsForMovement(gameState) {
        if (!gameState || !gameState.from || !gameState.units) {
            return 1; // Default fallback
        }

        const fromCity = gameState.from;
        const units = gameState.units[fromCity];
        
        if (!units || !Array.isArray(units)) {
            return 1; // Fallback
        }

        // Check for fleets based on player
        if (gameState.state.includes('persian')) {
            return units[3] || 0; // Persian fleets at index 3
        } else if (gameState.state.includes('greek')) {
            return units[2] || 0; // Greek fleets at index 2
        }

        return 1; // Safe default
    }

    /**
     * Select how many armies to move (default: all available)
     * Can be overridden by specific player types for different strategies
     */
    selectArmiesToMove(availableArmies) {
        if (availableArmies <= 0) return 0;
        if (availableArmies === 1) return 1;
        
        // Default strategy: move random number between 1 and all available
        return this.random(availableArmies) + 1;
    }

    /**
     * Select how many fleets to move (default: all available)
     * Can be overridden by specific player types for different strategies
     */
    selectFleetsToMove(availableFleets) {
        if (availableFleets <= 0) return 0;
        if (availableFleets === 1) return 1;
        
        // Default strategy: move random number between 1 and all available
        return this.random(availableFleets) + 1;
    }

    /**
     * Select how many armies to transport with fleets
     * Can be overridden by specific player types for different strategies
     */
    selectArmiesToTransport(maxTransportableArmies) {
        if (maxTransportableArmies <= 0) return 0;
        if (maxTransportableArmies === 1) return 1;
        
        // Default strategy: transport random number between 0 and max available
        return this.random(maxTransportableArmies + 1);
    }

    /**
     * Determine the type of action for logging/debugging
     */
    getActionType(action, value, gameState) {
        if (!gameState) return 'unknown';
        
        const state = gameState.state;
        
        // Building/preparation phases
        if (state.includes('preparation_build')) {
            if (action === 'city' || action === 'port') {
                return 'build_unit';
            }
            return 'build_phase';
        }
        
        // Movement phases
        if (state.includes('movement') || state.includes('land_movement') || state.includes('naval_movement')) {
            if (action === 'city' || action === 'port') {
                return 'move_destination';
            }
            return 'movement_phase';
        }
        
        // Draw phases
        if (state.includes('draw')) {
            return 'draw_phase';
        }
        
        // Operation phases
        if (state.includes('operation')) {
            return 'operation_phase';
        }
        
        // Simple actions
        if (typeof value === 'number' && value === 1) {
            return 'simple_action';
        }
        
        // Actions with arguments
        if (Array.isArray(value)) {
            return 'choice_action';
        }
        
        return 'other';
    }

    // ===================================================================
    // SHARED UTILITIES - Random number generation, statistics, etc.
    // ===================================================================

    /**
     * Seeded random number generator (Linear Congruential Generator)
     * Same approach as the RTT rules for consistency
     */
    random(n) {
        this.rng = (this.rng * 48271) % 0x7fffffff;
        return Math.floor((this.rng / 0x7fffffff) * n);
    }

    /**
     * Select a random element from an array
     */
    randomChoice(array) {
        if (!array || array.length === 0) {
            throw new Error('Cannot make random choice from empty array');
        }
        return array[this.random(array.length)];
    }

    /**
     * Update internal game statistics
     */
    updateGameStats(player, gameState, action) {
        // Count actions by type
        if (!this.gameStats.actionCounts[action]) {
            this.gameStats.actionCounts[action] = 0;
        }
        this.gameStats.actionCounts[action]++;

        // Count game states  
        if (!this.gameStats.stateCounts[gameState]) {
            this.gameStats.stateCounts[gameState] = 0;
        }
        this.gameStats.stateCounts[gameState]++;
    }

    /**
     * Determine game winner from final state
     */
    determineWinner(gameState) {
        if (gameState.state !== 'game_over') {
            return 'unknown';
        }
        
        // In 300: Earth & Water, winner is determined by VP
        if (gameState.vp > 0) {
            return 'Persia';
        } else if (gameState.vp < 0) {
            return 'Greece';
        } else {
            return 'tie';
        }
    }

    /**
     * Get current game statistics
     */
    getGameStats() {
        return {
            ...this.gameStats,
            currentTime: Date.now(),
            loggerStats: this.logger.getStats()
        };
    }

    /**
     * Utility function for delays (if needed by specific players)
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { BasePlayer };