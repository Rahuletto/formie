# Autofillr

A Chrome extension that uses AI to automatically fill out Google Forms

## Features

- Detects forms automatically on Google Forms and Microsoft Forms
- Extracts form structure, questions, and answer options
- Uses Google's Gemini AI to intelligently answer form questions
- Automatically fills out the form with AI-generated answers
- Skips personal questions that should be answered by the user
- Shows a preview of AI-generated answers before filling

## Installation

1. Clone this repository
2. Install dependencies with `npm install` or `yarn install`
3. Create a `.env` file in the root directory with your Google API key:
   ```
   PLASMO_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
   ```
4. Build the extension with `npm run build` or `yarn build`
5. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` directory

## Usage

1. Navigate to any Google Form or Microsoft Form
2. Click on the Autofillr extension icon
3. The extension will automatically extract the form structure
4. Click "Autofill" to generate and fill answers
5. Review the AI-generated answers in the extension popup
6. If needed, click "Refill" to regenerate answers

## Development

This extension is built with:

- [Plasmo](https://www.plasmo.com/) - Browser extension framework
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Google AI SDK](https://ai.google.dev/) - AI integration with Gemini

To start development:

```bash
npm run dev
# or
yarn dev
```

## Project Structure

- `popup.tsx` - Main extension popup
- `lib/ai.ts` - AI integration with Gemini
- `lib/formFiller.ts` - Form filling functionality
- `lib/env.ts` - Environment configuration

## License

MIT

## Credits

Built with:

- [Plasmo](https://www.plasmo.com/) - Browser Extension Framework
- [React](https://reactjs.org/) - UI Library
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Gemini 2.5](https://ai.google.dev/) - AI model for generating responses
- [AI SDK](https://github.com/vercel/ai) - AI integration toolkit
