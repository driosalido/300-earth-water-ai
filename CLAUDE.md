# Claude Memory - RTT AI Agent Project

## Current Project Status

### Active Work: 300: Earth & Water Bug Investigation

**Primary Goal:** Investigate and resolve the "Leonidas bug" and "Greek Fleet Movement bug" in the 300: Earth & Water game through AI agent testing and analysis.

### Bug Context

**Bug #1: Leonidas Movement Bug (CRITICAL)**
- **Error:** `Cannot read properties of undefined (reading '0')`
- **Location:** `rules.js:443` in `move_greek_army` function
- **State:** `greek_land_movement_leonidas` 
- **Cause:** `game.units[destination]` is undefined when trying to move armies
- **Frequency:** ~110 occurrences per 1000 games (11% error rate)

**Bug #2: Greek Fleet Movement Bug (INVESTIGATION FOCUS)**
- **Error:** `Cannot read properties of undefined (reading '2')`
- **Location:** `rules.js:452` in `move_greek_fleet` function  
- **State:** `greek_naval_movement`
- **Cause:** `game.units[from]` is undefined when trying to move fleets
- **Frequency:** ~28 occurrences per 1000 games (2.8% error rate)
- **User Hypothesis:** May be caused by choosing 0 as the number of fleets to move

### Technical Implementation Status

**✅ COMPLETED:**
1. **UUID System:** All games now generate unique UUIDs for identification
2. **Enhanced Logging:** Logs use UUID as primary identifier (`game-{uuid}.log`)
3. **State Capture System:** Integrated into BasePlayer for comprehensive error debugging
4. **Large-Scale Testing:** Completed 1000 game analysis revealing bug patterns
5. **Bug Categorization:** Errors are automatically categorized by type

**🔄 IN PROGRESS:**
- Investigating Greek Fleet Movement Bug (error #2)
- User hypothesis: 0 fleet movement selection causes undefined access

### Key Files and Components

**Core System Files:**
- `src/base-player.js` - Abstract base class with UUID generation and state capture
- `src/random-player.js` - RandomPlayer implementation for testing
- `src/logger.js` - UUID-based logging system
- `src/state-capture.js` - Error state capture and debugging system

**Game Rules (READ-ONLY):**
- `rules/300-earth-and-water/rules.js` - Cannot be modified (public server constraint)
- Line 443: `move_greek_army` - Leonidas bug location  
- Line 452: `move_greek_fleet` - Greek fleet bug location

**UUID Implementation Details:**
```javascript
// BasePlayer constructor
constructor(options = {}) {
    this.gameUuid = options.gameUuid || uuidv4();
    this.gameId = options.gameId || `game-${this.gameUuid.substring(0, 8)}`;
    this.logger = new GameLogger({ gameId: this.gameId, gameUuid: this.gameUuid, ...options });
}

// Logger naming convention
const logFileName = gameUuid ? `game-${gameUuid}.log` : `${gameId}.log`;

// State capture naming
const filename = `bug-capture-${timestamp}-${gameIdentifier}.json`;
```

### User Constraints and Requirements

**CRITICAL CONSTRAINTS:**
1. **No rules.js Modification:** Agent will play on public server where rules cannot be changed
2. **Defensive Programming:** All bug fixes must be implemented in the agent, not the rules
3. **UUID as Primary ID:** All logging and error capture must use UUID system

**Current Investigation Approach:**
1. Run normal games with RandomPlayer to generate logs and dumps
2. Analyze dumps to understand bug conditions
3. Implement defensive validations in agent to avoid triggering bugs

### Previous Bug Analysis Results

**From 1000-game analysis:**
- 862 games completed successfully (86.2%)
- 138 total errors (13.8% error rate)
- Leonidas bug: 110 occurrences (79.7% of errors)
- Greek fleet bug: 28 occurrences (20.3% of errors)
- 100% capture rate (all errors have debug files)

**Bug Distribution by Campaign:**
- Campaign 1: 23 errors
- Campaign 2: 25 errors  
- Campaign 3: 29 errors
- Campaign 4: 40 errors (most problematic)
- Campaign 5: 21 errors

### Next Steps for Greek Fleet Bug Investigation

1. **Execute normal RandomPlayer games** to generate fresh logs and dumps
2. **Analyze dump files** for Greek fleet movement bug patterns
3. **Test user's hypothesis** about 0 fleet movement causing the bug
4. **Implement defensive validation** in RandomPlayer to avoid the bug condition
5. **Verify fix** with additional test runs

### Development Notes

**Architecture Pattern:** Template Method Pattern with BasePlayer abstract class
- All player types inherit common UUID generation, logging, and state capture
- Individual `makeDecision()` methods implement specific AI strategies
- Error handling and debugging is universal across all player types

**Testing Strategy:**
- Use RandomPlayer for systematic bug discovery
- State capture provides complete reproduction cases
- UUID system enables precise tracking and correlation of errors

**Bug Investigation Methodology:**
1. Large-scale random testing to discover bug patterns
2. State capture analysis to understand exact failure conditions  
3. Defensive programming to implement workarounds in agent
4. Validation through continued testing

## How to Resume This Project

1. **Run normal games:** Execute RandomPlayer games to generate fresh logs and dumps
2. **Analyze Greek fleet bug:** Look for dump files with `greek_naval_movement` state
3. **Test 0-fleet hypothesis:** Check if RandomPlayer passes 0 as fleet count
4. **Implement fix:** Add validation in agent to prevent problematic conditions
5. **Validate solution:** Run test games to confirm bug is avoided

The project is well-structured with comprehensive logging, UUID tracking, and systematic bug investigation tools in place.