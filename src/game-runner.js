"use strict";

/**
 * Game Runner for RTT AI Agent
 * 
 * Main entry point for running games with the AI agent.
 * Supports multiple game modes:
 * - Single game with detailed logging
 * - Multiple games for statistical analysis
 * - Debug mode with extra verbosity
 * - Batch processing for rule testing
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');
const path = require('path');
const { PlayerFactory } = require('./player-factory');

/**
 * Main GameRunner class
 * Orchestrates game execution and manages multiple players/games
 */
class GameRunner {
    constructor(options = {}) {
        this.config = {
            rulesPath: options.rulesPath || '../rules/300-earth-and-water/rules.js',
            logLevel: options.logLevel || 'info',
            maxSteps: options.maxSteps || 10000,
            gameCount: options.gameCount || 1,
            seed: options.seed || Math.floor(Math.random() * 1000000),
            scenario: options.scenario || 'Standard',
            outputDir: options.outputDir || './logs',
            verbose: options.verbose || false,
            debug: options.debug || false,
            // Player configuration
            playerType: options.playerType || 'random',
            player1Type: options.player1Type || options.playerType || 'random',
            player2Type: options.player2Type || null, // null means single-player mode
            ...options
        };

        // Load rules module
        this.loadRulesModule();
        
        // Initialize results tracking
        this.results = {
            games: [],
            summary: {
                totalGames: 0,
                completedGames: 0,
                errors: 0,
                winners: {},
                averageSteps: 0,
                averageGameTime: 0
            }
        };

        console.log('GameRunner initialized with configuration:');
        console.log(JSON.stringify(this.config, null, 2));
    }

    /**
     * Load the rules module from the specified path
     */
    loadRulesModule() {
        try {
            const rulesPath = path.resolve(this.config.rulesPath);
            
            if (!fs.existsSync(rulesPath)) {
                throw new Error(`Rules file not found: ${rulesPath}`);
            }
            
            console.log(`Loading rules from: ${rulesPath}`);
            this.rules = require(rulesPath);
            
            // Validate required exports
            const requiredExports = ['setup', 'view', 'action', 'roles', 'scenarios'];
            const missingExports = requiredExports.filter(exp => !(exp in this.rules));
            
            if (missingExports.length > 0) {
                console.warn(`Warning: Missing exports in rules module: ${missingExports.join(', ')}`);
            }
            
            console.log('Rules module loaded successfully');
            console.log(`Available scenarios: ${JSON.stringify(this.rules.scenarios)}`);
            console.log(`Player roles: ${JSON.stringify(this.rules.roles)}`);
            
        } catch (error) {
            console.error('Failed to load rules module:', error.message);
            throw error;
        }
    }

    /**
     * Run a single game with detailed logging
     */
    async runSingleGame(gameOptions = {}) {
        const gameId = gameOptions.gameId || `game-${Date.now()}`;
        const seed = gameOptions.seed || this.config.seed;
        
        console.log(`\n=== Starting Game ${gameId} ===`);
        console.log(`Seed: ${seed}, Scenario: ${this.config.scenario}`);
        
        try {
            // Create player using factory
            const playerType = gameOptions.playerType || this.config.playerType;
            const player = PlayerFactory.create(playerType, {
                name: `${playerType.charAt(0).toUpperCase() + playerType.slice(1)}Player-${gameId}`,
                gameId: gameId,
                seed: seed,
                logLevel: this.config.logLevel,
                maxSteps: this.config.maxSteps,
                avoidUndo: true,
                ...gameOptions
            });

            console.log(`Using player type: ${playerType}`);

            // Game setup
            const gameSetup = {
                seed: seed,
                scenario: this.config.scenario,
                options: gameOptions.options || {}
            };

            // Play the game
            const result = await player.playGame(this.rules, gameSetup);
            
            // Log results
            console.log(`\n=== Game ${gameId} Results ===`);
            console.log(`Winner: ${result.winner}`);
            console.log(`Total Steps: ${result.totalSteps}`);
            console.log(`Game Time: ${result.gameTime}ms`);
            console.log(`Reason: ${result.reason}`);
            
            if (this.config.verbose) {
                console.log(`Final VP: ${result.finalState.vp}`);
                console.log(`Final Campaign: ${result.finalState.campaign}`);
                console.log('Player Statistics:', player.getGameStats());
            }
            
            // Store result
            this.results.games.push({
                gameId: gameId,
                seed: seed,
                playerType: playerType,
                result: result,
                playerStats: player.getGameStats()
            });
            
            return result;
            
        } catch (error) {
            console.error(`Error in game ${gameId}:`, error.message);
            
            this.results.games.push({
                gameId: gameId,
                seed: seed,
                error: error.message,
                result: null
            });
            
            this.results.summary.errors++;
            
            if (this.config.debug) {
                console.error('Full error stack:', error.stack);
            }
            
            throw error;
        }
    }

    /**
     * Run a match between two players
     * Each player alternates between Persia and Greece roles
     */
    async runMatch(player1Config, player2Config, matchOptions = {}) {
        const matchId = matchOptions.matchId || `match-${Date.now()}`;
        const gameCount = matchOptions.games || 2; // Play at least 2 games (one as each side)
        const seed = matchOptions.seed || this.config.seed;
        
        console.log(`\n=== Starting Match ${matchId} ===`);
        console.log(`Player 1: ${player1Config.type} vs Player 2: ${player2Config.type}`);
        console.log(`Games: ${gameCount}, Base Seed: ${seed}`);
        
        const results = {
            matchId: matchId,
            player1: player1Config,
            player2: player2Config,
            games: [],
            summary: {
                player1Wins: 0,
                player2Wins: 0,
                ties: 0,
                totalGames: 0,
                averageSteps: 0,
                averageGameTime: 0
            }
        };
        
        try {
            for (let gameNum = 0; gameNum < gameCount; gameNum++) {
                const gameSeed = seed + gameNum;
                const gameId = `${matchId}-game-${gameNum + 1}`;
                
                // Alternate which player goes first (Persia)
                const persiaPlayer = gameNum % 2 === 0 ? player1Config : player2Config;
                const greecePlayer = gameNum % 2 === 0 ? player2Config : player1Config;
                
                console.log(`\nGame ${gameNum + 1}/${gameCount}: ${persiaPlayer.type}(Persia) vs ${greecePlayer.type}(Greece)`);
                
                // For now, we'll use the single-player mode but track which player type won
                // This is a simplified implementation - full 2-player support would require
                // more complex game state management
                const gameResult = await this.runSingleGame({
                    gameId: gameId,
                    seed: gameSeed,
                    playerType: persiaPlayer.type,
                    ...matchOptions
                });
                
                // Determine match winner based on game result
                let matchWinner;
                if (gameResult.winner === 'Persia') {
                    matchWinner = gameNum % 2 === 0 ? 'player1' : 'player2';
                } else if (gameResult.winner === 'Greece') {
                    matchWinner = gameNum % 2 === 0 ? 'player2' : 'player1';
                } else {
                    matchWinner = 'tie';
                }
                
                // Update match statistics
                if (matchWinner === 'player1') {
                    results.summary.player1Wins++;
                } else if (matchWinner === 'player2') {
                    results.summary.player2Wins++;
                } else {
                    results.summary.ties++;
                }
                
                results.games.push({
                    gameNumber: gameNum + 1,
                    gameId: gameId,
                    seed: gameSeed,
                    persiaPlayer: persiaPlayer.type,
                    greecePlayer: greecePlayer.type,
                    gameWinner: gameResult.winner,
                    matchWinner: matchWinner,
                    result: gameResult
                });
                
                results.summary.totalGames++;
            }
            
            // Calculate averages
            const completedGames = results.games.filter(g => g.result.gameOver);
            if (completedGames.length > 0) {
                results.summary.averageSteps = 
                    completedGames.reduce((sum, g) => sum + g.result.totalSteps, 0) / completedGames.length;
                results.summary.averageGameTime = 
                    completedGames.reduce((sum, g) => sum + g.result.gameTime, 0) / completedGames.length;
            }
            
            // Print match summary
            console.log(`\n=== Match ${matchId} Results ===`);
            console.log(`${player1Config.type} wins: ${results.summary.player1Wins}`);
            console.log(`${player2Config.type} wins: ${results.summary.player2Wins}`);
            console.log(`Ties: ${results.summary.ties}`);
            console.log(`Average Steps: ${Math.round(results.summary.averageSteps)}`);
            console.log(`Average Game Time: ${Math.round(results.summary.averageGameTime)}ms`);
            
            return results;
            
        } catch (error) {
            console.error(`Error in match ${matchId}:`, error.message);
            throw error;
        }
    }

    /**
     * Run multiple games for statistical analysis
     */
    async runMultipleGames(count = null) {
        const gameCount = count || this.config.gameCount;
        console.log(`\n=== Running ${gameCount} Games ===`);
        
        const startTime = Date.now();
        const results = [];
        
        for (let i = 0; i < gameCount; i++) {
            try {
                const gameSeed = this.config.seed + i;
                const gameId = `game-${Date.now() + i}`;
                
                console.log(`\nGame ${i + 1}/${gameCount} (seed: ${gameSeed})`);
                
                const result = await this.runSingleGame({
                    gameId: gameId,
                    seed: gameSeed
                });
                
                results.push(result);
                this.results.summary.completedGames++;
                
                // Update winner statistics
                const winner = result.winner;
                if (!this.results.summary.winners[winner]) {
                    this.results.summary.winners[winner] = 0;
                }
                this.results.summary.winners[winner]++;
                
            } catch (error) {
                console.error(`Failed to complete game ${i + 1}:`, error.message);
                // Continue with next game
            }
        }
        
        const totalTime = Date.now() - startTime;
        this.results.summary.totalGames = gameCount;
        
        // Calculate averages
        const completedGames = results.filter(r => r.gameOver);
        if (completedGames.length > 0) {
            this.results.summary.averageSteps = 
                completedGames.reduce((sum, r) => sum + r.totalSteps, 0) / completedGames.length;
            this.results.summary.averageGameTime = 
                completedGames.reduce((sum, r) => sum + r.gameTime, 0) / completedGames.length;
        }
        
        // Print summary
        console.log(`\n=== Batch Results Summary ===`);
        console.log(`Total Games: ${gameCount}`);
        console.log(`Completed Games: ${this.results.summary.completedGames}`);
        console.log(`Errors: ${this.results.summary.errors}`);
        console.log(`Total Time: ${totalTime}ms`);
        console.log(`Average Game Time: ${Math.round(this.results.summary.averageGameTime)}ms`);
        console.log(`Average Steps: ${Math.round(this.results.summary.averageSteps)}`);
        console.log('Winners:', this.results.summary.winners);
        
        return this.results;
    }

    /**
     * Run a tournament with multiple player types
     */
    async runTournament(playerConfigs, tournamentOptions = {}) {
        const tournamentId = tournamentOptions.tournamentId || `tournament-${Date.now()}`;
        const roundRobin = tournamentOptions.roundRobin !== false; // Default true
        const gamesPerMatch = tournamentOptions.gamesPerMatch || 4;
        
        console.log(`\n=== Starting Tournament ${tournamentId} ===`);
        console.log(`Players: ${playerConfigs.map(p => p.type).join(', ')}`);
        console.log(`Format: ${roundRobin ? 'Round Robin' : 'Single Elimination'}`);
        console.log(`Games per match: ${gamesPerMatch}`);
        
        const tournament = {
            tournamentId: tournamentId,
            players: playerConfigs,
            matches: [],
            standings: {},
            summary: {
                totalMatches: 0,
                totalGames: 0,
                completedMatches: 0
            }
        };
        
        // Initialize standings
        playerConfigs.forEach(config => {
            tournament.standings[config.type] = {
                wins: 0,
                losses: 0,
                ties: 0,
                gameWins: 0,
                gameLosses: 0,
                gameTies: 0,
                totalGames: 0,
                winRate: 0
            };
        });
        
        try {
            if (roundRobin) {
                // Round robin: every player plays every other player
                for (let i = 0; i < playerConfigs.length; i++) {
                    for (let j = i + 1; j < playerConfigs.length; j++) {
                        const player1 = playerConfigs[i];
                        const player2 = playerConfigs[j];
                        
                        console.log(`\n--- Match: ${player1.type} vs ${player2.type} ---`);
                        
                        const matchResult = await this.runMatch(player1, player2, {
                            matchId: `${tournamentId}-${player1.type}-vs-${player2.type}`,
                            games: gamesPerMatch,
                            seed: this.config.seed + tournament.matches.length,
                            ...tournamentOptions
                        });
                        
                        tournament.matches.push(matchResult);
                        tournament.summary.totalMatches++;
                        tournament.summary.completedMatches++;
                        tournament.summary.totalGames += matchResult.summary.totalGames;
                        
                        // Update standings
                        const player1Stats = tournament.standings[player1.type];
                        const player2Stats = tournament.standings[player2.type];
                        
                        if (matchResult.summary.player1Wins > matchResult.summary.player2Wins) {
                            player1Stats.wins++;
                            player2Stats.losses++;
                        } else if (matchResult.summary.player2Wins > matchResult.summary.player1Wins) {
                            player1Stats.losses++;
                            player2Stats.wins++;
                        } else {
                            player1Stats.ties++;
                            player2Stats.ties++;
                        }
                        
                        // Update game-level stats
                        player1Stats.gameWins += matchResult.summary.player1Wins;
                        player1Stats.gameLosses += matchResult.summary.player2Wins;
                        player1Stats.gameTies += matchResult.summary.ties;
                        player1Stats.totalGames += matchResult.summary.totalGames;
                        
                        player2Stats.gameWins += matchResult.summary.player2Wins;
                        player2Stats.gameLosses += matchResult.summary.player1Wins;
                        player2Stats.gameTies += matchResult.summary.ties;
                        player2Stats.totalGames += matchResult.summary.totalGames;
                    }
                }
            }
            
            // Calculate win rates
            Object.values(tournament.standings).forEach(stats => {
                const totalMatches = stats.wins + stats.losses + stats.ties;
                if (totalMatches > 0) {
                    stats.winRate = ((stats.wins + stats.ties * 0.5) / totalMatches * 100).toFixed(1);
                }
            });
            
            // Sort standings by win rate
            const sortedStandings = Object.entries(tournament.standings)
                .sort(([, a], [, b]) => parseFloat(b.winRate) - parseFloat(a.winRate));
            
            // Print tournament results
            console.log(`\n=== Tournament ${tournamentId} Results ===`);
            console.log('Final Standings:');
            sortedStandings.forEach(([playerType, stats], index) => {
                console.log(`${index + 1}. ${playerType}: ${stats.wins}W-${stats.losses}L-${stats.ties}T (${stats.winRate}% win rate)`);
                console.log(`   Game record: ${stats.gameWins}W-${stats.gameLosses}L-${stats.gameTies}T (${stats.totalGames} games)`);
            });
            
            console.log(`\nTotal: ${tournament.summary.totalMatches} matches, ${tournament.summary.totalGames} games`);
            
            return tournament;
            
        } catch (error) {
            console.error(`Error in tournament ${tournamentId}:`, error.message);
            throw error;
        }
    }

    /**
     * Save results to JSON file for further analysis
     */
    saveResults(filename = null) {
        const outputFile = filename || path.join(this.config.outputDir, `results-${Date.now()}.json`);
        
        // Ensure output directory exists
        const dir = path.dirname(outputFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Prepare results for saving
        const output = {
            config: this.config,
            timestamp: new Date().toISOString(),
            results: this.results
        };
        
        try {
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`Results saved to: ${outputFile}`);
            return outputFile;
        } catch (error) {
            console.error('Failed to save results:', error.message);
            throw error;
        }
    }

    /**
     * Analyze results and generate report
     */
    generateReport() {
        const report = {
            summary: this.results.summary,
            analysis: {}
        };

        if (this.results.games.length > 0) {
            // Win rate analysis
            const totalCompleted = this.results.summary.completedGames;
            if (totalCompleted > 0) {
                report.analysis.winRates = {};
                for (const [winner, count] of Object.entries(this.results.summary.winners)) {
                    report.analysis.winRates[winner] = (count / totalCompleted * 100).toFixed(1) + '%';
                }
            }

            // Game length analysis
            const completedGames = this.results.games.filter(g => g.result && g.result.gameOver);
            if (completedGames.length > 0) {
                const steps = completedGames.map(g => g.result.totalSteps);
                const times = completedGames.map(g => g.result.gameTime);
                
                report.analysis.gameLength = {
                    avgSteps: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length),
                    minSteps: Math.min(...steps),
                    maxSteps: Math.max(...steps),
                    avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
                    minTime: Math.min(...times),
                    maxTime: Math.max(...times)
                };
            }

            // Error analysis
            const errors = this.results.games.filter(g => g.error);
            if (errors.length > 0) {
                report.analysis.errors = {
                    count: errors.length,
                    rate: (errors.length / this.results.games.length * 100).toFixed(1) + '%',
                    types: errors.reduce((acc, e) => {
                        const errorType = e.error.split(':')[0];
                        acc[errorType] = (acc[errorType] || 0) + 1;
                        return acc;
                    }, {})
                };
            }
        }

        return report;
    }
}

/**
 * Command line interface
 */
async function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: $0 [options]')
        .option('rules', {
            alias: 'r',
            type: 'string',
            default: '../rules/300-earth-and-water/rules.js',
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
            description: 'Player 1 type for matches'
        })
        .option('player2-type', {
            type: 'string',
            description: 'Player 2 type for matches'
        })
        .option('max-steps', {
            type: 'number',
            default: 10000,
            description: 'Maximum steps before game timeout'
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
        .help()
        .alias('help', 'h')
        .argv;

    try {
        // Create game runner
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

        // Run games
        let results;
        if (argv.count === 1) {
            results = await runner.runSingleGame();
        } else {
            results = await runner.runMultipleGames();
        }

        // Generate and display report
        const report = runner.generateReport();
        console.log('\n=== Final Report ===');
        console.log(JSON.stringify(report, null, 2));

        // Save results if requested
        if (argv.saveResults) {
            runner.saveResults();
        }

        console.log('\n=== Game Runner Complete ===');
        
    } catch (error) {
        console.error('Fatal error:', error.message);
        if (argv.debug) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { GameRunner };