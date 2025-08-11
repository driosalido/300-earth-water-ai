"use strict";

/**
 * Test fixtures for common game states and scenarios
 * Provides reusable game state data for testing
 */

const RULES = require('../../rules/300-earth-and-water/rules.js');

/**
 * Common test configurations
 */
const TEST_CONFIGS = {
    DEFAULT_SEED: 12345,
    TEST_SCENARIO: 'Standard',
    SHORT_MAX_STEPS: 100,
    MEDIUM_MAX_STEPS: 500,
    LONG_MAX_STEPS: 2000
};

/**
 * Common player configurations
 */
const PLAYER_CONFIGS = {
    DETERMINISTIC: {
        seed: 12345,
        gameId: 'test-deterministic',
        logLevel: 'error',
        avoidUndo: true
    },
    RANDOM: {
        gameId: 'test-random',
        logLevel: 'error',
        avoidUndo: true
    },
    ALLOW_UNDO: {
        seed: 54321,
        gameId: 'test-undo',
        logLevel: 'error',
        avoidUndo: false
    }
};

/**
 * Create a fresh initial game state
 */
function createInitialGameState(seed = TEST_CONFIGS.DEFAULT_SEED) {
    return RULES.setup(seed, TEST_CONFIGS.TEST_SCENARIO, {});
}

/**
 * Execute a sequence of moves on a game state
 */
function executeMoveSequence(gameState, moves) {
    let currentState = gameState;
    
    for (const move of moves) {
        currentState = RULES.action(currentState, move.player, move.action, move.args);
    }
    
    return currentState;
}

/**
 * Common move sequences for testing
 */
const MOVE_SEQUENCES = {
    /**
     * Minimal Persian preparation
     */
    PERSIAN_PREP_MINIMAL: [
        { player: 'Persia', action: 'draw' },
        { player: 'Persia', action: 'next' }
    ],

    /**
     * Persian preparation with bridge building and units
     */
    PERSIAN_PREP_WITH_UNITS: [
        { player: 'Persia', action: 'draw' },
        { player: 'Persia', action: 'next' },
        { player: 'Persia', action: 'build' },
        { player: 'Persia', action: 'port', args: 'Abydos' },
        { player: 'Persia', action: 'port', args: 'Abydos' },
        { player: 'Persia', action: 'city', args: 'Ephesos' },
        { player: 'Persia', action: 'next' }
    ],

    /**
     * Greek preparation with basic units
     */
    GREEK_PREP_BASIC: [
        { player: 'Greece', action: 'draw' },
        { player: 'Greece', action: 'draw' },
        { player: 'Greece', action: 'next' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'port', args: 'Sparta' },
        { player: 'Greece', action: 'next' }
    ],

    /**
     * Complete sequence to reach Persian movement phase
     */
    TO_PERSIAN_MOVEMENT: [
        // Persian prep
        { player: 'Persia', action: 'draw' },
        { player: 'Persia', action: 'next' },
        { player: 'Persia', action: 'build' },
        { player: 'Persia', action: 'port', args: 'Abydos' },
        { player: 'Persia', action: 'port', args: 'Abydos' },
        { player: 'Persia', action: 'city', args: 'Ephesos' },
        { player: 'Persia', action: 'next' },
        // Greek prep
        { player: 'Greece', action: 'draw' },
        { player: 'Greece', action: 'draw' },
        { player: 'Greece', action: 'next' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'port', args: 'Sparta' },
        { player: 'Greece', action: 'next' },
        // To movement
        { player: 'Persia', action: 'card_move', args: 2 }
    ],

    /**
     * Complete sequence to reach Persian land movement phase
     */
    TO_PERSIAN_LAND_MOVEMENT: [
        // Persian prep
        { player: 'Persia', action: 'draw' },
        { player: 'Persia', action: 'next' },
        { player: 'Persia', action: 'build' },
        { player: 'Persia', action: 'port', args: 'Abydos' },
        { player: 'Persia', action: 'port', args: 'Abydos' },
        { player: 'Persia', action: 'city', args: 'Ephesos' },
        { player: 'Persia', action: 'next' },
        // Greek prep
        { player: 'Greece', action: 'draw' },
        { player: 'Greece', action: 'draw' },
        { player: 'Greece', action: 'next' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'city', args: 'Athenai' },
        { player: 'Greece', action: 'port', args: 'Sparta' },
        { player: 'Greece', action: 'next' },
        // To movement and select origin
        { player: 'Persia', action: 'card_move', args: 2 },
        { player: 'Persia', action: 'city', args: 'Abydos' }
    ],

    /**
     * Complete sequence to reach Persian naval movement phase
     */
    TO_PERSIAN_NAVAL_MOVEMENT: [
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
    ]
};

/**
 * Pre-built game states for common testing scenarios
 */
const GAME_STATES = {
    /**
     * Create initial game state
     */
    INITIAL: () => createInitialGameState(),

    /**
     * Game state at Persian movement phase
     */
    PERSIAN_MOVEMENT: () => {
        const gameState = createInitialGameState();
        return executeMoveSequence(gameState, MOVE_SEQUENCES.TO_PERSIAN_MOVEMENT);
    },

    /**
     * Game state at Persian land movement phase (origin selected)
     */
    PERSIAN_LAND_MOVEMENT: () => {
        const gameState = createInitialGameState();
        return executeMoveSequence(gameState, MOVE_SEQUENCES.TO_PERSIAN_LAND_MOVEMENT);
    },

    /**
     * Game state at Persian naval movement phase (origin selected)
     */
    PERSIAN_NAVAL_MOVEMENT: () => {
        const gameState = createInitialGameState();
        return executeMoveSequence(gameState, MOVE_SEQUENCES.TO_PERSIAN_NAVAL_MOVEMENT);
    }
};

/**
 * Expected game state properties for validation
 */
const EXPECTED_STATES = {
    PERSIAN_MOVEMENT: {
        state: 'persian_movement',
        active: 'Persia',
        from: null,
        landMovement: true,
        navalMovement: true
    },

    PERSIAN_LAND_MOVEMENT: {
        state: 'persian_land_movement',
        active: 'Persia',
        from: 'Abydos'
    },

    PERSIAN_NAVAL_MOVEMENT: {
        state: 'persian_naval_movement',
        active: 'Persia',
        from: 'Abydos'
    }
};

/**
 * Common action sets for testing
 */
const ACTION_SETS = {
    SIMPLE_ACTIONS: {
        next: 1,
        draw: 1,
        pass: 1
    },

    BUILD_ACTIONS: {
        city: ['Abydos', 'Ephesos'],
        port: ['Abydos', 'Ephesos'],
        build: 1,
        next: 1
    },

    MOVEMENT_ORIGIN_ACTIONS: {
        city: ['Abydos', 'Ephesos'],
        port: ['Abydos', 'Ephesos'],
        undo: 1
    },

    LAND_MOVEMENT_ACTIONS: {
        city: ['Ephesos', 'Pella'],
        undo: 1
    },

    NAVAL_MOVEMENT_ACTIONS: {
        port: ['Athenai', 'Ephesos', 'Eretria', 'Naxos', 'Pella', 'Sparta', 'Thebai'],
        undo: 1
    },

    DISABLED_ACTIONS: {
        draw: false,
        city: [],
        port: 0,
        next: 1
    }
};

/**
 * Mock unit configurations for different cities
 */
const UNIT_CONFIGURATIONS = {
    COASTAL_CITY: [1, 2, 1, 2], // [greek_armies, persian_armies, greek_fleets, persian_fleets]
    INLAND_CITY: [1, 2],        // [greek_armies, persian_armies] - no fleet data
    EMPTY_COASTAL: [0, 0, 0, 0],
    EMPTY_INLAND: [0, 0],
    PERSIAN_STRONGHOLD: [0, 5, 0, 3],
    GREEK_STRONGHOLD: [5, 0, 3, 0]
};

/**
 * Helper functions for creating test scenarios
 */
const HELPERS = {
    /**
     * Create a game state with custom unit configuration
     */
    createStateWithUnits(unitConfig) {
        const gameState = createInitialGameState();
        
        // Apply custom unit configuration
        for (const [city, units] of Object.entries(unitConfig)) {
            if (gameState.units[city]) {
                gameState.units[city] = units;
            }
        }
        
        return gameState;
    },

    /**
     * Create a mock view with specific actions
     */
    createMockView(actions, prompt = 'Test prompt') {
        return {
            prompt: prompt,
            actions: actions
        };
    },

    /**
     * Validate game state matches expected properties
     */
    validateGameState(gameState, expected) {
        for (const [key, value] of Object.entries(expected)) {
            if (gameState[key] !== value) {
                throw new Error(`Expected ${key} to be ${value}, got ${gameState[key]}`);
            }
        }
        return true;
    }
};

module.exports = {
    TEST_CONFIGS,
    PLAYER_CONFIGS,
    MOVE_SEQUENCES,
    GAME_STATES,
    EXPECTED_STATES,
    ACTION_SETS,
    UNIT_CONFIGURATIONS,
    HELPERS,
    createInitialGameState,
    executeMoveSequence
};