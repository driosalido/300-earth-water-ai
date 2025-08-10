#!/usr/bin/env node

/**
 * PERSISTENT BRIDGE SERVER FOR 300: EARTH & WATER
 * 
 * This Node.js server provides a persistent interface between Python AI agents
 * and the Rally The Troops JavaScript game rules engine. It maintains game state
 * across multiple requests, enabling stateful gameplay.
 * 
 * Key Features:
 * - Persistent game state maintenance across multiple Python requests
 * - JSON line-based communication protocol (one JSON object per line)
 * - Direct integration with RTT rules.js for authentic game logic
 * - Comprehensive error handling and state validation
 * - Support for setup, state queries, and action execution
 * 
 * Communication Protocol:
 * - Input: JSON commands via stdin, one per line
 * - Output: JSON responses via stdout, one per line
 * - Commands: setup, state, action, quit
 * 
 * Architecture:
 * - Loads rules.js directly from RTT server installation
 * - Uses the same setup(), view(), action() pattern as RTT fuzzer
 * - Maintains game state in memory for the session lifetime
 * - Graceful cleanup on quit command or process termination
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * PersistentGameBridge - Main bridge class managing game state and RTT integration
 * 
 * This class provides the core functionality for interfacing with RTT game rules
 * while maintaining persistent state across multiple command invocations.
 */
class PersistentGameBridge {
    constructor() {
        // Core game state - null when no game is active
        this.gameState = null;
        
        // RTT rules engine - loaded from the actual RTT server installation
        this.gameRules = null;
        
        // Initialize the bridge by loading the rules engine
        this.initializeGame();
    }

    /**
     * Initialize the bridge by loading the 300: Earth & Water rules engine
     * 
     * This method:
     * - Locates the rules.js file from the RTT server installation  
     * - Clears require cache to ensure fresh rules loading
     * - Loads the rules module with setup(), view(), action() functions
     * - Validates successful loading before proceeding
     * 
     * @throws {Error} If rules.js cannot be found or loaded
     */
    initializeGame() {
        try {
            // Path to the actual RTT rules.js file - must match your RTT installation
            const rulesPath = path.join('/Users/driosalido/CloudFiles/Resilio/personal/git/rally-the-troops/server/public/300-earth-and-water/rules.js');
            
            // Validate that the rules file exists before attempting to load
            if (!fs.existsSync(rulesPath)) {
                throw new Error(`Rules file not found at: ${rulesPath}`);
            }

            // Clear require cache to ensure we get fresh rules on each startup
            // This is important for development when rules might change
            delete require.cache[require.resolve(rulesPath)];
            
            // Load the actual RTT rules engine - this gives us setup(), view(), action()
            this.gameRules = require(rulesPath);
            
            console.error('✅ Bridge server started');
        } catch (error) {
            console.error('❌ Failed to load game rules:', error.message);
            process.exit(1);
        }
    }

    /**
     * Initialize a new game using the RTT rules engine
     * 
     * This method calls the rules.setup() function which:
     * - Initializes the game board with starting positions
     * - Sets up initial resources (talents, armies, fleets)
     * - Determines starting player and game phase
     * - Creates the initial game log
     * 
     * @param {number|null} seed - Random seed for reproducible games (null for random)
     * @param {string} scenario - Game scenario name (default: "Standard")
     * @param {Object} options - Additional game options (default: {})
     * @returns {Object} Success response with game state or error response
     */
    setupNewGame(seed = null, scenario = "Standard", options = {}) {
        try {
            // Call the RTT rules setup function - same as RTT fuzzer pattern
            this.gameState = this.gameRules.setup(seed, scenario, options);
            
            return {
                success: true,
                gameState: this.getPublicGameState(),
                message: 'New game started'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to setup game'
            };
        }
    }

    /**
     * Extract public game state information for AI agents
     * 
     * This method:
     * - Gets the current game view using rules.view() for the active player
     * - Extracts key information needed for AI decision making
     * - Formats the state in a consistent, AI-friendly structure
     * - Handles errors gracefully with fallback information
     * 
     * The returned state includes:
     * - Current active player and game phase
     * - Available actions for the active player
     * - Victory points, campaign number, and game status
     * - Unit positions and game log for context
     * - All information needed for AI agents to make decisions
     * 
     * @returns {Object|null} Formatted game state object or null if no game active
     */
    getPublicGameState() {
        // Return null if no game has been initialized yet
        if (!this.gameState) return null;

        try {
            // Get the currently active player (Greece or Persia)
            const activePlayer = this.gameState.active;
            
            // Get the player-specific view from the rules engine
            // This respects hidden information - players only see what they should see
            const view = this.gameRules.view(this.gameState, activePlayer);
            
            // Return structured game state with all information needed for AI decisions
            return {
                // Core game control information
                active_player: activePlayer,
                game_state: this.gameState.state,
                game_over: this.gameState.state === 'game_over',
                
                // Game progress and scoring information
                phase: view.phase || 'unknown',
                campaign: view.campaign || 1,
                vp: view.vp || 0,
                
                // Player interaction information
                prompt: view.prompt || '',
                actions: view.actions || {},
                
                // Board state for strategic analysis
                units: view.units || {},
                
                // Game metadata and history
                seed: this.gameState.seed,
                log: this.gameState.log || []
            };
        } catch (error) {
            // If view generation fails, return error info and raw state for debugging
            return {
                error: error.message,
                raw_state: this.gameState
            };
        }
    }

    /**
     * Execute a player action using the RTT rules engine
     * 
     * This method:
     * - Validates that a game is currently active
     * - Calls rules.action() to process the action and update game state
     * - Returns updated game state or error information
     * - Maintains action history for logging and debugging
     * 
     * Action types in 300: Earth & Water include:
     * - 'draw': Draw cards during preparation phase
     * - 'city': Select cities for various purposes (build, move, attack)
     * - 'port': Select ports for fleet operations
     * - 'next': Advance to next phase/turn
     * - 'undo': Reverse last action (filtered out by Python clients for decisive gameplay)
     * - And many more depending on current game state
     * 
     * @param {string} player - Player making the action ('Greece' or 'Persia')
     * @param {string} action - Action type (see game rules for valid actions)
     * @param {*} arg - Action argument (city name, card ID, etc.) - optional
     * @returns {Object} Success response with updated state or error response
     */
    executeAction(player, action, arg = undefined) {
        // Validate that a game is currently active
        if (!this.gameState) {
            return {
                success: false,
                error: 'No active game',
                message: 'Game not initialized'
            };
        }

        try {
            // Execute the action using the RTT rules engine
            // This is the same pattern used by RTT fuzzer: rules.action(state, player, action, arg)
            this.gameState = this.gameRules.action(this.gameState, player, action, arg);
            
            return {
                success: true,
                gameState: this.getPublicGameState(),
                message: `Action executed: ${action}`,
                action_log: { player, action, arg }
            };
        } catch (error) {
            // If action fails, return error but keep the game state unchanged
            return {
                success: false,
                error: error.message,
                message: `Failed to execute action: ${action}`,
                action_log: { player, action, arg }
            };
        }
    }

    /**
     * Process incoming commands from Python clients
     * 
     * This is the main command dispatcher that handles all communication
     * from Python AI agents. Commands are JSON objects with 'cmd' and 'args'.
     * 
     * Supported Commands:
     * - setup: Initialize a new game
     * - state: Get current game state
     * - action: Execute a player action
     * - quit: Gracefully shutdown the server
     * 
     * @param {Object} command - Command object with 'cmd' field and optional 'args'
     * @returns {Object} Response object with success/error information
     */
    processCommand(command) {
        // Destructure command with default empty args object
        const { cmd, args = {} } = command;

        switch (cmd) {
            case 'setup':
                // Initialize a new game with optional seed, scenario, and options
                return this.setupNewGame(args.seed, args.scenario, args.options);
                
            case 'state':
                // Return current game state without making any changes
                return {
                    success: true,
                    gameState: this.getPublicGameState(),
                    message: 'Current game state'
                };
                
            case 'action':
                // Execute a player action (requires player, action, and optional arg)
                return this.executeAction(args.player, args.action, args.arg);
                
            case 'quit':
                // Gracefully shutdown the server
                console.error('Bridge server shutting down');
                process.exit(0);
                
            default:
                // Handle unknown commands with helpful error message
                return {
                    success: false,
                    error: `Unknown command: ${cmd}`,
                    message: 'Valid commands: setup, state, action, quit'
                };
        }
    }
}

/**
 * Main server function - sets up the persistent bridge server
 * 
 * This function:
 * - Creates a single persistent bridge instance for the session
 * - Sets up line-by-line JSON communication via stdin/stdout
 * - Processes commands and returns responses
 * - Handles graceful shutdown on input closure
 * 
 * Communication Protocol:
 * - Each line of input should be a valid JSON command object
 * - Each line of output is a JSON response object
 * - This enables simple, stateful communication with Python processes
 * - The bridge maintains game state across multiple command invocations
 */
function main() {
    // Create the persistent bridge instance - this lasts for the entire session
    const bridge = new PersistentGameBridge();
    
    // Set up readline interface for line-by-line JSON communication
    const rl = readline.createInterface({
        input: process.stdin,   // Read commands from stdin
        output: process.stdout, // Write responses to stdout (not used directly)
        terminal: false         // Disable terminal features - we want raw line processing
    });

    // Handle incoming command lines
    rl.on('line', (line) => {
        try {
            // Parse the incoming JSON command
            const command = JSON.parse(line.trim());
            
            // Process the command and get the response
            const result = bridge.processCommand(command);
            
            // Send JSON response back to Python client
            console.log(JSON.stringify(result));
        } catch (error) {
            // If JSON parsing fails, send error response
            console.log(JSON.stringify({
                success: false,
                error: error.message,
                message: 'Invalid JSON command'
            }));
        }
    });

    // Handle client disconnect or input closure
    rl.on('close', () => {
        console.error('Bridge server closing');
        process.exit(0);
    });
}

// Start the server if this file is run directly (not imported as module)
if (require.main === module) {
    main();
}

// Export the bridge class for potential use as a module
module.exports = PersistentGameBridge;