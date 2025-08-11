"use strict";

/**
 * Game State Capture System
 * 
 * This module provides functionality to capture complete game states
 * when errors occur, allowing for detailed bug analysis and reproduction.
 */

const fs = require('fs');
const path = require('path');

class StateCaptureManager {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.captureDir = options.captureDir || './bug-captures';
        this.maxCaptureSize = options.maxCaptureSize || 10; // Keep last N captures
        this.gameId = options.gameId || 'unknown';
        this.gameUuid = options.gameUuid || null;
        
        // Ensure capture directory exists
        if (this.enabled && !fs.existsSync(this.captureDir)) {
            fs.mkdirSync(this.captureDir, { recursive: true });
        }
    }

    /**
     * Capture complete game state when an error occurs
     */
    captureErrorState(error, gameState, actionHistory, context = {}) {
        if (!this.enabled) {
            return null;
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const gameIdentifier = this.gameUuid || context.gameUuid || this.gameId || context.gameId || 'unknown';
            const filename = `bug-capture-${timestamp}-${gameIdentifier}.json`;
            const filepath = path.join(this.captureDir, filename);

            const captureData = {
                // Metadata
                captureTime: new Date().toISOString(),
                captureReason: 'Runtime error during game execution',
                context: context,
                
                // Error information
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    ...this.extractErrorDetails(error, gameState)
                },
                
                // Complete game state
                gameState: this.captureCompleteGameState(gameState),
                
                // Action history for reproduction
                actionHistory: this.sanitizeActionHistory(actionHistory),
                
                // Reproduction instructions
                reproduction: this.generateReproductionInstructions(
                    gameState, 
                    actionHistory, 
                    context
                ),
                
                // Analysis
                analysis: this.analyzeErrorCondition(error, gameState, context)
            };

            fs.writeFileSync(filepath, JSON.stringify(captureData, null, 2));
            
            // Clean up old captures
            this.cleanupOldCaptures();
            
            console.log(`\n🔍 Error state captured: ${filename}`);
            console.log(`📊 Analysis: ${captureData.analysis.errorType}`);
            
            return {
                success: true,
                filename: filename,
                filepath: filepath,
                analysis: captureData.analysis
            };
            
        } catch (captureError) {
            console.error('Failed to capture error state:', captureError.message);
            return { success: false, error: captureError.message };
        }
    }

    /**
     * Capture complete game state with all necessary information
     */
    captureCompleteGameState(gameState) {
        if (!gameState) return null;

        return {
            // Basic state
            state: gameState.state,
            active: gameState.active,
            campaign: gameState.campaign || 1,
            vp: gameState.vp || 0,
            seed: gameState.seed,
            
            // Movement context (critical for movement bugs)
            from: gameState.from,
            move_list: gameState.move_list ? JSON.parse(JSON.stringify(gameState.move_list)) : null,
            
            // Player states
            persian: this.capturePlayerState(gameState.persian),
            greek: this.capturePlayerState(gameState.greek),
            
            // Game board
            units: gameState.units ? JSON.parse(JSON.stringify(gameState.units)) : null,
            
            // Game history
            log: gameState.log ? [...gameState.log] : [],
            undo: gameState.undo ? this.captureUndoHistory(gameState.undo) : [],
            
            // Deck and cards
            deck: gameState.deck ? [...gameState.deck] : [],
            discard: gameState.discard ? [...gameState.discard] : [],
            
            // Game triggers and state
            trigger: gameState.trigger ? JSON.parse(JSON.stringify(gameState.trigger)) : null,
            
            // Additional state that might be relevant
            ...this.captureAdditionalState(gameState)
        };
    }

    /**
     * Capture player-specific state
     */
    capturePlayerState(playerState) {
        if (!playerState) return null;
        
        return {
            hand: [...(playerState.hand || [])],
            draw: playerState.draw || 0,
            pass: playerState.pass || 0,
            event: playerState.event || 0,
            battle_event: playerState.battle_event || 0,
            fleet_cost: playerState.fleet_cost
        };
    }

    /**
     * Capture undo history (truncated for size)
     */
    captureUndoHistory(undoHistory) {
        if (!undoHistory || !Array.isArray(undoHistory)) return [];
        
        // Keep last 5 undo states to avoid huge files
        const recentHistory = undoHistory.slice(-5);
        
        return recentHistory.map((undoState, index) => ({
            index: undoHistory.length - recentHistory.length + index,
            state: undoState.state,
            active: undoState.active,
            from: undoState.from,
            move_list: undoState.move_list ? Object.keys(undoState.move_list) : null,
            // Don't include full undo state to save space
            summary: `Undo state ${index + 1} - ${undoState.state}`
        }));
    }

    /**
     * Extract additional details from error
     */
    extractErrorDetails(error, gameState) {
        const details = {
            errorType: this.classifyError(error, gameState),
            stackLocation: this.extractStackLocation(error),
            gameContext: {
                state: gameState?.state,
                active: gameState?.active,
                from: gameState?.from
            }
        };

        // Special handling for Leonidas bug
        if (this.isLeonidasBug(error, gameState)) {
            details.leonidasBugDetails = this.analyzeLeonidasBug(gameState);
        }

        return details;
    }

    /**
     * Classify the type of error
     */
    classifyError(error, gameState) {
        if (error.message.includes("Cannot read properties of undefined") && 
            gameState?.state === 'greek_land_movement_leonidas') {
            return 'Leonidas movement bug';
        }
        
        if (error.message.includes("Cannot read properties of undefined")) {
            return 'Undefined property access';
        }
        
        if (error.message.includes("is not a function")) {
            return 'Function call error';
        }
        
        return 'Unknown error';
    }

    /**
     * Check if this is the specific Leonidas bug
     */
    isLeonidasBug(error, gameState) {
        return error.message.includes("Cannot read properties of undefined") && 
               (gameState?.state === 'greek_land_movement_leonidas' ||
                gameState?.state?.includes('leonidas'));
    }

    /**
     * Analyze Leonidas-specific bug conditions
     */
    analyzeLeonidasBug(gameState) {
        if (!gameState) return null;

        const analysis = {
            moveList: gameState.move_list ? Object.keys(gameState.move_list) : [],
            unitsKeys: gameState.units ? Object.keys(gameState.units) : [],
            problematicDestinations: [],
            validDestinations: []
        };

        // Check for inconsistencies between move_list and units
        if (gameState.move_list && gameState.units) {
            for (const destination of Object.keys(gameState.move_list)) {
                if (gameState.units[destination]) {
                    analysis.validDestinations.push({
                        city: destination,
                        units: gameState.units[destination]
                    });
                } else {
                    analysis.problematicDestinations.push(destination);
                }
            }
        }

        analysis.inconsistencyCount = analysis.problematicDestinations.length;
        analysis.isLikelyBugCondition = analysis.inconsistencyCount > 0;

        return analysis;
    }

    /**
     * Extract stack trace location
     */
    extractStackLocation(error) {
        if (!error.stack) return null;
        
        const lines = error.stack.split('\n');
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('rules.js')) {
                return line;
            }
        }
        
        return lines[1]?.trim() || null;
    }

    /**
     * Sanitize action history for JSON serialization
     */
    sanitizeActionHistory(actionHistory) {
        if (!actionHistory || !Array.isArray(actionHistory)) return [];
        
        return actionHistory.map(action => ({
            step: action.step || 0,
            action: action.action,
            args: action.args,
            player: action.player,
            preState: action.preState,
            postState: action.postState,
            timestamp: action.timestamp
        }));
    }

    /**
     * Generate reproduction instructions
     */
    generateReproductionInstructions(gameState, actionHistory, context) {
        const instructions = {
            setup: {
                seed: gameState?.seed || context.seed,
                scenario: context.scenario || 'Standard',
                options: context.options || {}
            },
            
            reproductionSteps: [
                '1. Use the captured seed to initialize the game',
                '2. Execute the action history in sequence',
                '3. The error should occur at the final recorded action',
                '4. Use the captured game state to analyze the bug condition'
            ],
            
            codeExample: this.generateReproductionCode(gameState, actionHistory, context),
            
            notes: [
                'Seed-based reproduction may vary if game rules have changed',
                'Use the captured game state for exact state reproduction',
                'Check the analysis section for specific bug conditions'
            ]
        };

        return instructions;
    }

    /**
     * Generate JavaScript reproduction code
     */
    generateReproductionCode(gameState, actionHistory, context) {
        let code = '// Bug Reproduction Code\n';
        code += 'const rules = require("./rules/300-earth-and-water/rules.js");\n\n';
        code += `// Setup game with seed ${gameState?.seed || 'unknown'}\n`;
        code += `let gameState = rules.setup(${gameState?.seed || 12345}, 'Standard', {});\n\n`;
        
        if (actionHistory && actionHistory.length > 0) {
            code += '// Execute action sequence:\n';
            actionHistory.slice(-10).forEach((action, index) => { // Last 10 actions
                const args = action.args !== undefined ? 
                    (typeof action.args === 'string' ? `'${action.args}'` : action.args) : '';
                const argsParam = args ? `, ${args}` : '';
                
                code += `gameState = rules.action(gameState, '${action.player}'` +
                       `, '${action.action}'${argsParam}); // Step ${action.step}\n`;
            });
        }
        
        code += '\n// Error should occur around this point\n';
        code += '// Check gameState.state, gameState.move_list, and gameState.units\n';
        
        return code;
    }

    /**
     * Analyze error condition
     */
    analyzeErrorCondition(error, gameState, context) {
        const analysis = {
            errorType: this.classifyError(error, gameState),
            severity: 'high', // All captured errors are considered high severity
            gameContext: {
                state: gameState?.state,
                campaign: gameState?.campaign,
                step: context.step
            },
            possibleCauses: this.identifyPossibleCauses(error, gameState),
            suggestedFixes: this.suggestFixes(error, gameState)
        };

        return analysis;
    }

    /**
     * Identify possible causes of the error
     */
    identifyPossibleCauses(error, gameState) {
        const causes = [];

        if (this.isLeonidasBug(error, gameState)) {
            causes.push('Leonidas event creates move_list with cities not in game.units');
            causes.push('Inconsistent city initialization between ROADS and units');
            causes.push('Missing validation in move_greek_army function');
        }

        if (error.message.includes("Cannot read properties of undefined")) {
            causes.push('Object property accessed before initialization');
            causes.push('Game state corruption during execution');
        }

        return causes;
    }

    /**
     * Suggest possible fixes
     */
    suggestFixes(error, gameState) {
        const fixes = [];

        if (this.isLeonidasBug(error, gameState)) {
            fixes.push('Add validation in move_greek_army to check if destination exists');
            fixes.push('Initialize all cities referenced in ROADS in game.units');
            fixes.push('Add consistency check between move_list and game.units');
        }

        fixes.push('Add defensive programming checks before accessing object properties');
        fixes.push('Validate game state consistency before critical operations');

        return fixes;
    }

    /**
     * Capture additional state that might be relevant
     */
    captureAdditionalState(gameState) {
        const additional = {};

        // Add any other relevant state properties
        const relevantProps = ['talents', 'built_fleets', 'land_movement', 'naval_movement'];
        
        for (const prop of relevantProps) {
            if (gameState[prop] !== undefined) {
                additional[prop] = gameState[prop];
            }
        }

        return additional;
    }

    /**
     * Clean up old capture files to prevent disk space issues
     */
    cleanupOldCaptures() {
        try {
            const files = fs.readdirSync(this.captureDir)
                .filter(file => file.startsWith('bug-capture-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(this.captureDir, file),
                    stats: fs.statSync(path.join(this.captureDir, file))
                }))
                .sort((a, b) => b.stats.mtime - a.stats.mtime);

            // Keep only the most recent captures
            if (files.length > this.maxCaptureSize) {
                const toDelete = files.slice(this.maxCaptureSize);
                for (const file of toDelete) {
                    fs.unlinkSync(file.path);
                }
                console.log(`🧹 Cleaned up ${toDelete.length} old capture files`);
            }
        } catch (error) {
            console.warn('Failed to cleanup old captures:', error.message);
        }
    }
}

module.exports = { StateCaptureManager };