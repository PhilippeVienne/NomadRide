#!/bin/bash

# NomadRide Android Emulator Setup Script
# Creates an emulator matching Samsung Galaxy S25 specifications

set -e  # Exit on error

echo "=== NomadRide Android Emulator Setup ==="
echo ""

# Define Android SDK paths
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

# Step 1: Download and install Android SDK command-line tools
echo "[1/6] Installing Android SDK command-line tools..."
mkdir -p "$ANDROID_HOME/cmdline-tools"
cd "$ANDROID_HOME/cmdline-tools"

if [ ! -d "latest" ]; then
    echo "Downloading command-line tools..."
    wget -q --show-progress https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
    unzip -q cmdline-tools.zip
    mv cmdline-tools latest
    rm cmdline-tools.zip
    echo "✓ Command-line tools installed"
else
    echo "✓ Command-line tools already installed"
fi

# Step 2: Accept licenses
echo ""
echo "[2/6] Accepting SDK licenses..."
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null 2>&1 || true
echo "✓ Licenses accepted"

# Step 3: Install required SDK packages
echo ""
echo "[3/6] Installing SDK packages (this may take a few minutes)..."
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "emulator" \
    "system-images;android-34;google_apis_playstore;x86_64"

echo "✓ SDK packages installed"

# Step 4: Create custom AVD matching Samsung S25 specs
echo ""
echo "[4/6] Creating Samsung S25-like emulator..."
AVD_NAME="NomadRide_S25"

# Remove existing AVD if present
if [ -d "$HOME/.android/avd/${AVD_NAME}.avd" ]; then
    echo "Removing existing $AVD_NAME emulator..."
    rm -rf "$HOME/.android/avd/${AVD_NAME}.avd"
    rm -f "$HOME/.android/avd/${AVD_NAME}.ini"
fi

# Create AVD with S25-like specs (6.2", 1080x2340, Android 14)
echo "no" | $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd \
    -n "$AVD_NAME" \
    -k "system-images;android-34;google_apis_playstore;x86_64" \
    -d "pixel_6" \
    --force

# Customize config for better S25 match
CONFIG_FILE="$HOME/.android/avd/${AVD_NAME}.avd/config.ini"
if [ -f "$CONFIG_FILE" ]; then
    # Update display settings to match S25
    sed -i 's/hw.lcd.width=.*/hw.lcd.width=1080/' "$CONFIG_FILE"
    sed -i 's/hw.lcd.height=.*/hw.lcd.height=2340/' "$CONFIG_FILE"
    sed -i 's/hw.lcd.density=.*/hw.lcd.density=420/' "$CONFIG_FILE"
    
    # Performance optimizations for development
    echo "hw.ramSize=4096" >> "$CONFIG_FILE"
    echo "disk.dataPartition.size=8G" >> "$CONFIG_FILE"
    echo "hw.keyboard=yes" >> "$CONFIG_FILE"
fi

echo "✓ Emulator '$AVD_NAME' created"

# Step 5: Add environment variables to shell config
echo ""
echo "[5/6] Configuring environment variables..."
SHELL_RC="$HOME/.zshrc"
if [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
fi

# Check if already configured
if ! grep -q "ANDROID_HOME" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Android SDK paths for NomadRide" >> "$SHELL_RC"
    echo "export ANDROID_HOME=\$HOME/Android/Sdk" >> "$SHELL_RC"
    echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator" >> "$SHELL_RC"
    echo "✓ Environment variables added to $SHELL_RC"
else
    echo "✓ Environment variables already configured"
fi

# Step 6: Summary and next steps
echo ""
echo "[6/6] Setup complete!"
echo ""
echo "=== Created Emulator Specifications ==="
echo "Name:        $AVD_NAME"
echo "Device:      Samsung Galaxy S25-like"
echo "Screen:      6.2\" (1080x2340)"
echo "Android:     14 (API 34)"
echo "Play Store:  Yes"
echo "RAM:         4GB"
echo ""
echo "=== Next Steps ==="
echo "1. Restart your terminal or run:"
echo "   source $SHELL_RC"
echo ""
echo "2. Start the emulator:"
echo "   emulator -avd $AVD_NAME &"
echo ""
echo "3. Or run your app (emulator will start automatically):"
echo "   cd /home/philippe/perso/nomadride/app"
echo "   npm run android"
echo ""
echo "=== Useful Commands ==="
echo "List all emulators:         emulator -list-avds"
echo "Start emulator:             emulator -avd $AVD_NAME"
echo "Start with no audio:        emulator -avd $AVD_NAME -no-audio"
echo "Check running devices:      adb devices"
echo ""
