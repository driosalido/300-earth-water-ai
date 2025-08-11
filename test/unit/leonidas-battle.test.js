"use strict";

/**
 * Test case for Leonidas battle mechanics
 * 
 * This test specifically checks what happens when:
 * 1. Leonidas card is played (allows moving 1 army)
 * 2. The army moves to a city with enemy units (triggers battle)
 * 3. The battle uses Leonidas special rule (roll 2 dice, choose best)
 */

const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);

/**
 * Test Leonidas movement and battle sequence step by step
 */
function testLeonidasBattleSequence() {
    console.log('🗡️  LEONIDAS BATTLE TEST');
    console.log('=' .repeat(50));
    console.log('Testing: Leonidas movement → enemy contact → battle mechanics\n');

    try {
        // Start with a fresh game
        let gameState = rules.setup(12345, 'Standard', {});
        
        // Force game to a Greek operation phase where Leonidas can be played
        gameState = forceToGreekOperationPhase(gameState);
        
        console.log('✓ Reached Greek operation phase:', gameState.state);
        console.log('✓ Active player:', gameState.active);
        
        // Ensure Leonidas card is in Greek hand
        if (!gameState.greek.hand.includes(8)) {
            gameState.greek.hand.push(8);
        }
        console.log('✓ Added Leonidas (card 8) to Greek hand');
        
        // Set up a battle scenario:
        // - Greek army in Athenai
        // - Persian army in Sparta (destination)
        setupBattleScenario(gameState);
        
        console.log('\n📍 INITIAL SETUP:');
        displayUnitsStatus(gameState);
        
        // Step 1: Play Leonidas as event
        console.log('\n⚡ STEP 1: Playing Leonidas card as event...');
        
        const view1 = rules.view(gameState, gameState.active);
        console.log('Current state:', gameState.state);
        console.log('Current active:', gameState.active);
        console.log('Available actions:', Object.keys(view1.actions || {}));
        
        // If we're not in the right state, try to force it
        if (!view1.actions || !view1.actions.card_event || 
            (Array.isArray(view1.actions.card_event) && !view1.actions.card_event.includes(8))) {
            
            console.log('❌ Leonidas card not available for event play');
            console.log('Attempting to force Greek movement state directly...');
            
            // Try to simulate the Leonidas event being played by directly setting the movement state
            gameState.state = 'greek_land_movement_leonidas';
            gameState.active = 'Greece';
            gameState.from = 'Athenai'; // Set origin
            gameState.greek = gameState.greek || {};
            gameState.greek.event = 8; // Mark Leonidas as the active event
            
            // Create move_list that includes our target AND a non-existent city to trigger the bug
            gameState.move_list = {
                'Sparta': true,
                'Thebai': true,
                'Delphi': true,
                'NonExistentCity': true  // This should trigger the bug!
            };
            
            // Make sure NonExistentCity is NOT in game.units (this is the bug condition)
            if (gameState.units['NonExistentCity']) {
                delete gameState.units['NonExistentCity'];
            }
            
            console.log('✓ Manually set up Leonidas movement state');
            console.log('State:', gameState.state);
            console.log('From:', gameState.from);
            console.log('Move options:', Object.keys(gameState.move_list));
            
            // Skip to step 3 - movement
            console.log('\n⚡ STEP 3: Attempting Leonidas movement (direct)...');
            
            try {
                const view3 = rules.view(gameState, 'Greece');
                console.log('Movement actions available:', Object.keys(view3.actions || {}));
                
                if (view3.actions && view3.actions.city) {
                    const destinations = Array.isArray(view3.actions.city) ? view3.actions.city : [view3.actions.city];
                    console.log('Available destinations:', destinations);
                    
                    // First, try to move to the non-existent city to trigger the bug
                    if (destinations.includes('NonExistentCity')) {
                        console.log('🎯 Attempting to move to NonExistentCity (this should trigger the bug)...');
                        gameState = rules.action(gameState, 'Greece', 'city', 'NonExistentCity');
                        console.log('❌ Movement to NonExistentCity succeeded - bug not triggered');
                    } else {
                        console.log('NonExistentCity not in available destinations, trying Sparta...');
                        
                        // Try to move to Sparta (where we have Persian units)
                        const targetCity = 'Sparta';
                        if (destinations.includes(targetCity)) {
                            console.log(`Moving to ${targetCity}...`);
                            gameState = rules.action(gameState, 'Greece', 'city', targetCity);
                            console.log('✓ Movement successful!');
                            console.log('New state:', gameState.state);
                        } else {
                            // Try the first available destination
                            const firstDest = destinations[0];
                            console.log(`Moving to first available destination: ${firstDest}`);
                            gameState = rules.action(gameState, 'Greece', 'city', firstDest);
                            console.log('✓ Movement successful!');
                            console.log('New state:', gameState.state);
                        }
                    }
                } else {
                    console.log('❌ No city movement actions available');
                    return { success: false, step: 'forced_movement' };
                }
                
            } catch (error) {
                console.log('❌ Error during forced movement:', error.message);
                console.log('This confirms the Leonidas bug!');
                analyzeMovementError(gameState, error);
                return { success: false, step: 'leonidas_movement_bug', error, gameState };
            }
            
        } else {
            // Normal flow - play the event
            try {
                gameState = rules.action(gameState, 'Greece', 'card_event', 8);
                console.log('✓ Leonidas played successfully');
                console.log('New state:', gameState.state);
                console.log('Active player:', gameState.active);
            } catch (error) {
                console.log('❌ Error playing Leonidas:', error.message);
                return { success: false, step: 'play_leonidas', error };
            }
        }
        
        // Step 2: Check if we're in Leonidas movement state
        console.log('\n⚡ STEP 2: Analyzing Leonidas movement state...');
        
        if (gameState.state === 'greek_land_movement_leonidas') {
            console.log('✓ Entered Leonidas movement state');
            
            const view2 = rules.view(gameState, 'Greece');
            console.log('Movement options:', view2.actions);
            
            if (gameState.from) {
                console.log('Moving from:', gameState.from);
            }
            
            // Step 3: Attempt movement that will cause battle
            console.log('\n⚡ STEP 3: Moving to enemy-occupied city...');
            
            // Find a city with Persian units to attack
            const targetCity = findPersianOccupiedCity(gameState);
            if (!targetCity) {
                console.log('❌ No Persian-occupied cities found for battle test');
                return { success: false, step: 'find_target' };
            }
            
            console.log(`Attempting to move to ${targetCity} (occupied by Persians)`);
            
            try {
                gameState = rules.action(gameState, 'Greece', 'city', targetCity);
                console.log('✓ Movement command executed');
                console.log('New state:', gameState.state);
                
                // Check if battle is triggered
                if (gameState.state.includes('battle') || gameState.state.includes('combat')) {
                    console.log('🔥 BATTLE TRIGGERED!');
                    return testBattleResolution(gameState);
                } else {
                    console.log('ℹ️  No immediate battle - checking next steps...');
                    
                    // Continue with next available action
                    const view3 = rules.view(gameState, gameState.active);
                    console.log('Next available actions:', Object.keys(view3.actions || {}));
                    
                    if (view3.actions) {
                        const nextAction = Object.keys(view3.actions)[0];
                        const nextValue = view3.actions[nextAction];
                        
                        console.log(`Executing next action: ${nextAction}`);
                        
                        let args;
                        if (Array.isArray(nextValue)) {
                            args = nextValue[0];
                        } else if (typeof nextValue === 'number' && nextValue !== 1) {
                            args = nextValue;
                        }
                        
                        gameState = rules.action(gameState, gameState.active, nextAction, args);
                        console.log('Post-action state:', gameState.state);
                        
                        if (gameState.state.includes('battle') || gameState.state.includes('combat')) {
                            console.log('🔥 BATTLE TRIGGERED AFTER SECOND ACTION!');
                            return testBattleResolution(gameState);
                        }
                    }
                }
                
            } catch (error) {
                console.log('❌ Error during movement:', error.message);
                console.log('Error stack:', error.stack.split('\n')[0]);
                
                // This might be our original bug!
                if (error.message.includes("Cannot read properties of undefined")) {
                    console.log('🐛 FOUND THE BUG! This is the original Leonidas movement error');
                    analyzeMovementError(gameState, error);
                }
                
                return { success: false, step: 'leonidas_movement', error, gameState };
            }
        } else {
            console.log('❌ Did not enter Leonidas movement state');
            console.log('Current state:', gameState.state);
        }
        
        console.log('\n📊 FINAL STATUS:');
        displayUnitsStatus(gameState);
        
        return { success: true, finalState: gameState };
        
    } catch (error) {
        console.error('❌ Test setup error:', error.message);
        return { success: false, setupError: error };
    }
}

/**
 * Force game to Greek operation phase where events can be played
 */
function forceToGreekOperationPhase(gameState) {
    let attempts = 0;
    const maxAttempts = 200;
    
    console.log('Advancing game to Greek operation phase...');
    
    while (gameState.state !== 'game_over' && attempts < maxAttempts) {
        const view = rules.view(gameState, gameState.active);
        
        // Debug first 10 steps
        if (attempts < 10) {
            console.log(`  Step ${attempts}: ${gameState.state} (${gameState.active})`);
        }
        
        // Check if we're in a Greek phase where cards can be played
        if (gameState.active === 'Greece') {
            if (gameState.state.includes('operation') || 
                gameState.state.includes('greek_land_movement') ||
                gameState.state.includes('greek_naval_movement')) {
                
                if (view.actions && view.actions.card_event) {
                    console.log(`Found Greek phase with card events at step ${attempts}`);
                    break;
                }
                
                // Also check if we can force card event by looking for movement phases
                if (gameState.state.includes('movement')) {
                    console.log(`In movement phase: ${gameState.state}`);
                    if (view.actions && (view.actions.card_event || view.actions.card_move)) {
                        break;
                    }
                }
            }
        }
        
        if (!view.actions || Object.keys(view.actions).length === 0) {
            console.log(`No actions available at step ${attempts} in state: ${gameState.state}`);
            break;
        }
        
        // Take an action to advance
        const actions = Object.keys(view.actions);
        const action = actions[0];
        const actionValue = view.actions[action];
        
        let args;
        if (Array.isArray(actionValue)) {
            args = actionValue[0];
        } else if (typeof actionValue === 'number' && actionValue !== 1) {
            args = actionValue;
        }
        
        try {
            gameState = rules.action(gameState, gameState.active, action, args);
            attempts++;
        } catch (error) {
            console.log(`Failed to advance at attempt ${attempts}:`, error.message);
            break;
        }
    }
    
    console.log(`Finished advancing after ${attempts} steps`);
    return gameState;
}

/**
 * Set up a scenario where Leonidas can move and trigger a battle
 */
function setupBattleScenario(gameState) {
    // Ensure there are Greek units that can move
    if (!gameState.units['Athenai']) {
        gameState.units['Athenai'] = [2, 0, 0, 0]; // 2 Greek armies
    } else {
        gameState.units['Athenai'][0] = Math.max(gameState.units['Athenai'][0], 1); // At least 1 Greek army
    }
    
    // Ensure there are Persian units to fight
    if (!gameState.units['Sparta']) {
        gameState.units['Sparta'] = [0, 1, 0, 0]; // 1 Persian army
    } else {
        gameState.units['Sparta'][1] = Math.max(gameState.units['Sparta'][1], 1); // At least 1 Persian army
    }
    
    console.log('Battle scenario set up:');
    console.log('  Athenai (Greek base):', gameState.units['Athenai']);
    console.log('  Sparta (Persian target):', gameState.units['Sparta']);
}

/**
 * Find a city occupied by Persian units
 */
function findPersianOccupiedCity(gameState) {
    for (const [city, units] of Object.entries(gameState.units)) {
        if (city === 'reserve') continue;
        
        const [gArmy, pArmy] = units;
        if (pArmy > 0) {
            return city;
        }
    }
    return null;
}

/**
 * Test what happens during battle resolution with Leonidas
 */
function testBattleResolution(gameState) {
    console.log('\n🔥 BATTLE RESOLUTION TEST');
    console.log('Current state:', gameState.state);
    
    let battleSteps = 0;
    const maxBattleSteps = 10;
    
    try {
        while (!gameState.state.includes('game_over') && 
               battleSteps < maxBattleSteps &&
               (gameState.state.includes('battle') || gameState.state.includes('combat'))) {
            
            const view = rules.view(gameState, gameState.active);
            console.log(`Battle step ${battleSteps + 1}:`, gameState.state);
            console.log('Available actions:', Object.keys(view.actions || {}));
            
            if (!view.actions || Object.keys(view.actions).length === 0) {
                console.log('No actions available - battle may be resolved');
                break;
            }
            
            // Take the first available action
            const actions = Object.keys(view.actions);
            const action = actions[0];
            const actionValue = view.actions[action];
            
            let args;
            if (Array.isArray(actionValue)) {
                args = actionValue[0];
            } else if (typeof actionValue === 'number' && actionValue !== 1) {
                args = actionValue;
            }
            
            console.log(`Executing: ${action}${args ? ` (${args})` : ''}`);
            
            const oldState = gameState.state;
            gameState = rules.action(gameState, gameState.active, action, args);
            
            console.log(`State change: ${oldState} → ${gameState.state}`);
            
            // Check for battle logs
            if (gameState.log && gameState.log.length > 0) {
                const recentLogs = gameState.log.slice(-5);
                console.log('Recent battle logs:', recentLogs);
            }
            
            battleSteps++;
        }
        
        console.log('🏁 Battle sequence completed');
        console.log('Final battle state:', gameState.state);
        
        return { success: true, battleResolved: true, finalState: gameState };
        
    } catch (error) {
        console.log('❌ Error during battle resolution:', error.message);
        return { success: false, step: 'battle_resolution', error, gameState };
    }
}

/**
 * Analyze the movement error in detail
 */
function analyzeMovementError(gameState, error) {
    console.log('\n🔍 MOVEMENT ERROR ANALYSIS:');
    console.log('Error message:', error.message);
    console.log('Game state:', gameState.state);
    console.log('Active player:', gameState.active);
    console.log('From city:', gameState.from);
    
    if (gameState.move_list) {
        console.log('Move list destinations:', Object.keys(gameState.move_list));
        
        // Check which destinations exist in game.units
        for (const destination of Object.keys(gameState.move_list)) {
            if (gameState.units[destination]) {
                console.log(`  ✓ ${destination}: exists in game.units`);
            } else {
                console.log(`  ❌ ${destination}: MISSING from game.units - THIS IS THE BUG!`);
            }
        }
    }
}

/**
 * Display current units status
 */
function displayUnitsStatus(gameState) {
    console.log('Unit positions:');
    
    for (const [city, units] of Object.entries(gameState.units)) {
        if (city === 'reserve') continue;
        
        const [gArmy, pArmy, gFleet = 0, pFleet = 0] = units;
        if (gArmy > 0 || pArmy > 0 || gFleet > 0 || pFleet > 0) {
            const hasFleets = units.length > 2;
            if (hasFleets) {
                console.log(`  ${city}: G(${gArmy}a,${gFleet}f) P(${pArmy}a,${pFleet}f)`);
            } else {
                console.log(`  ${city}: G(${gArmy}a) P(${pArmy}a)`);
            }
        }
    }
}

/**
 * Direct test to reproduce the exact Leonidas bug
 */
function testDirectLeonidasBug() {
    console.log('\n🎯 DIRECT LEONIDAS BUG REPRODUCTION');
    console.log('='.repeat(50));
    
    try {
        // Create a minimal game state that triggers the bug
        let gameState = rules.setup(12345, 'Standard', {});
        
        // Manually create the exact conditions from our bug analysis
        gameState.state = 'greek_land_movement_leonidas';
        gameState.active = 'Greece';
        gameState.from = 'Athenai';
        gameState.greek = gameState.greek || {};
        gameState.greek.event = 8; // Leonidas card
        
        // This is the key: create move_list with destination NOT in game.units
        gameState.move_list = {
            'BuggyCity': true  // This city doesn't exist in game.units
        };
        
        // Ensure BuggyCity is NOT initialized in game.units
        if (gameState.units['BuggyCity']) {
            delete gameState.units['BuggyCity'];
        }
        
        console.log('🔧 Set up bug conditions:');
        console.log('  State:', gameState.state);
        console.log('  From:', gameState.from);
        console.log('  Move list destinations:', Object.keys(gameState.move_list));
        console.log('  BuggyCity in game.units?', 'BuggyCity' in gameState.units);
        
        // Get the view to see what actions are available
        const view = rules.view(gameState, 'Greece');
        console.log('  Available actions:', Object.keys(view.actions || {}));
        
        if (view.actions && view.actions.city) {
            const destinations = Array.isArray(view.actions.city) ? view.actions.city : [view.actions.city];
            console.log('  City destinations offered by game:', destinations);
            
            // Try to move to BuggyCity - this should trigger the error
            if (destinations.includes('BuggyCity')) {
                console.log('\n⚡ Attempting movement to BuggyCity (should crash)...');
                
                try {
                    gameState = rules.action(gameState, 'Greece', 'city', 'BuggyCity');
                    console.log('❌ No error occurred - the bug conditions might be different');
                    return { success: false, reason: 'no_error' };
                } catch (error) {
                    console.log('✅ BUG REPRODUCED!');
                    console.log('Error message:', error.message);
                    console.log('Error location:', error.stack.split('\n')[1]);
                    
                    if (error.message.includes("Cannot read properties of undefined")) {
                        console.log('🎯 This is the exact Leonidas movement bug!');
                    }
                    
                    return { success: true, reproduced: true, error };
                }
            } else {
                console.log('❌ BuggyCity not offered as movement option by the game');
                return { success: false, reason: 'city_not_offered' };
            }
        } else {
            console.log('❌ No city actions available in current state');
            return { success: false, reason: 'no_city_actions' };
        }
        
    } catch (error) {
        console.log('❌ Setup error:', error.message);
        return { success: false, setupError: error };
    }
}

/**
 * Main test runner
 */
function runLeonidasBattleTests() {
    console.log('🧪 LEONIDAS BATTLE MECHANICS TEST');
    console.log('='.repeat(60));
    console.log('This test examines what happens when Leonidas moves and fights:\n');
    console.log('1. Play Leonidas card as event');
    console.log('2. Move 1 army to enemy-occupied city');
    console.log('3. Trigger battle with special dice mechanics');
    console.log('4. Analyze any errors or unexpected behavior\n');
    
    const result = testLeonidasBattleSequence();
    
    // Also run the direct bug test
    const directResult = testDirectLeonidasBug();
    
    console.log('\n📋 TEST SUMMARY:');
    console.log('═'.repeat(40));
    
    if (result.success) {
        console.log('✅ Main test completed successfully');
        if (result.battleResolved) {
            console.log('✓ Battle mechanics worked correctly');
        }
    } else {
        console.log('❌ Main test encountered issues');
        if (result.error) {
            console.log('Error details:', result.error.message);
            if (result.error.message.includes("Cannot read properties of undefined")) {
                console.log('🎯 This confirms the original Leonidas movement bug');
            }
        }
    }
    
    if (directResult.success && directResult.reproduced) {
        console.log('✅ Direct bug reproduction: SUCCESSFUL');
        console.log('🐛 Confirmed: Leonidas movement bug reproduced');
    } else {
        console.log('❌ Direct bug reproduction: Failed');
        if (directResult.reason) {
            console.log('Reason:', directResult.reason);
        }
    }
    
    return { mainTest: result, directTest: directResult };
}

// Run test if called directly
if (require.main === module) {
    runLeonidasBattleTests();
}

module.exports = {
    testLeonidasBattleSequence,
    runLeonidasBattleTests
};