"use strict";

/**
 * Real Leonidas Bug with Actual City Names
 * 
 * This test uses actual failed seeds from our 100-game test to show
 * which real cities cause the Leonidas movement bug.
 */

const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);

/**
 * Test using actual seeds that failed with Leonidas bug
 */
function testRealLeonidasFailure() {
    console.log('🏛️  REAL LEONIDAS BUG WITH ACTUAL CITIES');
    console.log('='.repeat(60));
    console.log('Testing with seeds that actually failed in our 100-game test.\n');

    // These are actual seeds that failed with the Leonidas bug
    const failedSeeds = [942359, 942367, 942387, 942401, 942402];

    for (let i = 0; i < failedSeeds.length; i++) {
        const seed = failedSeeds[i];
        console.log(`\n🎲 TESTING SEED ${seed} (${i + 1}/${failedSeeds.length})`);
        console.log('═'.repeat(50));

        try {
            const result = runSeedUntilLeonidasBug(seed);
            
            if (result.bugFound) {
                console.log(`\n🎯 BUG REPRODUCED WITH SEED ${seed}!`);
                console.log('─'.repeat(40));
                console.log('Game state when bug occurred:', result.finalState?.state);
                console.log('Active player:', result.finalState?.active);
                console.log('Step when bug occurred:', result.step);
                
                if (result.gameStateAtBug) {
                    analyzeRealBugState(result.gameStateAtBug, result.error);
                }
                
                return result; // Found one, that's enough
            } else if (result.error) {
                console.log(`❌ Seed ${seed} failed with different error:`, result.error.message);
            } else {
                console.log(`✅ Seed ${seed} completed without Leonidas bug (${result.winner} won in ${result.steps} steps)`);
            }

        } catch (error) {
            console.log(`❌ Setup error with seed ${seed}:`, error.message);
        }
    }

    console.log('\n❌ Could not reproduce Leonidas bug with any of the test seeds');
    return { success: false };
}

/**
 * Run a single seed until we hit the Leonidas bug or game ends
 */
function runSeedUntilLeonidasBug(seed) {
    let gameState = rules.setup(seed, 'Standard', {});
    let step = 0;
    const maxSteps = 500;

    console.log(`Starting game with seed ${seed}...`);

    try {
        while (gameState.state !== 'game_over' && step < maxSteps) {
            const view = rules.view(gameState, gameState.active);
            
            // Check if we're in Leonidas movement state
            if (gameState.state === 'greek_land_movement_leonidas') {
                console.log(`\n🗡️  LEONIDAS MOVEMENT DETECTED at step ${step}!`);
                console.log('Current state:', gameState.state);
                console.log('Active player:', gameState.active);
                console.log('Moving from:', gameState.from);
                
                if (gameState.move_list) {
                    console.log('Available destinations:', Object.keys(gameState.move_list));
                    
                    // Check which destinations might be problematic
                    const problematicCities = [];
                    for (const city of Object.keys(gameState.move_list)) {
                        if (!gameState.units[city]) {
                            problematicCities.push(city);
                        }
                    }
                    
                    if (problematicCities.length > 0) {
                        console.log('🚨 PROBLEMATIC DESTINATIONS (not in game.units):');
                        problematicCities.forEach(city => {
                            console.log(`   ❌ ${city}`);
                        });
                        
                        // Try to trigger the bug by moving to the first problematic city
                        if (view.actions && view.actions.city) {
                            const availableCities = Array.isArray(view.actions.city) ? view.actions.city : [view.actions.city];
                            
                            for (const problemCity of problematicCities) {
                                if (availableCities.includes(problemCity)) {
                                    console.log(`\n💥 Attempting move to problematic city: ${problemCity}`);
                                    
                                    try {
                                        gameState = rules.action(gameState, gameState.active, 'city', problemCity);
                                        console.log(`❌ Unexpected: Move to ${problemCity} succeeded`);
                                    } catch (error) {
                                        console.log(`✅ BUG REPRODUCED! Move to ${problemCity} failed:`);
                                        console.log('Error:', error.message);
                                        
                                        return {
                                            bugFound: true,
                                            step: step,
                                            problematicCity: problemCity,
                                            error: error,
                                            gameStateAtBug: gameState,
                                            finalState: gameState
                                        };
                                    }
                                    break;
                                }
                            }
                        }
                    } else {
                        console.log('✅ All destinations exist in game.units');
                    }
                }
            }
            
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
            gameState = rules.action(gameState, gameState.active, action, args);
            step++;
            
            // Show progress every 50 steps
            if (step % 50 === 0) {
                console.log(`  Step ${step}: ${gameState.state} (${gameState.active})`);
            }
        }

        // Game completed without Leonidas bug
        const winner = determineWinner(gameState);
        return {
            bugFound: false,
            steps: step,
            winner: winner,
            finalState: gameState
        };

    } catch (error) {
        // Check if this is the Leonidas bug
        if (error.message.includes("Cannot read properties of undefined") && 
            gameState.state === 'greek_land_movement_leonidas') {
            
            console.log(`✅ LEONIDAS BUG CAUGHT at step ${step}!`);
            return {
                bugFound: true,
                step: step,
                error: error,
                gameStateAtBug: gameState,
                finalState: gameState
            };
        } else {
            // Different error
            return {
                bugFound: false,
                error: error,
                step: step,
                finalState: gameState
            };
        }
    }
}

/**
 * Analyze the real bug state with actual city names
 */
function analyzeRealBugState(gameState, error) {
    console.log('\n🔍 REAL BUG STATE ANALYSIS:');
    console.log('═'.repeat(50));
    
    console.log('Game State:', gameState.state);
    console.log('Active Player:', gameState.active);
    console.log('Movement From:', gameState.from);
    console.log('Greek Event:', gameState.greek?.event);
    
    if (gameState.move_list) {
        console.log('\nMove List Analysis:');
        for (const city of Object.keys(gameState.move_list)) {
            if (gameState.units[city]) {
                const units = gameState.units[city];
                console.log(`  ✅ ${city}: exists in game.units`, units);
            } else {
                console.log(`  💥 ${city}: MISSING from game.units - THIS IS THE REAL PROBLEMATIC CITY!`);
            }
        }
    }
    
    console.log('\nAll Cities in game.units:');
    const allCities = Object.keys(gameState.units).filter(key => key !== 'reserve');
    console.log('Total:', allCities.length);
    console.log('Cities:', allCities.join(', '));
    
    console.log('\nError Details:');
    console.log('Message:', error.message);
    console.log('Stack:', error.stack.split('\n')[1]?.trim());
    
    // Try to identify the specific problematic city from the error context
    console.log('\n🎯 ROOT CAUSE:');
    console.log('The Leonidas event created a move_list that includes cities');
    console.log('that are not properly initialized in the game.units object.');
    console.log('This suggests an issue with city initialization or connectivity rules.');
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

// Run tests if called directly
if (require.main === module) {
    const result = testRealLeonidasFailure();
    
    console.log('\n📋 FINAL SUMMARY:');
    console.log('═'.repeat(40));
    if (result.success !== false && result.bugFound) {
        console.log('✅ Successfully reproduced Leonidas bug with real cities');
        console.log(`🎯 Problematic city: ${result.problematicCity}`);
        console.log('🔧 This shows the bug occurs with actual game cities, not artificial ones');
    } else {
        console.log('❌ Could not reproduce the bug in this run');
        console.log('💡 The bug may be non-deterministic or require specific conditions');
        console.log('📊 Our 100-game test showed 20% failure rate, so it does occur');
    }
}

module.exports = {
    testRealLeonidasFailure,
    runSeedUntilLeonidasBug
};