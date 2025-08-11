"use strict";

/**
 * Interactive Game Wrapper for Human vs AI Debugging
 * 
 * This wrapper manages games where a human plays against an AI agent,
 * allowing the human to choose their side and opponent type.
 * Designed specifically for debugging and testing AI agents.
 */

const { PlayerFactory } = require('./player-factory');
const { GameLogger } = require('./logger');
const chalk = require('chalk');
const readline = require('readline');

class InteractiveGame {
    constructor(options = {}) {
        this.rulesPath = options.rulesPath || './rules/300-earth-and-water/rules.js';
        const path = require('path');
        const resolvedPath = path.resolve(this.rulesPath);
        this.rules = require(resolvedPath);
        this.seed = options.seed || Math.floor(Math.random() * 1000000);
        this.scenario = options.scenario || 'Standard';
        this.maxSteps = options.maxSteps || 500;
        
        // Game state
        this.gameId = `interactive-${Date.now()}`;
        this.humanSide = null;
        this.aiSide = null;
        this.humanPlayer = null;
        this.aiPlayer = null;
        this.currentStep = 0;
        
        // Create readline interface for setup prompts
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        // Logger
        this.logger = new GameLogger({
            gameId: this.gameId,
            logLevel: 'warn',
            enableConsole: false,
            enableFile: true
        });
    }
    
    /**
     * Start the interactive game session
     */
    async start() {
        try {
            console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
            console.log(chalk.bold.cyan('║         INTERACTIVE GAME: HUMAN vs AI                 ║'));
            console.log(chalk.bold.cyan('║         300: Earth & Water - Debug Mode               ║'));
            console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));
            
            // Setup phase
            await this.setupGame();
            
            // Play the game
            await this.playGame();
            
        } catch (error) {
            console.error(chalk.red('\n❌ Error:'), error.message);
            throw error;
        } finally {
            this.cleanup();
        }
    }
    
    /**
     * Setup game configuration through interactive prompts
     */
    async setupGame() {
        // Choose side
        this.humanSide = await this.chooseSide();
        this.aiSide = this.humanSide === 'Persia' ? 'Greece' : 'Persia';
        
        // Choose opponent
        const aiType = await this.chooseOpponent();
        
        // Display configuration
        console.log(chalk.green('\n✓ Game Configuration:'));
        console.log(chalk.white(`  You play as: ${this.humanSide === 'Persia' ? chalk.red(this.humanSide) : chalk.blue(this.humanSide)}`));
        console.log(chalk.white(`  AI plays as: ${this.aiSide === 'Persia' ? chalk.red(this.aiSide) : chalk.blue(this.aiSide)}`));
        console.log(chalk.white(`  AI Type: ${chalk.yellow(aiType)}`));
        console.log(chalk.white(`  Seed: ${this.seed}`));
        console.log(chalk.white(`  Max Steps: ${this.maxSteps}`));
        
        // Create players
        console.log(chalk.cyan('\nInitializing players...'));
        
        this.humanPlayer = PlayerFactory.create('interactive', {
            name: `Human (${this.humanSide})`,
            gameId: this.gameId,
            seed: this.seed,
            avoidUndo: false  // Humans can undo
        });
        
        this.aiPlayer = PlayerFactory.create(aiType, {
            name: `${aiType} AI (${this.aiSide})`,
            gameId: this.gameId,
            seed: this.seed + 1,
            avoidUndo: true  // AI cannot undo
        });
        
        console.log(chalk.green('✓ Players initialized'));
    }
    
    /**
     * Let user choose which side to play
     */
    async chooseSide() {
        return new Promise((resolve) => {
            console.log(chalk.bold('\nChoose your side:'));
            console.log(chalk.red('  1. Persia') + ' - The mighty empire, starts first');
            console.log(chalk.blue('  2. Greece') + ' - The free cities, defensive advantage');
            
            const askSide = () => {
                this.rl.question(chalk.cyan('Enter 1 or 2: '), (answer) => {
                    if (answer === '1') {
                        resolve('Persia');
                    } else if (answer === '2') {
                        resolve('Greece');
                    } else {
                        console.log(chalk.red('Invalid choice. Please enter 1 or 2.'));
                        askSide();
                    }
                });
            };
            
            askSide();
        });
    }
    
    /**
     * Let user choose opponent type
     */
    async chooseOpponent() {
        const availableTypes = PlayerFactory.getAvailableTypes().filter(t => 
            t !== 'interactive' && t !== 'human'
        );
        
        return new Promise((resolve) => {
            console.log(chalk.bold('\nChoose your opponent:'));
            availableTypes.forEach((type, index) => {
                console.log(chalk.yellow(`  ${index + 1}. ${type}`));
            });
            
            const askOpponent = () => {
                this.rl.question(chalk.cyan(`Enter 1-${availableTypes.length}: `), (answer) => {
                    const index = parseInt(answer) - 1;
                    if (index >= 0 && index < availableTypes.length) {
                        resolve(availableTypes[index]);
                    } else {
                        console.log(chalk.red(`Invalid choice. Please enter 1-${availableTypes.length}.`));
                        askOpponent();
                    }
                });
            };
            
            askOpponent();
        });
    }
    
    /**
     * Play the interactive game with proper turn switching
     */
    async playGame() {
        console.log(chalk.bold.green('\n🎮 GAME STARTING...\n'));
        
        // Close the setup readline interface
        this.rl.close();
        
        // Initialize game
        this.logger.logGameStart({
            seed: this.seed,
            scenario: this.scenario,
            humanSide: this.humanSide,
            aiSide: this.aiSide,
            humanPlayer: this.humanPlayer.name,
            aiPlayer: this.aiPlayer.name
        });
        
        // Setup initial game state
        let gameState = this.rules.setup(this.seed, this.scenario, {});
        
        // Show initial phase information
        const firstActivePlayer = this.determineActivePlayer(gameState);
        if (firstActivePlayer !== this.humanSide) {
            console.log(chalk.yellow(`⏳ Waiting for ${firstActivePlayer} to complete their preparation phase...`));
        }
        
        // Main game loop
        while (gameState.state !== 'game_over' && this.currentStep < this.maxSteps) {
            const activePlayer = this.determineActivePlayer(gameState);
            const isHumanTurn = activePlayer === this.humanSide;
            const currentPlayer = isHumanTurn ? this.humanPlayer : this.aiPlayer;
            
            // Display turn info
            if (isHumanTurn) {
                console.log(chalk.bold.green(`\n▶ YOUR TURN (${activePlayer}) - Step ${this.currentStep + 1}`));
            } else {
                // Only show AI turns occasionally to avoid spam
                if (this.currentStep % 3 === 0 || isHumanTurn) {
                    console.log(chalk.bold.yellow(`\n▶ AI TURN (${activePlayer}) - Step ${this.currentStep + 1}`));
                }
            }
            
            try {
                // Execute turn with appropriate player
                gameState = await currentPlayer.executeTurn(this.rules, gameState, activePlayer);
                this.currentStep++;
                
                // Brief pause after AI moves so human can see what happened
                if (!isHumanTurn) {
                    await this.delay(500); // Shorter delay
                }
                
            } catch (error) {
                console.error(chalk.red('\n❌ Error during turn:'), error.message);
                this.logger.logError(error, {
                    step: this.currentStep,
                    activePlayer: activePlayer,
                    gameState: gameState.state,
                    context: 'game_loop'
                });
                break;
            }
        }
        
        // Game over
        this.displayGameResult(gameState);
    }
    
    /**
     * Determine which side is currently active
     */
    determineActivePlayer(gameState) {
        const active = gameState.active;
        
        // Handle special cases
        if (active === 'Both' || active === 'All') {
            // In simultaneous action states, determine based on game state
            const state = gameState.state;
            if (state.includes('persian')) {
                return 'Persia';
            } else if (state.includes('greek')) {
                return 'Greece';
            }
            // Default to Persia if unclear
            return 'Persia';
        }
        
        return active;
    }
    
    /**
     * Display final game result
     */
    displayGameResult(gameState) {
        console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
        console.log(chalk.bold.cyan('║                    GAME OVER                          ║'));
        console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));
        
        const winner = this.determineWinner(gameState);
        const isHumanWin = winner === this.humanSide;
        
        if (winner === 'tie') {
            console.log(chalk.yellow('⚖️  The game ended in a TIE!'));
        } else if (isHumanWin) {
            console.log(chalk.bold.green(`🎉 VICTORY! You won as ${winner}!`));
        } else {
            console.log(chalk.bold.red(`💀 DEFEAT! The AI (${winner}) has won.`));
        }
        
        console.log(chalk.white(`\nFinal Victory Points: ${this.formatVP(gameState.vp)}`));
        console.log(chalk.white(`Campaign: ${gameState.campaign || 1}`));
        console.log(chalk.white(`Total Steps: ${this.currentStep}`));
        
        if (this.currentStep >= this.maxSteps) {
            console.log(chalk.yellow('\nGame ended due to step limit.'));
        }
        
        console.log(chalk.gray(`\nGame log saved to: logs/${this.gameId}.log`));
        
        this.logger.logGameEnd({
            result: gameState.state === 'game_over' ? 'completed' : 'max_steps',
            winner: winner,
            vp: gameState.vp,
            campaign: gameState.campaign || 1,
            totalSteps: this.currentStep
        });
    }
    
    /**
     * Determine winner from game state
     */
    determineWinner(gameState) {
        if (gameState.state !== 'game_over') {
            return 'unknown';
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
     * Format victory points with color
     */
    formatVP(vp) {
        if (vp > 0) {
            return chalk.red(`Persia +${vp}`);
        } else if (vp < 0) {
            return chalk.blue(`Greece +${Math.abs(vp)}`);
        } else {
            return chalk.yellow('Tied (0)');
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.rl && !this.rl.closed) {
            this.rl.close();
        }
        if (this.humanPlayer && this.humanPlayer.cleanup) {
            this.humanPlayer.cleanup();
        }
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { InteractiveGame };