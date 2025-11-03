# STAF — Structured AI Flow

[![CI](https://github.com/takapi-s/staf/actions/workflows/ci.yml/badge.svg)](https://github.com/takapi-s/staf/actions/workflows/ci.yml)
[![Release](https://github.com/takapi-s/staf/actions/workflows/release.yml/badge.svg)](https://github.com/takapi-s/staf/actions/workflows/release.yml)

<p align="center">
  <img src="src-tauri/icons/app-icon.png" alt="STAF App Icon" width="200">
</p>

An AI-assisted, structured flow to transform CSV data reliably at scale.

## Features

- 🚀 **High Performance**: Efficiently process large CSV files
- 🤖 **AI-Powered**: Advanced data transformation and analysis using Google Gemini AI
- 📊 **Structured Outputs**: Explicit columns and schema-first configuration
- 📝 **Template Management**: Save frequently used settings as templates
- 💾 **Easy Export**: Export processed results in CSV format
- 🎨 **Modern UI**: Beautiful interface built with TailwindCSS

## Requirements

- Windows 10/11
- Google Gemini API key

## Quick Start

1. Launch the application
2. Open Settings (⚙️) and enter your Google Gemini API key
3. Load a CSV file
4. Configure prompt and output columns, then Start

## Installation

### Pre-built Application (Recommended)

Download and install the Windows installer from the latest release.

### For Developers: Build from Source

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed instructions.

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Usage

1. **Set up API Key**: Enter your Google Gemini API key in Settings
2. **Load CSV**: Select a CSV file to process
3. **Configure**: Write a prompt and define output columns
4. **Run & Review**: Start processing, monitor progress, export results

## Vision

- Name: STAF — Structured AI Flow
- Tagline: Structure your AI data flows
- One-liner: An AI-assisted, structured flow to transform CSV data reliably at scale.
- Principles: Structure-first, Repeatability, Observability, Graceful Degradation, Tight Feedback

### Value Pillars
- Reliability: deterministic prompting, auditability, clear errors
- Speed at scale: concurrency, RPM limits, resilient timeouts
- Clarity: explicit schemas and progress visibility
- Control: human-in-the-loop review and reversible exports
- Security: local keys, transparent grounding

## Project Structure

```
staf/
├── app/                      # Frontend (React)
│   ├── components/          # UI Components
│   ├── hooks/               # Custom Hooks
│   ├── routes/              # Routing
│   ├── stores/              # State Management (Zustand)
│   └── utils/               # Utilities
├── src-tauri/               # Backend (Rust/Tauri)
└── public/                  # Static Files
```

## Tech Stack

- **Frontend**: React 19, React Router 7, TailwindCSS 4
- **Backend**: Tauri 2, Rust
- **State Management**: Zustand
- **AI API**: Google Gemini API
- **CSV Processing**: PapaParse

## License

MIT License

## Contributing

Pull requests and issue reports are welcome!

## Support

If you encounter any issues, please report them in the GitHub Issues section.

---

Built with ❤️ using Tauri, React, and React Router.
