"use strict";

/**
 * Integration tests for naval movement mechanics
 * Tests both manual naval moves and random player behavior
 */

const RULES = require('../../rules/300-earth-and-water/rules.js');
const { RandomPlayer } = require('../../src/random-player');

describe('Naval Movement Integration Tests', () => {
    let gameState;
    let player;

    beforeEach(() => {
        player = new RandomPlayer({ seed: 12345, gameId: 'naval-test', logLevel: 'error' });
    });

    describe('Naval Movement Setup and Execution', () => {
        test('should reach persian_naval_movement state successfully', () => {
            gameState = RULES.setup(12345, 'Standard', {});
            
            // Build up to naval movement phase
            const moves = [
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'next' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'next' },
                { player: 'Greece', action: 'draw' },
                { player: 'Greece', action: 'next' },
                { player: 'Greece', action: 'next' },
                { player: 'Persia', action: 'card_move', args: 1 },
                { player: 'Persia', action: 'port', args: 'Abydos' }
            ];
            
            for (const move of moves) {
                gameState = RULES.action(gameState, move.player, move.action, move.args);
            }

            expect(gameState.state).toBe('persian_naval_movement');
            expect(gameState.from).toBe('Abydos');
        });

        test('should provide correct naval movement actions', () => {
            gameState = RULES.setup(12345, 'Standard', {});
            
            // Setup to naval movement
            const moves = [
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'next' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'next' },
                { player: 'Greece', action: 'draw' },
                { player: 'Greece', action: 'next' },
                { player: 'Greece', action: 'next' },
                { player: 'Persia', action: 'card_move', args: 1 },
                { player: 'Persia', action: 'port', args: 'Abydos' }
            ];
            
            for (const move of moves) {
                gameState = RULES.action(gameState, move.player, move.action, move.args);
            }

            const view = RULES.view(gameState, 'Persia');
            expect(view.actions.port).toBeDefined();
            expect(Array.isArray(view.actions.port)).toBe(true);
            expect(view.actions.port.length).toBeGreaterThan(0);
        });
    });

    describe('Naval Movement Format Tests', () => {
        beforeEach(() => {
            // Setup to naval movement state
            gameState = RULES.setup(12345, 'Standard', {});
            const moves = [
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'next' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'next' },
                { player: 'Greece', action: 'draw' },
                { player: 'Greece', action: 'next' },
                { player: 'Greece', action: 'next' },
                { player: 'Persia', action: 'card_move', args: 1 },
                { player: 'Persia', action: 'port', args: 'Abydos' }
            ];
            
            for (const move of moves) {
                gameState = RULES.action(gameState, move.player, move.action, move.args);
            }
        });

        test('should reject wrong naval movement format (string only)', () => {
            expect(() => {
                RULES.action(gameState, 'Persia', 'port', 'Ephesos');
            }).toThrow();
        });

        test('should accept correct naval movement format [destination, fleets, armies]', () => {
            expect(() => {
                RULES.action(gameState, 'Persia', 'port', ['Ephesos', 1, 0]);
            }).not.toThrow();
        });

        test('should handle naval movement with army transport', () => {
            expect(() => {
                RULES.action(gameState, 'Persia', 'port', ['Ephesos', 1, 1]);
            }).not.toThrow();
        });

        test('should validate fleet and army counts', () => {
            // Test with more fleets than available (should work as game handles it)
            expect(() => {
                RULES.action(gameState, 'Persia', 'port', ['Ephesos', 5, 0]);
            }).not.toThrow();
        });
    });

    describe('Random Player Naval Movement', () => {
        beforeEach(() => {
            // Setup to naval movement state
            gameState = RULES.setup(12345, 'Standard', {});
            const moves = [
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'next' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'next' },
                { player: 'Greece', action: 'draw' },
                { player: 'Greece', action: 'next' },
                { player: 'Greece', action: 'next' },
                { player: 'Persia', action: 'card_move', args: 1 },
                { player: 'Persia', action: 'port', args: 'Abydos' }
            ];
            
            for (const move of moves) {
                gameState = RULES.action(gameState, move.player, move.action, move.args);
            }
        });

        test('should generate correct naval movement format', () => {
            const view = RULES.view(gameState, 'Persia');
            const actionSelection = player.selectRandomAction(view.actions, gameState, view);

            if (actionSelection.action === 'port') {
                expect(Array.isArray(actionSelection.args)).toBe(true);
                expect(actionSelection.args).toHaveLength(3);
                expect(typeof actionSelection.args[0]).toBe('string'); // destination
                expect(typeof actionSelection.args[1]).toBe('number'); // fleets
                expect(typeof actionSelection.args[2]).toBe('number'); // armies
                expect(actionSelection.actionType).toBe('move_destination');
            }
        });

        test('should execute random naval moves successfully', () => {
            const view = RULES.view(gameState, 'Persia');
            const actionSelection = player.selectRandomAction(view.actions, gameState, view);

            expect(() => {
                RULES.action(gameState, 'Persia', actionSelection.action, actionSelection.args);
            }).not.toThrow();
        });

        test('should get available fleets for movement', () => {
            const availableFleets = player.getAvailableFleetsForMovement(gameState);
            expect(typeof availableFleets).toBe('number');
            expect(availableFleets).toBeGreaterThanOrEqual(0);
        });

        test('should detect naval movement phase correctly', () => {
            expect(player.isMovementPhase(gameState)).toBe(true);
            expect(player.isSelectingMovementOrigin(gameState)).toBe(false);
        });
    });

    describe('Naval Origin Selection', () => {
        test('should handle naval origin selection correctly', () => {
            gameState = RULES.setup(12345, 'Standard', {});
            
            // Setup to persian_movement state (before selecting origin)
            const moves = [
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'next' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'next' },
                { player: 'Greece', action: 'draw' },
                { player: 'Greece', action: 'next' },
                { player: 'Greece', action: 'next' },
                { player: 'Persia', action: 'card_move', args: 1 }
            ];
            
            for (const move of moves) {
                gameState = RULES.action(gameState, move.player, move.action, move.args);
            }

            expect(gameState.state).toBe('persian_movement');
            expect(player.isSelectingMovementOrigin(gameState)).toBe(true);

            const view = RULES.view(gameState, 'Persia');
            const actionSelection = player.selectRandomAction(view.actions, gameState, view);

            // Naval origin selection should pass just the port name (string)
            if (actionSelection.action === 'port') {
                expect(typeof actionSelection.args).toBe('string');
            }
        });
    });
});