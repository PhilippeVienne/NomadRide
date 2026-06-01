#!/bin/bash

# Start NomadRide Android Emulator (Samsung S25-like)

# Set Android paths
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

AVD_NAME="NomadRide_S25"

echo "=== Starting NomadRide Emulator ==="
echo ""

# Check if emulator exists
if [ ! -d "$HOME/.android/avd/${AVD_NAME}.avd" ]; then
    echo "Error: Emulator '$AVD_NAME' not found!"
    echo ""
    echo "Available emulators:"
    emulator -list-avds
    echo ""
    echo "Please run: ./setup-android-emulator.sh first"
    exit 1
fi

echo "Starting emulator: $AVD_NAME"
echo "Device: Samsung Galaxy S25-like (6.2\", Android 14)"
echo ""
echo "The emulator window will open shortly..."
echo "To stop: Close the emulator window or press Ctrl+C"
echo ""

# Check KVM availability
if [ -e /dev/kvm ]; then
    echo "✓ KVM available — using hardware acceleration"
    ACCEL_FLAGS="-accel kvm -gpu host"
else
    echo "⚠ KVM not available — falling back to software rendering (slower)"
    echo "  To enable KVM: sudo modprobe kvm kvm_intel"
    echo ""
    ACCEL_FLAGS="-accel off -gpu swiftshader_indirect"
fi

# Start emulator with optimized settings
emulator -avd "$AVD_NAME" \
    -no-snapshot-load \
    -no-boot-anim \
    -skin 1080x2340 \
    $ACCEL_FLAGS \
    "$@"
