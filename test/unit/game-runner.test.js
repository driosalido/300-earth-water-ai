"use strict";

/**
 * Unit tests for GameRunner class
 * Tests game orchestration and batch processing
 */

const { GameRunner } = require('../../src/game-runner');
const fs = require('fs');
const path = require('path');

describe('GameRunner Unit Tests', () => {
    let gameRunner;
    let testOutputDir;

    beforeEach(() => {
        testOutputDir = path.join(__dirname, '../tmp-output');
        
        // Clean up any existing test output
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }

        gameRunner = new GameRunner({
            rulesPath: './rules/300-earth-and-water/rules.js',
            logLevel: 'error', // Reduce noise during tests
            maxSteps: 100, // Shorter for faster tests
            outputDir: testOutputDir
        });
    });

    afterEach(() => {
        // Clean up test output
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default configuration', () => {
            const defaultRunner = new GameRunner();
            
            expect(defaultRunner).toBeDefined();
            expect(defaultRunner.config.rulesPath).toBe('./rules/300-earth-and-water/rules.js');
            expect(defaultRunner.config.logLevel).toBe('info');
            expect(defaultRunner.config.maxSteps).toBe(10000);
        });

        test('should initialize with custom configuration', () => {
            const config = {
                rulesPath: './custom/rules.js',
                logLevel: 'debug',
                maxSteps: 500,
                outputDir: './custom-output'
            };

            const customRunner = new GameRunner(config);
            
            expect(customRunner.config.rulesPath).toBe('./custom/rules.js');
            expect(customRunner.config.logLevel).toBe('debug');
            expect(customRunner.config.maxSteps).toBe(500);
            expect(customRunner.config.outputDir).toBe('./custom-output');
        });

        test('should load rules module correctly', () => {
            expect(gameRunner.rules).toBeDefined();
            expect(typeof gameRunner.rules.setup).toBe('function');
            expect(typeof gameRunner.rules.action).toBe('function');
            expect(typeof gameRunner.rules.view).toBe('function');
        });
    });

    describe('Single Game Execution', () => {
        test('should run a single game successfully', async () => {
            const gameOptions = {
                seed: 12345,
                scenario: 'Standard',
                playerName: 'test-player'
            };

            const result = await gameRunner.runSingleGame(gameOptions);

            expect(result).toBeDefined();
            expect(result.gameOver || result.reason === 'max_steps_reached').toBe(true);
            expect(result.totalSteps).toBeGreaterThan(0);
            expect(result.gameTime).toBeGreaterThan(0);
            expect(result.winner).toBeDefined();
            expect(result.finalState).toBeDefined();
        }, 10000); // 10 second timeout

        test('should handle different game scenarios', async () => {
            const scenarios = ['Standard'];

            for (const scenario of scenarios) {
                const result = await gameRunner.runSingleGame({
                    seed: 12345,
                    scenario: scenario,
                    playerName: `test-${scenario.toLowerCase()}`
                });

                expect(result.totalSteps).toBeGreaterThan(0);
            }
        });

        test('should produce consistent results with same seed', async () => {
            const seed = 54321;
            const options = {
                seed: seed,
                scenario: 'Standard',
                playerName: 'consistency-test'
            };

            const result1 = await gameRunner.runSingleGame(options);
            const result2 = await gameRunner.runSingleGame(options);

            expect(result1.totalSteps).toBe(result2.totalSteps);
            expect(result1.winner).toBe(result2.winner);
            expect(result1.finalState.vp).toBe(result2.finalState.vp);
        }, 15000); // 15 second timeout
    });

    describe('Batch Game Execution', () => {
        test('should run multiple games in batch', async () => {
            const batchOptions = {
                gameCount: 3,
                seed: 12345,
                scenario: 'Standard'
            };

            const results = await gameRunner.runBatch(batchOptions);

            expect(results.games).toHaveLength(3);
            expect(results.summary.totalGames).toBe(3);
            expect(results.summary.completedGames).toBeGreaterThan(0);
            
            results.games.forEach(game => {
                expect(game.result.totalSteps).toBeGreaterThan(0);
            });
        }, 20000); // 20 second timeout

        test('should generate game statistics', async () => {
            const batchOptions = {
                gameCount: 5,
                scenario: 'Standard'
            };

            const results = await gameRunner.runBatch(batchOptions);

            expect(results.summary.totalGames).toBe(5);
            expect(results.summary.averageSteps).toBeGreaterThan(0);
            expect(results.summary.averageGameTime).toBeGreaterThan(0);
            expect(results.summary.winners).toBeDefined();
        }, 30000); // 30 second timeout

        test('should handle different seed strategies', async () => {
            // Test with fixed seed
            const fixedSeedResults = await gameRunner.runBatch({
                gameCount: 2,
                seed: 12345,
                scenario: 'Standard'
            });

            expect(fixedSeedResults.games[0].seed).toBe(12345);
            expect(fixedSeedResults.games[1].seed).toBe(12345);

            // Test with random seeds (no seed specified)
            const randomSeedResults = await gameRunner.runBatch({
                gameCount: 2,
                scenario: 'Standard'
            });

            // Seeds might be different (unless by coincidence)
            expect(randomSeedResults.games[0].seed).toBeDefined();
            expect(randomSeedResults.games[1].seed).toBeDefined();
        }, 20000);
    });

    describe('Error Handling', () => {
        test('should handle invalid game options', async () => {
            await expect(async () => {
                await gameRunner.runSingleGame({
                    seed: 'invalid-seed',
                    scenario: 'Standard'
                });
            }).rejects.toThrow();
        });

        test('should handle invalid scenarios', async () => {
            await expect(async () => {
                await gameRunner.runSingleGame({
                    seed: 12345,
                    scenario: 'NonExistentScenario'
                });
            }).rejects.toThrow();
        });

        test('should handle games that exceed max steps', async () => {
            const shortRunner = new GameRunner({
                rulesPath: './rules/300-earth-and-water/rules.js',
                maxSteps: 5, // Very short limit
                logLevel: 'error'
            });

            const result = await shortRunner.runSingleGame({
                seed: 12345,
                scenario: 'Standard'
            });

            expect(result.reason).toBe('max_steps_reached');
            expect(result.totalSteps).toBeLessThanOrEqual(5);
        }, 5000);
    });

    describe('Configuration Management', () => {
        test('should validate configuration', () => {
            expect(() => {
                new GameRunner({
                    rulesPath: './nonexistent/rules.js'
                });
            }).toThrow();
        });

        test('should use environment variables when available', () => {
            // Mock environment variable
            process.env.RTT_AI_LOG_LEVEL = 'debug';
            
            const envRunner = new GameRunner();
            
            // Clean up
            delete process.env.RTT_AI_LOG_LEVEL;
        });

        test('should handle output directory creation', async () => {
            const customOutputDir = path.join(testOutputDir, 'custom-nested-dir');
            
            const runner = new GameRunner({
                rulesPath: './rules/300-earth-and-water/rules.js',
                outputDir: customOutputDir,
                maxSteps: 50
            });

            await runner.runSingleGame({
                seed: 12345,
                scenario: 'Standard'
            });

            expect(fs.existsSync(customOutputDir)).toBe(true);
        }, 10000);
    });

    describe('Performance and Resource Management', () => {
        test('should complete games within reasonable time', async () => {
            const startTime = Date.now();
            
            await gameRunner.runSingleGame({
                seed: 12345,
                scenario: 'Standard'
            });

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Should complete within 10 seconds even with limited steps
            expect(executionTime).toBeLessThan(10000);
        }, 12000);

        test('should handle memory efficiently for batch runs', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            await gameRunner.runBatch({
                gameCount: 10,
                scenario: 'Standard'
            });

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = finalMemory - initialMemory;

            // Memory growth should be reasonable (less than 100MB for 10 games)
            expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
        }, 45000); // 45 second timeout for 10 games
    });

    describe('Result Analysis', () => {
        test('should provide comprehensive game analysis', async () => {
            const result = await gameRunner.runSingleGame({
                seed: 12345,
                scenario: 'Standard'
            });

            expect(result.finalState).toBeDefined();
            expect(result.finalState.state).toBeDefined();
            expect(result.finalState.vp).toBeDefined();
            expect(result.totalSteps).toBeGreaterThan(0);
            expect(result.gameTime).toBeGreaterThan(0);
            expect(['Persia', 'Greece', 'tie', 'unknown']).toContain(result.winner);
        });

        test('should track player statistics', async () => {
            const result = await gameRunner.runSingleGame({
                seed: 12345,
                scenario: 'Standard'
            });

            expect(result.playerStats).toBeDefined();
            expect(result.playerStats.actionCounts).toBeDefined();
            expect(result.playerStats.stateCounts).toBeDefined();
            expect(result.playerStats.totalSteps).toBeGreaterThan(0);
        });
    });
});