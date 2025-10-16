# Devvy Studio - Testing Guide

## 🚀 Quick Start

### 1. Start the License API
```bash
cd /Users/dineshrvl/devvy/devvy
./start-license-api.sh
```

Or manually:
```bash
cd backend
python3 temp_license_activator.py
```

**Expected Output:**
```
============================================================
🔑 License Activator API
============================================================
Starting server on http://127.0.0.1:8001

Test Keys:
  • PRO-TEST-KEY          → All premium tools
  • PREMIUM-TEST-KEY      → Selected premium tools
  • FREE-TEST-KEY         → Free tools only

Press Ctrl+C to stop
============================================================
```

### 2. Launch Devvy Studio
```bash
open "/Applications/Devvy Studio.app"
```

Or search for "Devvy Studio" in Spotlight (Cmd+Space)

## 🔑 Test License Activation

### Test Scenario 1: Free Tools (No Activation)
1. Launch app
2. **Expected**: See green **Key icon** at bottom of sidebar
3. Browse tools - only **free tools** accessible
4. Click premium tool (e.g., "REST API Tester")
5. **Expected**: Activation dialog appears

### Test Scenario 2: Activate PRO License
1. Click green **Key icon** in sidebar
2. Enter: `PRO-TEST-KEY`
3. Click **Activate**
4. **Expected**: 
   - Success message: "🎉 Pro license activated! All premium tools unlocked."
   - Key icon changes to **Shield icon** (green)
   - All premium tools now show **Crown icon** but no lock
5. Click any premium tool
6. **Expected**: Tool opens successfully

### Test Scenario 3: Persistence Test
1. Activate with `PRO-TEST-KEY`
2. **Close the app completely**
3. **Reopen the app**
4. **Expected**:
   - Shield icon visible (still activated)
   - All tools visible in sidebar
   - Premium tools unlocked
   - Can open any tool

### Test Scenario 4: PREMIUM License
1. Deactivate current license (if any)
2. Click Key/Shield icon
3. Enter: `PREMIUM-TEST-KEY`
4. Click **Activate**
5. **Expected**:
   - Success message: "✨ Premium license activated! Selected premium tools unlocked."
   - Only specific premium tools unlocked:
     - REST API Tester ✅
     - gRPC Tester ✅
     - UI Recorder ✅
     - Diff Checker ✅
     - SQL Formatter ✅
     - Image Optimizer ✅
   - Other premium tools still locked

## 🎯 What to Look For

### ✅ Correct Behavior

**Sidebar:**
- Categories show tool count
- Tools show descriptions
- Premium tools have **Crown icon** 👑
- Locked tools have **Lock icon** 🔒
- Free tools have no badges

**Activation:**
- Key icon visible when not activated
- Shield icon visible when activated
- Clicking icon shows license status
- Dialog appears for locked tools

**Tools:**
- Free tools always open
- Premium tools check license
- Locked tools show activation dialog

### ❌ Issues to Report

- Tools not showing in sidebar
- Activation not persisting after restart
- Premium tools still locked after activation
- Categories empty
- Console errors

## 🐛 Debugging

### Check Console Logs

Open Developer Tools (if running in dev mode):
```
Cmd+Option+I (Mac)
Ctrl+Shift+I (Windows/Linux)
```

Look for:
```
🔄 Loading license and tools...
📦 License result: {...}
✅ Loaded 20 tools
✅ Loaded 8 categories
✅ License loaded: { isActivated: true, licenseType: 'pro', ... }
```

### Check License API

Test API directly:
```bash
# Check API is running
curl http://127.0.0.1:8001/

# Check license status (replace MACHINE_ID)
curl "http://127.0.0.1:8001/api/license/config?machineId=YOUR_MACHINE_ID"
```

### Check Database

```bash
cd backend
sqlite3 devtools.db "SELECT * FROM licenses;"
```

### Clear License (Reset)

```bash
cd backend
sqlite3 devtools.db "DELETE FROM licenses;"
```

Then restart the app.

## 📊 Expected Tool List

### Free Tools (9)
1. ✅ JSON Beautifier
2. ✅ Base64 Encoder/Decoder
3. ✅ URL Encoder/Decoder
4. ✅ JWT Decoder
5. ✅ Hash Generator
6. ✅ UUID Generator
7. ✅ Regex Tester
8. ✅ Markdown Preview
9. ✅ XML Formatter
10. ✅ YAML Formatter
11. ✅ Color Picker
12. ✅ Cron Expression Builder

### Premium Tools (8)
1. 👑 REST API Tester
2. 👑 gRPC Tester
3. 👑 GraphQL Playground
4. 👑 WebSocket Tester
5. 👑 UI Recorder
6. 👑 Diff Checker
7. 👑 SQL Formatter
8. 👑 Image Optimizer

## 🔧 Common Issues & Fixes

### Issue: "Failed to activate license"
**Fix:** Ensure License API is running on port 8001
```bash
./start-license-api.sh
```

### Issue: Tools not showing after activation
**Fix:** Check console for errors, ensure toolconfig.json is loaded
```bash
# Rebuild and reinstall
cd frontend
npm run tauri:install
```

### Issue: License not persisting
**Fix:** Check database permissions
```bash
cd backend
ls -la devtools.db
# Should be writable
```

### Issue: Port 8001 already in use
**Fix:** Kill existing process
```bash
lsof -ti:8001 | xargs kill -9
./start-license-api.sh
```

## 📝 Test Checklist

- [ ] License API starts successfully
- [ ] App launches without errors
- [ ] All 20 tools visible in sidebar
- [ ] All 8 categories visible
- [ ] Free tools open without activation
- [ ] Premium tools show lock icon
- [ ] Activation dialog appears for locked tools
- [ ] PRO key unlocks all tools
- [ ] PREMIUM key unlocks selected tools
- [ ] License persists after app restart
- [ ] Shield icon shows when activated
- [ ] Can click shield to see license status
- [ ] Tools can be opened in tabs
- [ ] Multiple tabs work correctly

## 🎉 Success Criteria

✅ **All tests pass**  
✅ **No console errors**  
✅ **License persists across restarts**  
✅ **All tools accessible with PRO license**  
✅ **Clean, stable user experience**
