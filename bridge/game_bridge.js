#!/usr/bin/env node

/**
 * Simple JSON-based bridge between Python and Rally The Troops game engine
 * Based on the rtt-fuzzer interaction patterns
 */

const fs = require('fs');
const path = require('path');

class GameBridge {
    constructor() {
        this.gameState = null;
        this.gameRules = null;
        this.initializeGame();
    }

    initializeGame() {
        try {
            // Load the 300: Earth & Water rules from RTT server
            const rulesPath = path.join('/Users/driosalido/CloudFiles/Resilio/personal/git/rally-the-troops/server/public/300-earth-and-water/rules.js');
            
            if (!fs.existsSync(rulesPath)) {
                throw new Error(`Rules file not found at: ${rulesPath}`);
            }

            // Clear require cache to get fresh rules
            delete require.cache[require.resolve(rulesPath)];
            this.gameRules = require(rulesPath);
            
            console.error('✅ Game rules loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load game rules:', error.message);
            process.exit(1);
        }
    }

    setupNewGame(seed = null, scenario = "Standard", options = {}) {
        try {
            // Initialize game state using the same pattern as rtt-fuzzer
            this.gameState = this.gameRules.setup(seed, scenario, options);
            
            return {
                success: true,
                gameState: this.getPublicGameState(),
                message: 'New game started successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to setup game'
            };
        }
    }

    getPublicGameState() {
        if (!this.gameState) {
            return null;
        }

        try {
            // Get the active player
            const activePlayer = this.gameState.active;
            
            // Get the view for the active player (like rtt-fuzzer does)
            const view = this.gameRules.view(this.gameState, activePlayer);
            
            // Return structured game state
            return {
                // Core game state
                active_player: activePlayer,
                game_state: this.gameState.state,
                game_over: this.gameState.state === 'game_over',
                
                // View information
                phase: view.phase || 'unknown',
                campaign: view.campaign || 1,
                vp: view.vp || 0,
                prompt: view.prompt || '',
                actions: view.actions || {},
                
                // Game data
                units: view.units || {},
                
                // Additional info
                seed: this.gameState.seed,
                log: this.gameState.log || []
            };
        } catch (error) {
            console.error('Error getting game state:', error);
            return {
                error: error.message,
                raw_state: this.gameState
            };
        }
    }

    executeAction(player, action, arg = undefined) {
        if (!this.gameState) {
            return {
                success: false,
                error: 'No active game',
                message: 'Game not initialized'
            };
        }

        try {
            // Execute the action using RTT rules engine (same as rtt-fuzzer)
            this.gameState = this.gameRules.action(this.gameState, player, action, arg);
            
            return {
                success: true,
                gameState: this.getPublicGameState(),
                message: `Action executed: ${action}`,
                action_log: {
                    player: player,
                    action: action,
                    arg: arg
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Failed to execute action: ${action}`,
                action_log: {
                    player: player,
                    action: action,
                    arg: arg
                }
            };
        }
    }

    processCommand(command) {
        const { cmd, args = {} } = command;

        switch (cmd) {
            case 'setup':
                return this.setupNewGame(args.seed, args.scenario, args.options);
                
            case 'state':
                return {
                    success: true,
                    gameState: this.getPublicGameState(),
                    message: 'Current game state'
                };
                
            case 'action':
                return this.executeAction(args.player, args.action, args.arg);
                
            case 'actions':
                // Get available actions for current state
                if (!this.gameState) {
                    return {
                        success: false,
                        error: 'No active game',
                        message: 'Game not initialized'
                    };
                }
                
                try {
                    const view = this.gameRules.view(this.gameState, this.gameState.active);
                    return {
                        success: true,
                        actions: view.actions || {},
                        active_player: this.gameState.active,
                        message: 'Available actions'
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error.message,
                        message: 'Failed to get actions'
                    };
                }
                
            default:
                return {
                    success: false,
                    error: `Unknown command: ${cmd}`,
                    message: 'Valid commands: setup, state, action, actions'
                };
        }
    }
}

// Persistent bridge instance
let persistentBridge = null;

// Main execution with persistent state
function main() {
    if (!persistentBridge) {
        persistentBridge = new GameBridge();
    }
    
    // Read command from stdin
    process.stdin.setEncoding('utf8');
    
    let inputData = '';
    
    process.stdin.on('readable', () => {
        const chunk = process.stdin.read();
        if (chunk !== null) {
            inputData += chunk;
        }
    });
    
    process.stdin.on('end', () => {
        try {
            const command = JSON.parse(inputData.trim());
            const result = persistentBridge.processCommand(command);
            console.log(JSON.stringify(result, null, 2));
        } catch (error) {
            console.log(JSON.stringify({
                success: false,
                error: error.message,
                message: 'Invalid JSON command'
            }, null, 2));
        }
    });
}

if (require.main === module) {
    main();
}

module.exports = GameBridge;