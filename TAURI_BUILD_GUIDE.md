# Devvy Studio - Tauri Build Guide

## Overview

Devvy Studio is now built with **Tauri** instead of Electron, resulting in:
- **98.3% smaller app size** (9.4 MB vs 543 MB)
- **Faster startup** and better performance
- **Native WebView** instead of bundled Chromium
- **Rust-based backend** for security and efficiency

## Prerequisites

### macOS
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Xcode Command Line Tools
xcode-select --install
```

### Linux
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### Windows
```powershell
# Install Rust
# Download from: https://www.rust-lang.org/tools/install

# Install WebView2 (usually pre-installed on Windows 11)
# Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

## Development

### Install Dependencies
```bash
cd frontend
npm install
```

### Run in Development Mode
```bash
npm run tauri:dev
```

This will:
1. Start the React development server
2. Launch the Tauri app with hot-reload

## Building

### Build for Production
```bash
cd frontend
npm run tauri:build
```

### Build Output Locations

**macOS:**
- App: `frontend/src-tauri/target/release/bundle/macos/Devvy Studio.app`
- DMG: `frontend/src-tauri/target/release/bundle/dmg/Devvy Studio_0.1.0_aarch64.dmg`

**Linux:**
- AppImage: `frontend/src-tauri/target/release/bundle/appimage/`
- Deb: `frontend/src-tauri/target/release/bundle/deb/`

**Windows:**
- MSI: `frontend/src-tauri/target/release/bundle/msi/`
- NSIS: `frontend/src-tauri/target/release/bundle/nsis/`

## Configuration

### Tauri Config
Location: `frontend/src-tauri/tauri.conf.json`

Key settings:
- **productName**: "Devvy Studio"
- **identifier**: "com.devvy.studio"
- **window size**: 1400x900 (min: 1000x600)
- **frontendDist**: "../build" (React build output)

### Icons
Icons are located in `frontend/src-tauri/icons/`:
- `icon.png` - 512x512 main icon
- `icon.icns` - macOS icon
- `icon.ico` - Windows icon
- Various sizes for different platforms

## Size Comparison

| Framework | App Size | Installer | Build Time |
|-----------|----------|-----------|------------|
| Electron  | 543 MB   | N/A       | ~2 min     |
| **Tauri** | **9.4 MB** | **3.3 MB** | **~15 sec** |

## Architecture

### Frontend
- React 18.2 with Shadcn UI components
- Monaco Editor for code editing
- Tailwind CSS for styling
- Builds to `frontend/build/`

### Backend
- FastAPI with SQLite (desktop mode)
- Python backend bundled with app
- Launches automatically on app start

### Tauri Layer
- Rust-based native layer
- Uses system WebView (WebKit on macOS, WebView2 on Windows)
- Handles window management and system integration

## Troubleshooting

### Build Fails
```bash
# Clean build artifacts
cd frontend/src-tauri
cargo clean

# Rebuild
cd ..
npm run tauri:build
```

### Icon Not Showing
```bash
# Regenerate icons from source
cd frontend
python3 generate_tauri_icons.py
```

### Backend Not Starting
- Check that Python backend is in `backend/dist/`
- Verify `launcher.py` is executable
- Check logs in app console

## Distribution

### macOS
1. Build DMG: `npm run tauri:build`
2. Sign app (optional): `codesign --deep --force --verify --verbose --sign "Developer ID" "Devvy Studio.app"`
3. Notarize (optional): Submit to Apple for notarization
4. Distribute DMG file

### Windows
1. Build MSI/NSIS: `npm run tauri:build`
2. Sign executable (optional): Use SignTool
3. Distribute installer

### Linux
1. Build AppImage/Deb: `npm run tauri:build`
2. Distribute package

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri API Reference](https://tauri.app/v1/api/js/)
- [Rust Documentation](https://doc.rust-lang.org/)
