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

      for (let j = 0; j < lines.length - 1; j++) {
        if (/^\([0-9]{3}\.[0-9]{2}\.[0-9]{3}\.0\)$/.test(lines[j + 1])) {
          setPlayerName(`${lines[j]} ${lines[j + 1]}`);
          break;
        }
      }

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
          let val = infoBlockLines[idx].replace(label, "").replace(/^[:\s]*/, "");
          if (!val && infoBlockLines[idx + 1]) val = infoBlockLines[idx + 1].trim();
          info[label] = val;
        }
      });
      if (Object.keys(info).length > 0) setPlayerInfo(info);

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
            if (label === "NAME DES GEGNERS" && value) block.name = value;
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
            if (label === "CODE" && value) block.result = value;
            if ((label === "RESULTAT" || label === "RESULTATE") && value) block.score = value;
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

  return (
    <div className="p-4 max-w-2xl mx-auto">
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
    </div>
  );
}
