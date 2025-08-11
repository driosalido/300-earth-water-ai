# RTT AI Agent

An extensible AI agent system for playing board games on the Rally The Troops platform, starting with "300: Earth & Water".

## Overview

This project provides a flexible framework for AI agents that can play board games through:
1. **Multi-Player Architecture**: Support for different AI strategies (Random, Heuristic, MCTS, etc.)
2. **Comprehensive Analysis**: Detailed logging and statistical analysis of gameplay
3. **Tournament System**: Head-to-head matches and round-robin tournaments
4. **Extensible Design**: Easy to add new AI player types and strategies

## Features

### Current Implementation ✅

- **Multi-Player Architecture**: BasePlayer abstract class with extensible player types
- **Player Factory**: Create and manage different AI player types
- **Random Player**: Baseline AI with comprehensive logging and debugging
- **Tournament System**: Head-to-head matches and round-robin tournaments
- **CLI Interface**: Easy-to-use command-line interface with player type selection
- **Detailed Logging**: Every game step, state, and decision logged with timestamps
- **Statistical Analysis**: Game patterns, win rates, and performance metrics
- **Batch Processing**: Run multiple games for statistical significance

### Future Phases 🔮

- **Heuristic Player**: Rule-based strategic decision making
- **Monte Carlo Tree Search (MCTS)**: Advanced tree search algorithms
- **Neural Networks**: Deep learning for state evaluation and move prediction
- **Self-Play Training**: Continuous learning and improvement
- **Multi-Game Support**: Extend to other Rally The Troops games

## Installation

```bash
# Navigate to the project directory
cd rtt-ai-agent

# Install dependencies
npm install

# Copy rules from the RTT server (adjust path as needed)
mkdir -p rules/300-earth-and-water
cp ../server/public/300-earth-and-water/rules.js rules/300-earth-and-water/
```

## Usage

### Quick Start

```bash
# Run a single game with random player
node src/index.js play --player-type random --verbose

# Run multiple games for statistical analysis
node src/index.js play --count 10 --player-type random --verbose

# Debug mode with maximum logging
node src/index.js play --player-type random --debug --seed 12345

# Show available commands and options
node src/index.js --help
```

### Command Line Interface

```bash
# Show help
node src/index.js --help

# Run games
node src/index.js play --count 5 --seed 12345 --verbose

# Analyze results
node src/index.js analyze --file ./logs/results-123456.json

# System information
node src/index.js info
```

### Available Commands

#### `play` - Run Games
```bash
node src/index.js play [options]

Options:
  --count, -c       Number of games to run (default: 1)
  --seed, -s        Random seed for reproducibility
  --scenario        Game scenario (default: "Standard")
  --player-type     Player type to use (random) (default: "random")
  --player1-type    Player 1 type for matches (e.g., random)
  --player2-type    Player 2 type for matches (e.g., random)
  --max-steps       Maximum steps before timeout (default: 10000)
  --verbose, -v     Enable verbose output
  --debug, -d       Enable debug mode with detailed logging
  --output, -o      Output directory for logs (default: ./logs)
  --rules, -r       Path to rules.js file (default: "./rules/300-earth-and-water/rules.js")
  --save-results    Save results to JSON file (default: true)

Examples:
  node src/index.js play --count 5 --verbose
  node src/index.js play --debug --seed 12345
  node src/index.js play --player-type random --count 10
  
  # Match between two players (when multiple types are available)
  node src/index.js play --player1-type random --player2-type random --count 10
```

#### `interactive` / `debug` - Interactive Debugging
```bash
node src/index.js interactive [options]
# or use the simple launcher:
node debug.js [options]

Options:
  --seed, -s        Random seed for reproducibility
  --max-steps       Maximum steps before timeout (default: 500)
  --scenario        Game scenario (default: "Standard")

Interactive Features:
  - Choose your side (Persia or Greece)
  - Choose opponent AI type
  - Human-readable game state display
  - Card names and event descriptions
  - Turn-by-turn gameplay against AI
  - Perfect for debugging AI behavior
```

#### `analyze` - Analyze Results
```bash
node src/index.js analyze [options]

Options:
  --file, -f        Analyze specific results file
  --dir             Analyze all results in directory (default: ./logs)
```

## Project Structure

```
rtt-ai-agent/
├── src/
│   ├── index.js          # Main CLI entry point
│   ├── game-runner.js    # Game execution, matches, and tournaments
│   ├── base-player.js    # Abstract base class for all players
│   ├── random-player.js  # Random player implementation
│   ├── player-factory.js # Player creation and type management
│   └── logger.js         # Comprehensive logging system
├── docs/                 # Documentation
│   └── ARCHITECTURE.md   # Architecture design and patterns
├── test/                 # Test suite
│   ├── unit/             # Unit tests for individual components
│   ├── integration/      # Integration tests with game rules
│   └── fixtures/         # Test data and helpers
├── logs/                 # Game logs and results
│   ├── *.log             # Unified game logs (all info in one file)
│   └── results-*.json    # Game results and statistics
├── rules/                # Game rules
│   └── 300-earth-and-water/
│       └── rules.js      # 300: Earth & Water rules
├── package.json          # Node.js dependencies and scripts
└── README.md            # This file
```

## Player Architecture

The system uses a flexible architecture that separates game mechanics from decision-making strategies.

### Available Player Types

- **`random`**: Makes random valid moves (baseline for testing and comparison)
- *Future*: **`heuristic`**: Rule-based strategic decisions
- *Future*: **`mcts`**: Monte Carlo Tree Search
- *Future*: **`neural`**: Neural network-based AI

### Creating Players

```javascript
const { PlayerFactory } = require('./src/player-factory');

// Create a random player
const player = PlayerFactory.create('random', {
  seed: 12345,
  logLevel: 'info'
});

// Get available player types
console.log(PlayerFactory.getAvailableTypes()); // ['random']
```

### Extending with New Player Types

To add a new player type:

1. **Create Player Class**: Extend `BasePlayer` and implement `makeDecision()`
2. **Add to Factory**: Register in `PlayerFactory.PLAYER_TYPES`
3. **Add Tests**: Create unit and integration tests
4. **Update CLI**: Player type will automatically appear in help

Example skeleton:
```javascript
const { BasePlayer } = require('./base-player');

class MyPlayer extends BasePlayer {
  makeDecision(gameState, availableActions, view) {
    // Your decision logic here
    return {
      action: 'chosen_action',
      args: 'action_arguments',
      reason: 'why_this_move'
    };
  }
}
```

### Tournament System

```javascript
const { GameRunner } = require('./src/game-runner');

const runner = new GameRunner({ /* config */ });

// Head-to-head match
const matchResult = await runner.runMatch(
  { type: 'random', seed: 123 },
  { type: 'heuristic', difficulty: 'medium' },
  { games: 4 }
);

// Round-robin tournament
const tournament = await runner.runTournament([
  { type: 'random', name: 'Random-1' },
  { type: 'heuristic', name: 'Heuristic-Easy' },
  { type: 'heuristic', name: 'Heuristic-Hard' }
], { gamesPerMatch: 4 });
```

## Logging System

The system provides comprehensive logging at multiple levels:

### Log Files Generated

- **`game-{gameId}.log`**: General game events and actions
- **`error-{gameId}.log`**: Error events only
- **`state-{gameId}.log`**: Detailed state dumps (JSON format)
- **`results-{timestamp}.json`**: Game results and statistics

### Log Levels

- **`error`**: Errors and crashes only
- **`warn`**: Warnings and errors
- **`info`**: Game events, actions, and outcomes (default)
- **`debug`**: Detailed state information
- **`silly`**: Complete state dumps and internal details

### Sample Log Output

```
[2024-01-15 10:30:45.123] INFO: STEP 1: Persia in persian_preparation_draw
[2024-01-15 10:30:45.125] DEBUG: Action Selection Process
{
  "availableActions": ["draw", "pass"],
  "selectedAction": "draw",
  "selectionReason": "random",
  "randomSeed": 12345
}
[2024-01-15 10:30:45.127] INFO: STEP 2: Persia in persian_preparation_build
```

## Game Analysis

The system provides detailed analysis of game patterns:

### Statistics Collected

- **Game Completion Rate**: Percentage of games that finish successfully
- **Winner Distribution**: Who wins and how often
- **Game Length**: Average steps and time per game
- **Action Frequency**: Which actions are used most often
- **State Analysis**: Time spent in different game states
- **Error Patterns**: Common failure modes

### Sample Analysis Output

```json
{
  "summary": {
    "totalGames": 10,
    "completedGames": 9,
    "errors": 1,
    "winners": {
      "Persia": 5,
      "Greece": 4
    },
    "averageSteps": 156,
    "averageGameTime": 2340
  },
  "analysis": {
    "winRates": {
      "Persia": "55.6%",
      "Greece": "44.4%"
    },
    "gameLength": {
      "avgSteps": 156,
      "minSteps": 89,
      "maxSteps": 234
    }
  }
}
```

## Understanding the Game

### 300: Earth & Water

This is a strategic board game simulating the Greco-Persian Wars:

- **Players**: Persia (attacker) vs Greece (defender)
- **Victory**: Persia wins by gaining victory points, Greece wins by preventing this
- **Mechanics**: Card-driven with area movement, supply, and combat
- **Campaigns**: Multiple campaigns with preparation and action phases

### Game State Structure

Key components tracked in the game state:

```javascript
{
  campaign: 1,           // Current campaign number
  vp: 0,                // Victory points (+ for Persia, - for Greece)
  active: "Persia",     // Current player
  state: "persian_preparation_draw",  // Current game state
  units: { ... },       // Unit positions on map
  trigger: { ... },     // Event flags and triggers
  deck: [...],          // Card deck
  persian: { hand: [...] },  // Persian player state
  greek: { hand: [...] }     // Greek player state
}
```

## Development and Debugging

### Running Tests

```bash
# Run the Jest test suite
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests  
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Testing AI Players

The random player serves as both an AI baseline and a debugging tool:

```bash
# Test rules implementation with random player
node src/index.js play --count 20 --debug --player-type random

# Test specific scenarios with reproducible seeds
node src/index.js play --scenario "Standard" --seed 12345 --verbose

# Compare performance across multiple games
node src/index.js play --count 100 --player-type random
node src/index.js analyze --dir ./logs
```

### Development Workflow

1. **Create New Player**: Extend `BasePlayer` class
2. **Add to Factory**: Register in `PlayerFactory.PLAYER_TYPES`
3. **Write Tests**: Add unit and integration tests
4. **Test via CLI**: Use `--player-type your_type`
5. **Run Tournaments**: Compare against existing players

### Common Issues

1. **Rules Not Found**: Make sure to copy rules.js from the RTT server
2. **High Memory Usage**: Large state logs can consume memory; use appropriate log levels
3. **Game Timeouts**: Adjust `--max-steps` if games are taking too long

## Contributing

This project provides a solid foundation for AI research and experimentation:

### Adding New Player Types

1. **Create Player Class**: 
   ```javascript
   // src/players/heuristic-player.js
   class HeuristicPlayer extends BasePlayer {
     makeDecision(gameState, availableActions, view) {
       // Implement your strategy here
       return { action, args, reason };
     }
   }
   ```

2. **Register in Factory**:
   ```javascript
   // src/player-factory.js
   static get PLAYER_TYPES() {
     return {
       'random': RandomPlayer,
       'heuristic': HeuristicPlayer, // Add your player
     };
   }
   ```

3. **Add Tests**: Create comprehensive unit and integration tests
4. **Update Documentation**: Add to README and create player-specific docs

### Areas for Contribution

1. **New AI Strategies**: Heuristic, MCTS, neural network players
2. **Performance Optimization**: Faster game execution and analysis
3. **Enhanced Analytics**: Better statistical analysis and visualization
4. **Multi-Game Support**: Adapt for other Rally The Troops games
5. **UI/Web Interface**: Web-based tournament management and visualization

## Development Roadmap

### Phase 1: Foundation ✅ **COMPLETED**
- Random player with comprehensive logging
- Game analysis and debugging tools
- CLI interface and batch processing

### Phase 2: Multi-Player Architecture ✅ **COMPLETED**
- BasePlayer abstract class for consistent game mechanics
- PlayerFactory for extensible player type management
- Tournament system for head-to-head matches
- Enhanced CLI with player type selection
- Comprehensive test suite with Jest

### Phase 3: Strategic AI 📋 **NEXT**
- HeuristicPlayer with rule-based decision making
- Monte Carlo Tree Search (MCTS) implementation
- Basic game evaluation functions
- Strategic move selection algorithms

### Phase 4: Learning AI 📋 **FUTURE**
- Neural network integration for state evaluation
- Self-play training system
- Strategy evolution and adaptation
- Reinforcement learning capabilities

### Phase 5: Advanced Features 📋 **FUTURE**
- Deep reinforcement learning
- Multi-game support (other RTT games)
- Advanced tournament modes
- Performance optimization and scaling

## License

MIT License - Feel free to use, modify, and learn from this code.