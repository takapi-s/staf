# STAF Deployment Guide

This document explains how to build and deploy the STAF application for Windows.

## Prerequisites

Ensure the following tools are installed for building:

- **Node.js** (v18 or higher recommended)
- **Rust** (latest stable version)
- **Windows SDK** (for Windows builds)
- **Microsoft Visual Studio C++ Build Tools** (for Windows)

### Installing Required Environment

1. **Node.js**: Download from https://nodejs.org/
2. **Rust**: Install from https://www.rust-lang.org/tools/install
   ```bash
   rustc --version
   cargo --version
   ```
3. **Windows Build Tools**:
   - Install "C++ build tools" from Visual Studio Installer
   - Or run `npm install -g windows-build-tools`

## Build Preparation

### 1. Install Dependencies

```bash
npm install
```

### 2. Test in Development Mode

```bash
npm run tauri:dev
```

Verify that the application launches correctly.

## Production Build

### Creating Windows Installer

```bash
npm run tauri:build
```

After the build completes, the following artifacts will be generated:

```
src-tauri/target/release/
├── staf_0.1.0_x64-setup.exe  # Windows Installer
├── staf.exe                   # Executable
└── bundle/                           # Various package formats
```

### Build Output Explanation

- **`staf_0.1.0_x64-setup.exe`**: Most common distribution format. Users can install by double-clicking
- **`staf.exe`**: Portable version (no installation required)
- **MSI/AppX**: Other package formats generated in the `bundle` folder

## Distribution Methods

### 1. Direct Distribution

- Distribute the installer (`.exe`) directly to users
- Share via cloud storage (Google Drive, OneDrive, etc.)
- Provide download from your company's homepage

### 2. GitHub Releases

1. Create a repository on GitHub
2. Access the Releases page
3. Click "Draft a new release"
4. Enter tag, title, and description
5. Upload the built `staf_0.1.0_x64-setup.exe`
6. Publish with "Publish release"

### 3. Microsoft Store (Windows)

Required steps before distribution:

1. Register with **Microsoft Partner Center** ($19 registration fee)
2. Obtain **App ID** and configure in `tauri.conf.json`
3. Set up **certificates**
4. Rebuild for Store

Details: https://tauri.app/v1/guides/distribution/microsoft-store

### 4. Auto-Update Configuration

To use Tauri's auto-update feature:

1. Prepare an update server (GitHub Releases, S3, etc.)
2. Add `updater` configuration to `tauri.conf.json`
3. Implement update check functionality

**Detailed steps**: See [`UPDATES.md`](./UPDATES.md).

Main steps:
- Generate key pair and configure for signing
- Create `updater.json` and place on GitHub
- Check for updates via "Check for Updates" button in header

Details: https://tauri.app/v1/guides/distribution/updater

## Build Optimization

### Size Reduction

1. Remove unnecessary files
2. Compress with UPX, etc.
3. Optimize with `--release` flag

```bash
npm run tauri:build -- -- --release
```

### Performance Improvement

- Reduce frontend bundle size
- Remove unnecessary dependencies
- Implement code splitting

## Troubleshooting

### Build Errors

**Error: `link.exe not found`**
```bash
# Install Visual Studio Build Tools
# Or set environment variable
set VCVARSALL=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat
```

**Error: `cargo not found`**
```bash
# Reinstall Rust
# Or add Rust to PATH
```

**Error: `node_modules not found`**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Runtime Errors

- Antivirus software may give false positives
- Code signing reduces detection rate

## Code Signing (Recommended)

1. **Obtain Code Signing Certificate**
   - Commercial certificate authority (DigiCert, etc.)
2. **Sign with Certificate**
   ```bash
   signtool sign /f your-cert.pfx /p password /t http://timestamp.digicert.com staf.exe
   ```

## Checklist

Before building, verify:

- [ ] Update version number in `package.json` (other files will auto-sync)
- [ ] App icon is properly configured
- [ ] Copyright information is correctly stated
- [ ] License file is included
- [ ] README.md is up to date
- [ ] If environment variables are required, prepare documentation

## Next Steps

1. **Testing**: Test the built app on multiple Windows environments
2. **Feedback Collection**: Gather feedback from beta testers
3. **Feature Addition**: Improve features based on feedback
4. **Official Release**: Publish officially when ready

## Reference Links

- [Tauri Official Documentation](https://tauri.app/)
- [React Router Documentation](https://reactrouter.com/)
- [Windows App Distribution](https://tauri.app/v1/guides/distribution/windows)
- [Code Signing Explanation](https://docs.microsoft.com/en-us/windows/win32/win_cert/about-certificates)

