# DevTools Suite

A comprehensive desktop application with 70+ developer productivity tools.

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 server_desktop.py
```

### Frontend

```bash
cd frontend
npm install --force
npm start
```

### Build Desktop App

```bash
cd frontend
npm run tauri build
```

### Build Windows App from mac

```bash
cd frontend
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin
brew install makensis
brew install lld
npm run tauri:build:windows
```

## License

Proprietary - All rights reserved

"tauri:build:windows": "PATH=\"$HOME/.cargo/bin:$PATH\" tauri build --target x86_64-pc-windows-msvc --runner cargo-xwin",
