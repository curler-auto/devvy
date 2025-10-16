# Devvy Studio - Build Guide

## 🎯 Cross-Platform Support

Devvy Studio is **100% cross-platform** thanks to Tauri! The same codebase builds for:
- ✅ **macOS** (Intel & Apple Silicon)
- ✅ **Windows** (x64 & ARM)
- ✅ **Linux** (Debian, AppImage, RPM)

## 📦 Build Outputs by Platform

### macOS
- **App Bundle**: `Devvy Studio.app` (9.4 MB)
- **DMG Installer**: `Devvy Studio_0.1.0_aarch64.dmg` (3.3 MB)
- **Location**: `frontend/src-tauri/target/release/bundle/macos/`

### Windows
- **MSI Installer**: `Devvy Studio_0.1.0_x64_en-US.msi`
- **NSIS Installer**: `Devvy Studio_0.1.0_x64-setup.exe`
- **Location**: `frontend/src-tauri/target/release/bundle/msi/` and `nsis/`

### Linux
- **Debian Package**: `devvy-studio_0.1.0_amd64.deb`
- **AppImage**: `devvy-studio_0.1.0_amd64.AppImage`
- **RPM Package**: `devvy-studio-0.1.0-1.x86_64.rpm`
- **Location**: `frontend/src-tauri/target/release/bundle/deb/`, `appimage/`, `rpm/`

## 🚀 Quick Build Commands

### Build for Current Platform
```bash
cd frontend
npm run tauri:build
```

### Build and Install (macOS only)
```bash
cd frontend
npm run tauri:install
```

### Development Mode
```bash
cd frontend
npm run tauri:dev
```

## 🔧 Platform-Specific Builds

### macOS (on Mac)
```bash
cd frontend

# Universal Binary (Intel + Apple Silicon)
npm run tauri:build

# Output:
# - Devvy Studio.app
# - Devvy Studio_0.1.0_aarch64.dmg (or x64)
```

### Windows (on Windows)
```bash
cd frontend

# Build for Windows
npm run tauri:build

# Output:
# - Devvy Studio_0.1.0_x64_en-US.msi
# - Devvy Studio_0.1.0_x64-setup.exe
```

### Linux (on Linux)
```bash
cd frontend

# Build for Linux
npm run tauri:build

# Output:
# - devvy-studio_0.1.0_amd64.deb
# - devvy-studio_0.1.0_amd64.AppImage
# - devvy-studio-0.1.0-1.x86_64.rpm
```

## 🌍 Cross-Compilation

Tauri supports building for other platforms from your current OS (with limitations):

### From macOS → Windows
```bash
# Install Windows target
rustup target add x86_64-pc-windows-msvc

# Build (requires additional setup)
npm run tauri build -- --target x86_64-pc-windows-msvc
```

### From Linux → Windows
```bash
# Install Windows target
rustup target add x86_64-pc-windows-gnu

# Build
npm run tauri build -- --target x86_64-pc-windows-gnu
```

**Note**: Cross-compilation can be complex. Recommended approach is to build on native platforms or use CI/CD.

## 🤖 CI/CD Build (GitHub Actions)

For automated multi-platform builds, use GitHub Actions:

```yaml
# .github/workflows/build.yml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies (Ubuntu only)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
      
      - name: Install frontend dependencies
        run: cd frontend && npm install
      
      - name: Build
        run: cd frontend && npm run tauri:build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: devvy-studio-${{ matrix.platform }}
          path: frontend/src-tauri/target/release/bundle/
```

## 📝 Build Configuration

### Customize Build

Edit `frontend/src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",  // or ["dmg", "msi", "deb"]
    "icon": [...],
    "category": "DeveloperTool"
  }
}
```

### Target Specific Platforms

```bash
# macOS only
npm run tauri build -- --target dmg

# Windows only
npm run tauri build -- --target msi

# Linux only
npm run tauri build -- --target deb appimage
```

## 🔍 Build Requirements

### macOS
- ✅ macOS 10.15+ (Catalina or later)
- ✅ Xcode Command Line Tools
- ✅ Node.js 16+
- ✅ Rust 1.70+

### Windows
- ✅ Windows 10+
- ✅ Visual Studio Build Tools 2019+
- ✅ Node.js 16+
- ✅ Rust 1.70+
- ✅ WebView2 (usually pre-installed on Windows 11)

### Linux
- ✅ Ubuntu 20.04+ / Debian 11+ / Fedora 36+
- ✅ Node.js 16+
- ✅ Rust 1.70+
- ✅ System dependencies:
  ```bash
  sudo apt-get install -y \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf
  ```

## 📊 Build Size Comparison

| Platform | App Size | Installer Size | Build Time |
|----------|----------|----------------|------------|
| **macOS** | 9.4 MB | 3.3 MB (DMG) | ~13s |
| **Windows** | ~12 MB | ~4 MB (MSI) | ~15s |
| **Linux** | ~11 MB | ~3.5 MB (DEB) | ~14s |

**vs Electron:**
- Electron: 543 MB app, 200+ MB installer
- Tauri: **98.3% smaller!** 🎉

## 🎨 Customization

### Change App Icon

1. Replace icons in `frontend/src-tauri/icons/`
2. Or regenerate from source:
   ```bash
   cd frontend
   python3 generate_tauri_icons.py
   ```

### Change App Name

Edit `frontend/src-tauri/tauri.conf.json`:
```json
{
  "productName": "Your App Name",
  "identifier": "com.yourcompany.yourapp"
}
```

### Change Version

Edit `frontend/src-tauri/tauri.conf.json`:
```json
{
  "version": "1.0.0"
}
```

## 🐛 Troubleshooting

### Build Fails on macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Update Rust
rustup update
```

### Build Fails on Windows
```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/

# Install WebView2
# Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

### Build Fails on Linux
```bash
# Install all dependencies
sudo apt-get update
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.0-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  build-essential \
  curl \
  wget \
  file
```

### Slow Build Times
```bash
# Use release mode with optimizations
npm run tauri:build

# Or parallel builds
CARGO_BUILD_JOBS=8 npm run tauri:build
```

## 📦 Distribution

### macOS
1. **DMG**: Double-click to mount, drag to Applications
2. **Notarization** (for distribution):
   ```bash
   xcrun notarytool submit "Devvy Studio.dmg" \
     --apple-id "your@email.com" \
     --password "app-specific-password" \
     --team-id "TEAM_ID"
   ```

### Windows
1. **MSI**: Standard Windows installer
2. **Code Signing** (recommended):
   ```bash
   signtool sign /f certificate.pfx /p password "Devvy Studio.msi"
   ```

### Linux
1. **DEB**: `sudo dpkg -i devvy-studio_0.1.0_amd64.deb`
2. **AppImage**: `chmod +x devvy-studio.AppImage && ./devvy-studio.AppImage`
3. **RPM**: `sudo rpm -i devvy-studio-0.1.0-1.x86_64.rpm`

## 🎯 Production Checklist

- [ ] Update version in `tauri.conf.json`
- [ ] Test on all target platforms
- [ ] Update CHANGELOG.md
- [ ] Create git tag: `git tag v1.0.0`
- [ ] Build for all platforms
- [ ] Test installers
- [ ] Sign binaries (macOS/Windows)
- [ ] Create GitHub release
- [ ] Upload installers
- [ ] Update documentation

## 🚀 Automated Release

Use the provided GitHub Actions workflow to automatically build and release for all platforms when you push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will trigger builds for macOS, Windows, and Linux, and create a GitHub release with all installers attached.

## 📚 Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri Build Guide](https://tauri.app/v1/guides/building/)
- [Cross-Platform Guide](https://tauri.app/v1/guides/building/cross-platform)
- [Code Signing Guide](https://tauri.app/v1/guides/distribution/sign-macos)
