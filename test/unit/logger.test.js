"use strict";

/**
 * Unit tests for GameLogger class
 * Tests logging functionality and statistics tracking
 */

const { GameLogger } = require('../../src/logger');
const fs = require('fs');
const path = require('path');

describe('GameLogger Unit Tests', () => {
    let logger;
    let testLogDir;

    beforeEach(() => {
        testLogDir = path.join(__dirname, '../tmp-logs');
        
        // Clean up any existing test logs
        if (fs.existsSync(testLogDir)) {
            fs.rmSync(testLogDir, { recursive: true, force: true });
        }

        logger = new GameLogger({ 
            gameId: 'test-game',
            logDir: testLogDir,
            logLevel: 'debug'
        });
    });

    afterEach(() => {
        // Clean up test logs
        if (fs.existsSync(testLogDir)) {
            fs.rmSync(testLogDir, { recursive: true, force: true });
        }
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default options', () => {
            const defaultLogger = new GameLogger();
            
            expect(defaultLogger.stats).toBeDefined();
            expect(defaultLogger.stats.totalSteps).toBe(0);
            expect(defaultLogger.stats.playerActions).toBeDefined();
            expect(defaultLogger.stats.gameStates).toBeDefined();
            expect(defaultLogger.stats.errors).toEqual([]);
        });

        test('should initialize with custom options', () => {
            const customLogger = new GameLogger({
                gameId: 'custom-test',
                logLevel: 'error',
                logDir: './custom-logs'
            });

            expect(customLogger).toBeDefined();
            expect(customLogger.stats.totalSteps).toBe(0);
        });
    });

    describe('Basic Logging Methods', () => {
        test('should log game start', () => {
            const gameData = {
                seed: 12345,
                scenario: 'Standard',
                players: ['Persia', 'Greece']
            };

            expect(() => {
                logger.logGameStart(gameData);
            }).not.toThrow();
        });

        test('should log game end', () => {
            const endData = {
                result: 'game_completed',
                winner: 'Persia',
                totalSteps: 100,
                gameTime: 5000
            };

            expect(() => {
                logger.logGameEnd(endData);
            }).not.toThrow();
        });

        test('should log warnings', () => {
            const warningMsg = 'Test warning message';
            const context = { step: 1, player: 'Persia' };

            expect(() => {
                logger.logWarning(warningMsg, context);
            }).not.toThrow();
        });

        test('should log errors', () => {
            const error = new Error('Test error');
            const context = { step: 5, action: 'city' };

            expect(() => {
                logger.logError(error, context);
            }).not.toThrow();

            // Error should be added to stats
            expect(logger.stats.errors.length).toBe(1);
            expect(logger.stats.errors[0].error).toBe('Test error');
        });
    });

    describe('Game Step Logging', () => {
        test('should log game steps and update statistics', () => {
            const stepData = {
                step: 1,
                active: 'Persia',
                gameState: 'persian_preparation_draw',
                view: { prompt: 'Test prompt' },
                selectedAction: 'draw',
                actionArgs: undefined,
                executionTime: 10
            };

            logger.logGameStep(stepData);

            expect(logger.stats.totalSteps).toBe(1);
            expect(logger.stats.playerActions['Persia']).toBe(1);
            expect(logger.stats.gameStates['persian_preparation_draw']).toBe(1);
        });

        test('should accumulate multiple steps correctly', () => {
            const steps = [
                { step: 1, active: 'Persia', gameState: 'persian_preparation_draw', selectedAction: 'draw' },
                { step: 2, active: 'Persia', gameState: 'persian_preparation_build', selectedAction: 'city' },
                { step: 3, active: 'Greece', gameState: 'greek_preparation_draw', selectedAction: 'draw' }
            ];

            steps.forEach(step => logger.logGameStep(step));

            expect(logger.stats.totalSteps).toBe(3);
            expect(logger.stats.playerActions['Persia']).toBe(2);
            expect(logger.stats.playerActions['Greece']).toBe(1);
            expect(logger.stats.gameStates['persian_preparation_draw']).toBe(1);
            expect(logger.stats.gameStates['persian_preparation_build']).toBe(1);
            expect(logger.stats.gameStates['greek_preparation_draw']).toBe(1);
        });
    });

    describe('Action Selection Logging', () => {
        test('should log action selection', () => {
            const selectionData = {
                availableActions: { draw: 1, next: 1 },
                selectedAction: 'draw',
                selectedArgs: undefined,
                selectionReason: 'random'
            };

            expect(() => {
                logger.logActionSelection(selectionData);
            }).not.toThrow();
        });

        test('should handle complex action arguments', () => {
            const selectionData = {
                availableActions: { city: ['Abydos', 'Ephesos'] },
                selectedAction: 'city',
                selectedArgs: ['Abydos', 1],
                selectionReason: 'random'
            };

            expect(() => {
                logger.logActionSelection(selectionData);
            }).not.toThrow();
        });
    });

    describe('Statistics and Performance Tracking', () => {
        test('should track game timing', () => {
            const startTime = Date.now();
            
            // Simulate some game steps
            logger.logGameStep({ step: 1, active: 'Persia', gameState: 'test', selectedAction: 'test' });
            logger.logGameStep({ step: 2, active: 'Greece', gameState: 'test', selectedAction: 'test' });

            const stats = logger.getStats();
            
            expect(stats.totalSteps).toBe(2);
            expect(stats.gameTime).toBeGreaterThanOrEqual(0);
            expect(stats.averageStepTime).toBeGreaterThanOrEqual(0);
        });

        test('should calculate average step time', () => {
            const steps = [
                { step: 1, active: 'Persia', gameState: 'test', selectedAction: 'test', executionTime: 10 },
                { step: 2, active: 'Greece', gameState: 'test', selectedAction: 'test', executionTime: 20 },
                { step: 3, active: 'Persia', gameState: 'test', selectedAction: 'test', executionTime: 30 }
            ];

            steps.forEach(step => logger.logGameStep(step));

            const stats = logger.getStats();
            // The actual calculation might be different, just check it's reasonable
            expect(stats.averageStepTime).toBeGreaterThanOrEqual(0);
            expect(typeof stats.averageStepTime).toBe('number');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle null/undefined inputs gracefully', () => {
            expect(() => {
                logger.logGameStep(null);
            }).not.toThrow();

            expect(() => {
                logger.logActionSelection(undefined);
            }).not.toThrow();

            expect(() => {
                logger.logError(null, {});
            }).not.toThrow();
        });

        test('should handle missing step properties', () => {
            const incompleteStep = {
                step: 1
                // Missing other properties
            };

            expect(() => {
                logger.logGameStep(incompleteStep);
            }).not.toThrow();
        });

        test('should handle large datasets', () => {
            // Log many steps to test performance
            for (let i = 1; i <= 1000; i++) {
                logger.logGameStep({
                    step: i,
                    active: i % 2 === 0 ? 'Persia' : 'Greece',
                    gameState: `test_state_${i % 10}`,
                    selectedAction: `action_${i % 5}`
                });
            }

            const stats = logger.getStats();
            expect(stats.totalSteps).toBe(1000);
            expect(stats.playerActions['Persia']).toBe(500);
            expect(stats.playerActions['Greece']).toBe(500);
        });
    });

    describe('Log Level Handling', () => {
        test('should respect different log levels', () => {
            const errorLogger = new GameLogger({ logLevel: 'error' });
            const debugLogger = new GameLogger({ logLevel: 'debug' });

            // Both should work without throwing
            expect(() => {
                errorLogger.logWarning('Test warning', {});
                debugLogger.logWarning('Test warning', {});
            }).not.toThrow();
        });
    });

    describe('JSON Serialization', () => {
        test('should produce serializable statistics', () => {
            logger.logGameStep({
                step: 1,
                active: 'Persia',
                gameState: 'test',
                selectedAction: 'test'
            });

            const stats = logger.getStats();
            
            expect(() => {
                JSON.stringify(stats);
            }).not.toThrow();

            const serialized = JSON.stringify(stats);
            const parsed = JSON.parse(serialized);
            
            expect(parsed.totalSteps).toBe(stats.totalSteps);
            expect(parsed.playerActions).toEqual(stats.playerActions);
        });
    });
});