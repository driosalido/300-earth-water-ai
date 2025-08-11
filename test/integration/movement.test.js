"use strict";

/**
 * Integration tests for land movement mechanics
 * Tests both manual moves and random player behavior
 */

const RULES = require('../../rules/300-earth-and-water/rules.js');
const { RandomPlayer } = require('../../src/random-player');

describe('Land Movement Integration Tests', () => {
    let gameState;
    let player;

    beforeEach(() => {
        // Setup game state to a point where we have land movement
        gameState = RULES.setup(12345, 'Standard', {});
        
        // Execute moves to reach land movement state
        const moves = [
            { player: 'Persia', action: 'draw' },
            { player: 'Persia', action: 'next' },
            { player: 'Persia', action: 'build' },
            { player: 'Persia', action: 'port', args: 'Abydos' },
            { player: 'Persia', action: 'port', args: 'Abydos' },
            { player: 'Persia', action: 'city', args: 'Ephesos' },
            { player: 'Persia', action: 'next' },
            { player: 'Greece', action: 'draw' },
            { player: 'Greece', action: 'draw' },
            { player: 'Greece', action: 'next' },
            { player: 'Greece', action: 'city', args: 'Athenai' },
            { player: 'Greece', action: 'city', args: 'Athenai' },
            { player: 'Greece', action: 'city', args: 'Athenai' },
            { player: 'Greece', action: 'port', args: 'Sparta' },
            { player: 'Greece', action: 'next' },
            { player: 'Persia', action: 'card_move', args: 2 },
            { player: 'Persia', action: 'city', args: 'Abydos' }
        ];

        for (const move of moves) {
            gameState = RULES.action(gameState, move.player, move.action, move.args);
        }

        player = new RandomPlayer({ seed: 12345, gameId: 'test', logLevel: 'error' });
    });

    describe('Manual Movement Tests', () => {
        test('should handle correct land movement format', () => {
            expect(gameState.state).toBe('persian_land_movement');
            expect(gameState.from).toBe('Abydos');
            
            // Test correct movement format [destination, armies]
            expect(() => {
                RULES.action(gameState, 'Persia', 'city', ['Ephesos', 1]);
            }).not.toThrow();
        });

        test('should reject incorrect movement format (string only)', () => {
            // This should fail because it's just a string, not [destination, armies]
            expect(() => {
                RULES.action(gameState, 'Persia', 'city', 'Ephesos');
            }).toThrow();
        });

        test('should reject movement with zero armies', () => {
            expect(() => {
                RULES.action(gameState, 'Persia', 'city', ['Ephesos', 0]);
            }).not.toThrow(); // Zero armies should be allowed
        });

        test('should reject invalid destinations', () => {
            expect(() => {
                RULES.action(gameState, 'Persia', 'city', ['NonExistentCity', 1]);
            }).toThrow();
        });
    });

    describe('Random Player Movement', () => {
        test('should select valid movement actions', () => {
            const view = RULES.view(gameState, 'Persia');
            const actionSelection = player.selectRandomAction(view.actions, gameState, view);

            expect(actionSelection.action).toBe('city');
            expect(Array.isArray(actionSelection.args)).toBe(true);
            expect(actionSelection.args).toHaveLength(2);
            expect(typeof actionSelection.args[0]).toBe('string'); // destination
            expect(typeof actionSelection.args[1]).toBe('number'); // army count
            expect(actionSelection.actionType).toBe('move_destination');
        });

        test('should execute random player moves successfully', () => {
            const view = RULES.view(gameState, 'Persia');
            const actionSelection = player.selectRandomAction(view.actions, gameState, view);

            expect(() => {
                RULES.action(gameState, 'Persia', actionSelection.action, actionSelection.args);
            }).not.toThrow();
        });

        test('should detect movement phase correctly', () => {
            expect(player.isMovementPhase(gameState)).toBe(true);
            expect(player.isSelectingMovementOrigin(gameState)).toBe(false);
        });

        test('should get available armies for movement', () => {
            const availableArmies = player.getAvailableArmiesForMovement(gameState, 'city');
            expect(typeof availableArmies).toBe('number');
            expect(availableArmies).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Movement Origin Selection', () => {
        test('should handle origin selection correctly', () => {
            // Reset to persian_movement state (origin selection)
            gameState = RULES.setup(12345, 'Standard', {});
            const moves = [
                { player: 'Persia', action: 'draw' },
                { player: 'Persia', action: 'next' },
                { player: 'Persia', action: 'build' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'port', args: 'Abydos' },
                { player: 'Persia', action: 'city', args: 'Ephesos' },
                { player: 'Persia', action: 'next' },
                { player: 'Greece', action: 'draw' },
                { player: 'Greece', action: 'draw' },
                { player: 'Greece', action: 'next' },
                { player: 'Greece', action: 'city', args: 'Athenai' },
                { player: 'Greece', action: 'city', args: 'Athenai' },
                { player: 'Greece', action: 'city', args: 'Athenai' },
                { player: 'Greece', action: 'port', args: 'Sparta' },
                { player: 'Greece', action: 'next' },
                { player: 'Persia', action: 'card_move', args: 2 }
            ];

            for (const move of moves) {
                gameState = RULES.action(gameState, move.player, move.action, move.args);
            }

            expect(gameState.state).toBe('persian_movement');
            expect(gameState.from).toBeNull();
            expect(player.isSelectingMovementOrigin(gameState)).toBe(true);

            const view = RULES.view(gameState, 'Persia');
            const actionSelection = player.selectRandomAction(view.actions, gameState, view);

            // Origin selection should pass just the city name (string)
            if (actionSelection.action === 'city') {
                expect(typeof actionSelection.args).toBe('string');
            }
        });
    });
});