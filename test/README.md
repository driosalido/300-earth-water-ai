# Testing Framework

This directory contains the comprehensive test suite for the RTT AI Agent system using Jest.

## Directory Structure

```
test/
├── unit/                   # Unit tests for individual classes
│   ├── logger.test.js      # GameLogger functionality tests
│   ├── random-player.test.js # RandomPlayer functionality tests
│   └── game-runner.test.js # GameRunner functionality tests
├── integration/            # Integration tests for system components
│   ├── movement.test.js    # Land movement integration tests
│   ├── naval-movement.test.js # Naval movement integration tests
│   └── full-game.test.js   # Complete game execution tests
├── fixtures/               # Test data and helper utilities
│   └── game-states.js      # Pre-built game states and test utilities
└── README.md              # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (continuous testing)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Files
```bash
npx jest test/unit/random-player.test.js
npx jest test/integration/movement.test.js
```

## Test Categories

### Unit Tests
Test individual classes and their methods in isolation:

- **RandomPlayer Tests**: Test random action selection, movement phase detection, and game statistics
- **GameLogger Tests**: Test logging functionality, statistics tracking, and error handling
- **GameRunner Tests**: Test game orchestration, batch processing, and configuration

### Integration Tests
Test system components working together:

- **Movement Tests**: Test land movement mechanics with actual game rules
- **Naval Movement Tests**: Test naval movement mechanics with fleet management
- **Full Game Tests**: Test complete game execution from start to finish

## Test Fixtures

The `fixtures/game-states.js` file provides:

- **Pre-built Game States**: Common game states for testing (initial, movement phases, etc.)
- **Move Sequences**: Reusable sequences to reach specific game states
- **Mock Data**: Unit configurations, action sets, and expected values
- **Helper Functions**: Utilities for creating custom test scenarios

### Example Usage
```javascript
const { GAME_STATES, MOVE_SEQUENCES, HELPERS } = require('./fixtures/game-states');

// Use pre-built game state
const gameState = GAME_STATES.PERSIAN_MOVEMENT();

// Execute a move sequence
const finalState = executeMoveSequence(initialState, MOVE_SEQUENCES.TO_PERSIAN_LAND_MOVEMENT);

// Validate game state
HELPERS.validateGameState(gameState, EXPECTED_STATES.PERSIAN_MOVEMENT);
```

## Writing New Tests

### Unit Test Template
```javascript
const { YourClass } = require('../../src/your-class');

describe('YourClass Unit Tests', () => {
    let instance;

    beforeEach(() => {
        instance = new YourClass({ /* test config */ });
    });

    describe('Method Group', () => {
        test('should do something specific', () => {
            // Arrange
            const input = 'test-input';
            
            // Act
            const result = instance.method(input);
            
            // Assert
            expect(result).toBe('expected-output');
        });
    });
});
```

### Integration Test Template
```javascript
const RULES = require('../../rules/300-earth-and-water/rules.js');
const { YourClass } = require('../../src/your-class');

describe('Integration Tests', () => {
    let gameState;
    let instance;

    beforeEach(() => {
        gameState = RULES.setup(12345, 'Standard', {});
        instance = new YourClass({ seed: 12345, logLevel: 'error' });
    });

    test('should work with real game rules', () => {
        // Test integration with actual game mechanics
        const result = instance.doSomething(gameState);
        expect(result).toBeDefined();
    });
});
```

## Test Configuration

Jest configuration is in `package.json`:

- **Test Environment**: Node.js
- **Test Pattern**: `**/test/**/*.test.js`
- **Coverage**: Includes all `src/**/*.js` files
- **Timeout**: 30 seconds (for integration tests)

## Best Practices

1. **Isolation**: Unit tests should not depend on external systems
2. **Deterministic**: Use fixed seeds for reproducible results
3. **Fast**: Keep unit tests under 100ms each
4. **Descriptive**: Use clear, descriptive test names
5. **Arrange-Act-Assert**: Structure tests with clear phases
6. **Mock External Dependencies**: Use mocks for file I/O, network calls, etc.

## Debugging Tests

### Run Single Test
```bash
npx jest test/unit/random-player.test.js -t "should generate consistent random numbers"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest test/unit/random-player.test.js --runInBand
```

### Verbose Output
```bash
npm test -- --verbose
```

## Continuous Integration

The test suite is designed to run in CI environments:

- All tests should pass before merging
- Coverage reports are generated automatically
- Integration tests validate system behavior
- Performance tests ensure reasonable execution times

## Adding New Test Categories

To add new test categories:

1. Create new directory under `test/`
2. Add corresponding npm script in `package.json`
3. Update Jest configuration if needed
4. Document the new category in this README