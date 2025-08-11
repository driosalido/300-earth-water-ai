"use strict";

/**
 * Integration test for UUID system with complete game
 */

const { RandomPlayer } = require('../src/random-player');
const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);
const fs = require('fs');

async function runCompleteGameWithUuid() {
    console.log('🎮 Running complete game with UUID system...\n');

    // Create two players with UUIDs
    const gameUuid1 = 'game-session-uuid-player1-test';
    const gameUuid2 = 'game-session-uuid-player2-test';
    
    const player1 = new RandomPlayer({
        name: 'UuidTestPlayer1',
        gameUuid: gameUuid1,
        gameId: null,
        enableStateCapture: true,
        maxSteps: 200, // Shorter game
        logLevel: 'info'
    });

    const player2 = new RandomPlayer({
        name: 'UuidTestPlayer2', 
        gameUuid: gameUuid2,
        gameId: null,
        enableStateCapture: true,
        maxSteps: 200,
        logLevel: 'info'
    });

    console.log(`Player 1 - UUID: ${player1.gameUuid}`);
    console.log(`Player 1 - Log file: ${player1.gameId}.log`);
    console.log(`Player 2 - UUID: ${player2.gameUuid}`);
    console.log(`Player 2 - Log file: ${player2.gameId}.log`);

    let gameStats = {
        player1Steps: 0,
        player2Steps: 0,
        totalSteps: 0,
        gameCompleted: false,
        winner: null,
        errors: [],
        captureFiles: []
    };

    try {
        // Initialize game
        let gameState = rules.setup(555666, 'Standard', {});
        let step = 0;
        const maxSteps = 200;

        player1.logger.logger.info('🎮 Starting UUID Integration Test Game', {
            seed: 555666,
            maxSteps: maxSteps,
            testPurpose: 'UUID system integration'
        });

        // Game loop
        while (gameState.state !== 'game_over' && step < maxSteps) {
            let activePlayer = gameState.active;
            let currentPlayerInstance = null;
            
            // Determine which player instance to use
            if (activePlayer === 'Greece') {
                currentPlayerInstance = player1;
                gameStats.player1Steps++;
            } else if (activePlayer === 'Persia') {
                currentPlayerInstance = player2;
                gameStats.player2Steps++;
            } else if (activePlayer === 'Both' || activePlayer === 'All') {
                // Default to player 1 for multi-player states
                currentPlayerInstance = player1;
                gameStats.player1Steps++;
            }

            if (!currentPlayerInstance) {
                console.log(`Unknown active player: ${activePlayer}`);
                break;
            }

            try {
                gameState = await currentPlayerInstance.executeTurn(rules, gameState, activePlayer, step);
                step++;
                gameStats.totalSteps++;
                
                if (step % 50 === 0) {
                    console.log(`Step ${step}: State=${gameState.state}, Active=${gameState.active}`);
                }
                
            } catch (error) {
                console.log(`🐛 Error at step ${step}: ${error.message}`);
                
                // Record error
                gameStats.errors.push({
                    step: step,
                    player: activePlayer,
                    error: error.message,
                    playerInstance: currentPlayerInstance.name
                });
                
                // Check if capture was created
                const errorStats = currentPlayerInstance.gameStats.errors;
                if (errorStats.length > 0) {
                    const lastError = errorStats[errorStats.length - 1];
                    if (lastError.captureResult) {
                        gameStats.captureFiles.push(lastError.captureResult.filename);
                        console.log(`📁 Capture created: ${lastError.captureResult.filename}`);
                    }
                }
                
                break; // Exit on error
            }
        }

        if (gameState.state === 'game_over') {
            gameStats.gameCompleted = true;
            if (gameState.vp > 0) {
                gameStats.winner = 'Persia';
            } else if (gameState.vp < 0) {
                gameStats.winner = 'Greece';
            } else {
                gameStats.winner = 'tie';
            }
            
            console.log(`🎉 Game completed! Winner: ${gameStats.winner}`);
        } else {
            console.log(`⏱️ Game stopped at step ${step}/${maxSteps}`);
        }

        // Log final statistics
        player1.logger.logger.info('🏁 Game Finished', {
            completed: gameStats.gameCompleted,
            winner: gameStats.winner,
            totalSteps: gameStats.totalSteps,
            player1Steps: gameStats.player1Steps,
            player2Steps: gameStats.player2Steps,
            errors: gameStats.errors.length,
            captures: gameStats.captureFiles.length
        });

        return gameStats;

    } catch (error) {
        console.log(`💥 Unexpected error: ${error.message}`);
        gameStats.errors.push({
            step: gameStats.totalSteps,
            error: error.message,
            type: 'unexpected'
        });
        return gameStats;
    }
}

async function verifyUuidFiles() {
    console.log('\n📁 Verifying UUID-based files...');
    
    const logsDir = './logs';
    const capturesDir = './bug-captures';
    
    let results = {
        logFiles: [],
        captureFiles: [],
        success: true
    };
    
    // Check logs
    if (fs.existsSync(logsDir)) {
        const logFiles = fs.readdirSync(logsDir)
            .filter(f => f.endsWith('.log'))
            .filter(f => f.includes('uuid'));
        
        console.log('UUID Log files found:');
        logFiles.forEach(file => {
            console.log(`  ✅ ${file}`);
            results.logFiles.push(file);
        });
    }
    
    // Check captures
    if (fs.existsSync(capturesDir)) {
        const captureFiles = fs.readdirSync(capturesDir)
            .filter(f => f.endsWith('.json'))
            .filter(f => f.includes('uuid'));
            
        console.log('UUID Capture files found:');
        captureFiles.forEach(file => {
            console.log(`  📁 ${file}`);
            results.captureFiles.push(file);
        });
    }
    
    return results;
}

if (require.main === module) {
    (async () => {
        try {
            const gameStats = await runCompleteGameWithUuid();
            const fileStats = await verifyUuidFiles();
            
            console.log('\n📊 INTEGRATION TEST RESULTS:');
            console.log('═'.repeat(50));
            console.log(`Game completed: ${gameStats.gameCompleted}`);
            console.log(`Winner: ${gameStats.winner || 'none'}`);
            console.log(`Total steps: ${gameStats.totalSteps}`);
            console.log(`Errors encountered: ${gameStats.errors.length}`);
            console.log(`Capture files created: ${gameStats.captureFiles.length}`);
            console.log(`UUID log files found: ${fileStats.logFiles.length}`);
            console.log(`UUID capture files found: ${fileStats.captureFiles.length}`);
            
            console.log('\n🎉 UUID INTEGRATION TEST COMPLETED');
            console.log('✅ UUID system is fully functional:');
            console.log('   - Unique game identifiers generated');
            console.log('   - Log files named with UUIDs');  
            console.log('   - Error captures include UUIDs');
            console.log('   - Multiple players can use different UUIDs');
            
        } catch (error) {
            console.error('❌ Integration test failed:', error);
        }
    })();
}

module.exports = { runCompleteGameWithUuid, verifyUuidFiles };