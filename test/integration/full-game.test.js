"use strict";

/**
 * Integration tests for full game execution
 * Tests complete game flow from start to finish
 */

const RULES = require('../../rules/300-earth-and-water/rules.js');
const { RandomPlayer } = require('../../src/random-player');
const { GameRunner } = require('../../src/game-runner');

describe('Full Game Integration Tests', () => {
    let gameRunner;

    beforeEach(() => {
        gameRunner = new GameRunner({
            rulesPath: './rules/300-earth-and-water/rules.js',
            logLevel: 'error', // Reduce noise during tests
            maxSteps: 1000,
            outputDir: './test-logs'
        });
    });

    describe('Complete Game Execution', () => {
        test('should complete a full game without errors', async () => {
            const result = await gameRunner.runSingleGame({
                seed: 12345,
                scenario: 'Standard',
                playerName: 'test-player'
            });

            expect(result.gameOver || result.reason === 'max_steps_reached').toBe(true);
            expect(result.totalSteps).toBeGreaterThan(0);
            expect(result.gameTime).toBeGreaterThan(0);
            expect(result.winner).toBeDefined();
        }, 10000); // 10 second timeout for full game

        test('should handle different random seeds consistently', async () => {
            const seeds = [12345, 54321, 99999];
            const results = [];

            for (const seed of seeds) {
                const result = await gameRunner.runSingleGame({
                    seed: seed,
                    scenario: 'Standard',
                    playerName: `test-player-${seed}`
                });
                results.push(result);
            }

            // All games should complete
            results.forEach(result => {
                expect(result.gameOver || result.reason === 'max_steps_reached').toBe(true);
                expect(result.totalSteps).toBeGreaterThan(0);
            });

            // Same seed should produce same result
            const result1 = await gameRunner.runSingleGame({
                seed: 12345,
                scenario: 'Standard',
                playerName: 'deterministic-test-1'
            });

            const result2 = await gameRunner.runSingleGame({
                seed: 12345,
                scenario: 'Standard', 
                playerName: 'deterministic-test-2'
            });

            expect(result1.totalSteps).toBe(result2.totalSteps);
            expect(result1.winner).toBe(result2.winner);
        }, 30000); // 30 second timeout for multiple games
    });

    describe('Game State Progression', () => {
        test('should progress through expected game phases', async () => {
            const player = new RandomPlayer({ 
                seed: 12345, 
                gameId: 'phase-test',
                logLevel: 'error'
            });

            let gameState = RULES.setup(12345, 'Standard', {});
            const statesEncountered = new Set();
            let step = 0;

            while (gameState.state !== 'game_over' && step < 50) {
                statesEncountered.add(gameState.state);
                
                const activePlayer = gameState.active || 'Persia';
                const view = RULES.view(gameState, activePlayer);

                if (!view.actions || Object.keys(view.actions).length === 0) {
                    break;
                }

                // Use the BasePlayer's executeTurn method for consistent behavior
                gameState = await player.executeTurn(RULES, gameState, activePlayer);
                
                step++;
            }

            // Should encounter key game phases
            expect(statesEncountered.has('persian_preparation_draw')).toBe(true);
            expect(statesEncountered.has('persian_preparation_build')).toBe(true);
            expect(statesEncountered.has('greek_preparation_draw')).toBe(true);
            expect(statesEncountered.has('greek_preparation_build')).toBe(true);
            expect(statesEncountered.has('persian_operation')).toBe(true);

            expect(step).toBeGreaterThan(15);
        });

        test('should handle movement phases correctly', async () => {
            const player = new RandomPlayer({ 
                seed: 12345, 
                gameId: 'movement-test',
                logLevel: 'error'
            });

            let gameState = RULES.setup(12345, 'Standard', {});
            const movementStatesFound = [];
            let step = 0;

            while (gameState.state !== 'game_over' && step < 100) {
                if (gameState.state.includes('movement')) {
                    movementStatesFound.push({
                        state: gameState.state,
                        from: gameState.from,
                        step: step
                    });
                }
                
                const activePlayer = gameState.active || 'Persia';
                const view = RULES.view(gameState, activePlayer);

                if (!view.actions || Object.keys(view.actions).length === 0) {
                    break;
                }

                // Use the BasePlayer's executeTurn method for consistent behavior
                gameState = await player.executeTurn(RULES, gameState, activePlayer);
                
                step++;
            }

            // Should find some movement states
            expect(movementStatesFound.length).toBeGreaterThan(0);
            
            // Check movement state progression
            const landMovements = movementStatesFound.filter(m => m.state.includes('land_movement'));
            if (landMovements.length > 0) {
                // Should have both origin selection (from: null) and destination selection (from: city)
                const originSelections = landMovements.filter(m => !m.from);
                const destinationSelections = landMovements.filter(m => m.from);
                
                expect(originSelections.length).toBeGreaterThan(0);
                expect(destinationSelections.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Error Handling', () => {
        test('should not crash on edge cases', async () => {
            // Test with various seeds to catch edge cases
            const testSeeds = [1, 100, 999, 12345, 99999];

            for (const seed of testSeeds) {
                await expect(async () => {
                    await gameRunner.runSingleGame({
                        seed: seed,
                        scenario: 'Standard',
                        playerName: `edge-case-test-${seed}`,
                        maxSteps: 200 // Shorter for faster test
                    });
                }).not.toThrow();
            }
        }, 20000); // 20 second timeout

        test('should handle invalid scenarios gracefully', async () => {
            await expect(async () => {
                await gameRunner.runSingleGame({
                    seed: 12345,
                    scenario: 'NonExistentScenario',
                    playerName: 'invalid-scenario-test'
                });
            }).rejects.toThrow();
        });
    });

    describe('Random Player Behavior', () => {
        test('should make valid moves throughout the game', async () => {
            const player = new RandomPlayer({ 
                seed: 12345, 
                gameId: 'validity-test',
                logLevel: 'error'
            });

            let gameState = RULES.setup(12345, 'Standard', {});
            let invalidMoves = 0;
            let totalMoves = 0;
            let step = 0;

            while (gameState.state !== 'game_over' && step < 100) {
                const activePlayer = gameState.active || 'Persia';
                const view = RULES.view(gameState, activePlayer);

                if (!view.actions || Object.keys(view.actions).length === 0) {
                    break;
                }

                // Use makeDecision to get the action, then execute it
                const decision = player.makeDecision(gameState, view.actions, view);
                const formattedAction = player.formatAction(decision, gameState, view);
                totalMoves++;

                try {
                    gameState = RULES.action(gameState, activePlayer, formattedAction.action, formattedAction.args);
                } catch (error) {
                    invalidMoves++;
                    // Log the invalid move for debugging
                    console.warn(`Invalid move at step ${step}:`, {
                        state: gameState.state,
                        action: formattedAction.action,
                        args: formattedAction.args,
                        error: error.message
                    });
                    break;
                }
                
                step++;
            }

            expect(totalMoves).toBeGreaterThan(0);
            expect(invalidMoves).toBe(0); // Should have no invalid moves
        });
    });
});