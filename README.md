# 300: Earth & Water AI Agent

A Python interface for building AI agents to play the board game "300: Earth & Water" on the Rally The Troops platform.

## Quick Start

```bash
# Test enhanced game environment
python src/game_env.py

# Test random AI agent  
cd src && python random_agent.py

# Play interactively against AI
python src/interactive_game.py

# Use in your code
from src.game_env import GameEnvironment

game = GameEnvironment(log_level=logging.INFO)  # Comprehensive logging
game.new_game(seed=12345)

# Game loop with full tracking
while not game.is_game_over():
    actions = game.get_actions()
    # Your AI logic here...
    game.execute_action(player, action, arg)

# Access complete game history and logs
history = game.get_game_history()
print(f"Log file: {game.log_file}")
```

## Enhanced Architecture

- **`bridge/bridge_server.js`**: Comprehensive bridge server with detailed logging
- **`src/game_env.py`**: Enhanced Python environment with logging and history tracking
- **`src/random_agent.py`**: Random AI agent with extensible interface
- **`src/interactive_game.py`**: Full human vs AI interactive gameplay
- **`logs/`**: Timestamped comprehensive game logs for analysis

## Current Status

✅ **Enhanced Game Engine Complete**: Production-ready system with comprehensive features

The enhanced system provides:
- **Comprehensive Logging**: Every game event logged with timestamps and analysis
- **Interactive Gameplay**: Rich human vs AI interface with game visualization
- **AI Agent Framework**: Extensible agent interface with random baseline
- **Complete Documentation**: All code thoroughly commented and documented
- **Game History Tracking**: Full action history for analysis and replay
- **Error Handling**: Robust error recovery with detailed diagnostics
- **Decisive Gameplay**: Undo actions filtered out by default for committed decision-making

## Project Structure

```
rtt-ai-agent/
├── bridge/
│   ├── bridge_server.js    # Persistent Node.js server
│   └── game_bridge.js     # Original stateless bridge (reference)
├── src/
│   ├── game_env.py        # Clean Python game interface
│   └── __init__.py
├── test_simple.py         # Foundation test
├── CLAUDE.md             # Detailed project documentation
└── pyproject.toml        # Python project configuration
```

## Next Steps

This foundation is ready for AI agent development:

1. **Simple AI Agents**: Create random and heuristic-based agents
2. **Game Analysis**: Add state evaluation and logging capabilities  
3. **Training Infrastructure**: Implement self-play learning loops
4. **Advanced AI**: Monte Carlo Tree Search and neural networks

## Documentation

- **`CLAUDE.md`**: Complete project knowledge base with detailed history
- **`test_simple.py`**: Working example demonstrating the foundation

## About 300: Earth & Water

A 2-player asymmetric strategy game about the Greco-Persian Wars with:
- **Asymmetric gameplay**: Greece vs Persia with different capabilities
- **Card-driven events**: Dual-use cards for both sides
- **Resource management**: Talents, armies, and fleets
- **Strategic depth**: Multiple phases, combat, and victory conditions

The game is fully implemented and working through this Python interface.