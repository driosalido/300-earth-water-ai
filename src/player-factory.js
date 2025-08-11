"use strict";

/**
 * Player Factory for RTT AI Agent
 * 
 * Provides a centralized way to create different types of players
 * with consistent configuration and validation.
 */

const { RandomPlayer } = require('./random-player');
const { InteractivePlayer } = require('./interactive-player');

/**
 * Player Factory Class
 * Creates player instances based on type and configuration
 */
class PlayerFactory {
    /**
     * Available player types and their constructors
     */
    static get PLAYER_TYPES() {
        return {
            'random': RandomPlayer,
            'interactive': InteractivePlayer,
            'human': InteractivePlayer,  // Alias for interactive
            // Future player types will be added here:
            // 'heuristic': HeuristicPlayer,
            // 'mcts': MCTSPlayer,
            // 'neural': NeuralNetworkPlayer
        };
    }

    /**
     * Get list of available player types
     */
    static getAvailableTypes() {
        return Object.keys(PlayerFactory.PLAYER_TYPES);
    }

    /**
     * Create a player instance
     * 
     * @param {string} type - Type of player to create ('random', 'heuristic', etc.)
     * @param {Object} options - Configuration options for the player
     * @returns {BasePlayer} Player instance extending BasePlayer
     */
    static create(type, options = {}) {
        // Validate player type
        if (!type || typeof type !== 'string') {
            throw new Error('Player type must be a non-empty string');
        }

        const normalizedType = type.toLowerCase();
        const PlayerClass = PlayerFactory.PLAYER_TYPES[normalizedType];

        if (!PlayerClass) {
            const availableTypes = PlayerFactory.getAvailableTypes();
            throw new Error(`Unknown player type: ${type}. Available types: ${availableTypes.join(', ')}`);
        }

        // Set default name based on type if not provided
        const playerOptions = {
            name: `${type.charAt(0).toUpperCase() + type.slice(1)}Player`,
            gameId: `${type}-game-${Date.now()}`,
            ...options
        };

        // Create and return player instance
        try {
            const player = new PlayerClass(playerOptions);
            
            // Validate that the player extends BasePlayer (has required methods)
            if (typeof player.makeDecision !== 'function') {
                throw new Error(`Player type ${type} does not implement required makeDecision() method`);
            }
            
            if (typeof player.executeTurn !== 'function') {
                throw new Error(`Player type ${type} does not extend BasePlayer (missing executeTurn method)`);
            }

            return player;

        } catch (error) {
            throw new Error(`Failed to create ${type} player: ${error.message}`);
        }
    }

    /**
     * Create multiple players of different types for tournaments
     * 
     * @param {Array} playerConfigs - Array of {type, options} objects
     * @returns {Array} Array of player instances
     */
    static createMultiple(playerConfigs) {
        if (!Array.isArray(playerConfigs) || playerConfigs.length === 0) {
            throw new Error('playerConfigs must be a non-empty array');
        }

        return playerConfigs.map((config, index) => {
            if (!config || typeof config !== 'object') {
                throw new Error(`Player config at index ${index} must be an object`);
            }

            const { type, ...options } = config;
            
            // Add index to gameId for uniqueness
            const playerOptions = {
                ...options,
                gameId: `${type}-player-${index}-${Date.now()}`
            };

            return PlayerFactory.create(type, playerOptions);
        });
    }

    /**
     * Validate player configuration
     */
    static validateConfig(config) {
        const errors = [];

        if (!config.type) {
            errors.push('Player type is required');
        } else if (!PlayerFactory.PLAYER_TYPES[config.type.toLowerCase()]) {
            errors.push(`Invalid player type: ${config.type}`);
        }

        // Validate common options
        if (config.seed !== undefined && (typeof config.seed !== 'number' || config.seed < 0)) {
            errors.push('Seed must be a non-negative number');
        }

        if (config.maxSteps !== undefined && (typeof config.maxSteps !== 'number' || config.maxSteps < 1)) {
            errors.push('maxSteps must be a positive number');
        }

        if (config.logLevel !== undefined && typeof config.logLevel !== 'string') {
            errors.push('logLevel must be a string');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get default configuration for a player type
     */
    static getDefaultConfig(type) {
        const normalizedType = type.toLowerCase();
        
        if (!PlayerFactory.PLAYER_TYPES[normalizedType]) {
            throw new Error(`Unknown player type: ${type}`);
        }

        const baseConfig = {
            type: normalizedType,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)}Player`,
            seed: Math.floor(Math.random() * 1000000),
            logLevel: 'info',
            maxSteps: 10000,
            avoidUndo: true
        };

        // Type-specific defaults
        switch (normalizedType) {
            case 'random':
                return {
                    ...baseConfig,
                    // Random player has no special config
                };
            
            case 'interactive':
            case 'human':
                return {
                    ...baseConfig,
                    name: 'Human Player',
                    avoidUndo: false,  // Humans can use undo
                    logLevel: 'warn'   // Less logging for interactive play
                };
            
            // Future player types will have their specific defaults here
            // case 'heuristic':
            //     return {
            //         ...baseConfig,
            //         difficulty: 'medium',
            //         evaluationDepth: 3
            //     };

            default:
                return baseConfig;
        }
    }
}

module.exports = { PlayerFactory };