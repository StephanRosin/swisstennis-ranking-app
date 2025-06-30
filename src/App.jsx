import React, { useState } from "react";

export default function SwissTennisRanking() {
  const [inputText, setInputText] = useState("");
  const [matches, setMatches] = useState([]);
  const [startWW, setStartWW] = useState(5.0);
  const [decayFactor, setDecayFactor] = useState(0.9);
  const [showImport, setShowImport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const parseInput = () => {
    try {
      const lines = inputText.trim().split(/\n+/);
      const parsed = [];

      for (let i = 0; i < lines.length; i++) {
        let name = "Unbekannt";
        let wwLine = null;
        let resultLine = null;

        for (let j = i; j < lines.length; j++) {
          if (/^[0-9]+\.[0-9]+$/.test(lines[j].trim())) {
            wwLine = lines[j].trim();
            name = lines[j - 1]?.trim() || "Unbekannt";

            for (let k = j + 1; k < lines.length; k++) {
              if (lines[k].trim() === "S" || lines[k].trim() === "N" || lines[k].trim() === "W") {
                resultLine = lines[k].trim() === "W" ? "S" : lines[k].trim();
                i = k;
                break;
              }
            }
            break;
          }
        }

        if (wwLine && resultLine) {
          parsed.push({ name, ww: wwLine, result: resultLine });
        }
      }

      if (parsed.length === 0) {
        setErrorMessage("Keine gültigen WW/Resultat-Paare gefunden. Bitte überprüfe das Format.");
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

  const calculate = () => {
    const expWins = matches
      .filter((m) => m.result === "S")
      .reduce((sum, m) => sum + Math.exp(parseFloat(m.ww) * decayFactor), 0);

    const expLosses = matches
      .filter((m) => m.result === "N")
      .reduce((sum, m) => sum + Math.exp(-parseFloat(m.ww) * decayFactor), 0);

    const expW0 = Math.exp(startWW);
    const expW0Neg = Math.exp(-startWW);

    const lnWins = Math.log(expWins + expW0);
    const lnLosses = Math.log(expLosses + expW0Neg);

    const newWW = 0.5 * (lnWins - lnLosses);

    const risk = 1 / 6 + (lnWins + lnLosses) / 6;

    const total = newWW + risk;

    let classification = "Unbekannt";
    if (total >= 5.844) classification = "R4";
    else if (total >= 4.721) classification = "R5";
    else if (total >= 3.448) classification = "R6";
    else if (total >= 1.837) classification = "R7";
    else classification = "R8 oder tiefer";

    return { newWW: newWW.toFixed(3), risk: risk.toFixed(3), total: total.toFixed(3), classification };
  };

  const result = calculate();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Swiss Tennis Ranking Rechner</h1>

      <div className="mb-4">
        <label className="block">Start-Wettkampfwert (W₀):</label>
        <input
          type="number"
          step="0.001"
          value={startWW}
          onChange={(e) => setStartWW(parseFloat(e.target.value))}
          className="border p-2 w-32"
        />
      </div>

      <div className="mb-4">
        <label className="block">Ranking Decay Faktor (Standard: 0.9):</label>
        <input
          type="number"
          step="0.01"
          value={decayFactor}
          onChange={(e) => setDecayFactor(parseFloat(e.target.value))}
          className="border p-2 w-32"
        />
      </div>

      <button
        onClick={() => setShowImport(!showImport)}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {showImport ? "Import-Feld zuklappen" : "Import-Feld öffnen"}
      </button>

      {showImport && (
        <div className="mb-4">
          <label className="block">Importiere Text aus MyTennis (beide Formate unterstützt):</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={12}
            className="border p-2 w-full"
          ></textarea>
          <button
            onClick={parseInput}
            className="bg-green-500 text-white px-4 py-2 rounded mt-2"
          >
            Importieren & schließen
          </button>
          {errorMessage && <p className="text-red-600 mt-2">{errorMessage}</p>}
        </div>
      )}

      {matches.length > 0 && (
        <div className="mb-4">
          <button
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
                <tr key={i}>
                  <td className="border px-2 text-center">{m.name}</td>
                  <td className="border px-2 text-center">{m.ww}</td>
                  <td className="border px-2 text-center">{m.result}</td>
                  <td className="border px-2 text-center">
                    <button
                      onClick={() => removeMatch(i)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded shadow">
        <p><strong>Neuer WW:</strong> {result.newWW}</p>
        <p><strong>Risikozuschlag:</strong> {result.risk}</p>
        <p><strong>Gesamtwert:</strong> {result.total}</p>
        <p><strong>Aktuelle Klassierung:</strong> {result.classification}</p>
      </div>
    </div>
  );
}
