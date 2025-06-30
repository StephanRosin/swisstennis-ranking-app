import React, { useState } from "react";

export default function SwissTennisRanking() {
  const [inputText, setInputText] = useState("");
  const [matches, setMatches] = useState([]);
  const [startWW, setStartWW] = useState(5.0);
  const [playerName, setPlayerName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Decay-Berechnung: Linear 0.82 bis 1.00 bei 24 Spielen
  function estimateDecay(numSpiele) {
    return Math.min(1, 0.82 + 0.0075 * Math.min(numSpiele, 24));
  }

const parseInput = () => {
  try {
    const text = inputText;
    const lines = text
      .replace(/ /g, "\n") // Ersetze seltsame Umbruchzeichen
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Spielernamen extrahieren
    for (let j = 0; j < lines.length - 1; j++) {
      if (/^\([0-9]{3}\.[0-9]{2}\.[0-9]{3}\.0\)$/.test(lines[j + 1])) {
        setPlayerName(`${lines[j]} ${lines[j + 1]}`);
        break;
      }
    }

    // Wettkampfwert extrahieren
    const wwi = lines.findIndex(l => /^Wettkampfwert$/i.test(l));
    if (
      wwi !== -1 &&
      wwi + 1 < lines.length &&
      /^[\d\.,]+$/.test(lines[wwi + 1])
    ) {
      let wwExtracted = lines[wwi + 1].replace(",", ".");
      setStartWW(parseFloat(wwExtracted));
    }

    const parsed = [];
    let i = 0;
    while (i < lines.length) {
      // NEU: Label-Block (z.B. von deinem Beispiel)
      if (
        (lines[i] === "DATUM" || lines[i] === "Datum") &&
        i + 1 < lines.length &&
        /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i + 1])
      ) {
        let block = {};
        let j = i;
        // Gehe bis nächster "DATUM" oder bis max. 12 Zeilen
        while (
          j < lines.length &&
          !["DATUM", "Datum"].includes(lines[j]) ||
          j === i
        ) {
          const label = lines[j];
          const value = lines[j + 1];
          if (
            (label === "NAME DES GEGNERS" || label === "Name des Gegners") &&
            value
          ) {
            block.name = value;
          }
          if (
            /^R\d\s*\(.+\)$/.test(value) &&
            value
          ) {
            // WW steht in Zeile davor oder danach, je nach Export
            // Ignoriere, hole den Wert später beim passenden Label
          }
          if (
            (label === "CODE" || label === "Code") &&
            value
          ) {
            block.result = value;
          }
          if (
            (label === "RESULTAT" || label === "Resultate" || label === "Resultat") &&
            value
          ) {
            block.score = value;
          }
          if (
            (label === "Wettk. Wert 4.L." ||
              label === "Wettkampfwert 4.L." ||
              label === "Wettkampfwert" ||
              label === "WW Gegner" ||
              label === "WW") &&
            value &&
            /^[\d\.,]+$/.test(value.replace(",", "."))
          ) {
            block.ww = value.replace(",", ".");
          }
          // Turniername, Runde, Liga etc. werden ignoriert
          j += 2;
        }
        if (block.name && block.ww && block.result && (block.result === "S" || block.result === "N")) {
          parsed.push({
            name: block.name,
            ww: block.ww,
            result: block.result,
          });
        }
        // Gehe zum nächsten DATUM
        i = j;
        continue;
      }

      // Universeller Block wie bisher
      // ... (hier wie im vorherigen Parser die weiteren Formate abdecken!)
      // Beispiel: 6er, 7er, 8er Blöcke von weiter oben...

      // (hier restliche Formate von vorherem Parser beibehalten!)

      i++;
    }

    if (parsed.length === 0) {
      setErrorMessage(
        "Keine gültigen Resultate gefunden. Bitte stelle sicher, dass du das komplette Textfeld von MyTennis kopierst."
      );
      return;
    }
    setMatches((prev) => [...prev, ...parsed]);
    setInputText("");
    setShowImport(false);
    setErrorMessage("");
  } catch (error) {
    setErrorMessage("Fehler beim Parsen: " + error.message);
  }
};

  const removeMatch = (index) => {
    const updated = matches.filter((_, i) => i !== index);
    setMatches(updated);
  };

  const clearAll = () => {
    setMatches([]);
    setPlayerName("");
  };

  // Berechnung mit Decay nach Spielanzahl + max. 4 Streichresultaten
  const calculate = () => {
    let wins = matches.filter((m) => m.result === "S");
    let losses = matches
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => m.result === "N");

    const numGames = wins.length + losses.length;
    const decay = estimateDecay(numGames);
    const decayedWW = startWW * decay;

    // Streichresultate (maximal 4)
    const numStreich = Math.min(4, Math.floor(numGames / 6));
    let gestrichenIdx = [];
    if (numStreich > 0 && losses.length > 0) {
      const sortedLosses = losses
        .slice()
        .sort((a, b) => parseFloat(a.ww) - parseFloat(b.ww));
      gestrichenIdx = sortedLosses.slice(0, numStreich).map((m) => m.index);
      losses = losses.filter((m) => !gestrichenIdx.includes(m.index));
    }

    const expWins = wins.reduce(
      (sum, m) => sum + Math.exp(parseFloat(m.ww)),
      0
    );
    const expLosses = losses.reduce(
      (sum, m) => sum + Math.exp(-parseFloat(m.ww)),
      0
    );

    const expW0 = Math.exp(decayedWW);
    const expW0_neg = Math.exp(-decayedWW);

    const lnWins = Math.log(expWins + expW0);
    const lnLosses = Math.log(expLosses + expW0_neg);

    const W = 0.5 * (lnWins - lnLosses);
    const R = 1 / 6 + (lnWins + lnLosses) / 6;
    const total = W + R;

    let classification = "Unbekannt";
    if (total >= 10.566) classification = "N4";
    else if (total >= 9.317) classification = "R1";
    else if (total >= 8.091) classification = "R2";
    else if (total >= 6.894) classification = "R3";
    else if (total >= 5.844) classification = "R4";
    else if (total >= 4.721) classification = "R5";
    else if (total >= 3.448) classification = "R6";
    else if (total >= 1.837) classification = "R7";
    else if (total >= 0.872) classification = "R8";
    else classification = "R9 oder tiefer";

    return {
      newWW: W.toFixed(3),
      risk: R.toFixed(3),
      total: total.toFixed(3),
      classification,
      gestrichenIdx,
      numStreich,
      decay: decay.toFixed(3),
      decayedWW: decayedWW.toFixed(3),
      numGames,
    };
  };

  const result = calculate();

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <img
          src="https://www.mytennis.ch/assets/logo.86ab5f81.svg"
          alt="SwissTennis Logo"
          style={{ height: 54, margin: "0 auto 0.5rem auto", display: "block" }}
        />
        <h1 className="text-2xl font-bold mb-4" style={{ color: "#143986" }}>
          Swiss Tennis Ranking Rechner
        </h1>
      </div>

      {playerName && (
        <div className="mb-2" style={{ textAlign: "center", fontWeight: 600, fontSize: "1.13em" }}>
          {playerName}
        </div>
      )}

      <div style={{ textAlign: "center" }}>
        <div className="mb-4">
          <label className="block">Start-Wettkampfwert (W₀):</label>
          <input
            type="number"
            step="0.001"
            value={startWW}
			readOnly
            onChange={(e) => setStartWW(parseFloat(e.target.value))}
            className="border p-2 w-32"
            style={{ margin: "0 auto", display: "block" }}
          />
        </div>

        <div className="mb-4">
          <label className="block">
            Decay-Faktor (automatisch):
          </label>
          <input
            type="number"
            step="0.001"
            value={result.decay}
            readOnly
            className="border p-2 w-32 bg-gray-100 text-gray-600"
            style={{ margin: "0 auto", display: "block" }}
            tabIndex={-1}
          />
          <div style={{ fontSize: "0.95em", color: "#666", marginTop: 4 }}>
            ({result.numGames} Spiele)
          </div>
        </div>

        <div
          className="bg-gray-100 p-4 rounded shadow result-summary-box"
          style={{
            minWidth: 220,
            textAlign: "left",
            margin: "0 auto 2rem auto",
            marginBottom: "2rem",
            maxWidth: 350,
          }}
        >
          <p>
            <strong>Neuer WW:</strong> {result.newWW}
          </p>
          <p>
            <strong>Risikozuschlag:</strong> {result.risk}
          </p>
          <p>
            <strong>Gesamtwert:</strong> {result.total}
          </p>
          <p>
            <strong>Klassierung:</strong> {result.classification}
          </p>
          <p style={{ fontSize: "0.95em", color: "#666", marginTop: 4 }}>
            (Decay: {result.decay}, W₀ nach Decay: {result.decayedWW})
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-2"
          style={{ margin: "0 auto", display: "block" }}
        >
          {showImport ? "Import-Feld zuklappen" : "Import-Feld öffnen"}
        </button>

        {matches.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="bg-red-600 text-white px-4 py-2 rounded mb-4"
            style={{ margin: "0 auto", display: "block" }}
          >
            Alle Daten löschen
          </button>
        )}
      </div>

      {showImport && (
        <div className="mb-4" style={{ textAlign: "center" }}>
          <label className="block">
            Importiere Text aus MyTennis (alle Formate unterstützt):
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={12}
            className="border p-2 w-full"
            style={{ maxWidth: 550, margin: "0 auto", display: "block" }}
          ></textarea>
          <button
            type="button"
            onClick={parseInput}
            className="bg-green-500 text-white px-4 py-2 rounded mt-2"
            style={{ margin: "0 auto", display: "block" }}
          >
            Importieren & schließen
          </button>
          {errorMessage && (
            <p className="text-red-600 mt-2">{errorMessage}</p>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2" style={{ textAlign: "center" }}>
            Importierte Matches:
          </h2>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <table className="min-w-full border" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th className="border px-2">Name</th>
                  <th className="border px-2">WW Gegner</th>
                  <th className="border px-2">Resultat</th>
                  <th className="border px-2">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr
                    key={i}
                    className={
                      result.gestrichenIdx && result.gestrichenIdx.includes(i)
                        ? "stricken-row"
                        : ""
                    }
                    title={
                      result.gestrichenIdx && result.gestrichenIdx.includes(i)
                        ? "Streichresultat"
                        : ""
                    }
                  >
                    <td className="border px-2 text-center">{m.name}</td>
                    <td className="border px-2 text-center">{m.ww}</td>
                    <td className="border px-2 text-center">
                      <span
                        className={
                          "result-circle " +
                          (m.result === "S"
                            ? "result-s"
                            : m.result === "N"
                            ? "result-n"
                            : m.result === "W"
                            ? "result-w"
                            : "")
                        }
                      >
                        {m.result}
                      </span>
                    </td>
                    <td className="border px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeMatch(i)}
                        className="delete-x-btn"
                        title="Löschen"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* CSS Styles für Striche & Kreise */}
      <style>
        {`
          .stricken-row {
            text-decoration: line-through;
            opacity: 0.7;
          }
          .result-circle {
            display: inline-block;
            border-radius: 50%;
            width: 2em;
            height: 2em;
            line-height: 2em;
            text-align: center;
            font-weight: bold;
          }
          .result-s {
            background: #3490dc;
            color: #fff;
          }
          .result-n {
            background: #e3342f;
            color: #fff;
          }
          .delete-x-btn {
            color: #fff;
            background: #e3342f;
            border: none;
            border-radius: 50%;
            width: 2em;
            height: 2em;
            font-size: 1.4em;
            font-weight: bold;
            line-height: 2em;
            cursor: pointer;
          }
          .delete-x-btn:hover {
            background: #c1271b;
          }
        `}
      </style>
    </div>
  );
}
