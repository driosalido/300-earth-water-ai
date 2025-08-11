"use strict";

/**
 * Test case for the Leonidas movement bug
 * 
 * This test reproduces the error found in random games:
 * "Cannot read properties of undefined (reading '0')" at rules.js:443
 * when the Leonidas card is played and moves to an uninitialized city.
 */

const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);

/**
 * Try to reproduce the bug by setting up the exact conditions where it occurs
 */
function testLeonidasBug() {
    console.log('🐛 Testing Leonidas movement bug...\n');
    
    try {
        // Use one of the seeds that caused errors in our 100-game test
        const bugSeeds = [942359, 942367, 942387, 942401, 942402]; // Seeds that failed
        
        for (let i = 0; i < bugSeeds.length; i++) {
            const seed = bugSeeds[i];
            console.log(`Testing seed ${seed} (${i + 1}/${bugSeeds.length})...`);
            
            try {
                const result = testSingleSeed(seed);
                if (result.error) {
                    console.log(`✅ Successfully reproduced bug with seed ${seed}!`);
                    console.log(`Error details:`, result.error.message);
                    console.log(`Error stack:`, result.error.stack.split('\n')[0]);
                    console.log(`Game state when error occurred:`, result.finalState?.state);
                    console.log(`Step when error occurred:`, result.step);
                    
                    // Let's analyze the game state
                    if (result.gameState) {
                        analyzeGameState(result.gameState);
                    }
                    
                    return { success: true, seed: seed, error: result.error, gameState: result.gameState };
                } else {
                    console.log(`❌ Seed ${seed} completed without error (${result.winner} won in ${result.steps} steps)`);
                }
            } catch (error) {
                console.log(`❌ Unexpected error with seed ${seed}:`, error.message);
            }
        }
        
        console.log(`\n❌ Could not reproduce the Leonidas bug with any of the test seeds.`);
        return { success: false };
        
    } catch (error) {
        console.error('❌ Test setup error:', error.message);
        return { success: false, setupError: error };
    }
}

/**
 * Test a single seed to see if it reproduces the bug
 */
function testSingleSeed(seed) {
    let gameState = rules.setup(seed, 'Standard', {});
    let step = 0;
    const maxSteps = 200; // Keep it reasonable
    
    try {
        while (gameState.state !== 'game_over' && step < maxSteps) {
            const view = rules.view(gameState, gameState.active);
            
            if (!view.actions || Object.keys(view.actions).length === 0) {
                break;
            }
            
            // Take first available action
            const actions = Object.keys(view.actions);
            const action = actions[0];
            const actionValue = view.actions[action];
            
            let args;
            if (Array.isArray(actionValue)) {
                args = actionValue[0];
            } else if (typeof actionValue === 'number' && actionValue !== 1) {
                args = actionValue;
            }
            
            // Execute the action
            const previousState = gameState.state;
            gameState = rules.action(gameState, gameState.active, action, args);
            step++;
            
            // Check if we're in the problematic state
            if (gameState.state === 'greek_land_movement_leonidas' || previousState === 'greek_land_movement_leonidas') {
                console.log(`  → Step ${step}: ${previousState} -> ${gameState.state} (${action}${args ? ` ${args}` : ''})`);
            }
        }
        
        // If we get here, no error occurred
        const winner = determineWinner(gameState);
        return { 
            success: true, 
            winner: winner, 
            steps: step,
            finalState: gameState
        };
        
    } catch (error) {
        // Error occurred - this is what we're looking for!
        return { 
            error: error, 
            step: step, 
            gameState: gameState 
        };
    }
}

/**
 * Analyze the game state when the error occurred
 */
function analyzeGameState(gameState) {
    console.log('\n🔍 GAME STATE ANALYSIS:');
    console.log('━'.repeat(50));
    
    console.log(`State: ${gameState.state}`);
    console.log(`Active player: ${gameState.active}`);
    console.log(`Campaign: ${gameState.campaign}`);
    console.log(`VP: ${gameState.vp}`);
    
    if (gameState.from) {
        console.log(`Moving from: ${gameState.from}`);
    }
    
    if (gameState.where) {
        console.log(`Current where: ${gameState.where}`);
    }
    
    // Check move_list
    if (gameState.move_list) {
        console.log(`Available moves:`, Object.keys(gameState.move_list));
    }
    
    // Check units at various locations
    console.log('\nUnit distribution:');
    const importantCities = ['Abydos', 'Athenai', 'Ephesos', 'Sparta', 'Korinthos', 'Thebai', 'Pella', 'Delphi', 'Naxos', 'Eretria', 'Larissa'];
    for (const city of importantCities) {
        if (gameState.units[city]) {
            const units = gameState.units[city];
            if (units.length === 4) {
                console.log(`  ${city}: G:${units[0]}/${units[2]} P:${units[1]}/${units[3]} (armies/fleets)`);
            } else {
                console.log(`  ${city}: G:${units[0]} P:${units[1]} (armies only)`);
            }
        } else {
            console.log(`  ${city}: ❌ UNDEFINED - This might be the problem!`);
        }
    }
    
    // Check if there are cities in move_list that aren't in units
    if (gameState.move_list) {
        console.log('\n⚠️  POTENTIAL PROBLEMS:');
        for (const destination of Object.keys(gameState.move_list)) {
            if (!gameState.units[destination]) {
                console.log(`  ❌ Destination "${destination}" in move_list but not in game.units!`);
            }
        }
    }
}

/**
 * Simple winner determination
 */
function determineWinner(gameState) {
    if (gameState.state !== 'game_over') {
        return 'incomplete';
    }
    
    if (gameState.vp > 0) {
        return 'Persia';
    } else if (gameState.vp < 0) {
        return 'Greece';
    } else {
        return 'tie';
    }
}

/**
 * Create a more targeted test that directly creates the error condition
 */
function testDirectLeonidasBug() {
    console.log('\n🎯 Direct Leonidas Bug Test...\n');
    
    try {
        // Create a minimal game state that should trigger the bug
        let gameState = rules.setup(12345, 'Standard', {});
        
        // Manually set up the conditions that lead to the bug
        // Force the game into a state where Leonidas is active
        gameState.state = 'greek_land_movement_leonidas';
        gameState.active = 'Greece';
        gameState.from = 'Athenai'; // Move from Athens
        gameState.greek.event = 8; // Leonidas card
        
        // Create a move_list with a destination that doesn't exist in units
        gameState.move_list = {
            'NonExistentCity': true,
            'Sparta': true
        };
        
        // Try to get the view - this should show available actions
        const view = rules.view(gameState, 'Greece');
        console.log('Available actions:', Object.keys(view.actions || {}));
        
        if (view.actions && view.actions.city) {
            console.log('Cities available for movement:', view.actions.city);
            
            // Try to move to a city that doesn't exist in game.units
            // This should trigger the error
            try {
                console.log('\nAttempting to move to non-existent city...');
                const newGameState = rules.action(gameState, 'Greece', 'city', 'NonExistentCity');
                console.log('❌ No error occurred - the bug might be fixed or conditions are different');
            } catch (error) {
                console.log('✅ Successfully reproduced the bug!');
                console.log('Error:', error.message);
                console.log('Error location:', error.stack.split('\n')[1]);
                return { success: true, error: error };
            }
        } else {
            console.log('❌ No city actions available in the current state');
        }
        
        return { success: false, reason: 'Could not trigger the conditions' };
        
    } catch (error) {
        console.error('❌ Direct test error:', error.message);
        return { success: false, setupError: error };
    }
}

// Run the tests
function runLeonidasBugTests() {
    console.log('🧪 LEONIDAS BUG REPRODUCTION TESTS');
    console.log('=' .repeat(60));
    console.log('This test attempts to reproduce the bug found in random games where');
    console.log('move_greek_army fails because game.units[destination] is undefined.\n');
    
    // First, try with the actual seeds that failed
    const seedTestResult = testLeonidasBug();
    
    // Then try a direct approach
    const directTestResult = testDirectLeonidasBug();
    
    console.log('\n📋 TEST SUMMARY:');
    console.log('═'.repeat(40));
    if (seedTestResult.success || directTestResult.success) {
        console.log('✅ Bug successfully reproduced!');
        if (seedTestResult.success) {
            console.log(`   Reproduction method: Seed-based (seed: ${seedTestResult.seed})`);
        }
        if (directTestResult.success) {
            console.log('   Reproduction method: Direct state manipulation');
        }
    } else {
        console.log('❌ Could not reproduce the bug');
        console.log('   This might mean:');
        console.log('   1. The bug has been fixed');
        console.log('   2. The bug requires more specific conditions');
        console.log('   3. The bug is non-deterministic');
    }
    
    return seedTestResult.success || directTestResult.success;
}

// Run tests if called directly
if (require.main === module) {
    runLeonidasBugTests();
}

module.exports = {
    testLeonidasBug,
    testDirectLeonidasBug,
    runLeonidasBugTests
};