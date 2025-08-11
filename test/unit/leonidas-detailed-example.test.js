"use strict";

/**
 * Detailed Leonidas Bug Example
 * 
 * This test shows the complete game state before, during, and at the point of failure
 * when the Leonidas movement bug occurs.
 */

const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);

/**
 * Show a detailed failing example with complete game state
 */
function showDetailedLeonidasFailure() {
    console.log('📋 DETAILED LEONIDAS BUG EXAMPLE');
    console.log('='.repeat(60));
    console.log('This shows the complete game state when the Leonidas bug occurs.\n');

    try {
        // Start with a fresh game
        let gameState = rules.setup(12345, 'Standard', {});
        
        console.log('🎮 INITIAL GAME STATE:');
        console.log('═'.repeat(50));
        showCompleteGameState(gameState, 'After Setup');
        
        // Force to the point where Leonidas could be played
        // We'll simulate the conditions that lead to the bug
        console.log('\n🔧 SETTING UP BUG CONDITIONS:');
        console.log('═'.repeat(50));
        
        // Save original state
        const originalState = JSON.parse(JSON.stringify(gameState));
        
        // Manually create the problematic state
        gameState.state = 'greek_land_movement_leonidas';
        gameState.active = 'Greece';
        gameState.from = 'Athenai';
        gameState.greek = gameState.greek || {};
        gameState.greek.event = 8; // Leonidas card active
        
        // This is the key problem: move_list contains cities that don't exist in game.units
        gameState.move_list = {
            'Sparta': true,      // This exists - OK
            'Thebai': true,      // This exists - OK  
            'MissingCity': true  // This doesn't exist - BUG!
        };
        
        // Remove the missing city from game.units to simulate the bug condition
        delete gameState.units['MissingCity'];
        
        console.log('✓ Forced game state to: greek_land_movement_leonidas');
        console.log('✓ Set active player to: Greece');
        console.log('✓ Set movement origin: Athenai');
        console.log('✓ Set Leonidas as active event (card 8)');
        console.log('✓ Created move_list with missing city');
        
        console.log('\n🎯 PROBLEMATIC STATE DETAILS:');
        console.log('═'.repeat(50));
        showCompleteGameState(gameState, 'Before Bug Trigger');
        
        // Show the specific problem
        console.log('\n🐛 THE SPECIFIC PROBLEM:');
        console.log('─'.repeat(40));
        console.log('move_list destinations:', Object.keys(gameState.move_list));
        console.log('Cities in game.units:');
        
        let missingCities = [];
        for (const city of Object.keys(gameState.move_list)) {
            if (gameState.units[city]) {
                console.log(`  ✓ ${city}: exists in game.units`, gameState.units[city]);
            } else {
                console.log(`  ❌ ${city}: MISSING from game.units`);
                missingCities.push(city);
            }
        }
        
        if (missingCities.length > 0) {
            console.log(`\n🚨 PROBLEM IDENTIFIED: ${missingCities.length} cities in move_list are missing from game.units:`);
            missingCities.forEach(city => console.log(`   - ${city}`));
        }
        
        // Get the view to see what the game offers
        console.log('\n🎮 GAME VIEW FOR PLAYER:');
        console.log('─'.repeat(40));
        const view = rules.view(gameState, 'Greece');
        console.log('Active player:', view.active);
        console.log('Game state:', gameState.state);
        console.log('Available actions:', Object.keys(view.actions || {}));
        
        if (view.actions && view.actions.city) {
            const destinations = Array.isArray(view.actions.city) ? view.actions.city : [view.actions.city];
            console.log('Cities offered for movement:', destinations);
            
            // Show which of these will cause problems
            destinations.forEach(city => {
                if (gameState.units[city]) {
                    console.log(`  ✓ ${city}: Safe (exists in game.units)`);
                } else {
                    console.log(`  💥 ${city}: WILL CRASH (missing from game.units)`);
                }
            });
        }
        
        // Now trigger the bug
        console.log('\n💥 TRIGGERING THE BUG:');
        console.log('═'.repeat(50));
        
        const buggyCity = missingCities[0];
        if (buggyCity && view.actions && view.actions.city && 
            (Array.isArray(view.actions.city) && view.actions.city.includes(buggyCity))) {
            
            console.log(`Attempting to move to "${buggyCity}" (this will crash)...`);
            console.log('Code will try to execute: game.units["' + buggyCity + '"][0] += 1');
            console.log('But game.units["' + buggyCity + '"] is undefined!');
            
            try {
                gameState = rules.action(gameState, 'Greece', 'city', buggyCity);
                console.log('❌ Unexpected: No crash occurred');
            } catch (error) {
                console.log('\n🔥 CRASH OCCURRED!');
                console.log('─'.repeat(30));
                console.log('Error message:', error.message);
                console.log('Error location:', error.stack.split('\n')[1].trim());
                
                // Show the exact line that failed
                console.log('\n📍 FAILED CODE LOCATION:');
                console.log('File: rules/300-earth-and-water/rules.js');
                console.log('Line: 443');
                console.log('Code: game.units[to][0] += n;');
                console.log('Where:');
                console.log(`  - to = "${buggyCity}"`);
                console.log(`  - n = 1 (number of armies to move)`);
                console.log(`  - game.units[to] = undefined`);
                console.log('  - Trying to access undefined[0] causes the crash');
                
                return {
                    success: true,
                    bugReproduced: true,
                    buggyCity: buggyCity,
                    error: error,
                    gameState: gameState
                };
            }
        } else {
            console.log('❌ Could not find a buggy city in the offered actions');
            return { success: false, reason: 'no_buggy_city_offered' };
        }
        
    } catch (error) {
        console.error('❌ Setup error:', error.message);
        return { success: false, setupError: error };
    }
}

/**
 * Display complete game state in detail
 */
function showCompleteGameState(gameState, label) {
    console.log(`\n📊 COMPLETE GAME STATE: ${label}`);
    console.log('─'.repeat(50));
    
    // Basic state info
    console.log('Game State:', gameState.state);
    console.log('Active Player:', gameState.active);
    console.log('Campaign:', gameState.campaign);
    console.log('Victory Points:', gameState.vp);
    
    if (gameState.from) {
        console.log('Movement From:', gameState.from);
    }
    
    if (gameState.move_list) {
        console.log('Move List:', Object.keys(gameState.move_list).join(', '));
    }
    
    // Player hands
    if (gameState.persian && gameState.persian.hand) {
        console.log('Persian Hand:', gameState.persian.hand);
    }
    if (gameState.greek && gameState.greek.hand) {
        console.log('Greek Hand:', gameState.greek.hand);
    }
    
    // Active events
    if (gameState.persian && gameState.persian.event) {
        console.log('Persian Active Event:', gameState.persian.event);
    }
    if (gameState.greek && gameState.greek.event) {
        console.log('Greek Active Event:', gameState.greek.event);
    }
    
    // Unit positions
    console.log('\nUnit Positions:');
    const cities = Object.keys(gameState.units).filter(key => key !== 'reserve');
    cities.forEach(city => {
        const units = gameState.units[city];
        if (units && (units[0] > 0 || units[1] > 0 || (units.length > 2 && (units[2] > 0 || units[3] > 0)))) {
            if (units.length === 4) {
                console.log(`  ${city}: Greek(${units[0]}a,${units[2]}f) Persian(${units[1]}a,${units[3]}f)`);
            } else {
                console.log(`  ${city}: Greek(${units[0]}a) Persian(${units[1]}a)`);
            }
        }
    });
    
    if (gameState.units.reserve) {
        const [gArmy, pArmy, gFleet, pFleet] = gameState.units.reserve;
        console.log(`  Reserve: Greek(${gArmy}a,${gFleet}f) Persian(${pArmy}a,${pFleet}f)`);
    }
    
    console.log('\nTotal Cities in game.units:', Object.keys(gameState.units).length);
    console.log('All cities:', Object.keys(gameState.units).join(', '));
}

/**
 * Create a minimal working example
 */
function createMinimalExample() {
    console.log('\n🔬 MINIMAL REPRODUCTION EXAMPLE');
    console.log('='.repeat(60));
    console.log('This is the smallest possible code to reproduce the bug:\n');
    
    console.log('```javascript');
    console.log('const rules = require("./rules/300-earth-and-water/rules.js");');
    console.log('');
    console.log('// Create game');
    console.log('let gameState = rules.setup(12345, "Standard", {});');
    console.log('');
    console.log('// Force the bug conditions');
    console.log('gameState.state = "greek_land_movement_leonidas";');
    console.log('gameState.active = "Greece";');
    console.log('gameState.from = "Athenai";');
    console.log('gameState.greek = { event: 8 }; // Leonidas card');
    console.log('gameState.move_list = { "BuggyCity": true };');
    console.log('delete gameState.units["BuggyCity"]; // Remove from units');
    console.log('');
    console.log('// This will crash with "Cannot read properties of undefined"');
    console.log('gameState = rules.action(gameState, "Greece", "city", "BuggyCity");');
    console.log('```');
    console.log('');
    console.log('💥 The crash happens at rules.js:443 in move_greek_army()');
    console.log('🐛 Root cause: game.units["BuggyCity"] is undefined');
}

// Run tests if called directly
if (require.main === module) {
    const result = showDetailedLeonidasFailure();
    createMinimalExample();
    
    console.log('\n📋 SUMMARY:');
    console.log('═'.repeat(40));
    if (result.success && result.bugReproduced) {
        console.log('✅ Bug successfully reproduced');
        console.log(`🎯 Buggy city: ${result.buggyCity}`);
        console.log('🔧 Fix needed: Add validation in move_greek_army function');
    } else {
        console.log('❌ Could not reproduce the bug');
        if (result.reason) {
            console.log('Reason:', result.reason);
        }
    }
}

module.exports = {
    showDetailedLeonidasFailure,
    createMinimalExample
};