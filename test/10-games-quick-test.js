"use strict";

/**
 * Quick test with 10 games to verify the system works
 */

const { RandomPlayer } = require('../src/random-player');
const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);
const fs = require('fs');

async function run10GamesTest() {
    console.log('🎮 QUICK TEST: 10 GAMES');
    console.log('='.repeat(40));

    const results = {
        gamesPlayed: 0,
        gamesCompleted: 0,
        errors: 0,
        captures: 0,
        wins: { Greece: 0, Persia: 0, ties: 0 },
        errorDetails: [],
        captureFiles: [],
        totalSteps: 0,
        startTime: Date.now()
    };

    for (let gameNum = 1; gameNum <= 10; gameNum++) {
        const seed = Math.floor(Math.random() * 1000000) + 100000;
        const gameUuid = `quick-test-${gameNum.toString().padStart(2, '0')}-${seed}`;
        
        console.log(`🎲 Game ${gameNum}/10 (seed: ${seed})`);
        
        try {
            const gameResult = await runSingleQuickGame(gameUuid, seed, gameNum);
            
            results.gamesPlayed++;
            results.totalSteps += gameResult.steps;
            
            if (gameResult.completed) {
                results.gamesCompleted++;
                results.wins[gameResult.winner]++;
                console.log(`  ✅ ${gameResult.winner} won in ${gameResult.steps} steps`);
            } else if (gameResult.error) {
                results.errors++;
                results.errorDetails.push({
                    game: gameNum,
                    seed: seed,
                    error: gameResult.error,
                    step: gameResult.step
                });
                
                if (gameResult.captureFile) {
                    results.captures++;
                    results.captureFiles.push(gameResult.captureFile);
                    console.log(`  🐛 Error captured: ${gameResult.captureFile}`);
                } else {
                    console.log(`  ❌ Error at step ${gameResult.step}: ${gameResult.error.substring(0, 50)}...`);
                }
            }
            
        } catch (error) {
            console.log(`  💥 Unexpected error: ${error.message}`);
            results.errors++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    const totalTime = (Date.now() - results.startTime) / 1000;
    
    console.log('\n📊 QUICK TEST RESULTS');
    console.log('═'.repeat(30));
    console.log(`Execution time: ${totalTime.toFixed(1)}s`);
    console.log(`Games played: ${results.gamesPlayed}/10`);
    console.log(`Completed: ${results.gamesCompleted} (${(results.gamesCompleted/results.gamesPlayed*100).toFixed(1)}%)`);
    console.log(`Errors: ${results.errors} (${(results.errors/results.gamesPlayed*100).toFixed(1)}%)`);
    console.log(`Captures: ${results.captures}`);
    
    if (results.gamesCompleted > 0) {
        console.log(`Greece: ${results.wins.Greece} (${(results.wins.Greece/results.gamesCompleted*100).toFixed(1)}%)`);
        console.log(`Persia: ${results.wins.Persia} (${(results.wins.Persia/results.gamesCompleted*100).toFixed(1)}%)`);
        console.log(`Ties: ${results.wins.ties} (${(results.wins.ties/results.gamesCompleted*100).toFixed(1)}%)`);
    }
    
    return results;
}

async function runSingleQuickGame(gameUuid, seed, gameNum) {
    const greecePlayer = new RandomPlayer({
        name: `QuickGreece-${gameNum}`,
        gameUuid: `${gameUuid}-greece`,
        enableStateCapture: true,
        maxSteps: 500,
        logLevel: 'error'
    });
    
    const persiaPlayer = new RandomPlayer({
        name: `QuickPersia-${gameNum}`,
        gameUuid: `${gameUuid}-persia`,
        enableStateCapture: true,
        maxSteps: 500,
        logLevel: 'error'
    });

    let step = 0;
    
    try {
        let gameState = rules.setup(seed, 'Standard', {});
        const maxSteps = 500;

        while (gameState.state !== 'game_over' && step < maxSteps) {
            let activePlayer = gameState.active;
            let currentPlayerInstance = null;
            
            if (activePlayer === 'Greece') {
                currentPlayerInstance = greecePlayer;
            } else if (activePlayer === 'Persia') {
                currentPlayerInstance = persiaPlayer;
            } else {
                currentPlayerInstance = greecePlayer;
            }

            gameState = await currentPlayerInstance.executeTurn(rules, gameState, activePlayer, step);
            step++;
        }

        let winner = 'incomplete';
        if (gameState.state === 'game_over') {
            if (gameState.vp > 0) {
                winner = 'Persia';
            } else if (gameState.vp < 0) {
                winner = 'Greece';
            } else {
                winner = 'ties';
            }
        }

        return {
            completed: gameState.state === 'game_over',
            winner: winner,
            steps: step,
            seed: seed,
            gameUuid: gameUuid
        };

    } catch (error) {
        let captureFile = null;
        const players = [greecePlayer, persiaPlayer];
        
        for (const player of players) {
            const errorStats = player.gameStats.errors;
            if (errorStats.length > 0) {
                const lastError = errorStats[errorStats.length - 1];
                if (lastError.captureResult && lastError.captureResult.filename) {
                    captureFile = lastError.captureResult.filename;
                    break;
                }
            }
        }

        return {
            completed: false,
            error: error.message,
            step: step,
            seed: seed,
            gameUuid: gameUuid,
            captureFile: captureFile
        };
    }
}

if (require.main === module) {
    run10GamesTest().then(results => {
        console.log('\n🎉 QUICK TEST COMPLETED');
        if (results.errors > 0) {
            console.log('⚠️  System working but found errors to investigate');
        } else {
            console.log('✅ System working perfectly - ready for 100 game test');
        }
    }).catch(error => {
        console.error('❌ Quick test failed:', error);
    });
}

module.exports = { run10GamesTest };