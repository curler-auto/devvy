# License System Implementation Plan

## ✅ Completed (Part 1)

### 1. Tool Configuration Schema
- ✅ Created `frontend/public/toolconfig.json` with 20 tools
- ✅ Defined tool tiers: `free` and `premium`
- ✅ Defined 8 categories
- ✅ Each tool has: id, name, category, enabled, tier, icon, description

### 2. Machine Fingerprinting
- ✅ Created `frontend/src/utils/machineId.js`
- ✅ Generates unique machine ID from system properties
- ✅ Uses canvas fingerprinting, screen resolution, timezone, etc.
- ✅ SHA-256 hash for consistency

### 3. License Service
- ✅ Created `frontend/src/services/licenseService.js`
- ✅ Methods:
  - `activateLicense(key)` - Activate with key
  - `getLicenseConfig()` - Get current license
  - `getDefaultConfig()` - Load toolconfig.json
  - `isToolAccessible(tool, config)` - Check access
  - `deactivateLicense()` - For testing

### 4. Backend License API (Mock)
- ✅ Added to `backend/server.py`
- ✅ Endpoints:
  - `POST /api/license/activate` - Activate license
  - `POST /api/license/config` - Save config
  - `GET /api/license/config` - Get config
  - `DELETE /api/license/config` - Deactivate
- ✅ Mock validation:
  - `PRO-*` → All tools
  - `PREMIUM-*` → Selected premium tools
  - `FREE-*` → Free tools only

### 5. Activation Dialog UI
- ✅ Created `frontend/src/components/ActivationDialog.js`
- ✅ Features:
  - Input for activation key
  - Loading state
  - Success/error messages
  - Test keys displayed
  - Enter key support

## 🚧 Remaining (Part 2)

### 6. Update App.js
- [ ] Replace hardcoded `TOOLS` array with dynamic loading
- [ ] Load toolconfig.json on mount
- [ ] Merge with activated license config
- [ ] Add activation dialog state
- [ ] Filter tools based on license
- [ ] Show "Activate" button for premium tools
- [ ] Handle activation flow

### 7. Tool Access Control
- [ ] Check tool tier before opening
- [ ] Show activation dialog for locked premium tools
- [ ] Display lock icon on premium tools (if not activated)
- [ ] Update tool rendering logic

### 8. UI Updates
- [ ] Add "Premium" badge to premium tools
- [ ] Add lock icon to locked tools
- [ ] Add "Activate License" button in sidebar
- [ ] Show license status in UI

### 9. Testing
- [ ] Test with FREE key
- [ ] Test with PREMIUM key
- [ ] Test with PRO key
- [ ] Test invalid key
- [ ] Test machine ID persistence
- [ ] Test config persistence in database

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Devvy Studio App                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ toolconfig   │         │   License    │                  │
│  │   .json      │────────▶│   Service    │                  │
│  │ (Default)    │         │              │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                          │
│                                   ▼                          │
│                          ┌─────────────────┐                │
│                          │  Machine ID     │                │
│                          │  Generator      │                │
│                          └────────┬────────┘                │
│                                   │                          │
│                                   ▼                          │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │  Activation  │────────▶│   Backend    │                 │
│  │   Dialog     │         │  License API │                 │
│  └──────────────┘         └──────┬───────┘                 │
│                                   │                          │
│                                   ▼                          │
│                          ┌─────────────────┐                │
│                          │    SQLite DB    │                │
│                          │  (Activated     │                │
│                          │   Config)       │                │
│                          └─────────────────┘                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Flow

### 1. App Startup
```
1. Load toolconfig.json (default config)
2. Get machine ID
3. Check if license activated for this machine
4. If activated:
   - Load activated config from database
   - Merge with toolconfig.json
   - Enable premium tools based on license
5. If not activated:
   - Use default config (free tools only)
   - Show "Activate" prompts on premium tools
```

### 2. Activation Flow
```
1. User clicks "Activate" on premium tool
2. Show ActivationDialog
3. User enters activation key
4. Send to backend with machine ID and name
5. Backend validates key (mock)
6. Backend returns tool config
7. Save config to database
8. Update UI with new config
9. User can now access premium tools
```

### 3. Tool Access Check
```
1. User clicks on tool
2. Check tool tier in config
3. If free → Open tool
4. If premium:
   - Check if activated
   - If yes → Open tool
   - If no → Show activation dialog
```

## Test Keys

- `PRO-TEST-KEY` → Unlocks all premium tools
- `PREMIUM-TEST-KEY` → Unlocks selected premium tools
- `FREE-TEST-KEY` → Only free tools (same as no activation)
- Any other format → Invalid key error

## Database Schema

### license_config table (via tool_configs)
```json
{
  "machine_id": "abc123...",
  "machine_name": "MacBook-Pro",
  "activation_key": "PRO-TEST-KEY",
  "tool_config": {
    "version": "1.0.0",
    "isActivated": true,
    "licenseType": "pro",
    "activatedTools": ["all"]
  },
  "activated_at": "2025-10-16T06:00:00Z"
}
```

## Security Considerations

1. **Machine ID** - Prevents license sharing between computers
2. **Database Storage** - Config stored locally in SQLite
3. **API Validation** - Backend validates activation keys
4. **Fingerprinting** - Multiple system properties combined
5. **Hash** - SHA-256 for consistent machine ID

## Future Enhancements

1. **Real License Server** - Replace mock with actual API
2. **License Expiry** - Add expiration dates
3. **Seat Management** - Track number of activations
4. **Offline Validation** - Cache validation for offline use
5. **License Transfer** - Allow deactivation and reactivation
6. **Usage Analytics** - Track tool usage per license
