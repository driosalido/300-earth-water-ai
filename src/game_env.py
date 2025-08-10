#!/usr/bin/env python3
"""
PYTHON GAME ENVIRONMENT FOR 300: EARTH & WATER

This module provides a clean Python interface for AI agents to play the board game 
"300: Earth & Water" through integration with the Rally The Troops JavaScript rules engine.

Key Features:
- Simple, gym-like interface for AI agent development
- Persistent communication with Node.js bridge server
- Comprehensive game state management and logging
- Error handling and graceful degradation
- Support for reproducible games with seeds

Architecture:
- GameEnvironment class manages all game interactions
- Persistent Node.js subprocess for maintaining game state
- JSON line-based communication protocol
- Comprehensive logging of all game events and decisions

Usage:
    game = GameEnvironment()
    game.new_game(seed=12345)
    
    while not game.is_game_over():
        actions = game.get_actions()
        # AI decision logic here
        game.execute_action(player, action, arg)
"""

import json
import subprocess
import os
import logging
import datetime
from pathlib import Path


class GameEnvironment:
    """
    GAME ENVIRONMENT FOR 300: EARTH & WATER AI AGENTS
    
    This class provides a clean, gym-like interface for AI agents to interact with
    the 300: Earth & Water board game. It manages communication with the Node.js
    bridge server and provides comprehensive logging of all game events.
    
    Key Capabilities:
    - Initialize and manage 300: Earth & Water games
    - Execute actions and maintain game state
    - Comprehensive logging of game events and AI decisions
    - Error handling and graceful degradation
    - Support for reproducible games with seeds
    
    State Management:
    - Maintains current game state in self.game_state
    - Tracks game history and action sequences
    - Provides helper methods for common game queries
    
    Communication:
    - Uses persistent Node.js subprocess for performance
    - JSON line-based protocol for reliable communication
    - Automatic process cleanup on destruction
    """
    
    def __init__(self, log_level=logging.INFO):
        """
        Initialize the game environment
        
        Sets up:
        - Path to the Node.js bridge server
        - Logging system for game events
        - Persistent bridge server process
        - Initial game state variables
        
        Args:
            log_level: Logging level for game events (default: INFO)
        """
        # Core paths and configuration
        self.bridge_server_path = Path(__file__).parent.parent / "bridge" / "bridge_server.js"
        self.logs_dir = Path(__file__).parent.parent / "logs"
        
        # Game state management
        self.game_state = None
        self.turn_number = 0
        self.game_history = []
        
        # Bridge communication
        self.bridge_process = None
        
        # Set up logging system
        self._setup_logging(log_level)
        
        # Start the persistent bridge server
        self._start_bridge_server()
    
    def _setup_logging(self, log_level):
        """
        Set up comprehensive logging system for game events
        
        Creates:
        - Game-specific log file with timestamp
        - Console and file handlers
        - Structured logging format for analysis
        
        Args:
            log_level: Python logging level (INFO, DEBUG, etc.)
        """
        # Ensure logs directory exists
        self.logs_dir.mkdir(exist_ok=True)
        
        # Create timestamp-based log filename
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.logs_dir / f"game_{timestamp}.log"
        
        # Set up logger
        self.logger = logging.getLogger(f"GameEnvironment_{id(self)}")
        self.logger.setLevel(log_level)
        
        # Clear any existing handlers
        self.logger.handlers.clear()
        
        # Create formatters
        detailed_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - [Turn %(turn_number)s] %(message)s',
            defaults={'turn_number': 0}
        )
        
        # File handler for detailed logs
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(detailed_formatter)
        self.logger.addHandler(file_handler)
        
        # Console handler for important events
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter('%(levelname)s: %(message)s')
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        self.logger.info(f"🎮 Game logging initialized - Log file: {self.log_file}")
        
    def _start_bridge_server(self):
        """
        Start the persistent Node.js bridge server
        
        This method:
        - Launches the Node.js bridge as a subprocess
        - Sets up stdin/stdout pipes for JSON communication
        - Configures text mode with line buffering for reliability
        - Validates that the server started successfully
        
        Raises:
            RuntimeError: If the bridge server fails to start
        """
        try:
            self.logger.info("🚀 Starting Node.js bridge server...")
            
            # Launch the bridge server as a persistent subprocess
            self.bridge_process = subprocess.Popen(
                ['node', str(self.bridge_server_path)],
                stdin=subprocess.PIPE,    # For sending JSON commands
                stdout=subprocess.PIPE,   # For receiving JSON responses
                stderr=subprocess.PIPE,   # For error messages and diagnostics
                text=True,               # Handle strings instead of bytes
                bufsize=1                # Line buffering for immediate communication
            )
            
            self.logger.info("✅ Bridge server started successfully")
            
        except Exception as e:
            error_msg = f"Failed to start bridge server: {e}"
            self.logger.error(f"❌ {error_msg}")
            raise RuntimeError(error_msg)
    
    def _call_bridge(self, command):
        """
        Execute command via persistent bridge server with comprehensive logging
        
        This method handles all communication with the Node.js bridge server:
        - Validates that the bridge process is still running
        - Sends JSON command and waits for JSON response
        - Logs all communication for debugging and analysis
        - Handles errors gracefully with detailed error reporting
        
        Args:
            command (dict): Command object with 'cmd' and optional 'args' fields
            
        Returns:
            dict: Response object with 'success' field and result/error data
        """
        # Validate bridge server is running
        if not self.bridge_process or self.bridge_process.poll() is not None:
            error_msg = 'Bridge server not running'
            self.logger.error(f"❌ {error_msg}")
            return {'success': False, 'error': error_msg}
        
        # Log the outgoing command (for debugging and analysis)
        cmd_type = command.get('cmd', 'unknown')
        self.logger.debug(f"📤 Sending command: {cmd_type}")
        if cmd_type == 'action':
            args = command.get('args', {})
            action_details = f"{args.get('player', '?')} -> {args.get('action', '?')}"
            if args.get('arg'):
                action_details += f"({args.get('arg')})"
            self.logger.debug(f"   Action details: {action_details}")
            
        try:
            # Send command as JSON line to bridge server
            command_line = json.dumps(command) + '\n'
            self.bridge_process.stdin.write(command_line)
            self.bridge_process.stdin.flush()
            
            # Read JSON response line from bridge server
            response_line = self.bridge_process.stdout.readline()
            if not response_line:
                error_msg = 'No response from bridge'
                self.logger.error(f"❌ {error_msg}")
                return {'success': False, 'error': error_msg}
            
            # Parse the JSON response
            response = json.loads(response_line.strip())
            
            # Log the response status
            if response.get('success'):
                self.logger.debug(f"✅ Command {cmd_type} successful")
            else:
                error = response.get('error', 'Unknown error')
                self.logger.warning(f"⚠️ Command {cmd_type} failed: {error}")
            
            return response
            
        except json.JSONDecodeError as e:
            error_msg = f'JSON decode error: {e}'
            self.logger.error(f"❌ {error_msg}")
            return {'success': False, 'error': error_msg}
        except Exception as e:
            error_msg = f'Bridge communication error: {e}'
            self.logger.error(f"❌ {error_msg}")
            return {'success': False, 'error': error_msg}
    
    def __del__(self):
        """
        Clean up bridge server on object destruction
        
        This method ensures that the Node.js bridge server is properly
        terminated when the GameEnvironment is destroyed, preventing
        orphaned processes.
        """
        if self.bridge_process and self.bridge_process.poll() is None:
            try:
                # Try graceful shutdown first
                self._call_bridge({'cmd': 'quit'})
                self.bridge_process.wait(timeout=2)
                self.logger.info("🔄 Bridge server shut down gracefully")
            except:
                # Force termination if graceful shutdown fails
                self.bridge_process.terminate()
                self.logger.warning("⚠️ Bridge server terminated forcefully")
    
    def new_game(self, seed=None, scenario="Standard", options=None):
        """
        Initialize a new 300: Earth & Water game
        
        This method:
        - Sends setup command to the bridge server
        - Initializes game state and logging context
        - Resets turn counter and game history
        - Logs game initialization details for analysis
        
        Args:
            seed (int, optional): Random seed for reproducible games
            scenario (str): Game scenario name (default: "Standard")
            options (dict, optional): Additional game options
            
        Returns:
            dict: Response with game state or error information
        """
        if options is None:
            options = {}
        
        # Reset game tracking variables
        self.turn_number = 0
        self.game_history = []
        
        # Log game initialization
        seed_info = f"seed={seed}" if seed else "random seed"
        self.logger.info(f"🎮 Starting new game: {scenario} ({seed_info})")
        
        # Send setup command to bridge
        command = {
            'cmd': 'setup',
            'args': {
                'seed': seed,
                'scenario': scenario,
                'options': options
            }
        }
        
        result = self._call_bridge(command)
        
        # Update game state and log results
        if result.get('success'):
            self.game_state = result.get('gameState')
            if self.game_state:
                active_player = self.game_state.get('active_player')
                prompt = self.game_state.get('prompt', '')
                self.logger.info(f"✅ Game initialized - {active_player} to play")
                self.logger.info(f"📝 Initial state: {prompt}")
                
                # Log initial game state details
                self._log_game_state("Game initialized")
            else:
                self.logger.warning("⚠️ Game setup succeeded but no state returned")
        else:
            error = result.get('error', 'Unknown error')
            self.logger.error(f"❌ Game setup failed: {error}")
        
        return result
    
    def _log_game_state(self, event_description):
        """
        Log detailed game state information for analysis
        
        This helper method extracts key information from the current game state
        and logs it in a structured format for later analysis and debugging.
        
        Args:
            event_description (str): Description of what triggered this state log
        """
        if not self.game_state:
            return
            
        # Extract key state information
        active_player = self.game_state.get('active_player', 'Unknown')
        game_state = self.game_state.get('game_state', 'Unknown')
        campaign = self.game_state.get('campaign', 0)
        vp = self.game_state.get('vp', 0)
        actions = self.game_state.get('actions', {})
        
        # Log structured game state
        self.logger.info(f"📊 {event_description}")
        self.logger.info(f"   Player: {active_player} | Campaign: {campaign} | VP: {vp}")
        self.logger.info(f"   State: {game_state}")
        self.logger.info(f"   Available actions: {list(actions.keys())}")
        
        # Log unit positions for strategic analysis
        units = self.game_state.get('units', {})
        if units:
            # Count total units for each player
            greek_armies = greek_fleets = persian_armies = persian_fleets = 0
            for city, unit_array in units.items():
                if city != 'reserve' and isinstance(unit_array, list):
                    if len(unit_array) >= 2:
                        greek_armies += unit_array[0] or 0
                        persian_armies += unit_array[1] or 0
                    if len(unit_array) >= 4:
                        greek_fleets += unit_array[2] or 0
                        persian_fleets += unit_array[3] or 0
            
            self.logger.info(f"   Units - Greece: {greek_armies}A/{greek_fleets}F, "
                           f"Persia: {persian_armies}A/{persian_fleets}F")
    
    def get_state(self):
        """
        Get current game state from bridge server
        
        This method queries the bridge for the current game state without
        making any changes to the game. Useful for AI agents that need to
        analyze the current situation.
        
        Returns:
            dict: Response with current game state or error information
        """
        command = {'cmd': 'state'}
        result = self._call_bridge(command)
        
        if result.get('success'):
            self.game_state = result.get('gameState')
            self.logger.debug("📋 Retrieved current game state")
        else:
            error = result.get('error', 'Unknown error')
            self.logger.warning(f"⚠️ Failed to get game state: {error}")
        
        return result
    
    def get_actions(self, include_undo=False):
        """
        Get available actions for the current player
        
        Returns the actions that are currently available to the active player.
        These actions are extracted from the current game state and represent
        all valid moves that can be made at this point in the game.
        
        Args:
            include_undo (bool): Whether to include undo actions (default: False for decisive gameplay)
        
        Returns:
            dict: Response with available actions or error information
        """
        # Validate that a game is active
        if not self.game_state:
            self.logger.warning("⚠️ Attempted to get actions but no game is active")
            return {'success': False, 'error': 'No active game'}
        
        # Extract actions from current game state
        raw_actions = self.game_state.get('actions', {})
        active_player = self.game_state.get('active_player')
        
        # Filter out undo actions unless explicitly requested
        if include_undo:
            actions = raw_actions
        else:
            actions = {k: v for k, v in raw_actions.items() if k != 'undo'}
        
        actions_list = list(actions.keys())
        if not include_undo and 'undo' in raw_actions:
            self.logger.debug(f"📋 Available actions for {active_player}: {actions_list} (undo filtered out)")
        else:
            self.logger.debug(f"📋 Available actions for {active_player}: {actions_list}")
        
        return {
            'success': True,
            'actions': actions,
            'active_player': active_player,
            'message': 'Available actions from game state' + ('' if include_undo else ' (undo filtered)')
        }
    
    def execute_action(self, player, action, arg=None):
        """
        Execute a player action and update the game state
        
        This is the primary method for advancing the game. It:
        - Validates the action parameters
        - Sends the action to the bridge server
        - Updates the local game state
        - Logs the action and its results
        - Tracks game history for analysis
        
        Args:
            player (str): Player making the action ('Greece' or 'Persia')
            action (str): Action type (e.g., 'draw', 'city', 'next')
            arg: Optional action argument (e.g., city name, card ID)
            
        Returns:
            dict: Response with updated game state or error information
        """
        # Increment turn counter for logging context
        self.turn_number += 1
        
        # Log the attempted action
        action_desc = f"{player} -> {action}"
        if arg is not None:
            action_desc += f"({arg})"
        self.logger.info(f"🎯 Turn {self.turn_number}: {action_desc}")
        
        # Prepare command for bridge server
        command = {
            'cmd': 'action',
            'args': {
                'player': player,
                'action': action,
                'arg': arg
            }
        }
        
        # Execute the action via bridge
        result = self._call_bridge(command)
        
        # Process the result and update state
        if result.get('success'):
            # Update game state
            old_state = self.game_state
            self.game_state = result.get('gameState')
            
            # Log successful action
            self.logger.info(f"✅ Action successful")
            
            # Add to game history for analysis
            action_record = {
                'turn': self.turn_number,
                'player': player,
                'action': action,
                'arg': arg,
                'timestamp': datetime.datetime.now().isoformat(),
                'game_state_before': old_state,
                'game_state_after': self.game_state
            }
            self.game_history.append(action_record)
            
            # Log updated game state
            if self.game_state:
                prompt = self.game_state.get('prompt', '')
                if prompt:
                    self.logger.info(f"📝 New state: {prompt}")
                self._log_game_state(f"After turn {self.turn_number}")
                
                # Check for game end
                if self.game_state.get('game_over'):
                    winner = self.game_state.get('winner', 'Draw')
                    self.logger.info(f"🏆 GAME OVER - Winner: {winner}")
            
        else:
            # Log failed action
            error = result.get('error', 'Unknown error')
            self.logger.error(f"❌ Action failed: {error}")
        
        return result
    
    def is_game_over(self):
        """
        Check if the current game has ended
        
        Returns:
            bool: True if game is over, False otherwise
        """
        if not self.game_state:
            return False
        return self.game_state.get('game_over', False)
    
    def get_winner(self):
        """
        Get the winner of the current game (if game is over)
        
        Returns:
            str|None: Winner name ('Greece', 'Persia'), 'Draw', or None if game not over
        """
        if not self.game_state:
            return None
        return self.game_state.get('winner')
    
    def get_active_player(self):
        """
        Get the currently active player
        
        Returns:
            str|None: Active player name ('Greece' or 'Persia') or None if no game
        """
        if not self.game_state:
            return None
        return self.game_state.get('active_player')
    
    def get_prompt(self):
        """
        Get the current game prompt/status message
        
        The prompt describes what is happening in the game and what actions
        are expected from the current player. This is useful for human players
        and for AI agents to understand the current game context.
        
        Returns:
            str: Current game prompt or empty string if no game active
        """
        if not self.game_state:
            return ""
        return self.game_state.get('prompt', '')
    
    def get_game_history(self):
        """
        Get the complete game history for analysis
        
        Returns:
            list: List of action records with full game state information
        """
        return self.game_history.copy()
    
    def get_turn_number(self):
        """
        Get the current turn number
        
        Returns:
            int: Current turn number (starts at 0)
        """
        return self.turn_number


def main():
    """
    Comprehensive test of the game environment with logging demonstration
    
    This test function demonstrates:
    - Game environment initialization with logging
    - Game setup with seed for reproducibility
    - Action execution with comprehensive logging
    - Game state tracking and history
    - Proper cleanup and log file generation
    """
    print("🎮 Testing Enhanced 300: Earth & Water Game Environment")
    print("=" * 60)
    
    # Create game environment with debug logging
    game = GameEnvironment(log_level=logging.DEBUG)
    
    print(f"📁 Log file: {game.log_file}")
    print()
    
    # Start new game with seed for reproducibility
    print("🚀 Starting new game with seed for testing...")
    result = game.new_game(seed=12345)
    
    if not result.get('success'):
        print(f"❌ Failed to start game: {result.get('error')}")
        return
    
    print("✅ Game started successfully!")
    print(f"🎯 Active Player: {game.get_active_player()}")
    print(f"📝 Current Prompt: {game.get_prompt()}")
    
    # Demonstrate a few turns with logging
    for i in range(3):
        print(f"\n--- Turn {i+1} ---")
        
        # Get available actions
        actions_result = game.get_actions()
        if not actions_result.get('success'):
            print("❌ Failed to get actions")
            break
            
        actions = actions_result.get('actions', {})
        print(f"Available actions: {list(actions.keys())}")
        
        if not actions:
            print("No actions available - game may be over")
            break
        
        # Execute a random action for demonstration
        import random
        action_name = random.choice(list(actions.keys()))
        action_args = actions[action_name]
        
        # Handle action arguments
        arg = None
        if isinstance(action_args, list) and action_args:
            arg = random.choice(action_args)
        
        # Execute the action
        player = game.get_active_player()
        print(f"🎲 Executing: {player} -> {action_name}" + (f"({arg})" if arg else ""))
        
        result = game.execute_action(player, action_name, arg)
        if not result.get('success'):
            print(f"❌ Action failed: {result.get('error')}")
            break
        
        print(f"📝 New Prompt: {game.get_prompt()}")
        
        # Check if game ended
        if game.is_game_over():
            winner = game.get_winner()
            print(f"🏆 GAME OVER - Winner: {winner}")
            break
    
    # Display game statistics
    print(f"\n📊 Game Statistics:")
    print(f"   Total turns executed: {game.get_turn_number()}")
    print(f"   Game history entries: {len(game.get_game_history())}")
    print(f"   Game ended: {game.is_game_over()}")
    print(f"   Log file: {game.log_file}")
    
    print("\n✨ Enhanced game environment test complete!")
    print("Check the logs directory for detailed game logs.")


if __name__ == "__main__":
    main()