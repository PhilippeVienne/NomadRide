# Android Emulator Setup for NomadRide

This guide helps you set up an Android emulator matching the Samsung Galaxy S25 specifications for testing the NomadRide app.

## Quick Start

Three helper scripts have been created in the project root:

1. **`setup-android-emulator.sh`** - Full installation and configuration
2. **`check-android-setup.sh`** - Verify installation status  
3. **`start-emulator.sh`** - Start the NomadRide emulator

### Step-by-Step Installation

```bash
# 1. Run the setup script (takes 5-10 minutes)
./setup-android-emulator.sh

# 2. After completion, reload your shell configuration
source ~/.zshrc  # or source ~/.bashrc if you use bash

# 3. Verify the installation
./check-android-setup.sh

# 4. Start the emulator
./start-emulator.sh
```

### Running NomadRide on the Emulator

Once the emulator is running:

```bash
cd app
npm run android
```

The app will automatically deploy to the running emulator.

## Emulator Specifications

**Name:** NomadRide_S25  
**Device:** Samsung Galaxy S25-like  
**Screen:** 6.2" (1080x2340 pixels)  
**Density:** 420 dpi  
**Android:** 14 (API Level 34)  
**Play Store:** Yes  
**RAM:** 4GB  
**Storage:** 8GB  

## Manual Installation (Alternative)

If the automated script has issues, follow these steps manually:

### 1. Install Android SDK Command-Line Tools

```bash
mkdir -p ~/Android/Sdk/cmdline-tools
cd ~/Android/Sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-11076708_latest.zip
mv cmdline-tools latest
rm commandlinetools-linux-11076708_latest.zip
```

### 2. Set Environment Variables

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

Then reload: `source ~/.zshrc`

### 3. Accept Licenses

```bash
yes | sdkmanager --licenses
```

### 4. Install SDK Packages

```bash
sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "emulator" \
    "system-images;android-34;google_apis_playstore;x86_64"
```

### 5. Create the Emulator

```bash
avdmanager create avd \
    -n NomadRide_S25 \
    -k "system-images;android-34;google_apis_playstore;x86_64" \
    -d "pixel_6" \
    --force
```

### 6. Customize for S25 Specs (Optional)

Edit `~/.android/avd/NomadRide_S25.avd/config.ini`:

```ini
hw.lcd.width=1080
hw.lcd.height=2340
hw.lcd.density=420
hw.ramSize=4096
disk.dataPartition.size=8G
hw.keyboard=yes
```

## Useful Commands

### List Available Emulators
```bash
emulator -list-avds
```

### Start Emulator with Specific Options
```bash
# No audio (faster)
emulator -avd NomadRide_S25 -no-audio

# Specific resolution
emulator -avd NomadRide_S25 -skin 1080x2340

# Read-only system
emulator -avd NomadRide_S25 -read-only

# Wipe data (fresh start)
emulator -avd NomadRide_S25 -wipe-data
```

### Check Connected Devices
```bash
adb devices
```

### View Emulator Logs
```bash
adb logcat
```

### Install APK Manually
```bash
adb install path/to/app.apk
```

### Take Screenshot
```bash
adb exec-out screencap -p > screenshot.png
```

## Troubleshooting

### Emulator Won't Start

**Check if KVM is available (Linux):**
```bash
sudo apt-get install cpu-checker
kvm-ok
```

If KVM is not available, start with software rendering:
```bash
emulator -avd NomadRide_S25 -gpu swiftshader_indirect
```

### Expo Can't Find Device

```bash
# Make sure adb is running
adb start-server

# List devices
adb devices

# If emulator shows offline, restart adb
adb kill-server
adb start-server
```

### Slow Performance

1. Increase RAM in emulator config
2. Use hardware acceleration: `-gpu host`
3. Disable animations: `-no-boot-anim`
4. Close other applications

### "INSTALL_FAILED_INSUFFICIENT_STORAGE"

```bash
# Wipe emulator data
emulator -avd NomadRide_S25 -wipe-data
```

Or increase storage in `~/.android/avd/NomadRide_S25.avd/config.ini`:
```ini
disk.dataPartition.size=12G
```

### Connection Issues with Expo

If Expo can't connect to the emulator:

1. Check that Metro bundler is running on the correct port
2. Reverse the port:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. Use the tunnel option in Expo

## Using with VS Code

The `.vscode/tasks.json` includes a "Start Mobile App" task. You can:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Start Mobile App"

This will start Expo, and you can then press 'a' to open on Android.

## Cost-Optimization Notes (For AWS Deployment)

While developing locally with the emulator is free, keep in mind:

- Test thoroughly on emulator before deploying to AWS
- Use emulator for UI/UX iterations
- Only test backend integration when API contracts are stable
- Consider using emulator snapshots to avoid cold boot times

## Need Help?

Check the setup logs:
```bash
cat ~/android-setup.log
```

Check installation status:
```bash
./check-android-setup.sh
```

## Next Steps

Once your emulator is running:

1. **Start developing the Explore module** - Navigation and routing UI
2. **Test glove-friendly touch targets** - All buttons should be 60dp+ minimum
3. **Test dark mode rendering** - High contrast for sunlight visibility
4. **Test landscape orientation** - Many riders mount phones horizontally
5. **Profile app performance** - Target 60fps for smooth animations

Happy riding! 🏍️
