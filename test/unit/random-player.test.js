"use strict";

/**
 * Unit tests for RandomPlayer class
 * Tests individual methods and behaviors
 */

const { RandomPlayer } = require('../../src/random-player');

describe('RandomPlayer Unit Tests', () => {
    let player;

    beforeEach(() => {
        player = new RandomPlayer({ 
            seed: 12345, 
            gameId: 'test-unit',
            logLevel: 'error'
        });
    });

    describe('Constructor and Initialization', () => {
        test('should initialize with default values', () => {
            const defaultPlayer = new RandomPlayer();
            
            expect(defaultPlayer.name).toBe('RandomPlayer');
            expect(defaultPlayer.gameId).toBe('random-game');
            expect(defaultPlayer.seed).toBeDefined();
            expect(defaultPlayer.config.avoidUndo).toBe(true);
            expect(defaultPlayer.config.maxSteps).toBe(10000);
        });

        test('should initialize with custom options', () => {
            const customPlayer = new RandomPlayer({
                name: 'TestPlayer',
                gameId: 'custom-game',
                seed: 54321,
                avoidUndo: false,
                maxSteps: 500
            });

            expect(customPlayer.name).toBe('TestPlayer');
            expect(customPlayer.gameId).toBe('custom-game');
            expect(customPlayer.seed).toBe(54321);
            expect(customPlayer.config.avoidUndo).toBe(false);
            expect(customPlayer.config.maxSteps).toBe(500);
        });
    });

    describe('Random Number Generation', () => {
        test('should generate consistent random numbers with same seed', () => {
            const player1 = new RandomPlayer({ seed: 12345 });
            const player2 = new RandomPlayer({ seed: 12345 });

            // Generate same sequence of numbers
            const sequence1 = [
                player1.random(100),
                player1.random(100),
                player1.random(100)
            ];

            const sequence2 = [
                player2.random(100),
                player2.random(100), 
                player2.random(100)
            ];

            expect(sequence1).toEqual(sequence2);
        });

        test('should generate numbers in correct range', () => {
            for (let i = 0; i < 100; i++) {
                const num = player.random(10);
                expect(num).toBeGreaterThanOrEqual(0);
                expect(num).toBeLessThan(10);
                expect(Number.isInteger(num)).toBe(true);
            }
        });

        test('should handle edge cases', () => {
            expect(player.random(1)).toBe(0);
            expect(() => player.random(0)).not.toThrow();
        });
    });

    describe('Random Choice', () => {
        test('should select from array correctly', () => {
            const array = ['a', 'b', 'c'];
            const choice = player.randomChoice(array);
            expect(array).toContain(choice);
        });

        test('should throw error for empty array', () => {
            expect(() => player.randomChoice([])).toThrow();
            expect(() => player.randomChoice(null)).toThrow();
        });

        test('should handle single element array', () => {
            const choice = player.randomChoice(['only']);
            expect(choice).toBe('only');
        });
    });

    describe('Movement Phase Detection', () => {
        test('should detect movement phases correctly', () => {
            // Land movement
            expect(player.isMovementPhase({ state: 'persian_land_movement' })).toBe(true);
            expect(player.isMovementPhase({ state: 'greek_land_movement' })).toBe(true);
            
            // Naval movement
            expect(player.isMovementPhase({ state: 'persian_naval_movement' })).toBe(true);
            expect(player.isMovementPhase({ state: 'greek_naval_movement' })).toBe(true);

            // General movement
            expect(player.isMovementPhase({ state: 'persian_movement' })).toBe(true);
            expect(player.isMovementPhase({ state: 'greek_movement' })).toBe(true);

            // Non-movement phases
            expect(player.isMovementPhase({ state: 'persian_preparation_build' })).toBe(false);
            expect(player.isMovementPhase({ state: 'greek_preparation_draw' })).toBe(false);
            expect(player.isMovementPhase({ state: 'persian_operation' })).toBe(false);
        });

        test('should handle null/undefined states', () => {
            expect(player.isMovementPhase(null)).toBe(false);
            expect(player.isMovementPhase({})).toBe(false);
            expect(player.isMovementPhase({ state: null })).toBe(false);
        });
    });

    describe('Movement Origin Selection Detection', () => {
        test('should detect origin selection correctly', () => {
            expect(player.isSelectingMovementOrigin({ 
                state: 'persian_movement', 
                from: null 
            })).toBe(true);

            expect(player.isSelectingMovementOrigin({ 
                state: 'greek_movement', 
                from: null 
            })).toBe(true);

            expect(player.isSelectingMovementOrigin({ 
                state: 'persian_movement', 
                from: 'Abydos' 
            })).toBe(false);

            expect(player.isSelectingMovementOrigin({ 
                state: 'persian_land_movement', 
                from: null 
            })).toBe(false);
        });

        test('should handle edge cases', () => {
            expect(player.isSelectingMovementOrigin(null)).toBe(false);
            expect(player.isSelectingMovementOrigin({})).toBe(false);
        });
    });

    describe('Available Units for Movement', () => {
        const mockGameState = {
            from: 'TestCity',
            units: {
                'TestCity': [1, 2, 3, 4], // [greek_armies, persian_armies, greek_fleets, persian_fleets]
                'InlandCity': [1, 2] // Only armies, no fleets
            },
            state: 'persian_land_movement'
        };

        test('should get available armies correctly', () => {
            const armies = player.getAvailableArmiesForMovement(mockGameState, 'city');
            expect(armies).toBe(2); // Persian armies at index 1
        });

        test('should get available fleets correctly', () => {
            const fleets = player.getAvailableFleetsForMovement(mockGameState);
            expect(fleets).toBe(4); // Persian fleets at index 3
        });

        test('should handle cities without fleet data', () => {
            const inlandState = {
                ...mockGameState,
                from: 'InlandCity'
            };

            const armies = player.getAvailableArmiesForMovement(inlandState, 'city');
            expect(armies).toBe(2);

            const fleets = player.getAvailableFleetsForMovement(inlandState);
            expect(fleets).toBe(0); // units[3] is undefined, should return 0
        });

        test('should handle missing game state data', () => {
            expect(player.getAvailableArmiesForMovement(null)).toBe(1);
            expect(player.getAvailableArmiesForMovement({})).toBe(1);
            expect(player.getAvailableArmiesForMovement({ from: null })).toBe(1);
            
            expect(player.getAvailableFleetsForMovement(null)).toBe(1);
            expect(player.getAvailableFleetsForMovement({})).toBe(1);
        });
    });

    describe('Action Type Detection', () => {
        test('should classify action types correctly', () => {
            // Build phase
            expect(player.getActionType('city', ['Abydos'], { state: 'persian_preparation_build' }))
                .toBe('build_unit');
            
            // Movement phase
            expect(player.getActionType('city', ['Ephesos'], { state: 'persian_land_movement' }))
                .toBe('move_destination');

            // Simple actions
            expect(player.getActionType('next', 1, { state: 'any_state' }))
                .toBe('simple_action');

            // Choice actions (using a non-operation state to avoid the operation_phase match)
            expect(player.getActionType('card_move', [1, 2, 3], { state: 'some_other_state' }))
                .toBe('choice_action');
        });

        test('should handle null game state', () => {
            expect(player.getActionType('test', 1, null)).toBe('unknown');
        });
    });

    describe('Decision Making', () => {
        test('should select from simple actions', () => {
            const actions = { next: 1, draw: 1 };
            const gameState = { state: 'test_state' };
            const view = { actions: actions };
            const decision = player.makeDecision(gameState, actions, view);

            expect(['next', 'draw']).toContain(decision.action);
            expect(decision.args).toBeUndefined();
            expect(decision.reason).toBe('random_selection');
        });

        test('should select from array actions', () => {
            const actions = { city: ['Abydos', 'Ephesos'] };
            const gameState = { state: 'persian_preparation_build' };
            const view = { actions: actions };
            const decision = player.makeDecision(gameState, actions, view);

            expect(decision.action).toBe('city');
            expect(['Abydos', 'Ephesos']).toContain(decision.args);
        });

        test('should filter out disabled actions', () => {
            const actions = { 
                next: 1, 
                draw: false, 
                city: [], 
                port: 0,
                undo: 1
            };
            const gameState = { state: 'test_state' };
            const view = { actions: actions };
            
            const decision = player.makeDecision(gameState, actions, view);
            
            // Should only select 'next' since others are disabled/empty and undo is avoided
            expect(decision.action).toBe('next');
        });

        test('should avoid undo by default', () => {
            const actions = { next: 1, undo: 1 };
            const gameState = { state: 'test_state' };
            const view = { actions: actions };
            
            // Run multiple times to ensure undo is consistently avoided
            for (let i = 0; i < 10; i++) {
                const decision = player.makeDecision(gameState, actions, view);
                expect(decision.action).toBe('next');
            }
        });

        test('should allow undo when configured', () => {
            const playerWithUndo = new RandomPlayer({ 
                seed: 12345,
                avoidUndo: false 
            });
            
            const actions = { undo: 1 };
            const gameState = { state: 'test_state' };
            const view = { actions: actions };
            const decision = playerWithUndo.makeDecision(gameState, actions, view);
            
            expect(decision.action).toBe('undo');
        });

        test('should throw error for no valid actions', () => {
            const gameState = { state: 'test_state' };
            const view = { actions: {} };
            
            expect(() => player.makeDecision(gameState, {}, view)).toThrow();
            expect(() => player.makeDecision(gameState, { draw: false, city: [] }, view)).toThrow();
        });
    });

    describe('Game Statistics', () => {
        test('should provide game statistics', () => {
            const stats = player.getGameStats();
            
            expect(stats.startTime).toBeDefined();
            expect(stats.endTime).toBeDefined();
            expect(stats.totalSteps).toBe(0); // No steps taken yet
            expect(stats.actionCounts).toBeDefined();
            expect(stats.stateCounts).toBeDefined();
            expect(stats.currentTime).toBeDefined();
        });
    });

    describe('Winner Determination', () => {
        test('should determine winner correctly', () => {
            expect(player.determineWinner({ state: 'game_over', vp: 1 })).toBe('Persia');
            expect(player.determineWinner({ state: 'game_over', vp: -1 })).toBe('Greece');
            expect(player.determineWinner({ state: 'game_over', vp: 0 })).toBe('tie');
            expect(player.determineWinner({ state: 'persian_operation', vp: 1 })).toBe('unknown');
        });
    });
});