# RTT AI Agent Architecture

## Current Status: Phase 1 Complete ✅

The RTT AI Agent has successfully completed Phase 1 with a fully functional random player system including comprehensive logging, testing framework, and all movement mechanics (land and naval) working correctly.

## Phase 2: Player Architecture Refactoring 🚧

### **Goal & Vision**

Transform the current single-player system into a flexible, multi-player architecture that supports different AI strategies while maintaining code reuse and consistency.

**Core Principle**: Separate **game mechanics** (how to interact with the game) from **decision making** (what move to choose).

### **Current Problems to Solve**

1. **Code Duplication**: Each new player type would need to reimplement game mechanics
2. **Consistency Issues**: Different players might handle movement/actions differently → bugs
3. **Limited Flexibility**: GameRunner only works with RandomPlayer
4. **No Comparison**: Can't easily pit different strategies against each other

### **Target Architecture**

```
BasePlayer (Abstract)
├── Game Mechanics (Shared)
│   ├── Movement formatting & validation
│   ├── Action type detection
│   ├── Game state utilities
│   └── Statistics tracking
└── Decision Making (Player-Specific)
    ├── RandomPlayer → Random selection
    ├── HeuristicPlayer → Rule-based decisions  
    ├── MCTSPlayer → Monte Carlo Tree Search
    └── NeuralNetworkPlayer → ML-based decisions
```

### **Implementation Plan**

#### **Phase 2.1: Create BasePlayer Foundation**
- [ ] Create abstract `BasePlayer` class
- [ ] Extract common game mechanics from `RandomPlayer`
- [ ] Define abstract `makeDecision()` method
- [ ] Implement template method pattern for turn execution

#### **Phase 2.2: Refactor RandomPlayer**
- [ ] Make `RandomPlayer` extend `BasePlayer`  
- [ ] Move decision logic to `makeDecision()` method
- [ ] Remove duplicated game mechanics
- [ ] Update tests to ensure no regression

#### **Phase 2.3: Update GameRunner**
- [ ] Accept generic `BasePlayer` instances
- [ ] Support multi-player matches (Player1 vs Player2)
- [ ] Add player factory pattern for easy instantiation
- [ ] Update CLI to accept player types

#### **Phase 2.4: Add HeuristicPlayer**
- [ ] Implement simple rule-based player
- [ ] Add evaluation framework for comparing players
- [ ] Create tournament/batch testing capabilities

### **Key Components**

#### **BasePlayer Interface**
```javascript
abstract class BasePlayer {
    // Abstract - each player implements differently
    abstract makeDecision(gameState, availableActions, view);
    
    // Concrete - shared by all players
    formatMovementAction(action, args, gameState, view);
    isMovementPhase(gameState);
    isSelectingMovementOrigin(gameState);
    getAvailableArmiesForMovement(gameState, actionType);
    getAvailableFleetsForMovement(gameState);
    updateGameStats(action, gameState);
    determineWinner(gameState);
    
    // Template method - orchestrates turn execution
    async playTurn(rules, gameState, activePlayer);
}
```

#### **Updated GameRunner**
```javascript
class GameRunner {
    async runMatch(player1, player2, gameOptions);
    async runTournament(playerConfigs[], roundRobin = true);
    generateComparisonReport(results);
}
```

#### **Player Factory**
```javascript
const PlayerFactory = {
    create(type, options) {
        // 'random', 'heuristic', 'mcts', etc.
    }
};
```

### **Benefits of This Architecture**

1. **Code Reuse**: Game mechanics implemented once, used by all players
2. **Consistency**: All players handle movements/actions identically
3. **Flexibility**: Easy to add new player types (just implement `makeDecision()`)
4. **Testing**: Can validate all players behave consistently with game rules
5. **Comparison**: Tournament system to evaluate different strategies
6. **Scalability**: Foundation for advanced AI techniques (MCTS, neural networks)

### **Usage Examples After Refactoring**

```javascript
// Create different player types
const randomPlayer = PlayerFactory.create('random', { seed: 12345 });
const heuristicPlayer = PlayerFactory.create('heuristic', { difficulty: 'medium' });
const mctsPlayer = PlayerFactory.create('mcts', { simulations: 1000 });

// Run matches between different types
await gameRunner.runMatch(randomPlayer, heuristicPlayer, { games: 100 });
await gameRunner.runMatch(mctsPlayer, randomPlayer, { games: 50 });

// Tournament with multiple player types
const players = [
    { type: 'random', name: 'Random-1' },
    { type: 'heuristic', name: 'Heuristic-Medium', difficulty: 'medium' },
    { type: 'mcts', name: 'MCTS-1000', simulations: 1000 }
];
const results = await gameRunner.runTournament(players);
```

### **Migration Strategy**

1. **Backward Compatibility**: Existing `RandomPlayer` usage continues to work
2. **Gradual Migration**: Move functionality piece by piece with tests
3. **No Feature Loss**: All current functionality preserved
4. **Enhanced Capabilities**: New multi-player features added

### **Success Criteria**

- [ ] All existing tests pass with refactored architecture
- [ ] RandomPlayer behavior identical to current implementation  
- [ ] GameRunner supports multiple player types
- [ ] At least 2 different player types implemented (Random + Heuristic)
- [ ] Tournament/comparison system functional
- [ ] Clean separation between game mechanics and decision logic

---

## Future Phases (Post-Refactoring)

### **Phase 3: Advanced AI Players**
- MCTS implementation with configurable simulation count
- Simple neural network player (if desired)
- Hybrid approaches (heuristics + search)

### **Phase 4: Evaluation & Analysis**
- Statistical analysis of player performance
- Strategy pattern identification  
- Game theory analysis tools
- Performance profiling and optimization

---

## Development Notes

### **Key Files to Modify**
- `src/random-player.js` → Extract to BasePlayer + RandomPlayer
- `src/game-runner.js` → Add multi-player support
- `test/unit/random-player.test.js` → Update for new architecture
- `test/integration/` → Add multi-player integration tests

### **New Files to Create**
- `src/base-player.js` → Abstract base class
- `src/player-factory.js` → Factory pattern implementation
- `src/players/heuristic-player.js` → Rule-based player
- `test/unit/base-player.test.js` → Base class tests

### **Architecture Patterns Used**
- **Template Method Pattern**: BasePlayer.playTurn() orchestrates the process
- **Strategy Pattern**: Different decision-making algorithms
- **Factory Pattern**: Player creation and configuration
- **Abstract Base Class**: Common interface and shared functionality

This refactoring sets the foundation for all future AI development and makes the system significantly more powerful and flexible.