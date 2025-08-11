"use strict";

/**
 * Enhanced Leonidas Bug Detection with Complete State Capture
 * 
 * This captures the complete game state including undo history and logs
 * when the Leonidas bug occurs, allowing for exact reproduction.
 */

const path = require('path');
const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
const rules = require(rulesPath);
const fs = require('fs');

/**
 * Enhanced bug detection that captures complete game state
 */
function captureLeonidasBugState() {
    console.log('🔍 ENHANCED LEONIDAS BUG STATE CAPTURE');
    console.log('='.repeat(60));
    console.log('Running enhanced detection with complete state capture...\n');

    // Use the failed seeds from our previous testing
    const failedSeeds = [942359, 942367, 942387, 942401, 942402];
    
    // Also test with some new random seeds
    const additionalSeeds = [];
    for (let i = 0; i < 10; i++) {
        additionalSeeds.push(Math.floor(Math.random() * 1000000) + 950000);
    }
    
    const allSeeds = [...failedSeeds, ...additionalSeeds];
    
    console.log(`Testing ${allSeeds.length} seeds with state capture...`);
    
    for (let i = 0; i < allSeeds.length; i++) {
        const seed = allSeeds[i];
        console.log(`\n🎲 Testing seed ${seed} (${i + 1}/${allSeeds.length})`);
        
        try {
            const result = runGameWithStateCapture(seed);
            
            if (result.bugCaptured) {
                console.log(`\n🎯 BUG CAPTURED WITH SEED ${seed}!`);
                
                // Save the complete state to file
                const stateFile = `leonidas-bug-state-${seed}.json`;
                const stateData = {
                    seed: seed,
                    bugStep: result.bugStep,
                    error: {
                        message: result.error.message,
                        stack: result.error.stack
                    },
                    completeGameState: result.gameStateAtBug,
                    actionHistory: result.actionHistory,
                    reproductionInstructions: result.reproductionInstructions
                };
                
                fs.writeFileSync(stateFile, JSON.stringify(stateData, null, 2));
                console.log(`✅ Complete state saved to: ${stateFile}`);
                
                // Show key information
                analyzeCompleteState(result);
                
                return result;
            } else if (result.completed) {
                // console.log(`✅ Seed ${seed} completed successfully (${result.winner}, ${result.steps} steps)`);
            } else if (result.error) {
                console.log(`❌ Seed ${seed} failed with different error: ${result.error.message}`);
            }
            
        } catch (error) {
            console.log(`❌ Setup error with seed ${seed}: ${error.message}`);
        }
    }
    
    console.log('\n❌ Could not capture Leonidas bug in this run');
    return { success: false };
}

/**
 * Run a single game with complete state capture
 */
function runGameWithStateCapture(seed) {
    let gameState = rules.setup(seed, 'Standard', {});
    let step = 0;
    const maxSteps = 1000;
    
    // Store action history for reproduction
    const actionHistory = [];
    
    try {
        while (gameState.state !== 'game_over' && step < maxSteps) {
            const view = rules.view(gameState, gameState.active);
            
            // Capture state before each action
            const preActionState = {
                step: step,
                state: gameState.state,
                active: gameState.active,
                availableActions: Object.keys(view.actions || {}),
                gameStateSnapshot: JSON.parse(JSON.stringify(gameState))
            };
            
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
            
            // Record the action for history
            const actionRecord = {
                step: step,
                action: action,
                args: args,
                preState: gameState.state,
                preActive: gameState.active,
                preUnitsState: JSON.parse(JSON.stringify(gameState.units))
            };
            
            try {
                // Execute the action
                gameState = rules.action(gameState, gameState.active, action, args);
                
                // Record successful action
                actionRecord.postState = gameState.state;
                actionRecord.postActive = gameState.active;
                actionRecord.success = true;
                
            } catch (error) {
                // Check if this is the Leonidas bug
                if (error.message.includes("Cannot read properties of undefined") && 
                    (gameState.state === 'greek_land_movement_leonidas' || 
                     actionRecord.preState === 'greek_land_movement_leonidas')) {
                    
                    console.log(`🐛 LEONIDAS BUG CAUGHT at step ${step}!`);
                    
                    // Capture complete state at bug
                    const completeState = captureCompleteGameState(gameState, actionRecord, error);
                    
                    return {
                        bugCaptured: true,
                        bugStep: step,
                        error: error,
                        gameStateAtBug: completeState,
                        actionHistory: actionHistory,
                        reproductionInstructions: generateReproductionInstructions(seed, actionHistory, actionRecord)
                    };
                }
                
                // Different error, record and continue or break
                actionRecord.error = error.message;
                actionRecord.success = false;
                
                return {
                    bugCaptured: false,
                    error: error,
                    step: step,
                    actionHistory: actionHistory
                };
            }
            
            actionHistory.push(actionRecord);
            step++;
            
            // Progress reporting for long games
            if (step % 100 === 0) {
                process.stdout.write('.');
            }
        }
        
        // Game completed successfully
        const winner = determineWinner(gameState);
        return {
            bugCaptured: false,
            completed: true,
            steps: step,
            winner: winner,
            actionHistory: actionHistory
        };
        
    } catch (error) {
        return {
            bugCaptured: false,
            error: error,
            step: step,
            actionHistory: actionHistory
        };
    }
}

/**
 * Capture complete game state when bug occurs
 */
function captureCompleteGameState(gameState, actionRecord, error) {
    return {
        // Basic game state
        state: gameState.state,
        active: gameState.active,
        campaign: gameState.campaign,
        vp: gameState.vp,
        
        // Movement specific
        from: gameState.from,
        move_list: gameState.move_list,
        
        // Player states
        persian: JSON.parse(JSON.stringify(gameState.persian)),
        greek: JSON.parse(JSON.stringify(gameState.greek)),
        
        // Units - this is where the bug occurs
        units: JSON.parse(JSON.stringify(gameState.units)),
        
        // Game history
        log: JSON.parse(JSON.stringify(gameState.log)),
        undo: JSON.parse(JSON.stringify(gameState.undo)),
        
        // Additional game state
        deck: JSON.parse(JSON.stringify(gameState.deck)),
        discard: JSON.parse(JSON.stringify(gameState.discard)),
        trigger: JSON.parse(JSON.stringify(gameState.trigger)),
        
        // Bug context
        failedAction: actionRecord,
        bugError: {
            message: error.message,
            stack: error.stack
        },
        
        // Capture timestamp
        captureTime: new Date().toISOString()
    };
}

/**
 * Generate instructions to reproduce the exact bug
 */
function generateReproductionInstructions(seed, actionHistory, failedAction) {
    const instructions = {
        setup: {
            seed: seed,
            scenario: 'Standard',
            options: {}
        },
        actions: actionHistory.map(action => ({
            step: action.step,
            action: action.action,
            args: action.args,
            expectedPreState: action.preState,
            expectedPostState: action.postState
        })),
        failingAction: {
            step: failedAction.step,
            action: failedAction.action,
            args: failedAction.args,
            expectedError: "Cannot read properties of undefined (reading '0')",
            context: 'greek_land_movement_leonidas'
        },
        codeToReproduce: generateReproductionCode(seed, actionHistory, failedAction)
    };
    
    return instructions;
}

/**
 * Generate JavaScript code to reproduce the bug
 */
function generateReproductionCode(seed, actionHistory, failedAction) {
    let code = `// Leonidas Bug Reproduction Code\n`;
    code += `const rules = require('./rules/300-earth-and-water/rules.js');\n\n`;
    code += `// Setup game\n`;
    code += `let gameState = rules.setup(${seed}, 'Standard', {});\n\n`;
    
    code += `// Execute actions leading to bug\n`;
    actionHistory.forEach((action, index) => {
        if (action.args !== undefined) {
            code += `gameState = rules.action(gameState, '${action.preActive}', '${action.action}', ${typeof action.args === 'string' ? `'${action.args}'` : action.args}); // Step ${action.step}\n`;
        } else {
            code += `gameState = rules.action(gameState, '${action.preActive}', '${action.action}'); // Step ${action.step}\n`;
        }
    });
    
    code += `\n// This action will trigger the bug:\n`;
    if (failedAction.args !== undefined) {
        code += `// gameState = rules.action(gameState, '${failedAction.preActive}', '${failedAction.action}', ${typeof failedAction.args === 'string' ? `'${failedAction.args}'` : failedAction.args}); // Step ${failedAction.step} - WILL CRASH\n`;
    } else {
        code += `// gameState = rules.action(gameState, '${failedAction.preActive}', '${failedAction.action}'); // Step ${failedAction.step} - WILL CRASH\n`;
    }
    
    return code;
}

/**
 * Analyze the complete captured state
 */
function analyzeCompleteState(result) {
    console.log('\n📊 BUG STATE ANALYSIS:');
    console.log('═'.repeat(50));
    
    const state = result.gameStateAtBug;
    console.log('Bug occurred at step:', result.bugStep);
    console.log('Game state:', state.state);
    console.log('Active player:', state.active);
    console.log('Moving from:', state.from);
    console.log('Error:', result.error.message);
    
    if (state.move_list) {
        console.log('\nMove list analysis:');
        for (const city of Object.keys(state.move_list)) {
            if (state.units[city]) {
                console.log(`  ✅ ${city}: exists in units`, state.units[city]);
            } else {
                console.log(`  💥 ${city}: MISSING from units - THIS IS THE PROBLEM!`);
            }
        }
    }
    
    console.log('\nAction that failed:');
    console.log('  Action:', state.failedAction.action);
    console.log('  Args:', state.failedAction.args);
    console.log('  Pre-state:', state.failedAction.preState);
    
    console.log('\nUndo history length:', state.undo.length);
    console.log('Log entries:', state.log.length);
    console.log('Total action history:', result.actionHistory.length);
    
    if (result.reproductionInstructions) {
        console.log('\n📝 REPRODUCTION CODE GENERATED');
        console.log('Full reproduction code available in saved JSON file');
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

// Run tests if called directly
if (require.main === module) {
    const result = captureLeonidasBugState();
    
    console.log('\n📋 FINAL SUMMARY:');
    console.log('═'.repeat(40));
    if (result.success !== false && result.bugCaptured) {
        console.log('✅ Successfully captured Leonidas bug with complete state');
        console.log('🔧 State saved to JSON file for analysis and reproduction');
    } else {
        console.log('❌ Could not capture the bug in this run');
        console.log('💡 Try running multiple times or with more seeds');
        console.log('📊 Bug occurs in ~20% of games based on previous testing');
    }
}

module.exports = {
    captureLeonidasBugState,
    runGameWithStateCapture
};