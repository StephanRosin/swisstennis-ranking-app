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

  // Universeller MyTennis-Parser für alle Blocktypen inkl. Spielername & WW
  const parseInput = () => {
    try {
      const text = inputText;
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // Spielernamen extrahieren (Name gefolgt von Lizenznummer in Klammern)
      for (let j = 0; j < lines.length - 1; j++) {
        if (/^\([0-9]{3}\.[0-9]{2}\.[0-9]{3}\.0\)$/.test(lines[j + 1])) {
          setPlayerName(`${lines[j]} ${lines[j + 1]}`);
          break;
        }
      }

      // Wettkampfwert extrahieren (z.B. "Wettkampfwert" gefolgt von Zahl)
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
        // Universeller Block: Datum, Name, WW, [optional Info], Ergebnis, Code
        if (
          i + 5 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 2].replace(",", ".")) &&
          /^([0-9]+[:\-][0-9]+.*|[0-9]+:[0-9]+.*)$/.test(lines[i + 4]) &&
          ["S", "N", "W", "Z"].includes(lines[i + 5])
        ) {
          const code = lines[i + 5];
          if (code === "S" || code === "N") {
            parsed.push({
              name: lines[i + 1],
              ww: lines[i + 2].replace(",", "."),
              result: code,
            });
          }
          i += 6;
          continue;
        }

        // Alternativer Block: Datum, Turnier, Name, WW, Klassierung, Ergebnis, Code
        if (
          i + 6 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 3].replace(",", ".")) &&
          /^([0-9]+[:\-][0-9]+.*|[0-9]+:[0-9]+.*)$/.test(lines[i + 5]) &&
          ["S", "N", "W", "Z"].includes(lines[i + 6])
        ) {
          const code = lines[i + 6];
          if (code === "S" || code === "N") {
            parsed.push({
              name: lines[i + 2],
              ww: lines[i + 3].replace(",", "."),
              result: code,
            });
          }
          i += 7;
          continue;
        }

        // Für Interclub/Turnier wie gehabt
        if (
          i + 7 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 4].replace(",", ".")) &&
          ["S", "N", "W", "Z"].includes(lines[i + 7])
        ) {
          const code = lines[i + 7];
          if (code === "S" || code === "N") {
            parsed.push({
              name: lines[i + 3],
              ww: lines[i + 4].replace(",", "."),
              result: code,
            });
          }
          i += 8;
          continue;
        }

        // Für Turnier (7 Zeilen)
        if (
          i + 6 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 3].replace(",", ".")) &&
          ["S", "N", "W", "Z"].includes(lines[i + 6])
        ) {
          const code = lines[i + 6];
          if (code === "S" || code === "N") {
            parsed.push({
              name: lines[i + 2],
              ww: lines[i + 3].replace(",", "."),
              result: code,
            });
          }
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
