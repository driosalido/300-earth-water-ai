#!/usr/bin/env python3
"""
RANDOM AGENT FOR 300: EARTH & WATER

This module implements a simple random agent that makes random valid moves
in the game. It's useful for:
- Testing the game environment
- Providing a baseline opponent for human players
- Demonstrating the agent interface
- Generating random game data for analysis

The RandomAgent class follows a simple interface that can be extended
for more sophisticated AI agents.
"""

import random
import logging


class RandomAgent:
    """
    SIMPLE RANDOM AGENT FOR 300: EARTH & WATER
    
    This agent makes completely random valid moves. While not strategic,
    it's useful for testing and as a baseline opponent.
    
    Agent Interface:
    - __init__(name, log_level): Initialize the agent with logging
    - choose_action(game_env): Select an action from available options
    - game_started(game_env): Called when a new game begins
    - game_ended(game_env, winner): Called when the game ends
    
    The agent maintains its own logger for decision tracking and analysis.
    """
    
    def __init__(self, name="RandomAgent", log_level=logging.INFO):
        """
        Initialize the random agent
        
        Args:
            name (str): Agent name for logging and identification
            log_level: Logging level for agent decisions
        """
        self.name = name
        self.decision_count = 0
        
        # Set up agent-specific logging
        self.logger = logging.getLogger(f"{self.name}_{id(self)}")
        self.logger.setLevel(log_level)
        
        # Clear any existing handlers
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(f'[{self.name}] %(levelname)s: %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        self.logger.info(f"🤖 {self.name} initialized")
    
    def choose_action(self, game_env):
        """
        Choose a random action from available options
        
        This method:
        - Gets available actions from the game environment
        - Selects one action randomly
        - Handles action arguments appropriately
        - Logs the decision process for analysis
        
        Args:
            game_env (GameEnvironment): Current game environment
            
        Returns:
            tuple: (action_name, action_arg) or None if no actions available
        """
        self.decision_count += 1
        
        # Get available actions
        actions_result = game_env.get_actions()
        if not actions_result.get('success'):
            self.logger.error("❌ Failed to get available actions")
            return None
        
        actions = actions_result.get('actions', {})
        if not actions:
            self.logger.warning("⚠️ No actions available")
            return None
        
        # Filter out disabled actions (value is 0 or False) and undo actions
        valid_actions = {k: v for k, v in actions.items() 
                        if v != 0 and v != False and v != [] and k != 'undo'}
        
        if not valid_actions:
            self.logger.warning("⚠️ No valid actions available (excluding undo)")
            return None
        
        # Select random action
        action_name = random.choice(list(valid_actions.keys()))
        action_args = valid_actions[action_name]
        
        # Handle action arguments
        action_arg = None
        if isinstance(action_args, list) and action_args:
            action_arg = random.choice(action_args)
        elif isinstance(action_args, (int, str)) and action_args not in [0, 1, False]:
            action_arg = action_args
        
        # Log the decision
        decision_desc = f"Decision #{self.decision_count}: {action_name}"
        if action_arg is not None:
            decision_desc += f"({action_arg})"
        
        available_desc = f"from {list(valid_actions.keys())}"
        self.logger.info(f"🎲 {decision_desc} {available_desc}")
        
        return (action_name, action_arg)
    
    def game_started(self, game_env):
        """
        Called when a new game starts
        
        Args:
            game_env (GameEnvironment): The game environment
        """
        self.decision_count = 0
        active_player = game_env.get_active_player()
        self.logger.info(f"🎮 New game started - {'I play as ' + active_player if active_player else 'Observing'}")
    
    def game_ended(self, game_env, winner):
        """
        Called when the game ends
        
        Args:
            game_env (GameEnvironment): The game environment
            winner (str): Winner of the game ('Greece', 'Persia', 'Draw', etc.)
        """
        turn_count = game_env.get_turn_number()
        self.logger.info(f"🏆 Game ended after {turn_count} turns")
        self.logger.info(f"   Winner: {winner}")
        self.logger.info(f"   My decisions: {self.decision_count}")
    
    def __str__(self):
        """String representation of the agent"""
        return f"{self.name} (Random)"


def test_random_agent():
    """Test the random agent with a short game"""
    print("🤖 Testing RandomAgent")
    print("=" * 40)
    
    # Import here to avoid circular imports
    from game_env import GameEnvironment
    
    # Create game and agent
    game = GameEnvironment(log_level=logging.WARNING)  # Reduce game logging for test
    agent = RandomAgent("TestBot", log_level=logging.INFO)
    
    # Start game
    result = game.new_game(seed=54321)
    if not result.get('success'):
        print(f"❌ Failed to start game: {result.get('error')}")
        return
    
    agent.game_started(game)
    
    # Play a few random moves
    for i in range(5):
        if game.is_game_over():
            break
        
        player = game.get_active_player()
        print(f"\nTurn {i+1}: {player}'s turn")
        print(f"Prompt: {game.get_prompt()}")
        
        # Let agent choose action
        choice = agent.choose_action(game)
        if not choice:
            print("❌ Agent couldn't choose an action")
            break
        
        action_name, action_arg = choice
        
        # Execute the action
        result = game.execute_action(player, action_name, action_arg)
        if not result.get('success'):
            print(f"❌ Action failed: {result.get('error')}")
            break
    
    # End game
    winner = game.get_winner() or "Unknown"
    agent.game_ended(game, winner)
    
    print("\n✨ RandomAgent test complete!")


if __name__ == "__main__":
    test_random_agent()