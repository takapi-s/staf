# GeminiScope

A desktop application that leverages Google Gemini AI to process CSV files.

## Features

- 🚀 **High Performance**: Efficiently process large CSV files
- 🤖 **AI-Powered**: Advanced data transformation and analysis using Google Gemini AI
- 📊 **Flexible Configuration**: Customizable prompts and output columns
- 📝 **Template Management**: Save frequently used settings as templates
- 💾 **Easy Export**: Export processed results in CSV format
- 🎨 **Modern UI**: Beautiful interface built with TailwindCSS

## Requirements

- Windows 10/11
- Google Gemini API key

## Quick Start

1. Launch the application
2. Click the settings icon (⚙️)
3. Enter your Google Gemini API key
4. Select a CSV file
5. Edit the prompt (e.g., "Convert product names to uppercase")
6. Click the "Start Processing" button
7. Export the results as CSV when complete

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

1. **Set up Google Gemini API Key**
   - Enter your API key in the settings dialog

2. **Load CSV File**
   - Click "Select File" to choose a CSV file

3. **Configure Processing**
   - Edit the prompt (describe the required transformation)
   - Specify output columns
   - Adjust parallel processing count (default: 1)

4. **Execute Processing**
   - Click "Start Processing" button
   - Monitor progress in real-time

5. **Export Results**
   - After processing is complete, save results via "Export CSV"

## Project Structure

```
geminiscope/
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
