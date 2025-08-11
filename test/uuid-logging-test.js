"use strict";

/**
 * Test UUID-based logging system
 */

const { RandomPlayer } = require('../src/random-player');
const fs = require('fs');
const path = require('path');

async function testUuidLogging() {
    console.log('🔧 Testing UUID-based logging system...\n');

    // Create a player with no explicit UUID (should generate one)
    const player1 = new RandomPlayer({
        name: 'TestPlayer1',
        gameId: null, // Let it use the UUID-based ID
        logLevel: 'info'
    });

    console.log(`Player 1 - UUID: ${player1.gameUuid}`);
    console.log(`Player 1 - Game ID: ${player1.gameId}`);

    // Create a player with explicit UUID
    const customUuid = '12345678-1234-5678-9abc-123456789def';
    const player2 = new RandomPlayer({
        name: 'TestPlayer2', 
        gameUuid: customUuid,
        gameId: null, // Let it use the UUID-based ID
        logLevel: 'info'
    });

    console.log(`Player 2 - UUID: ${player2.gameUuid}`);
    console.log(`Player 2 - Game ID: ${player2.gameId}`);

    // Test logging
    player1.logger.logger.info('Test message from player 1', { action: 'test' });
    player2.logger.logger.info('Test message from player 2', { action: 'test' });

    console.log('\n📁 Checking log files...');

    const logsDir = path.join(__dirname, '../logs');
    if (fs.existsSync(logsDir)) {
        const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
        console.log('Log files found:');
        logFiles.forEach(file => {
            console.log(`  - ${file}`);
        });
    } else {
        console.log('No logs directory found');
    }

    return {
        player1Uuid: player1.gameUuid,
        player1GameId: player1.gameId,
        player2Uuid: player2.gameUuid,
        player2GameId: player2.gameId
    };
}

if (require.main === module) {
    testUuidLogging().then(result => {
        console.log('\n✅ UUID logging test completed');
        console.log('Results:', result);
    }).catch(error => {
        console.error('❌ Test failed:', error);
    });
}

module.exports = { testUuidLogging };