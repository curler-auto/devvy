#!/bin/bash

echo "🚀 Building Devvy Studio with Tauri..."
echo ""

# Build the app
npm run tauri:build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    
    # Get the app path
    APP_PATH="src-tauri/target/release/bundle/macos/Devvy Studio.app"
    INSTALL_PATH="/Applications/Devvy Studio.app"
    
    if [ -d "$APP_PATH" ]; then
        echo "📦 Installing to /Applications..."
        
        # Remove old version if exists
        if [ -d "$INSTALL_PATH" ]; then
            echo "🗑️  Removing old version..."
            rm -rf "$INSTALL_PATH"
        fi
        
        # Copy new version
        cp -R "$APP_PATH" /Applications/
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Devvy Studio installed successfully!"
            echo "📍 Location: /Applications/Devvy Studio.app"
            echo ""
            echo "🎉 You can now launch it from Applications or Spotlight!"
            echo ""
            
            # Ask if user wants to launch
            read -p "🚀 Launch Devvy Studio now? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open "/Applications/Devvy Studio.app"
            fi
        else
            echo "❌ Installation failed"
            exit 1
        fi
    else
        echo "❌ Build artifact not found at: $APP_PATH"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi
