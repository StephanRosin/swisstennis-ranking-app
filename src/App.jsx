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

      // === NEU: Robuste Spielerinfos-Extraktion ===
      let info = {};
      let infoBlockStart = lines.findIndex(line =>
        line.startsWith("Club") ||
        line.startsWith("Verein") ||
        line.startsWith("Lizenz-Status")
      );
      let infoBlockEnd = lines.findIndex(
        (line, i) => i > infoBlockStart && line.toLowerCase().includes("resultate")
      );
      let infoBlockLines =
        infoBlockStart !== -1 && infoBlockEnd !== -1
          ? lines.slice(infoBlockStart, infoBlockEnd)
          : [];

      infoLabels.forEach(label => {
        let idx = infoBlockLines.findIndex(line => line.startsWith(label));
        if (idx !== -1) {
          // Wert ist entweder hinter dem Label oder in der nächsten Zeile
          let val = infoBlockLines[idx].replace(label, "").replace(/^[:\s]*/, "");
          if (!val && infoBlockLines[idx + 1]) val = infoBlockLines[idx + 1].trim();
          info[label] = val;
        }
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

      // Matches extrahieren (wie gehabt)
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

      {/* Spielername und Info-Box im MyTennis.ch Stil */}
      {playerName && (
        <div className="player-header-box">
          <span className="player-header">{playerName}</span>
          <span className="player-header-icon">🎾</span>
        </div>
      )}
      {playerInfo && Object.keys(playerInfo).length > 0 && (
        <div className="player-info-box">
          <div className="player-info-row">
            <div>
              <span className="player-info-label">Club</span><br />
              <span className="player-info-value">{playerInfo["Club"]}</span>
            </div>
            <div>
              <span className="player-info-label">Alterskat.</span><br />
              <span className="player-info-value">{playerInfo["Alterskat."]}</span>
            </div>
            <div>
              <span className="player-info-label">Lizenz-Status</span><br />
              <span className="player-info-value">{playerInfo["Lizenz-Status"]}</span>
            </div>
            <div>
              <span className="player-info-label">Interclub Status</span><br />
              <span className="player-info-value">{playerInfo["Interclub Status"]}</span>
            </div>
            <div>
              <span className="player-info-label">Klassierung</span><br />
              <span className="player-info-value">{playerInfo["Klassierung"]}</span>
            </div>
            <div>
              <span className="player-info-label">Klassierungswert</span><br />
              <span className="player-info-value">{playerInfo["Klassierungswert"]}</span>
            </div>
          </div>
          <div className="player-info-row">
            <div>
              <span className="player-info-label">Wettkampfwert</span><br />
              <span className="player-info-value">{playerInfo["Wettkampfwert"]}</span>
            </div>
            <div>
              <span className="player-info-label">Risikozuschlag</span><br />
              <span className="player-info-value">{playerInfo["Risikozuschlag"]}</span>
            </div>
            <div>
              <span className="player-info-label">Anzahl Spiele</span><br />
              <span className="player-info-value">{playerInfo["Anzahl Spiele"]}</span>
            </div>
            <div>
              <span className="player-info-label">Anzahl/Abzug w.o.</span><br />
              <span className="player-info-value">{playerInfo["Anzahl/Abzug w.o."]}</span>
            </div>
            <div>
              <span className="player-info-label">Letzte Klassierung</span><br />
              <span className="player-info-value">{playerInfo["Letzte Klassierung"]}</span>
            </div>
            <div>
              <span className="player-info-label">Beste Klassierung seit 2004</span><br />
              <span className="player-info-value">{playerInfo["Beste Klassierung seit 2004"]}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- Rest deiner App (Import-Button, Tabelle etc.) bleibt unverändert --- */}
      {/* ... */}

      <style>
        {`
          .player-header-box {
            background: #fff;
            border-radius: 10px;
            padding: 20px 25px 14px 25px;
            margin-bottom: 8px;
            box-shadow: 0 2px 8px #0001;
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: flex-start;
          }
          .player-header {
            font-size: 2.2em;
            color: #c8002a;
            font-weight: bold;
            letter-spacing: 0.02em;
          }
          .player-header-icon {
            font-size: 1.3em;
            color: #d2a632;
            margin-left: 0.5em;
            filter: drop-shadow(0 0 1px #d2a63288);
          }
          .player-info-box {
            background: #f8fbfd;
            border-radius: 10px;
            box-shadow: 0 2px 8px #0001;
            padding: 22px 18px 18px 18px;
            margin-bottom: 16px;
            margin-top: 0px;
          }
          .player-info-row {
            display: flex;
            flex-direction: row;
            gap: 36px;
            justify-content: flex-start;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }
          .player-info-row:last-child {
            margin-bottom: 0;
          }
          .player-info-label {
            color: #002c53;
            font-weight: 500;
            font-size: 1em;
            letter-spacing: 0.01em;
          }
          .player-info-value {
            color: #053362;
            font-size: 1em;
            font-weight: 400;
            letter-spacing: 0.01em;
            white-space: nowrap;
          }
        `}
      </style>
    </div>
  );
}
