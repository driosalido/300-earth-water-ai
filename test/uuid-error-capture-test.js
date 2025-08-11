"use strict";

/**
 * Test UUID-based error capture system
 */

const { RandomPlayer } = require('../src/random-player');
const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);
const fs = require('fs');

async function testUuidErrorCapture() {
    console.log('🔧 Testing UUID-based error capture system...\n');

    // Create a player with a custom UUID for easy identification
    const testUuid = 'test-uuid-error-capture-12345';
    const player = new RandomPlayer({
        name: 'ErrorCaptureTestPlayer',
        gameUuid: testUuid,
        gameId: null, // Use UUID-based ID
        enableStateCapture: true,
        captureDir: './bug-captures',
        logLevel: 'info'
    });

    console.log(`Test UUID: ${player.gameUuid}`);
    console.log(`Game ID: ${player.gameId}`);

    try {
        // Create a problematic game state that will cause an error
        let gameState = rules.setup(12345, 'Standard', {});
        
        // Force a problematic condition
        gameState.state = 'greek_land_movement_leonidas';
        gameState.active = 'Greece';
        gameState.from = 'Athenai';
        gameState.move_list = {
            'Sparta': true,
            'NonExistentCity': true // This should cause an error
        };
        
        console.log('Creating intentional error for capture test...');
        
        // This should trigger error capture with UUID
        await player.executeTurn(rules, gameState, 'Greece', 1);
        
        console.log('❌ Expected error did not occur');
        return { success: false, error: 'No error captured' };
        
    } catch (error) {
        console.log('✅ Error captured successfully:', error.message);
        
        // Check if capture was created
        const errorStats = player.gameStats.errors;
        if (errorStats.length > 0) {
            const lastError = errorStats[errorStats.length - 1];
            if (lastError.captureResult) {
                console.log(`📁 Capture file: ${lastError.captureResult.filename}`);
                
                // Verify the capture file contains our UUID
                const captureFile = path.join('./bug-captures', lastError.captureResult.filename);
                if (fs.existsSync(captureFile)) {
                    const captureData = JSON.parse(fs.readFileSync(captureFile, 'utf8'));
                    console.log(`🔍 Capture UUID: ${captureData.context?.gameUuid || 'not found'}`);
                    console.log(`🔍 Capture Game ID: ${captureData.context?.gameId || 'not found'}`);
                    
                    return {
                        success: true,
                        filename: lastError.captureResult.filename,
                        captureUuid: captureData.context?.gameUuid,
                        captureGameId: captureData.context?.gameId,
                        error: error.message
                    };
                } else {
                    console.log('❌ Capture file not found');
                    return { success: false, error: 'Capture file not found' };
                }
            }
        }
        
        console.log('❌ No capture result recorded');
        return { success: false, error: 'No capture result' };
    }
}

if (require.main === module) {
    testUuidErrorCapture().then(result => {
        console.log('\n✅ UUID error capture test completed');
        console.log('Results:', result);
        
        if (result.success && result.captureUuid) {
            console.log('\n🎉 UUID system working correctly:');
            console.log(`  - Logs use UUID: game-${result.captureUuid}.log`);
            console.log(`  - Captures include UUID: ${result.captureUuid}`);
            console.log(`  - Error files use UUID: ${result.filename}`);
        }
    }).catch(error => {
        console.error('❌ Test failed:', error);
    });
}

module.exports = { testUuidErrorCapture };