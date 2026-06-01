#!/bin/bash

# NomadRide Android Emulator Uninstall Script
# Reverses all changes made by setup-android-emulator.sh

set -e  # Exit on error

echo "=== NomadRide Android Emulator Uninstall ==="
echo ""

# Define Android SDK paths
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

AVD_NAME="NomadRide_S25"

# Helper: prompt for confirmation (default: No)
confirm() {
    read -r -p "$1 [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# Step 1: Kill running emulator if active
echo "[1/5] Checking for running emulator..."
if adb devices 2>/dev/null | grep -q "emulator"; then
    echo "  Found running emulator instance(s)."
    if confirm "  Shut down all running emulators?"; then
        adb devices 2>/dev/null | grep "emulator" | cut -f1 | while read -r device; do
            echo "  Shutting down $device..."
            adb -s "$device" emu kill 2>/dev/null || true
        done
        sleep 2
        echo "✓ Emulator(s) shut down"
    else
        echo "⊘ Skipped emulator shutdown"
    fi
else
    echo "✓ No running emulator found"
fi

# Step 2: Delete the NomadRide AVD
echo ""
echo "[2/5] Removing AVD '$AVD_NAME'..."
if [ -d "$HOME/.android/avd/${AVD_NAME}.avd" ] || [ -f "$HOME/.android/avd/${AVD_NAME}.ini" ]; then
    if confirm "  Delete emulator '$AVD_NAME' and its disk images?"; then
        rm -rf "$HOME/.android/avd/${AVD_NAME}.avd"
        rm -f "$HOME/.android/avd/${AVD_NAME}.ini"
        echo "✓ AVD '$AVD_NAME' removed"
    else
        echo "⊘ Skipped AVD removal"
    fi
else
    echo "✓ AVD '$AVD_NAME' not found (already removed)"
fi

# Step 3: Uninstall SDK packages installed by setup script
echo ""
echo "[3/5] Uninstalling SDK packages..."
if [ -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "  The following packages were installed by the setup script:"
    echo "    - system-images;android-34;google_apis_playstore;x86_64"
    echo "    - platforms;android-34"
    echo "    - build-tools;34.0.0"
    echo "    - emulator"
    echo "    - platform-tools"
    echo ""
    if confirm "  Uninstall these SDK packages? (Other Android projects may need them)"; then
        echo "  Removing system image..."
        $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --uninstall \
            "system-images;android-34;google_apis_playstore;x86_64" 2>/dev/null || true

        echo "  Removing platform android-34..."
        $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --uninstall \
            "platforms;android-34" 2>/dev/null || true

        echo "  Removing build-tools 34.0.0..."
        $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --uninstall \
            "build-tools;34.0.0" 2>/dev/null || true

        echo "  Removing emulator..."
        $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --uninstall \
            "emulator" 2>/dev/null || true

        echo "  Removing platform-tools..."
        $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --uninstall \
            "platform-tools" 2>/dev/null || true

        echo "✓ SDK packages uninstalled"
    else
        echo "⊘ Skipped SDK package removal"
    fi
else
    echo "✓ sdkmanager not found (SDK packages already removed)"
fi

# Step 4: Remove command-line tools
echo ""
echo "[4/5] Removing Android SDK command-line tools..."
if [ -d "$ANDROID_HOME/cmdline-tools/latest" ]; then
    if confirm "  Delete command-line tools from $ANDROID_HOME/cmdline-tools/?"; then
        rm -rf "$ANDROID_HOME/cmdline-tools/latest"
        # Remove cmdline-tools dir if empty
        rmdir "$ANDROID_HOME/cmdline-tools" 2>/dev/null || true
        echo "✓ Command-line tools removed"
    else
        echo "⊘ Skipped command-line tools removal"
    fi
else
    echo "✓ Command-line tools not found (already removed)"
fi

# Optional: remove entire Android SDK directory if empty
if [ -d "$ANDROID_HOME" ]; then
    remaining=$(find "$ANDROID_HOME" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l)
    if [ "$remaining" -eq 0 ]; then
        if confirm "  Android SDK directory is empty. Remove $ANDROID_HOME?"; then
            rmdir "$ANDROID_HOME"
            echo "✓ Empty Android SDK directory removed"
        fi
    fi
fi

# Step 5: Clean environment variables from shell config
echo ""
echo "[5/5] Cleaning up environment variables..."
SHELL_RC="$HOME/.zshrc"
if [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
fi

if grep -q "# Android SDK paths for NomadRide" "$SHELL_RC" 2>/dev/null; then
    if confirm "  Remove NomadRide Android SDK entries from $SHELL_RC?"; then
        # Remove the NomadRide block (blank line + comment + ANDROID_HOME + PATH)
        sed -i '/^# Android SDK paths for NomadRide$/,+2d' "$SHELL_RC"
        # Remove any leftover blank line the block left behind
        sed -i '/^$/N;/^\n$/d' "$SHELL_RC"
        echo "✓ Environment variables removed from $SHELL_RC"
        echo "  Run 'source $SHELL_RC' or restart your terminal to apply"
    else
        echo "⊘ Skipped environment variable cleanup"
    fi
else
    echo "✓ No NomadRide entries found in $SHELL_RC"
fi

# Kill adb server if we removed platform-tools
if ! command -v adb &>/dev/null && pgrep -x adb &>/dev/null; then
    echo ""
    echo "Stopping orphaned adb server..."
    killall adb 2>/dev/null || true
fi

echo ""
echo "=== Uninstall Complete ==="
echo ""
echo "What was removed (if confirmed):"
echo "  • AVD:            $AVD_NAME"
echo "  • SDK packages:   platform-tools, platforms;android-34, build-tools;34.0.0,"
echo "                     emulator, system-images;android-34;google_apis_playstore;x86_64"
echo "  • cmdline-tools:  $ANDROID_HOME/cmdline-tools/latest"
echo "  • Shell config:   NomadRide entries in $SHELL_RC"
echo ""
