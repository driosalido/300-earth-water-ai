"use strict";

/**
 * Unified logging system for RTT AI Agent
 * All game information (steps, states, decisions, errors) goes to a single log file per game
 * This makes it easy to follow a complete game from start to finish
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Clean, readable log format for unified game logs
 * Timestamp + level + message with compact metadata
 */
const gameLogFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }), // Shorter timestamp
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let output = `[${timestamp}] ${message}`;
        
        // Add metadata in a more compact format
        if (Object.keys(meta).length > 0) {
            // For step logs, show key info inline
            if (meta.step && meta.player && meta.action) {
                output += ` | Args: ${JSON.stringify(meta.args) || 'none'} | Time: ${meta.executionTime} | Available: [${meta.availableActions ? meta.availableActions.join(', ') : ''}]`;
            } else if (Object.keys(meta).length <= 3) {
                // Small metadata objects - show inline
                output += ' | ' + Object.entries(meta).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
            } else {
                // Large metadata - show formatted below
                output += '\n' + JSON.stringify(meta, null, 2);
            }
        }
        
        return output;
    })
);

/**
 * Create logger instance with single file per game
 * All game information goes to one unified log file
 */
function createLogger(options = {}) {
    const {
        logLevel = 'info',
        enableConsole = true,
        enableFile = true,
        gameId = 'default',
        gameUuid = null
    } = options;

    const transports = [];

    // Console transport for development
    if (enableConsole) {
        transports.push(new winston.transports.Console({
            level: logLevel,
            format: winston.format.combine(
                winston.format.colorize(),
                gameLogFormat
            )
        }));
    }

    // Single file transport - everything goes here
    if (enableFile) {
        // Use UUID as primary identifier, fallback to gameId
        const logFileName = gameUuid ? `game-${gameUuid}.log` : `${gameId}.log`;
        transports.push(new winston.transports.File({
            filename: path.join(logsDir, logFileName),
            level: 'silly',  // Capture everything
            format: gameLogFormat
        }));
    }

    return winston.createLogger({
        level: 'silly',  // Capture everything, filter at transport level
        transports: transports,
        exitOnError: false
    });
}

/**
 * Game-specific logging utilities
 * Provides structured logging methods for different game events
 */
class GameLogger {
    constructor(options = {}) {
        this.logger = createLogger(options);
        this.gameId = options.gameId || 'default';
        this.gameUuid = options.gameUuid || null;
        this.stepCounter = 0;
        this.startTime = Date.now();
        
        // Track game statistics
        this.stats = {
            totalSteps: 0,
            playerActions: {},
            gameStates: {},
            errors: []
        };
    }

    /**
     * Log game initialization
     */
    logGameStart(gameSetup) {
        this.logger.info('');
        this.logger.info('===============================================');
        this.logger.info(`GAME STARTED: ${this.gameId}`);
        this.logger.info(`Seed: ${gameSetup.seed} | Scenario: ${gameSetup.scenario} | Player: ${gameSetup.playerName}`);
        this.logger.info('===============================================');
        this.logger.info('');
    }

    /**
     * Log each game step with comprehensive state information
     */
    logGameStep(stepData) {
        if (!stepData) {
            this.logger.warn('logGameStep called with null/undefined stepData');
            return;
        }

        this.stepCounter++;
        this.stats.totalSteps = this.stepCounter;

        const {
            step,
            active,
            gameState,
            view,
            availableActions,
            selectedAction,
            actionArgs,
            stateAfterAction,
            executionTime
        } = stepData;

        // Update statistics
        if (!this.stats.playerActions[active]) {
            this.stats.playerActions[active] = 0;
        }
        this.stats.playerActions[active]++;

        if (!this.stats.gameStates[gameState]) {
            this.stats.gameStates[gameState] = 0;
        }
        this.stats.gameStates[gameState]++;

        // Main step log with all essential information
        this.logger.info(`STEP ${this.stepCounter}: ${active} in ${gameState} -> ${selectedAction}`, {
            step: this.stepCounter,
            player: active,
            gameState: gameState,
            action: selectedAction,
            args: actionArgs,
            executionTime: executionTime + 'ms',
            availableActions: availableActions ? Object.keys(availableActions) : []
        });

        // Detailed view information (debug level) 
        if (view && view.prompt) {
            this.logger.debug(`  Game Prompt: ${view.prompt}`);
        }
        
        // Game state changes (debug level)
        if (stateAfterAction && stateAfterAction.state !== gameState) {
            this.logger.info(`  State changed: ${gameState} -> ${stateAfterAction.state}`);
        }

        // Victory Points and Campaign tracking (always visible if present)
        if (stateAfterAction && typeof stateAfterAction.vp !== 'undefined') {
            this.logger.info(`  VP: ${stateAfterAction.vp}, Campaign: ${stateAfterAction.campaign || 1}`);
        }
    }

    /**
     * Log action selection process (now integrated into main step log)
     */
    logActionSelection(selectionData) {
        if (!selectionData) {
            this.logger.warn('logActionSelection called with null/undefined selectionData');
            return;
        }
        
        const { availableActions, selectedAction, selectedArgs, selectionReason } = selectionData;
        
        // Only log if we have additional detail beyond what's in the main step log
        if (selectionReason && selectionReason !== 'random_selection') {
            this.logger.debug(`  Selection reason: ${selectionReason}`, {
                availableOptions: availableActions ? Object.keys(availableActions).length : 0,
                chosen: selectedAction,
                args: selectedArgs
            });
        }
    }

    /**
     * Log game end with final statistics
     */
    logGameEnd(endData) {
        const gameTime = Date.now() - this.startTime;
        
        this.logger.info('');
        this.logger.info('===============================================');
        this.logger.info(`GAME ENDED: ${endData.result.toUpperCase()}`);
        this.logger.info(`Winner: ${endData.winner} | VP: ${endData.vp} | Campaign: ${endData.campaign}`);
        this.logger.info(`Total Steps: ${this.stats.totalSteps} | Game Time: ${Math.round(gameTime)}ms | Avg per Step: ${Math.round(gameTime / this.stats.totalSteps)}ms`);
        
        // Show action counts from playerActions instead of actionCounts
        if (this.stats.playerActions && Object.keys(this.stats.playerActions).length > 0) {
            this.logger.info(`Player Actions: ${Object.entries(this.stats.playerActions).map(([player, count]) => `${player}:${count}`).join(', ')}`);
        }
        
        // Show errors if any
        if (this.stats.errors && this.stats.errors.length > 0) {
            this.logger.info(`Errors: ${this.stats.errors.length}`);
        }
        
        this.logger.info('===============================================');
        this.logger.info('');
    }

    /**
     * Log errors with context
     */
    logError(error, context = {}) {
        const errorMsg = error ? error.message || String(error) : 'Unknown error';
        
        this.stats.errors.push({
            error: errorMsg,
            step: this.stepCounter,
            context: context,
            timestamp: new Date().toISOString()
        });

        this.logger.error(`❌ ERROR at step ${this.stepCounter}: ${errorMsg}`, {
            context: context,
            stack: error && error.stack ? error.stack : undefined
        });
    }

    /**
     * Log warnings (non-fatal issues)
     */
    logWarning(message, context = {}) {
        this.logger.warn(`⚠️  WARNING at step ${this.stepCounter}: ${message}`, {
            context: context
        });
    }

    /**
     * Log AI decision process (for future AI implementations)
     */
    logAIDecision(decisionData) {
        this.logger.debug('AI Decision Process', {
            step: this.stepCounter,
            ...decisionData
        });
    }

    /**
     * Sanitize view object for logging (remove sensitive or overly verbose data)
     */
    sanitizeViewForLogging(view) {
        if (!view) return null;

        const sanitized = { ...view };
        
        // Remove or truncate large arrays/objects that might clutter logs
        if (sanitized.log && sanitized.log.length > 10) {
            sanitized.log = [
                ...sanitized.log.slice(0, 5),
                `... [${sanitized.log.length - 10} more entries] ...`,
                ...sanitized.log.slice(-5)
            ];
        }

        return sanitized;
    }

    /**
     * Get current game statistics
     */
    getStats() {
        return {
            ...this.stats,
            gameTime: Date.now() - this.startTime,
            averageStepTime: (Date.now() - this.startTime) / this.stats.totalSteps
        };
    }
}

module.exports = {
    createLogger,
    GameLogger
};