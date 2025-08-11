"use strict";

/**
 * RTT AI Agent - Main Entry Point
 * 
 * This is the main entry point for the Rally The Troops AI Agent system.
 * It provides a command-line interface for running different types of AI agents
 * and game analysis tools.
 * 
 * Available modes:
 * - play: Run games with random player (similar to fuzzer)
 * - train: Train AI agents (future implementation)
 * - analyze: Analyze game logs and results
 * - benchmark: Performance testing
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { GameRunner } = require('./game-runner');
const { InteractiveGame } = require('./interactive-game');
const { createLogger } = require('./logger');
const { PlayerFactory } = require('./player-factory');
const fs = require('fs');
const path = require('path');

/**
 * Main application class
 */
class RTTAIAgent {
    constructor() {
        this.logger = createLogger({
            gameId: 'main',
            logLevel: 'info'
        });
        
        this.version = '1.0.0';
        this.logger.info(`RTT AI Agent v${this.version} initialized`);
    }

    /**
     * Display welcome message and system information
     */
    showWelcome() {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    RTT AI Agent v${this.version}                     ║
║           AI Agent for Rally The Troops Board Games          ║
║                 Starting with "300: Earth & Water"          ║
╚══════════════════════════════════════════════════════════════╝

Welcome to the RTT AI Agent system! This tool helps you:

🎮 Play games with AI agents for debugging and analysis
📊 Generate comprehensive game logs and statistics  
🧠 Train and test different AI strategies (future)
📈 Analyze game patterns and rule implementations

Available Commands:
  play     - Run games with random player (debugging mode)
  analyze  - Analyze existing game logs and results
  info     - Show system information and available games
  help     - Show detailed help for any command

Examples:
  rtt-ai play --count 10 --verbose
  rtt-ai play --debug --seed 12345
  rtt-ai analyze --file ./logs/results-123456.json
  
For detailed help on any command, use: rtt-ai <command> --help
        `);
    }

    /**
     * Show system information
     */
    showSystemInfo() {
        const rulesPath = path.resolve('./rules/300-earth-and-water/rules.js');
        const rulesExists = fs.existsSync(rulesPath);
        
        console.log(`
System Information:
==================
Version: ${this.version}
Node.js: ${process.version}
Platform: ${process.platform}
Working Directory: ${process.cwd()}

Game Rules:
===========
Rules File: ${rulesPath}
Rules Available: ${rulesExists ? '✓' : '✗'}

Logs Directory: ${path.resolve('./logs')}
Config Directory: ${path.resolve('./config')}
        `);

        if (rulesExists) {
            try {
                const rules = require(rulesPath);
                console.log(`
Game Details:
=============
Available Scenarios: ${JSON.stringify(rules.scenarios || [])}
Player Roles: ${JSON.stringify(rules.roles || [])}
                `);
            } catch (error) {
                console.log(`Error loading rules: ${error.message}`);
            }
        } else {
            console.log(`
⚠️  Warning: Rules file not found!
   Make sure you have the 300: Earth & Water rules.js file in:
   ${rulesPath}
   
   You can copy it from the RTT server directory:
   cp ../server/public/300-earth-and-water/rules.js ./rules/300-earth-and-water/
            `);
        }
    }

    /**
     * Run the play command (game execution)
     */
    async runPlayCommand(argv) {
        console.log('🎮 Starting Game Play Mode...\n');
        
        const runner = new GameRunner({
            rulesPath: argv.rules,
            gameCount: argv.count,
            seed: argv.seed,
            scenario: argv.scenario,
            maxSteps: argv.maxSteps,
            verbose: argv.verbose,
            debug: argv.debug,
            outputDir: argv.output,
            logLevel: argv.debug ? 'debug' : (argv.verbose ? 'info' : 'warn'),
            playerType: argv.playerType,
            player1Type: argv.player1Type,
            player2Type: argv.player2Type
        });

        try {
            let results;
            
            // If both player types are specified, run a match
            if (argv.player1Type && argv.player2Type) {
                console.log(`\n⚔️  Match Mode: ${argv.player1Type} vs ${argv.player2Type}`);
                const player1Config = { type: argv.player1Type, name: `${argv.player1Type}-1` };
                const player2Config = { type: argv.player2Type, name: `${argv.player2Type}-2` };
                results = await runner.runMatch(player1Config, player2Config, {
                    gameCount: argv.count
                });
            } else if (argv.count === 1) {
                results = await runner.runSingleGame();
            } else {
                results = await runner.runMultipleGames();
            }

            // Generate and display report
            const report = runner.generateReport();
            console.log('\n📊 Final Report:');
            console.log('================');
            console.log(JSON.stringify(report, null, 2));

            // Save results
            if (argv.saveResults) {
                const savedFile = runner.saveResults();
                console.log(`\n💾 Results saved to: ${savedFile}`);
            }

            return results;
            
        } catch (error) {
            console.error('❌ Error during game execution:', error.message);
            if (argv.debug) {
                console.error('Stack trace:', error.stack);
            }
            throw error;
        }
    }

    /**
     * Run the analyze command
     */
    async runAnalyzeCommand(argv) {
        console.log('📈 Starting Analysis Mode...\n');
        
        if (argv.file) {
            return this.analyzeResultsFile(argv.file);
        } else if (argv.dir) {
            return this.analyzeLogsDirectory(argv.dir);
        } else {
            throw new Error('Must specify either --file or --dir for analysis');
        }
    }

    /**
     * Run the interactive debugging command
     */
    async runInteractiveCommand(argv) {
        try {
            const interactiveGame = new InteractiveGame({
                rulesPath: argv.rules,
                seed: argv.seed,
                scenario: argv.scenario,
                maxSteps: argv.maxSteps
            });
            
            await interactiveGame.start();
            
        } catch (error) {
            console.error('❌ Error in interactive mode:', error.message);
            process.exit(1);
        }
    }

    /**
     * Analyze a specific results file
     */
    analyzeResultsFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Results file not found: ${filePath}`);
        }

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            console.log(`Analysis of: ${filePath}`);
            console.log(`Generated: ${data.timestamp}`);
            console.log(`Configuration:`, JSON.stringify(data.config, null, 2));
            console.log(`\nResults Summary:`);
            console.log(JSON.stringify(data.results.summary, null, 2));

            // Additional analysis
            if (data.results.games && data.results.games.length > 0) {
                this.performDetailedAnalysis(data.results.games);
            }

        } catch (error) {
            throw new Error(`Failed to analyze results file: ${error.message}`);
        }
    }

    /**
     * Analyze all log files in a directory
     */
    analyzeLogsDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const files = fs.readdirSync(dirPath);
        const resultFiles = files.filter(f => f.startsWith('results-') && f.endsWith('.json'));
        
        console.log(`Found ${resultFiles.length} result files in ${dirPath}`);
        
        for (const file of resultFiles) {
            console.log(`\n--- ${file} ---`);
            this.analyzeResultsFile(path.join(dirPath, file));
        }
    }

    /**
     * Perform detailed statistical analysis
     */
    performDetailedAnalysis(games) {
        console.log('\n🔍 Detailed Analysis:');
        console.log('=====================');

        // Success rate analysis
        const successful = games.filter(g => g.result && g.result.gameOver);
        const failed = games.filter(g => g.error);
        
        console.log(`Game Completion Rate: ${(successful.length / games.length * 100).toFixed(1)}%`);
        console.log(`Error Rate: ${(failed.length / games.length * 100).toFixed(1)}%`);

        if (successful.length > 0) {
            // Game length statistics
            const steps = successful.map(g => g.result.totalSteps);
            const times = successful.map(g => g.result.gameTime);
            
            console.log('\nGame Length Statistics:');
            console.log(`  Average Steps: ${Math.round(steps.reduce((a,b) => a+b) / steps.length)}`);
            console.log(`  Step Range: ${Math.min(...steps)} - ${Math.max(...steps)}`);
            console.log(`  Average Time: ${Math.round(times.reduce((a,b) => a+b) / times.length)}ms`);
            
            // Winner analysis
            const winners = successful.map(g => g.result.winner);
            const winnerCounts = winners.reduce((acc, w) => {
                acc[w] = (acc[w] || 0) + 1;
                return acc;
            }, {});
            
            console.log('\nWinner Distribution:');
            for (const [winner, count] of Object.entries(winnerCounts)) {
                console.log(`  ${winner}: ${count} (${(count/winners.length*100).toFixed(1)}%)`);
            }
        }

        if (failed.length > 0) {
            console.log('\nError Analysis:');
            const errorTypes = failed.reduce((acc, g) => {
                const errorType = g.error.split(':')[0];
                acc[errorType] = (acc[errorType] || 0) + 1;
                return acc;
            }, {});
            
            for (const [error, count] of Object.entries(errorTypes)) {
                console.log(`  ${error}: ${count}`);
            }
        }
    }
}

/**
 * Command line interface setup
 */
function setupCLI() {
    return yargs(hideBin(process.argv))
        .scriptName('rtt-ai')
        .usage('Usage: $0 <command> [options]')
        .version('1.0.0')
        .command(
            ['play', 'p'],
            'Run games with AI agents',
            (yargs) => {
                return yargs
                    .option('rules', {
                        alias: 'r',
                        type: 'string',
                        default: './rules/300-earth-and-water/rules.js',
                        description: 'Path to rules.js file'
                    })
                    .option('count', {
                        alias: 'c',
                        type: 'number',
                        default: 1,
                        description: 'Number of games to run'
                    })
                    .option('seed', {
                        alias: 's',
                        type: 'number',
                        default: Math.floor(Math.random() * 1000000),
                        description: 'Random seed for reproducibility'
                    })
                    .option('scenario', {
                        type: 'string',
                        default: 'Standard',
                        description: 'Game scenario to use'
                    })
                    .option('player-type', {
                        type: 'string',
                        default: 'random',
                        description: `Player type to use (${PlayerFactory.getAvailableTypes().join(', ')})`
                    })
                    .option('player1-type', {
                        type: 'string',
                        description: `Player 1 type for matches (${PlayerFactory.getAvailableTypes().join(', ')})`
                    })
                    .option('player2-type', {
                        type: 'string',
                        description: `Player 2 type for matches (${PlayerFactory.getAvailableTypes().join(', ')})`
                    })
                    .option('max-steps', {
                        type: 'number',
                        default: 10000,
                        description: 'Maximum steps before timeout'
                    })
                    .option('verbose', {
                        alias: 'v',
                        type: 'boolean',
                        default: false,
                        description: 'Enable verbose output'
                    })
                    .option('debug', {
                        alias: 'd',
                        type: 'boolean', 
                        default: false,
                        description: 'Enable debug mode'
                    })
                    .option('output', {
                        alias: 'o',
                        type: 'string',
                        default: './logs',
                        description: 'Output directory for logs'
                    })
                    .option('save-results', {
                        type: 'boolean',
                        default: true,
                        description: 'Save results to JSON file'
                    })
                    .example('$0 play -c 5 -v', 'Run 5 games with verbose output')
                    .example('$0 play --debug --seed 12345', 'Run single game with debug logging');
            }
        )
        .command(
            ['analyze', 'a'],
            'Analyze game results and logs',
            (yargs) => {
                return yargs
                    .option('file', {
                        alias: 'f',
                        type: 'string',
                        description: 'Analyze specific results file'
                    })
                    .option('dir', {
                        type: 'string',
                        default: './logs',
                        description: 'Analyze all results in directory'
                    })
                    .example('$0 analyze -f ./logs/results-123.json', 'Analyze specific results file')
                    .example('$0 analyze --dir ./logs', 'Analyze all results in logs directory');
            }
        )
        .command(
            ['interactive', 'debug'],
            'Play interactively against AI for debugging',
            (yargs) => {
                return yargs
                    .option('rules', {
                        alias: 'r',
                        type: 'string',
                        default: './rules/300-earth-and-water/rules.js',
                        description: 'Path to rules.js file'
                    })
                    .option('seed', {
                        alias: 's',
                        type: 'number',
                        default: Math.floor(Math.random() * 1000000),
                        description: 'Random seed for reproducibility'
                    })
                    .option('scenario', {
                        type: 'string',
                        default: 'Standard',
                        description: 'Game scenario to use'
                    })
                    .option('max-steps', {
                        type: 'number',
                        default: 500,
                        description: 'Maximum steps before timeout'
                    })
                    .example('$0 interactive', 'Start interactive debugging session')
                    .example('$0 debug --seed 12345', 'Start with specific seed');
            }
        )
        .command(
            ['info', 'i'],
            'Show system information',
            () => {},
            () => {
                const agent = new RTTAIAgent();
                agent.showSystemInfo();
            }
        )
        .demandCommand(1, 'You must specify a command')
        .recommendCommands()
        .strict()
        .help()
        .alias('help', 'h');
}

/**
 * Main entry point
 */
async function main() {
    const agent = new RTTAIAgent();
    
    const argv = setupCLI().argv;
    const command = argv._[0];

    try {
        switch (command) {
            case 'play':
            case 'p':
                await agent.runPlayCommand(argv);
                break;
                
            case 'analyze':
            case 'a':
                await agent.runAnalyzeCommand(argv);
                break;
                
            case 'interactive':
            case 'debug':
                await agent.runInteractiveCommand(argv);
                break;
                
            default:
                // Show welcome for unknown commands or no command
                agent.showWelcome();
                break;
        }
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        if (argv.debug) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { RTTAIAgent };