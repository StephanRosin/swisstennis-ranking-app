# SwissTennis Ranking App

[![Release](https://img.shields.io/github/v/release/StephanRosin/swisstennis-ranking-app)](https://github.com/StephanRosin/swisstennis-ranking-app/releases/latest)

SwissTennis Ranking App is a web application that fetches your current SwissTennis ranking data and projects your next monthly ranking based on recent match results and points decay. Stay informed about your potential movement in the standings before official updates!

## Features

* 📈 **Next-Month Projection**: Calculates estimated ranking for the upcoming month.
* 🔄 **Automatic Data Fetch**: Retrieves current points and match results from the SwissTennis API.
* ⚙️ **Configurable Parameters**: Adjust projection window, decay rates, and weightings.
* 🌐 **Responsive UI**: Works on desktop and mobile browsers.

## Demo

Try the live web app [here](https://cheerful-manatee-49b75a.netlify.app/)

## Requirements

* **Node.js** 16.x or later
* **npm** or **yarn**
* A valid **SwissTennis API key** (free to register on the SwissTennis developer portal)

## Installation

1. Go to the [Release page](https://github.com/StephanRosin/swisstennis-ranking-app/releases/latest) and download the **swisstennis-ranking-app.zip**.
2. Extract the archive.
3. Copy the contents into your web server’s document root (e.g., `/var/www/html/swisstennis-ranking-app`).
4. Create a `.env` file in the root folder with your SwissTennis API key:

   ```ini
   REACT_APP_API_KEY=your_api_key_here
   ```
5. Serve the files with your preferred static server (e.g., nginx, Apache).

## Development Setup

For local development or contributing:

1. Clone the repository:

   ```bash
   git clone https://github.com/StephanRosin/swisstennis-ranking-app.git
   cd swisstennis-ranking-app
   ```
2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```
3. Copy `.env.example` to `.env` and set your API key.
4. Start the development server:

   ```bash
   npm start
   # or
   yarn start
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

The app supports customizing the projection logic via the `.env` or `settings.json`:

```json
{
  "decayRate": 0.85,
  "lookbackMonths": 4,
  "weighting": {
    "recent": 0.6,
    "older": 0.4
  }
}
```

* **decayRate**: Points retention percentage per month (default: 0.85).
* **lookbackMonths**: Number of past months to consider in the projection (default: 4).
* **weighting**: How to weight recent vs. older months.

## Usage

1. Go to a mytennis player profile page, f.e. https://www.mytennis.ch/de/spieler/19799802
2. Copy the whole page (CTRL+A CTRL+C).
3. Open the Textfield on the site with "Import Feld öffnen"
4. Paste the whole content in the the textfield (CTRL+V)
5. Click "Importieren & Schließen)
6. View your current ranking, projected next ranking, and detailed matches.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create your feature branch:

   ```bash
   git checkout -b feature/MyFeature
   ```
3. Commit your changes:

   ```bash
   git commit -m "Add MyFeature"
   ```
4. Push to the branch:

   ```bash
   git push origin feature/MyFeature
   ```
5. Open a Pull Request on GitHub.

Include clear descriptions and screenshots if applicable.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

*Stay ahead of the game with SwissTennis Ranking App!*
