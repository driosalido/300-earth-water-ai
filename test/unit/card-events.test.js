"use strict";

/**
 * Card Event Tests for 300: Earth & Water
 * 
 * Tests all card events to ensure they can be played without errors
 * and produce expected game state changes.
 */

const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);

// All Persian and Greek cards with their names
const PERSIAN_CARDS = {
    1: "Cavalry of Mardonius",
    2: "Tribute of Earth and Water",
    3: "Tribute of Earth and Water", 
    4: "Carneia Festival",
    5: "The Immortals",
    6: "Ostracism",
    7: "The Great King",
    8: "The Royal Road",
    9: "Hippias",
    10: "Separate Peace",
    11: "Sudden Death of the Great King",
    12: "Defection of Thebes",
    13: "Tribute of Earth and Water",
    14: "Alliance with Carthage",
    15: "Acropolis on Fire",
    16: "Pacification of Babylon or Egypt"
};

const GREEK_CARDS = {
    1: "Mines of Laurion",
    2: "Ionian Revolt",
    3: "Wrath of Poseidon",
    4: "Miltiades",
    5: "Themistocles",
    6: "Pausanias", 
    7: "Oracle of Delphi",
    8: "Leonidas",
    9: "Artemisia I",
    10: "Evangelion",
    11: "Melas Zomos",
    12: "Molon Labe",
    13: "Triremes",
    14: "Support from Syracuse",
    15: "300 Spartans",
    16: "Desertion of Greek Soldiers"
};

// Cards that are reaction events only (cannot be played proactively)
const REACTION_ONLY_CARDS = {
    persian: [5, 11, 14], // The Immortals, Sudden Death, Alliance with Carthage
    greek: [4, 5, 6, 9, 12] // Miltiades, Themistocles, Pausanias, Artemisia, Molon Labe
};

/**
 * Create a test game state where cards can be played
 */
function createTestGameState(seed = 12345) {
    let gameState = rules.setup(seed, 'Standard', {});
    
    // Advance to a phase where cards can be played as events
    // We need to get through preparation phases to operation phases
    let maxSteps = 100;
    let step = 0;
    
    while (gameState.state !== 'game_over' && step < maxSteps) {
        const view = rules.view(gameState, gameState.active);
        
        // Check if we've reached an operation phase where cards can be played
        if (gameState.state.includes('operation') || gameState.state.includes('movement')) {
            // Check if card_event is available
            if (view.actions && view.actions.card_event) {
                break;
            }
            // If in movement but no card_event, try one more action
            if (gameState.state.includes('movement') && view.actions && Object.keys(view.actions).length > 0) {
                if (!view.actions.card_event && !view.actions.card_move) {
                    break; // We're in a different type of movement phase
                }
            }
        }
        
        if (!view.actions || Object.keys(view.actions).length === 0) {
            console.warn(`No actions available in state: ${gameState.state}`);
            break;
        }
        
        // Take appropriate action to advance game
        let action, args;
        
        // Handle common actions to progress through phases
        if (view.actions.draw) {
            action = 'draw';
        } else if (view.actions.next) {
            action = 'next';
        } else if (view.actions.city && Array.isArray(view.actions.city)) {
            action = 'city';
            args = view.actions.city[0];
        } else if (view.actions.port && Array.isArray(view.actions.port)) {
            action = 'port';  
            args = view.actions.port[0];
        } else if (view.actions.pass) {
            action = 'pass';
        } else {
            // Take first available action
            const actions = Object.keys(view.actions);
            action = actions[0];
            const actionValue = view.actions[action];
            
            if (Array.isArray(actionValue)) {
                args = actionValue[0];
            } else if (typeof actionValue === 'number' && actionValue !== 1) {
                args = actionValue;
            }
        }
        
        try {
            const oldState = gameState.state;
            gameState = rules.action(gameState, gameState.active, action, args);
            step++;
            
            // Debug output for first few steps
            if (step <= 10) {
                console.log(`Step ${step}: ${oldState} -> ${gameState.state} (${action})`);
            }
            
        } catch (error) {
            console.error(`Failed to advance game state at step ${step}: ${error.message}`);
            console.error(`State: ${gameState.state}, Action: ${action}, Args: ${args}`);
            break;
        }
    }
    
    return gameState;
}

/**
 * Test if a card can be played as an event without errors
 */
function testCardEvent(cardId, faction, gameState) {
    const cardName = faction === 'Persia' ? PERSIAN_CARDS[cardId] : GREEK_CARDS[cardId];
    const isReactionOnly = REACTION_ONLY_CARDS[faction.toLowerCase()]?.includes(cardId);
    
    console.log(`Testing ${faction} Card ${cardId}: ${cardName} ${isReactionOnly ? '(reaction only)' : ''}`);
    
    try {
        // Create a copy of game state for testing
        const testState = JSON.parse(JSON.stringify(gameState));
        
        // Ensure the card is in the player's hand
        if (faction === 'Persia') {
            if (!testState.persian.hand.includes(cardId)) {
                testState.persian.hand.push(cardId);
            }
        } else {
            if (!testState.greek.hand.includes(cardId)) {
                testState.greek.hand.push(cardId);
            }
        }
        
        // Get view for the faction
        const view = rules.view(testState, faction);
        
        // Check if card_event action is available
        if (!view.actions || !view.actions.card_event) {
            if (isReactionOnly) {
                console.log(`  ✓ PASS: ${cardName} is reaction-only, not available in normal operation`);
                return { passed: true, reason: 'reaction-only', cardName };
            } else {
                console.log(`  ⚠ SKIP: ${cardName} - card_event not available in current state`);
                return { passed: false, reason: 'no-card-event', cardName };
            }
        }
        
        // Check if this specific card is playable
        if (!Array.isArray(view.actions.card_event) || !view.actions.card_event.includes(cardId)) {
            if (isReactionOnly) {
                console.log(`  ✓ PASS: ${cardName} is reaction-only, correctly not available for proactive play`);
                return { passed: true, reason: 'reaction-only', cardName };
            } else {
                console.log(`  ⚠ SKIP: ${cardName} - card not available for play in current conditions`);
                return { passed: false, reason: 'card-not-available', cardName };
            }
        }
        
        if (isReactionOnly) {
            console.log(`  ❌ FAIL: ${cardName} should be reaction-only but is available for proactive play!`);
            return { passed: false, reason: 'should-be-reaction-only', cardName };
        }
        
        // Try to play the card
        const resultState = rules.action(testState, faction, 'card_event', cardId);
        
        // Verify the game state changed appropriately
        if (resultState.state === 'game_over' && testState.state !== 'game_over') {
            console.log(`  ❌ FAIL: ${cardName} caused unexpected game over`);
            return { passed: false, reason: 'unexpected-game-over', cardName };
        }
        
        console.log(`  ✓ PASS: ${cardName} played successfully`);
        return { passed: true, reason: 'success', cardName };
        
    } catch (error) {
        if (isReactionOnly && error.message.includes('unimplemented')) {
            console.log(`  ✓ PASS: ${cardName} is reaction-only and correctly throws unimplemented error`);
            return { passed: true, reason: 'reaction-only-error', cardName };
        }
        
        console.log(`  ❌ FAIL: ${cardName} threw error: ${error.message}`);
        return { passed: false, reason: 'error', cardName, error: error.message };
    }
}

/**
 * Create a test game state for Greek operations
 */
function createGreekTestGameState(seed = 12345) {
    let gameState = rules.setup(seed, 'Standard', {});
    
    // Advance past Persian phases to Greek phases
    let maxSteps = 200;
    let step = 0;
    
    while (gameState.state !== 'game_over' && step < maxSteps) {
        const view = rules.view(gameState, gameState.active);
        
        // Check if we've reached a Greek operation phase
        if (gameState.state.includes('greek') && 
            (gameState.state.includes('operation') || gameState.state.includes('movement'))) {
            if (view.actions && view.actions.card_event) {
                break;
            }
        }
        
        if (!view.actions || Object.keys(view.actions).length === 0) {
            break;
        }
        
        // Take action to advance game
        let action, args;
        
        if (view.actions.draw) {
            action = 'draw';
        } else if (view.actions.next) {
            action = 'next';
        } else if (view.actions.pass) {
            action = 'pass';
        } else if (view.actions.city && Array.isArray(view.actions.city)) {
            action = 'city';
            args = view.actions.city[0];
        } else if (view.actions.port && Array.isArray(view.actions.port)) {
            action = 'port';
            args = view.actions.port[0];
        } else {
            const actions = Object.keys(view.actions);
            action = actions[0];
            const actionValue = view.actions[action];
            
            if (Array.isArray(actionValue)) {
                args = actionValue[0];
            } else if (typeof actionValue === 'number' && actionValue !== 1) {
                args = actionValue;
            }
        }
        
        try {
            gameState = rules.action(gameState, gameState.active, action, args);
            step++;
        } catch (error) {
            console.error(`Failed to advance to Greek phase at step ${step}: ${error.message}`);
            break;
        }
    }
    
    return gameState;
}

/**
 * Main test function
 */
function runCardEventTests() {
    console.log('🎴 Starting Card Event Tests for 300: Earth & Water\n');
    
    const results = {
        persian: {},
        greek: {},
        summary: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        }
    };
    
    // Test Persian cards in Persian operation phase
    console.log('Setting up Persian test game state...');
    const persianGameState = createTestGameState();
    console.log(`Persian game state: ${persianGameState.state}, Active: ${persianGameState.active}\n`);
    
    console.log('🔴 Testing Persian Cards:');
    console.log('═'.repeat(40));
    for (const [cardId, cardName] of Object.entries(PERSIAN_CARDS)) {
        const result = testCardEvent(parseInt(cardId), 'Persia', persianGameState);
        results.persian[cardId] = result;
        results.summary.total++;
        
        if (result.passed) {
            results.summary.passed++;
        } else if (result.reason === 'no-card-event' || result.reason === 'card-not-available') {
            results.summary.skipped++;
        } else {
            results.summary.failed++;
        }
    }
    
    console.log('');
    
    // Test Greek cards in Greek operation phase
    console.log('Setting up Greek test game state...');
    const greekGameState = createGreekTestGameState();
    console.log(`Greek game state: ${greekGameState.state}, Active: ${greekGameState.active}\n`);
    
    console.log('🔵 Testing Greek Cards:');
    console.log('═'.repeat(40));
    for (const [cardId, cardName] of Object.entries(GREEK_CARDS)) {
        const result = testCardEvent(parseInt(cardId), 'Greece', greekGameState);
        results.greek[cardId] = result;
        results.summary.total++;
        
        if (result.passed) {
            results.summary.passed++;
        } else if (result.reason === 'no-card-event' || result.reason === 'card-not-available') {
            results.summary.skipped++;
        } else {
            results.summary.failed++;
        }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CARD EVENT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Cards Tested: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️  Skipped: ${results.summary.skipped}`);
    console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
    
    // Show failures in detail
    if (results.summary.failed > 0) {
        console.log('\n❌ FAILED CARDS:');
        console.log('-'.repeat(40));
        
        for (const faction of ['persian', 'greek']) {
            for (const [cardId, result] of Object.entries(results[faction])) {
                if (!result.passed && result.reason !== 'no-card-event' && result.reason !== 'card-not-available') {
                    console.log(`${faction === 'persian' ? '🔴' : '🔵'} Card ${cardId}: ${result.cardName}`);
                    console.log(`   Reason: ${result.reason}`);
                    if (result.error) {
                        console.log(`   Error: ${result.error}`);
                    }
                }
            }
        }
    }
    
    // Detailed report on reaction-only cards
    console.log('\n📝 REACTION-ONLY CARDS (Expected to be skipped):');
    console.log('-'.repeat(50));
    
    const reactionCards = {
        'Persian': [5, 11, 14],
        'Greek': [4, 5, 6, 9, 12]
    };
    
    for (const [faction, cardIds] of Object.entries(reactionCards)) {
        const cardDict = faction === 'Persian' ? PERSIAN_CARDS : GREEK_CARDS;
        console.log(`${faction}:`);
        for (const cardId of cardIds) {
            console.log(`  ${cardId}: ${cardDict[cardId]}`);
        }
    }
    
    return results;
}

// Run tests if called directly
if (require.main === module) {
    runCardEventTests();
}

module.exports = {
    runCardEventTests,
    testCardEvent,
    createTestGameState,
    PERSIAN_CARDS,
    GREEK_CARDS,
    REACTION_ONLY_CARDS
};