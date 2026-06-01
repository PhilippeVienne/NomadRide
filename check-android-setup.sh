#!/bin/bash

# Check Android SDK and Emulator Installation Status

echo "=== NomadRide Android Setup Status ==="
echo ""

# Check Android SDK
if [ -d "$HOME/Android/Sdk" ]; then
    echo "✓ Android SDK directory exists"
    export ANDROID_HOME="$HOME/Android/Sdk"
    export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
else
    echo "✗ Android SDK not found at $HOME/Android/Sdk"
    echo "  Run: ./setup-android-emulator.sh"
    exit 1
fi

# Check command-line tools
if [ -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "✓ SDK command-line tools installed"
else
    echo "✗ Command-line tools not found"
    exit 1
fi

# Check platform-tools
if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
    echo "✓ Platform tools (adb) installed"
    ADB_VERSION=$($ANDROID_HOME/platform-tools/adb --version | head -1)
    echo "  $ADB_VERSION"
else
    echo "✗ Platform tools not found"
fi

# Check emulator
if [ -f "$ANDROID_HOME/emulator/emulator" ]; then
    echo "✓ Emulator binary installed"
    EMULATOR_VERSION=$($ANDROID_HOME/emulator/emulator -version | head -1)
    echo "  $EMULATOR_VERSION"
else
    echo "✗ Emulator not found"
fi

# Check system images
echo ""
echo "System Images:"
if [ -d "$ANDROID_HOME/system-images" ]; then
    ls -1 "$ANDROID_HOME/system-images/" 2>/dev/null || echo "  No system images found"
else
    echo "  No system images directory"
fi

# Check AVDs
echo ""
echo "Available Emulators (AVDs):"
if [ -d "$HOME/.android/avd" ]; then
    AVD_COUNT=$(ls -1 "$HOME/.android/avd/" | grep ".avd$" | wc -l)
    if [ "$AVD_COUNT" -gt 0 ]; then
        ls -1 "$HOME/.android/avd/" | grep ".avd$" | sed 's/.avd$//' | sed 's/^/  ✓ /'
    else
        echo "  No emulators created yet"
    fi
else
    echo "  No AVD directory found"
fi

# Check for  NomadRide emulator
echo ""
if [ -d "$HOME/.android/avd/NomadRide_S25.avd" ]; then
    echo "✓ NomadRide_S25 emulator is ready!"
    echo ""
    echo "To start it, run:"
    echo "  ./start-emulator.sh"
    echo ""
    echo "Or from the app directory:"
    echo "  cd app && npm run android"
else
    echo "⚠ NomadRide_S25 emulator not found"
    echo ""
    echo "The setup script may still be running. Check:"
    echo "  tail -f ~/android-setup.log"
    echo ""
    echo "Or run setup again:"
    echo "  ./setup-android-emulator.sh"
fi

# Check running emulators
echo ""
echo "Currently Running Devices:"
if command -v adb &> /dev/null; then
    DEVICES=$($ANDROID_HOME/platform-tools/adb devices | grep -v "List of devices" | grep -v "^$")
    if [ -z "$DEVICES" ]; then
        echo "  No devices running"
    else
        echo "$DEVICES" | sed 's/^/  /'
    fi
else
    echo "  adb not available"
fi

echo ""
echo "=== Environment Variables ==="
echo "ANDROID_HOME=${ANDROID_HOME:-not set}"
echo ""
echo "Add to your ~/.zshrc or ~/.bashrc:"
echo "  export ANDROID_HOME=\$HOME/Android/Sdk"
echo "  export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator"
echo ""
