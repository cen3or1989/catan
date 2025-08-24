# 🚀 How to Run and Test the Catan Webapp

## 📋 Quick Start Guide

### 1. **Run the Fixed Phase 1 Version**
```bash
# Open in browser (no server needed for HTML files)
# Option 1: Direct file opening
open /workspace/catan-app/catan-predictor-ph1.html

# Option 2: Using a local server (better for development)
cd /workspace/catan-app
npx serve .
# Then open http://localhost:3000/catan-predictor-ph1.html
```

### 2. **Run the Test Suite**
```bash
# Open the test file
open /workspace/catan-app/test-ph1.html
# Click "Run All Tests" button
```

## 🧪 Testing Steps

### Step 1: Basic Functionality Test
1. Open `catan-predictor-ph1.html` in your browser
2. Check browser console (F12) for any errors
3. You should see:
   - 🎲 Board with 19 hex tiles
   - 🎮 Simulation controls
   - 📊 Results area

### Step 2: Edit Board Setup
1. Click any hex tile
2. Change resource type and number
3. Click "Save"
4. Verify tile updates correctly

### Step 3: Run Simulation
1. Set simulation count (start with 100 for quick test)
2. Click "Run Prediction"
3. Watch progress bar
4. Check results display

### Step 4: Memory Leak Test
1. Open browser Task Manager (Shift+Esc in Chrome)
2. Note initial memory usage
3. Run 5-10 simulations
4. Memory should NOT continuously increase

## 🔍 What to Check

### ✅ **Working Correctly:**
- [ ] Page loads without errors
- [ ] Can edit tiles
- [ ] Simulations run without freezing
- [ ] Results show win percentages
- [ ] Chart displays properly
- [ ] Memory stays stable
- [ ] Can stop simulation mid-run

### ❌ **Known Issues (Still Present):**
- Dice probabilities still wrong (no robber on 7)
- Board adjacency still uses random
- No actual game rules implemented
- AI is still mostly random

## 📊 Expected Results

### With Current Implementation:
- **Win rates**: Should be roughly 25% each player (because it's random)
- **Simulation speed**: 1000 sims in 5-10 seconds
- **Memory usage**: Under 100MB

### After Full Fix:
- **Win rates**: Will vary based on starting positions
- **Better predictions**: Based on actual game mechanics
- **Accurate simulation**: Including robber, trading, etc.

## 🛠️ Troubleshooting

### Problem: Page won't load
```bash
# Check if file exists
ls -la /workspace/catan-app/catan-predictor-ph1.html

# Try different browser
# Chrome, Firefox, Safari all work
```

### Problem: React errors
```javascript
// Check console for errors
// Common issue: React not loaded
// Solution: Wait for page to fully load
```

### Problem: Memory increasing
```javascript
// This means Chart.js cleanup isn't working
// Refresh page between tests
// Check test-ph1.html memory leak test
```

## 🚦 Test Scenarios

### Scenario 1: Quick Smoke Test
1. Load page
2. Run 100 simulations
3. Check results appear
4. No crashes = PASS ✅

### Scenario 2: Stress Test
1. Set to 5000 simulations
2. Run prediction
3. Try to stop mid-way
4. Check if UI stays responsive

### Scenario 3: Memory Test
1. Open test-ph1.html
2. Click "Memory Leak Test"
3. Watch memory monitor
4. Should show < 50MB increase

## 📈 Performance Benchmarks

| Test | Expected | Your Result |
|------|----------|-------------|
| Page Load | < 2 seconds | _____ |
| 100 Simulations | < 1 second | _____ |
| 1000 Simulations | < 10 seconds | _____ |
| 5000 Simulations | < 30 seconds | _____ |
| Memory Usage | < 100MB | _____ |
| Chart Render | < 500ms | _____ |

## 🎯 Next Steps

### If Tests Pass:
1. ✅ Phase 1 memory fixes working
2. ✅ Basic UI functioning
3. ✅ Ready for Phase 2 (game logic)

### If Tests Fail:
1. Check browser console
2. Run test-ph1.html diagnostics
3. Verify all files copied correctly
4. Try different browser

## 💻 Browser Compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome 90+ | ✅ | Best performance |
| Firefox 88+ | ✅ | Good |
| Safari 14+ | ✅ | Good |
| Edge 90+ | ✅ | Good |
| IE | ❌ | Not supported |

## 🔧 Developer Tools

### Chrome DevTools:
1. **Console** (F12): Check for errors
2. **Memory**: Monitor heap usage
3. **Performance**: Profile simulations
4. **Network**: Check resource loading

### Useful Commands:
```javascript
// In console, check if components loaded
console.log('React:', !!window.React);
console.log('Chart.js:', !!window.Chart);
console.log('Game running:', !!window.CatanPredictor);

// Force garbage collection (if enabled)
if (window.gc) window.gc();

// Check memory usage
if (performance.memory) {
    console.log('Memory (MB):', 
        (performance.memory.usedJSHeapSize / 1048576).toFixed(2)
    );
}
```

## 📝 Test Report Template

```
Date: _______
Browser: _______
Version: Phase 1 Fixed

Basic Tests:
[ ] Page loads
[ ] Tiles editable  
[ ] Simulation runs
[ ] Results display
[ ] Chart renders

Performance:
- 1000 sims time: _____ seconds
- Memory start: _____ MB
- Memory end: _____ MB
- UI responsive: YES / NO

Issues Found:
1. ________________
2. ________________

Overall: PASS / FAIL
```

## 🎉 Success Criteria

### Phase 1 is successful if:
1. **No memory leaks** - Memory stable after multiple runs
2. **No crashes** - Error boundaries prevent app crashes
3. **UI responsive** - Can interact during simulation
4. **Charts work** - Proper cleanup, no errors

### Ready for Phase 2 when:
- All Phase 1 tests pass
- Memory leaks fixed
- Basic functionality stable
- Ready to implement real game logic

---

**Remember**: Current predictions are inaccurate because game logic is placeholder. Phase 1 just fixes stability. Phase 2 will add actual Catan rules!