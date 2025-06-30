import React, { useState } from "react";

export default function SwissTennisRanking() {
  const [inputText, setInputText] = useState("");
  const [matches, setMatches] = useState([]);
  const [startWW, setStartWW] = useState(5.0);
  const [showImport, setShowImport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Decay-Berechnung: Linear 0.82 bis 1.00 bei 24 Spielen
  function estimateDecay(numSpiele) {
    return Math.min(1, 0.82 + 0.0075 * Math.min(numSpiele, 24));
  }

  // Parser für beide Formate + Walkover
  const parseInput = () => {
    try {
      const lines = inputText.trim().split(/\n+/);
      const parsed = [];
      let i = 0;
      while (i < lines.length) {
        // Turnier-Format (7 Zeilen-Block)
        if (
          i + 6 < lines.length &&
          /^[0-9]{2}\.[0-9]{2}\.20[0-9]{2}$/.test(lines[i].trim()) &&
          /^[0-9]+\.[0-9]+$/.test(lines[i + 3].trim()) &&
          ["S", "N", "W"].includes(lines[i + 6].trim())
        ) {
          parsed.push({
            name: lines[i + 2].trim(),
            ww: lines[i + 3].trim(),
            result: lines[i + 6].trim(),
          });
          i += 7;
          continue;
        }
        // Interclub-Format (8 Zeilen-Block)
        if (
          i + 7 < lines.length &&
          /^[0-9]{2}\.[0-9]{2}\.20[0-9]{2}$/.test(lines[i].trim()) &&
          /^[0-9]+\.[0-9]+$/.test(lines[i + 4].trim()) &&
          ["S", "N", "W"].includes(lines[i + 7].trim())
        ) {
          parsed.push({
            name: lines[i + 3].trim(),
            ww: lines[i + 4].trim(),
            result: lines[i + 7].trim(),
          });
          i += 8;
          continue;
        }
        // Generisch
        if (/^[0-9]+\.[0-9]+$/.test(lines[i].trim())) {
          const wwLine = lines[i].trim();
          const name = (i > 0 ? lines[i - 1].trim() : "Unbekannt");
          let resultLine = null;
          for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
            if (["S", "N", "W"].includes(lines[j].trim())) {
              resultLine = lines[j].trim();
              i = j;
              break;
            }
          }
          if (wwLine && resultLine) {
            parsed.push({ name, ww: wwLine, result: resultLine });
          }
        }
        i++;
      }
      if (parsed.length === 0) {
        setErrorMessage(
          "Keine gültigen WW/Resultat-Paare gefunden. Bitte überprüfe das Format."
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
  };

  // Berechnung mit Decay nach Spielanzahl + Streichresultaten
  const calculate = () => {
    let wins = matches.filter((m) => m.result === "S");
    let losses = matches
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => m.result === "N");

    // Nur echte Spiele zählen
    const numGames = wins.length + losses.length;
    const decay = estimateDecay(numGames);
    const decayedWW = startWW * decay;

    // Streichresultate
    const numStreich = Math.floor(numGames / 6);
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

      <div style={{ textAlign: "center" }}>
        <div className="mb-4">
          <label className="block">Start-Wettkampfwert (W₀):</label>
          <input
            type="number"
            step="0.001"
            value={startWW}
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

        {/* Ergebnisbox unter den Feldern */}
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
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
          style={{ margin: "0 auto", display: "block" }}
        >
          {showImport ? "Import-Feld zuklappen" : "Import-Feld öffnen"}
        </button>
      </div>

      {showImport && (
        <div className="mb-4" style={{ textAlign: "center" }}>
          <label className="block">
            Importiere Text aus MyTennis (beide Formate unterstützt):
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
          <button
            type="button"
            onClick={clearAll}
            className="bg-red-600 text-white px-4 py-2 rounded mb-2"
          >
            Alle Daten löschen
          </button>

          <h2 className="text-lg font-semibold mb-2">Importierte Matches:</h2>
          <table className="min-w-full border">
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
      )}
    </div>
  );
}
