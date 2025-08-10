#!/usr/bin/env python3
"""
INTERACTIVE GAME INTERFACE FOR 300: EARTH & WATER

This module provides an interactive command-line interface for humans to play
against AI agents in 300: Earth & Water. It features:

- Clean, user-friendly interface with game state display
- Human vs AI gameplay with role selection
- Comprehensive game state visualization
- Action selection with input validation
- Game history and replay capabilities
- Detailed logging of all game events

The interface is designed to be intuitive for both casual players and
serious game analysis, with rich formatting and helpful prompts.
"""

import sys
import random
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from game_env import GameEnvironment
from random_agent import RandomAgent


class InteractiveGame:
    """
    INTERACTIVE GAME INTERFACE FOR HUMAN VS AI
    
    This class manages an interactive game session where a human player
    can play against an AI agent. It provides:
    
    - Game setup with player selection
    - Turn-based gameplay with clear prompts
    - Game state visualization
    - Action input and validation
    - Game history tracking
    - Final game analysis and statistics
    
    The interface is designed to be educational and engaging, helping
    players understand the game mechanics and AI decision-making.
    """
    
    def __init__(self):
        """Initialize the interactive game interface"""
        self.game_env = None
        self.human_player = None
        self.ai_agent = None
        self.ai_player = None
        
        print("🎮 300: EARTH & WATER - Interactive Game")
        print("=" * 50)
    
    def setup_game(self):
        """
        Set up a new interactive game session
        
        This method:
        - Prompts for player preferences (side selection, AI difficulty)
        - Initializes the game environment with appropriate logging
        - Creates and configures AI agent
        - Sets up game parameters (seed, scenario, etc.)
        """
        print("\n🔧 Game Setup")
        print("-" * 20)
        
        # Player side selection
        while True:
            side_choice = input("Choose your side (G)reece or (P)ersia [G]: ").strip().lower()
            if side_choice in ['', 'g', 'greece']:
                self.human_player = 'Greece'
                self.ai_player = 'Persia'
                break
            elif side_choice in ['p', 'persia']:
                self.human_player = 'Persia'
                self.ai_player = 'Greece'
                break
            else:
                print("❌ Invalid choice. Please enter G for Greece or P for Persia.")
        
        print(f"✅ You will play as {self.human_player}")
        print(f"🤖 AI will play as {self.ai_player}")
        
        # Game seed selection
        seed_input = input("Enter game seed (number) or press Enter for random: ").strip()
        seed = None
        if seed_input:
            try:
                seed = int(seed_input)
            except ValueError:
                print("❌ Invalid seed, using random")
        
        # Initialize game environment
        print("\n🚀 Initializing game environment...")
        self.game_env = GameEnvironment(log_level=logging.INFO)
        
        # Create AI agent
        self.ai_agent = RandomAgent(f"AI-{self.ai_player}", log_level=logging.INFO)
        
        # Start the game
        result = self.game_env.new_game(seed=seed)
        if not result.get('success'):
            print(f"❌ Failed to start game: {result.get('error')}")
            return False
        
        # Notify AI agent
        self.ai_agent.game_started(self.game_env)
        
        print("✅ Game setup complete!")
        print(f"📁 Game log: {self.game_env.log_file}")
        
        return True
    
    def display_game_state(self):
        """
        Display the current game state in a user-friendly format
        
        Shows:
        - Current player and game phase
        - Game prompt and context
        - Victory points and campaign information
        - Available actions with descriptions
        - Key unit positions for strategic overview
        """
        if not self.game_env or not self.game_env.game_state:
            print("❌ No game state available")
            return
        
        state = self.game_env.game_state
        
        print("\n" + "=" * 60)
        print("📊 CURRENT GAME STATE")
        print("=" * 60)
        
        # Basic game information
        active_player = state.get('active_player', 'Unknown')
        campaign = state.get('campaign', 0)
        vp = state.get('vp', 0)
        turn = self.game_env.get_turn_number()
        
        print(f"🎯 Turn: {turn} | Campaign: {campaign} | Victory Points: {vp}")
        print(f"👤 Active Player: {active_player}")
        
        # Current game prompt
        prompt = state.get('prompt', '')
        if prompt:
            print(f"📝 Status: {prompt}")
        
        # Unit summary
        units = state.get('units', {})
        if units:
            self._display_unit_summary(units)
        
        print()
    
    def _display_unit_summary(self, units):
        """
        Display a summary of unit positions on the board
        
        Args:
            units (dict): Unit positions from game state
        """
        print("\n🗺️  UNIT POSITIONS:")
        
        # Calculate totals
        greek_armies = greek_fleets = persian_armies = persian_fleets = 0
        key_positions = []
        
        for city, unit_array in units.items():
            if city == 'reserve' or not isinstance(unit_array, list):
                continue
            
            if len(unit_array) >= 2:
                g_armies = unit_array[0] or 0
                p_armies = unit_array[1] or 0
                greek_armies += g_armies
                persian_armies += p_armies
                
                g_fleets = p_fleets = 0
                if len(unit_array) >= 4:
                    g_fleets = unit_array[2] or 0
                    p_fleets = unit_array[3] or 0
                    greek_fleets += g_fleets
                    persian_fleets += p_fleets
                
                # Record significant positions
                if g_armies > 0 or p_armies > 0 or g_fleets > 0 or p_fleets > 0:
                    position_desc = f"{city}: "
                    parts = []
                    if g_armies > 0:
                        parts.append(f"🇬🇷{g_armies}A")
                    if p_armies > 0:
                        parts.append(f"🇮🇷{p_armies}A")
                    if g_fleets > 0:
                        parts.append(f"🇬🇷{g_fleets}F")
                    if p_fleets > 0:
                        parts.append(f"🇮🇷{p_fleets}F")
                    
                    key_positions.append(position_desc + " ".join(parts))
        
        # Show totals
        print(f"   🇬🇷 Greece: {greek_armies} Armies, {greek_fleets} Fleets")
        print(f"   🇮🇷 Persia: {persian_armies} Armies, {persian_fleets} Fleets")
        
        # Show key positions (limit to most important)
        if key_positions:
            print("   Key positions:")
            for pos in key_positions[:8]:  # Show up to 8 positions
                print(f"     • {pos}")
            if len(key_positions) > 8:
                print(f"     ... and {len(key_positions) - 8} more")
    
    def get_human_action(self):
        """
        Get action choice from human player
        
        This method:
        - Displays available actions with numbers
        - Prompts for player selection
        - Validates input and handles special commands
        - Returns the selected action or None for quit/help
        
        Returns:
            tuple: (action_name, action_arg) or None for special commands
        """
        actions_result = self.game_env.get_actions()
        if not actions_result.get('success'):
            print(f"❌ Failed to get actions: {actions_result.get('error')}")
            return None
        
        actions = actions_result.get('actions', {})
        if not actions:
            print("⚠️ No actions available")
            return None
        
        # Filter valid actions (excluding undo for decisive gameplay)
        valid_actions = {k: v for k, v in actions.items() 
                        if v != 0 and v != False and v != [] and k != 'undo'}
        
        if not valid_actions:
            print("⚠️ No valid actions available (undo disabled for decisive gameplay)")
            return None
        
        print("\n🎯 AVAILABLE ACTIONS:")
        print("-" * 30)
        
        # Display actions with numbers
        action_list = list(valid_actions.items())
        for i, (action_name, action_args) in enumerate(action_list, 1):
            arg_desc = ""
            if isinstance(action_args, list) and action_args:
                arg_desc = f" (choose from: {action_args})"
            elif isinstance(action_args, (int, str)) and action_args not in [0, 1]:
                arg_desc = f" ({action_args})"
            
            print(f"  {i}. {action_name}{arg_desc}")
        
        print()
        print("Special commands: (h)elp, (s)tatus, (q)uit")
        
        # Get user input
        while True:
            choice = input("Enter your choice: ").strip().lower()
            
            # Handle special commands
            if choice in ['h', 'help']:
                self._show_help()
                continue
            elif choice in ['s', 'status']:
                self.display_game_state()
                continue
            elif choice in ['q', 'quit']:
                return None
            
            # Handle numeric choice
            try:
                choice_num = int(choice)
                if 1 <= choice_num <= len(action_list):
                    action_name, action_args = action_list[choice_num - 1]
                    
                    # Handle action arguments
                    action_arg = None
                    if isinstance(action_args, list) and action_args:
                        if len(action_args) == 1:
                            action_arg = action_args[0]
                        else:
                            print(f"Choose argument for {action_name}: {action_args}")
                            while True:
                                arg_choice = input("Enter choice: ").strip()
                                if arg_choice in action_args:
                                    action_arg = arg_choice
                                    break
                                try:
                                    arg_idx = int(arg_choice) - 1
                                    if 0 <= arg_idx < len(action_args):
                                        action_arg = action_args[arg_idx]
                                        break
                                except ValueError:
                                    pass
                                print(f"❌ Invalid choice. Must be one of: {action_args}")
                    
                    return (action_name, action_arg)
                else:
                    print(f"❌ Invalid choice. Enter 1-{len(action_list)}")
            except ValueError:
                print("❌ Invalid input. Enter a number or command")
    
    def _show_help(self):
        """Display help information"""
        print("\n" + "=" * 50)
        print("📚 HELP - 300: EARTH & WATER")
        print("=" * 50)
        print("This is a 2-player strategy game about the Greco-Persian Wars.")
        print()
        print("🎯 OBJECTIVE:")
        print("   • Greece: Prevent Persian victory, control key cities")
        print("   • Persia: Capture Greek capitals or gain victory points")
        print()
        print("📋 GAME PHASES:")
        print("   • Preparation: Draw cards, build units")
        print("   • Operations: Play cards, move units, fight battles")
        print("   • Supply: Check supply lines")
        print("   • Scoring: Count controlled cities")
        print()
        print("⚙️  ACTIONS:")
        print("   • draw: Draw cards from deck")
        print("   • city: Select a city for various purposes")
        print("   • port: Select a port for fleet actions")
        print("   • next: Advance to next phase/step")
        print("   • Note: Undo actions are disabled for decisive gameplay")
        print()
        print("💡 TIPS:")
        print("   • Read the prompt carefully - it tells you what to do")
        print("   • Use 's' to check game status anytime")
        print("   • Armies and Fleets have different movement rules")
        print("   • Control cities for victory points")
        print()
        print("Press Enter to continue...")
        input()
    
    def play_turn(self):
        """
        Play one turn of the game
        
        Returns:
            bool: True to continue game, False to quit
        """
        active_player = self.game_env.get_active_player()
        
        if active_player == self.human_player:
            # Human turn
            print(f"\n👤 YOUR TURN ({self.human_player})")
            print("-" * 30)
            
            choice = self.get_human_action()
            if choice is None:
                return False  # Quit
            
            action_name, action_arg = choice
            
            # Execute action
            result = self.game_env.execute_action(active_player, action_name, action_arg)
            if not result.get('success'):
                print(f"❌ Action failed: {result.get('error')}")
                return True  # Continue game
            
            print(f"✅ Executed: {action_name}" + (f"({action_arg})" if action_arg else ""))
            
        else:
            # AI turn
            print(f"\n🤖 AI TURN ({self.ai_player})")
            print("-" * 30)
            
            choice = self.ai_agent.choose_action(self.game_env)
            if choice is None:
                print("❌ AI couldn't choose an action")
                return False
            
            action_name, action_arg = choice
            
            # Execute action
            result = self.game_env.execute_action(active_player, action_name, action_arg)
            if not result.get('success'):
                print(f"❌ AI action failed: {result.get('error')}")
                return True
            
            print(f"🤖 AI played: {action_name}" + (f"({action_arg})" if action_arg else ""))
            
            # Show new prompt after AI action
            new_prompt = self.game_env.get_prompt()
            if new_prompt:
                print(f"📝 {new_prompt}")
        
        return True
    
    def run_game(self):
        """
        Run the complete interactive game session
        
        This is the main game loop that:
        - Sets up the game
        - Manages turn-by-turn gameplay
        - Handles game end conditions
        - Displays final results and statistics
        """
        if not self.setup_game():
            return
        
        print("\n🎮 GAME START")
        print("Type 'h' for help during your turn")
        
        # Initial game state display
        self.display_game_state()
        
        # Main game loop
        turn_count = 0
        max_turns = 200  # Safety limit
        
        while turn_count < max_turns and not self.game_env.is_game_over():
            turn_count += 1
            
            if not self.play_turn():
                print("\n👋 Thanks for playing!")
                break
            
            # Check for game end
            if self.game_env.is_game_over():
                break
        
        # Game ended
        self._show_game_results()
    
    def _show_game_results(self):
        """Display final game results and statistics"""
        print("\n" + "🏆" * 20)
        print("GAME COMPLETE")
        print("🏆" * 20)
        
        winner = self.game_env.get_winner()
        turn_count = self.game_env.get_turn_number()
        
        if winner:
            if winner == self.human_player:
                print(f"🎉 CONGRATULATIONS! You won as {winner}!")
            elif winner == self.ai_player:
                print(f"🤖 AI wins as {winner}. Better luck next time!")
            else:
                print(f"🤝 Game ended in a {winner}")
        else:
            print("🤷 Game ended without a clear winner")
        
        print(f"\n📊 Game Statistics:")
        print(f"   • Total turns: {turn_count}")
        print(f"   • Your side: {self.human_player}")
        print(f"   • AI side: {self.ai_player}")
        print(f"   • Winner: {winner}")
        print(f"   • Log file: {self.game_env.log_file}")
        
        # Notify AI agent
        if self.ai_agent:
            self.ai_agent.game_ended(self.game_env, winner)
        
        print("\nThanks for playing 300: Earth & Water!")


def main():
    """Main entry point for interactive game"""
    try:
        game = InteractiveGame()
        game.run_game()
    except KeyboardInterrupt:
        print("\n\n👋 Game interrupted. Thanks for playing!")
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        print("Please check the logs for more details.")


if __name__ == "__main__":
    main()