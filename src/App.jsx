import React, { useState } from "react";

export default function App() {
  const [inputText, setInputText] = useState("");
  const [matches, setMatches] = useState([]);
  const [startWW, setStartWW] = useState(5.0);
  const [playerName, setPlayerName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function estimateDecay(numSpiele) {
    return Math.min(1, 0.82 + 0.0075 * Math.min(numSpiele, 24));
  }

  const parseInput = () => {
    try {
      const cleanText = inputText.replace(/[\u2028\u2029\u200B\u00A0]/g, "\n");
      const lines = cleanText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // Spielername erkennen
      for (let j = 0; j < lines.length - 1; j++) {
        if (/^\([0-9]{3}\.[0-9]{2}\.[0-9]{3}\.0\)$/.test(lines[j + 1])) {
          setPlayerName(`${lines[j]} ${lines[j + 1]}`);
          break;
        }
      }

      // StartWW setzen wenn im Import enthalten
      const wwi = lines.findIndex(l => /^Wettkampfwert$/i.test(l));
      if (
        wwi !== -1 &&
        wwi + 1 < lines.length &&
        /^[\d\.,]+$/.test(lines[wwi + 1])
      ) {
        let wwExtracted = lines[wwi + 1].replace(",", ".");
        setStartWW(parseFloat(wwExtracted));
      }

      // Matches extrahieren (beide Formate)
      const parsed = [];
      let i = 0;
      while (i < lines.length) {
        if (
          i + 5 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 2].replace(",", ".")) &&
          /^([0-9]+[:\-][0-9]+.*|[0-9]+:[0-9]+.*)$/.test(lines[i + 4]) &&
          ["S", "N", "W", "Z"].includes(lines[i + 5])
        ) {
          parsed.push({
            name: lines[i + 1],
            ww: lines[i + 2].replace(",", "."),
            result: lines[i + 5],
            score: lines[i + 4],
            isWalkover: lines[i + 5] === "W" || lines[i + 5] === "Z",
          });
          i += 6;
          continue;
        }
        if (
          i + 6 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 3].replace(",", ".")) &&
          /^([0-9]+[:\-][0-9]+.*|[0-9]+:[0-9]+.*)$/.test(lines[i + 5]) &&
          ["S", "N", "W", "Z"].includes(lines[i + 6])
        ) {
          parsed.push({
            name: lines[i + 2],
            ww: lines[i + 3].replace(",", "."),
            result: lines[i + 6],
            score: lines[i + 5],
            isWalkover: lines[i + 6] === "W" || lines[i + 6] === "Z",
          });
          i += 7;
          continue;
        }
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
    setMatches((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setMatches([]);
    setPlayerName("");
  };

  function calculate() {
    let relevantMatches = matches.filter(
      (m) =>
        m.result === "S" ||
        m.result === "N" ||
        (
          (m.result === "W" || m.result === "Z") &&
          m.score &&
          m.score.length > 1
        )
    );
    let wins = relevantMatches.filter((m) => m.result === "S" || (m.result === "W" && m.score));
    let losses = relevantMatches
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => m.result === "N" || (m.result === "Z" && m.score));

    const numGames = wins.length + losses.length;
    const decay = estimateDecay(numGames);
    const decayedWW = startWW * decay;

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
      (sum, m) => sum + Math.exp(parseFloat(m.ww || 0)),
      0
    );
    const expLosses = losses.reduce(
      (sum, m) => sum + Math.exp(-parseFloat(m.ww || 0)),
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
    if (total >= 10.565) classification = "N4";
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
  }

  const result = calculate();

  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <h2 style={{ fontWeight: "bold", fontSize: 28, textAlign: "center" }}>
        Swisstennis Ranking Rechner
      </h2>
      {playerName && (
        <div style={{ textAlign: "center", fontWeight: 600, color: "#b31c2e", fontSize: 22, marginBottom: 8 }}>
          {playerName}
        </div>
      )}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <button onClick={() => setShowImport((v) => !v)}>
          {showImport ? "Schließen" : "Import"}
        </button>
        {matches.length > 0 && (
          <button onClick={clearAll} style={{ marginLeft: 10, color: "#b31c2e" }}>
            Alle Daten löschen
          </button>
        )}
      </div>
      {showImport && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
            cols={60}
            placeholder="Copy&Paste aus MyTennis"
            style={{ width: "100%" }}
          />
          <div>
            <button onClick={parseInput} style={{ marginTop: 5 }}>Importieren</button>
          </div>
          {errorMessage && <div style={{ color: "red", marginTop: 8 }}>{errorMessage}</div>}
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <b>Start-Wettkampfwert (W₀):</b> <input
          value={startWW}
          onChange={(e) => setStartWW(e.target.value)}
          style={{ width: 60, textAlign: "right" }}
        />
      </div>

      <div style={{
        maxWidth: 700, margin: "0 auto", marginBottom: 24, background: "#f4f4f7", borderRadius: 10, padding: 12
      }}>
        <b>Aktueller berechneter Wettkampfwert:</b> {result.newWW}
        <br />
        <b>Risikozuschlag:</b> {result.risk}
        <br />
        <b>Klassierungswert:</b> {result.total}
        <br />
        <b>Klassierung:</b> {result.classification}
      </div>

      <table style={{
        borderCollapse: "collapse",
        width: "100%",
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 2px 8px #0001",
        margin: "0 auto"
      }}>
        <thead>
          <tr style={{ background: "#ececec" }}>
            <th style={{ padding: 6 }}>Name</th>
            <th style={{ padding: 6 }}>WW Gegner</th>
            <th style={{ padding: 6 }}>Resultat</th>
            <th style={{ padding: 6 }}>Score</th>
            <th style={{ padding: 6 }}>Löschen</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, idx) => (
            <tr key={idx} style={result.gestrichenIdx && result.gestrichenIdx.includes(idx) ? { textDecoration: "line-through", opacity: 0.5 } : {}}>
              <td style={{ padding: 5 }}>{m.name}</td>
              <td style={{ padding: 5 }}>{m.ww}</td>
              <td style={{
                padding: 5,
                color: "#fff",
                textAlign: "center",
                background: m.result === "S" || m.result === "W" ? "#1b60b6" : "#d51a2c",
                borderRadius: 16,
                minWidth: 24
              }}>{m.result}</td>
              <td style={{ padding: 5 }}>{m.score}</td>
              <td style={{ textAlign: "center", cursor: "pointer", color: "#c00", fontSize: 20 }}
                onClick={() => removeMatch(idx)}
                title="Eintrag löschen"
              >×</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
