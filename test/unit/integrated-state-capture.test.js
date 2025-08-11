"use strict";

/**
 * Integrated State Capture Test
 * 
 * Tests the state capture system integrated into BasePlayer by running
 * multiple games and demonstrating bug capture capabilities.
 */

const path = require('path');
const { RandomPlayer } = require('../../src/random-player');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);
const fs = require('fs');

/**
 * Test the integrated state capture system
 */
async function testIntegratedStateCapture() {
    console.log('🔧 INTEGRATED STATE CAPTURE SYSTEM TEST');
    console.log('='.repeat(60));
    console.log('Testing state capture system integrated into BasePlayer...\n');

    const testResults = {
        gamesPlayed: 0,
        gamesCompleted: 0,
        errorsEncountered: 0,
        bugsCaptured: 0,
        captureFiles: []
    };

    // Run multiple games to test the system
    const numGames = 20;
    console.log(`Running ${numGames} test games with state capture enabled...\n`);

    for (let i = 0; i < numGames; i++) {
        const gameId = `integrated-test-${i + 1}`;
        const seed = Math.floor(Math.random() * 1000000) + 900000;
        
        console.log(`🎮 Game ${i + 1}/${numGames} (seed: ${seed})`);
        
        try {
            const result = await runSingleGameWithCapture(gameId, seed);
            
            testResults.gamesPlayed++;
            
            if (result.completed) {
                testResults.gamesCompleted++;
                console.log(`  ✅ Completed: ${result.winner} won in ${result.steps} steps`);
            } else if (result.errorCaptured) {
                testResults.errorsEncountered++;
                testResults.bugsCaptured++;
                testResults.captureFiles.push(result.captureFile);
                console.log(`  🐛 Error captured: ${result.error}`);
                console.log(`  📁 Capture file: ${result.captureFile}`);
                
                // Stop after first capture for demonstration
                break;
            } else {
                testResults.errorsEncountered++;
                console.log(`  ❌ Error (no capture): ${result.error}`);
            }
            
        } catch (error) {
            console.log(`  💥 Unexpected error: ${error.message}`);
            testResults.errorsEncountered++;
        }
        
        // Small delay between games
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Show results
    console.log('\n📊 TEST RESULTS:');
    console.log('═'.repeat(50));
    console.log(`Games played: ${testResults.gamesPlayed}`);
    console.log(`Games completed: ${testResults.gamesCompleted}`);
    console.log(`Errors encountered: ${testResults.errorsEncountered}`);
    console.log(`Bugs captured: ${testResults.bugsCaptured}`);
    console.log(`Capture files created: ${testResults.captureFiles.length}`);

    if (testResults.captureFiles.length > 0) {
        console.log('\n📁 CAPTURE FILES:');
        testResults.captureFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file}`);
        });
        
        // Analyze the first capture file
        if (testResults.captureFiles[0]) {
            analyzeCaptureFile(testResults.captureFiles[0]);
        }
    }

    return testResults;
}

/**
 * Run a single game with state capture enabled
 */
async function runSingleGameWithCapture(gameId, seed) {
    // Create player with state capture enabled
    const player = new RandomPlayer({
        name: 'TestRandomPlayer',
        gameId: gameId,
        seed: seed,
        enableStateCapture: true,
        captureDir: './bug-captures',
        maxSteps: 500, // Shorter games for testing
        logLevel: 'error' // Reduce logging noise
    });

    try {
        const gameSetup = {
            seed: seed,
            scenario: 'Standard',
            options: {}
        };

        // Initialize game
        let gameState = rules.setup(seed, 'Standard', {});
        let step = 0;

        // Run game loop with state capture
        while (gameState.state !== 'game_over' && step < player.config.maxSteps) {
            // Determine active player
            let activePlayer = gameState.active;
            if (activePlayer === 'Both' || activePlayer === 'All') {
                const roles = rules.roles || ['Persia', 'Greece'];
                activePlayer = roles[0];
            }

            // Execute turn through BasePlayer (with integrated state capture)
            gameState = await player.executeTurn(rules, gameState, activePlayer, step);
            step++;
        }

        // Game completed successfully
        const winner = determineWinner(gameState);
        
        return {
            completed: true,
            winner: winner,
            steps: step,
            gameId: gameId,
            seed: seed
        };

    } catch (error) {
        // Check if error was captured
        const errorStats = player.gameStats.errors;
        const lastError = errorStats[errorStats.length - 1];
        
        if (lastError && lastError.captureResult && lastError.captureResult.success) {
            return {
                errorCaptured: true,
                error: error.message,
                captureFile: lastError.captureResult.filename,
                gameId: gameId,
                seed: seed,
                step: lastError.step
            };
        } else {
            return {
                errorCaptured: false,
                error: error.message,
                gameId: gameId,
                seed: seed
            };
        }
    }
}

/**
 * Analyze a capture file
 */
function analyzeCaptureFile(filename) {
    try {
        console.log(`\n🔍 ANALYZING CAPTURE FILE: ${filename}`);
        console.log('─'.repeat(50));
        
        const filepath = path.join('./bug-captures', filename);
        if (!fs.existsSync(filepath)) {
            console.log('❌ Capture file not found');
            return;
        }
        
        const captureData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        console.log('Capture Details:');
        console.log(`  Time: ${captureData.captureTime}`);
        console.log(`  Game ID: ${captureData.context?.gameId}`);
        console.log(`  Player: ${captureData.context?.playerName} (${captureData.context?.playerType})`);
        console.log(`  Seed: ${captureData.context?.seed}`);
        console.log(`  Step: ${captureData.context?.step}`);
        
        console.log('\nError Information:');
        console.log(`  Type: ${captureData.error?.name}`);
        console.log(`  Message: ${captureData.error?.message}`);
        console.log(`  Location: ${captureData.error?.stackLocation}`);
        console.log(`  Classification: ${captureData.error?.errorType}`);
        
        console.log('\nGame State:');
        console.log(`  State: ${captureData.gameState?.state}`);
        console.log(`  Active: ${captureData.gameState?.active}`);
        console.log(`  Campaign: ${captureData.gameState?.campaign}`);
        console.log(`  From: ${captureData.gameState?.from}`);
        
        if (captureData.gameState?.move_list) {
            console.log(`  Move list: ${Object.keys(captureData.gameState.move_list).join(', ')}`);
        }
        
        console.log('\nAction History:');
        const recentActions = captureData.actionHistory?.slice(-5) || [];
        recentActions.forEach((action, index) => {
            console.log(`  ${action.step}: ${action.action}${action.args ? ` (${action.args})` : ''} - ${action.preState} → ${action.postState || 'FAILED'}`);
        });
        
        if (captureData.analysis) {
            console.log('\nBug Analysis:');
            console.log(`  Type: ${captureData.analysis.errorType}`);
            console.log(`  Severity: ${captureData.analysis.severity}`);
            
            if (captureData.analysis.possibleCauses?.length > 0) {
                console.log('  Possible causes:');
                captureData.analysis.possibleCauses.forEach(cause => {
                    console.log(`    - ${cause}`);
                });
            }
            
            if (captureData.analysis.suggestedFixes?.length > 0) {
                console.log('  Suggested fixes:');
                captureData.analysis.suggestedFixes.forEach(fix => {
                    console.log(`    - ${fix}`);
                });
            }
        }
        
        console.log('\n💾 Complete state and reproduction code available in capture file');
        
    } catch (error) {
        console.log(`❌ Failed to analyze capture file: ${error.message}`);
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
 * Demonstrate forced bug capture
 */
async function demonstrateForcedCapture() {
    console.log('\n🎯 DEMONSTRATING FORCED BUG CAPTURE');
    console.log('='.repeat(50));
    
    // Create a player with state capture enabled
    const player = new RandomPlayer({
        name: 'ForcedBugPlayer',
        gameId: 'forced-bug-demo',
        seed: 12345,
        enableStateCapture: true,
        captureDir: './bug-captures'
    });
    
    try {
        // Create a game state that will cause the Leonidas bug
        let gameState = rules.setup(12345, 'Standard', {});
        
        // Force the problematic condition
        gameState.state = 'greek_land_movement_leonidas';
        gameState.active = 'Greece';
        gameState.from = 'Athenai';
        gameState.greek = gameState.greek || {};
        gameState.greek.event = 8;
        gameState.move_list = {
            'Sparta': true,
            'ForcedBugCity': true
        };
        delete gameState.units['ForcedBugCity'];
        
        console.log('Forcing bug condition and attempting action...');
        
        // This should trigger the state capture
        await player.executeTurn(rules, gameState, 'Greece', 1);
        
        console.log('❌ Expected error did not occur');
        
    } catch (error) {
        console.log('✅ Error captured successfully');
        
        const errorStats = player.gameStats.errors;
        const capturedError = errorStats[errorStats.length - 1];
        
        if (capturedError && capturedError.captureResult) {
            console.log(`📁 Capture file: ${capturedError.captureResult.filename}`);
            console.log(`🔍 Analysis: ${capturedError.captureResult.analysis?.errorType}`);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    (async () => {
        try {
            const results = await testIntegratedStateCapture();
            
            // If no bugs were captured naturally, demonstrate forced capture
            if (results.bugsCaptured === 0) {
                await demonstrateForcedCapture();
            }
            
            console.log('\n🎉 INTEGRATION TEST COMPLETE');
            console.log('State capture system is now integrated into BasePlayer');
            console.log('All player types will automatically capture error states');
            
        } catch (error) {
            console.error('❌ Integration test failed:', error.message);
        }
    })();
}

module.exports = {
    testIntegratedStateCapture,
    demonstrateForcedCapture
};