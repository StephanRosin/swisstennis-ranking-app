import React, { useState } from "react";

export default function SwissTennisRanking() {
  const [inputText, setInputText] = useState("");
  const [matches, setMatches] = useState([]);
  const [startWW, setStartWW] = useState(5.0);
  const [playerName, setPlayerName] = useState("");
  const [playerInfo, setPlayerInfo] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const infoLabels = [
    "Club",
    "Alterskat.",
    "Lizenz-Status",
    "Interclub Status",
    "Klassierung",
    "Klassierungswert",
    "Wettkampfwert",
    "Risikozuschlag",
    "Anzahl Spiele",
    "Anzahl/Abzug w.o.",
    "Letzte Klassierung",
    "Beste Klassierung seit 2004",
  ];

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

      // Spielerinfos extrahieren
      const info = {};
      lines.forEach((line, i) => {
        infoLabels.forEach(label => {
          if (line.startsWith(label)) {
            // alles nach dem Label (inkl. evtl. Doppelpunkt) extrahieren
            info[label] = line.replace(label, "").replace(/^[:\s]*/, "");
            // Speziell: Wenn Wert fehlt, evtl. auf nächster Zeile
            if (!info[label] && lines[i + 1]) info[label] = lines[i + 1].trim();
          }
        });
      });
      if (Object.keys(info).length > 0) setPlayerInfo(info);

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

      // Matches extrahieren (unverändert)
      const parsed = [];
      let i = 0;
      while (i < lines.length) {
        if (
          (lines[i].toUpperCase() === "DATUM") &&
          i + 1 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i + 1])
        ) {
          let block = {};
          let j = i;
          let step = 0;
          while (
            j < lines.length &&
            (!["DATUM", "Datum"].includes(lines[j]) || j === i)
          ) {
            const label = lines[j].toUpperCase();
            const value = lines[j + 1];
            if (
              label === "NAME DES GEGNERS" &&
              value
            ) {
              block.name = value;
            }
            if (
              (label === "WETTK. WERT 4.L." ||
                label === "WETTKAMPFWERT 4.L." ||
                label === "WETTKAMPFWERT" ||
                label === "WW GEGNER" ||
                label === "WW") &&
              value &&
              /^[\d\.,]+$/.test(value.replace(",", "."))
            ) {
              block.ww = value.replace(",", ".");
            }
            if (
              (label === "CODE") &&
              value
            ) {
              block.result = value;
            }
            if (
              (label === "RESULTAT" || label === "RESULTATE") &&
              value
            ) {
              block.score = value;
            }
            j += 2;
            step++;
            if (step > 12) break;
          }
          if (
            block.name &&
            (block.result === "S" || block.result === "N" || block.result === "W" || block.result === "Z")
          ) {
            parsed.push({
              name: block.name,
              ww: block.ww || "",
              result: block.result,
              score: block.score || "",
              isWalkover: block.result === "W" || block.result === "Z",
            });
          }
          i = j;
          continue;
        }
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
        if (
          i + 7 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 4].replace(",", ".")) &&
          ["S", "N", "W", "Z"].includes(lines[i + 7])
        ) {
          parsed.push({
            name: lines[i + 3],
            ww: lines[i + 4].replace(",", "."),
            result: lines[i + 7],
            score: lines[i + 5],
            isWalkover: lines[i + 7] === "W" || lines[i + 7] === "Z",
          });
          i += 8;
          continue;
        }
        if (
          i + 6 < lines.length &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(lines[i]) &&
          /^[\d\.,]+$/.test(lines[i + 3].replace(",", ".")) &&
          ["S", "N", "W", "Z"].includes(lines[i + 6])
        ) {
          parsed.push({
            name: lines[i + 2],
            ww: lines[i + 3].replace(",", "."),
            result: lines[i + 6],
            score: lines[i + 4],
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
    const updated = matches.filter((_, i) => i !== index);
    setMatches(updated);
  };

  const clearAll = () => {
    setMatches([]);
    setPlayerName("");
    setPlayerInfo({});
  };

  // Für die Berechnung werden NUR Matches gewertet, die bewertet werden sollen
  const calculate = () => {
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
        <div className="player-name-main" style={{ textAlign: "center" }}>
          {playerName}
        </div>
      )}

      {playerInfo && Object.keys(playerInfo).length > 0 && (
        <div
          style={{
            maxWidth: 420,
            margin: "0 auto 1.2em auto",
            fontSize: "1em",
            background: "#f7f9fc",
            borderRadius: 8,
            padding: "10px 18px",
            color: "#14214a",
            boxShadow: "0 2px 6px #0001",
          }}
        >
          <table style={{ width: "100%" }}>
            <tbody>
              {infoLabels.map(label =>
                playerInfo[label] ? (
                  <tr key={label}>
                    <td style={{ fontWeight: "bold", width: "54%" }}>{label}:</td>
                    <td>{playerInfo[label]}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
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
      </div>

      {/* BUTTONS: IMMER SICHTBAR */}
      <div className="btn-row" style={{ marginBottom: 18, textAlign: "center" }}>
        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {showImport ? "Import-Feld zuklappen" : "Import-Feld öffnen"}
        </button>
        {matches.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="bg-red-600 text-white px-4 py-2 rounded"
            style={{ marginLeft: 14 }}
          >
            Alle Daten löschen
          </button>
        )}
      </div>

      {matches.length > 0 && (
        <div>
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
                {matches.map((m, i) => {
                  // Walkover ohne Score: wird angezeigt, aber nicht bewertet
                  const isUnratedWalkover = (m.result === "W" || m.result === "Z") && (!m.score || m.score.length < 2);
                  return (
                    <tr
                      key={i}
                      className={
                        isUnratedWalkover
                          ? "row-unrated"
                          : result.gestrichenIdx && result.gestrichenIdx.includes(i)
                          ? "stricken-row"
                          : ""
                      }
                      title={
                        isUnratedWalkover
                          ? "Walkover nicht gewertet"
                          : result.gestrichenIdx && result.gestrichenIdx.includes(i)
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
                            ((m.result === "S" || m.result === "W")
                              ? "result-s"
                              : (m.result === "N" || m.result === "Z")
                              ? "result-n"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      <style>
        {`
          .player-name-main {
            font-size: 1.65em;
            font-weight: bold;
            margin-bottom: 0.8em;
            color: #123370;
            letter-spacing: 0.01em;
          }
          .btn-row { margin-bottom: 18px; }
          .stricken-row {
            text-decoration: line-through;
            opacity: 0.7;
          }
          .row-unrated {
            background: #f0f0f0;
            color: #888 !important;
            font-style: italic;
            opacity: 0.75;
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
          .result-s { background: #3490dc; color: #fff; } /* Blau */
          .result-n { background: #e3342f; color: #fff; } /* Rot */
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
