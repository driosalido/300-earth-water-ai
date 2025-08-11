#!/usr/bin/env node

/**
 * Interactive Game Launcher
 * 
 * Simple launcher for human vs AI games for debugging.
 * Usage: node interactive.js [--seed 12345] [--max-steps 500]
 */

const { InteractiveGame } = require('./src/interactive-game');

async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    let seed = Math.floor(Math.random() * 1000000);
    let maxSteps = 1000;  // Más pasos por defecto para partidas completas
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--seed' && args[i+1]) {
            seed = parseInt(args[i+1]);
            i++;
        } else if (args[i] === '--max-steps' && args[i+1]) {
            maxSteps = parseInt(args[i+1]);
            i++;
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log(`
Interactive Game Launcher - Human vs AI Debugging

Usage: node interactive.js [options]

Options:
  --seed NUM       Use specific random seed (default: random)
  --max-steps NUM  Maximum game steps (default: 1000)
  --help, -h       Show this help

Features:
  • Choose your side (Persia or Greece)
  • Choose opponent AI type
  • See cards with event names
  • Turn-by-turn gameplay
  • Perfect for debugging AI behavior

Examples:
  node interactive.js
  node interactive.js --seed 12345
  node interactive.js --max-steps 1000
            `);
            process.exit(0);
        }
    }
    
    try {
        const game = new InteractiveGame({ seed, maxSteps });
        await game.start();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}