import React, { useState } from "react";
import { detectGenderAndClassByRang } from "./utils";
import ratingConfig from "./ratingConfig.json";
export default function SwissTennisRanking() {
  const [inputText, setInputText] = useState("");
  const [matches, setMatches] = useState([]);
  const [startWW, setStartWW] = useState(5.0);
  const [playerName, setPlayerName] = useState("");
  const [playerInfo, setPlayerInfo] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gender, setGender] = useState(null);

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
	  function getNextLowerClassName(gender, currentClassName) {
	  const boundaries = Object.keys(ratingConfig.classBoundaries[gender] || {});
	  const idx = boundaries.indexOf(currentClassName);
	  if (idx === -1 || idx === boundaries.length - 1) return null; // keine tiefere Klasse
	  return boundaries[idx + 1];
	}

	function getClassBoundaries(gender, value, ratingConfig) {
	  const boundaries = ratingConfig.classBoundaries[gender];
	  if (!boundaries) return null;

	  // Sortiere nach Wert DESC (höchste zuerst)
	  const entries = Object.entries(boundaries).sort((a, b) => b[1] - a[1]);

	  let prevClass = null;
	  let nextClass = null;
	  let found = false;

	  for (let i = 0; i < entries.length; i++) {
		const [klasse, minWert] = entries[i];
		if (value >= minWert && !found) {
		  prevClass = entries[i - 1] || null;
		  nextClass = entries[i + 1] || null;
		  found = true;
		  return {
			current: { klasse, minWert },
			higher: prevClass ? { klasse: prevClass[0], minWert: prevClass[1] } : null,
			lower: nextClass ? { klasse: nextClass[0], minWert: nextClass[1] } : null
		  };
		}
	  }
	  // Wenn keine Grenze gefunden (zu tief) => unterste Klasse
	  const last = entries[entries.length - 1];
	  return {
		current: { klasse: last[0], minWert: last[1] },
		higher: entries[entries.length - 2] ? { klasse: entries[entries.length - 2][0], minWert: entries[entries.length - 2][1] } : null,
		lower: null
	  };
	}

  function estimateDecay(numSpiele) {
  const base = ratingConfig.decayBase || 0.82;
  const max = ratingConfig.decayMax || 60;
  return Math.min(1, base + (1 - base) * (Math.min(numSpiele, max) / max));
}
	function calcClassByCValue(gender, cValue) {
	  // Hole das richtige Grenzwert-Objekt
	  const boundaries = ratingConfig.classBoundaries[gender];
	  if (!boundaries) return "Unbekannt";

	  // Sortiere Grenzwerte nach Wert DESC
	  const entries = Object.entries(boundaries).sort((a, b) => b[1] - a[1]);

	  // Finde die passende Klassierung
	  for (const [klasse, minWert] of entries) {
		if (cValue >= minWert) return klasse;
	  }
	  // Wenn kleiner als alle Schwellen -> R9
	  return "R9 oder tiefer";
	}

  const parseInput = () => {
    try {
      const cleanText = inputText.replace(/[\u2028\u2029\u200B\u00A0]/g, "\n");
      const lines = cleanText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

			 // Robuster: Name suchen (erste Zeile mit mind. 2 Wörtern, gefolgt von Lizenznummer in () in nächster Zeile)
		let foundName = null;
		for (let j = 0; j < lines.length - 1; j++) {
		  // Zeilen überspringen, die nichts mit Name zu tun haben
		  if (
			lines[j].toLowerCase().includes("favoriten auswählen") ||
			lines[j].toLowerCase().includes("alle favoriten")
		  ) continue;

		  // mind. 2 Wörter, mind. 6 Zeichen (keine Zahl am Anfang), nur Buchstaben, evtl. Bindestrich/Apostroph
		  if (
			/^[A-Za-zÄÖÜäöüß\-'. ]{6,}$/.test(lines[j]) &&
			lines[j].split(" ").length >= 2 &&
			/^\([0-9]{3}\.[0-9]{2}\.[0-9]{3}\.[0-9]\)$/.test(lines[j + 1])
		  ) {
			foundName = `${lines[j]} ${lines[j + 1]}`;
			break;
		  }
		}
		if (foundName) setPlayerName(foundName);


      // Spielerinfos extrahieren
      const info = {};
      lines.forEach((line, i) => {
        infoLabels.forEach(label => {
          if (line.startsWith(label)) {
            let val = line.replace(label, "").replace(/^[:\s]*/, "");
            if (!val && lines[i + 1]) val = lines[i + 1].trim();
            // Für Klassierung: nur nehmen, wenn es wie ein Klassierungswert aussieht
            if (label === "Klassierung") {
              if (/^(R\d|N\d)(\s*\(\d+\))?$/.test(val)) {
                info[label] = val;
              }
            } else {
              info[label] = val;
            }
          }
        });
      });

        if (Object.keys(info).length > 0) setPlayerInfo(info);
		let detected = null;
		if (info["Klassierung"]) {
		  detected = detectGenderAndClassByRang(info["Klassierung"], ratingConfig);
		  console.log('Klassierung:', info["Klassierung"]);
		  console.log('detected:', detected);
		  if (detected && detected.gender) setGender(detected.gender);
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
            if ((label === "RESULTAT" || label === "RESULTATE") && value)
              block.score = value;
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

  const clearAll = () => {
    setMatches([]);
    setPlayerName("");
    setPlayerInfo({});
    setGender(null);
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
    let wins = relevantMatches.filter((m) =>
      m.result === "S" || (m.result === "W" && m.score)
    );
    let losses = relevantMatches
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => m.result === "N" || (m.result === "Z" && m.score));

    const numGames = wins.length + losses.length;
	const n = numGames > 0 ? numGames : 1; // Verhindert Division durch 0
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
      (sum, m) => sum + Math.exp(parseFloat((m.ww*0.95) || 0)),
      0
    );
    const expLosses = losses.reduce(
      (sum, m) => sum + Math.exp(-parseFloat((m.ww*0.95) || 0)),
      0
    );

    const expW0 = Math.exp(decayedWW);
    const expW0_neg = Math.exp(-decayedWW);

    const lnWins = Math.log(expWins + expW0);
    const lnLosses = Math.log(expLosses + expW0_neg);

    const W = 0.5 * (lnWins - lnLosses);
    const R = (1 / 6) * (lnWins + lnLosses);
    const total = W + R;

    // Dynamische Grenzen je nach Geschlecht!
    // Beispiel: Nimm einen Array von [min, max] pro Klasse (je nach gender)
    let classification = calcClassByCValue(gender, total);

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
  const classBoundaries = getClassBoundaries(gender, parseFloat(result.total), ratingConfig);
	let distanceToHigher = null;
	let distanceToLower = null;

	if (classBoundaries) {
	  if (classBoundaries.higher) {
		distanceToHigher = (classBoundaries.higher.minWert - parseFloat(result.total)).toFixed(3);
	  }
	  if (classBoundaries.lower) {
		distanceToLower = (parseFloat(result.total) - classBoundaries.current.minWert).toFixed(3);
	  }
	}

  return (
    <div className="app-bg" style={{ minHeight: "100vh", background: "#f5f6f8", paddingBottom: 60 }}>
      <div style={{ textAlign: "center", marginBottom: "0.2rem", marginTop: "2.2rem" }}>
        <img
          src="https://www.mytennis.ch/assets/logo.86ab5f81.svg"
          alt="SwissTennis Logo"
          style={{ height: 54, margin: "0 auto 0.5rem auto", display: "block" }}
        />
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#143986" }}>
          Swiss Tennis Ranking Rechner
        </h1>
      </div>
      {playerName && (
        <div
          className="player-name-main"
          style={{
            textAlign: "center",
            fontSize: "2em",
            fontWeight: "bold",
            marginBottom: "0.7em",
            color: "#123370",
            letterSpacing: 0.01,
          }}
        >
          {playerName}
        </div>
      )}

      {gender && (
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <span style={{ color: "#888", fontSize: "1.02em" }}>
            (Erkanntes Geschlecht: <b>{gender === "male" ? "Mann" : "Frau"}</b>)
          </span>
        </div>
      )}

      {playerInfo && Object.keys(playerInfo).length > 0 && (
        <div
          className="player-info-table"
          style={{
            margin: "0 auto 1.3em auto",
            background: "#fff",
            borderRadius: 16,
            padding: "25px 30px",
            boxShadow: "0 4px 18px #0002",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "1700px"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="info-label">Club:</td>
                <td>{playerInfo["Club"] || ""}</td>
                <td className="info-label">Alterskat.:</td>
                <td>{playerInfo["Alterskat."] || ""}</td>
                <td className="info-label">Lizenz-Status:</td>
                <td>{playerInfo["Lizenz-Status"] || ""}</td>
                <td className="info-label">Interclub Status:</td>
                <td>{playerInfo["Interclub Status"] || ""}</td>
                <td className="info-label">Klassierung:</td>
                <td>{playerInfo["Klassierung"] || ""}</td>
                <td className="info-label">Klassierungswert:</td>
                <td>{playerInfo["Klassierungswert"] || ""}</td>
              </tr>
              <tr style={{ borderTop: "1px solid #e1e1e1" }}>
                <td className="info-label">Wettkampfwert:</td>
                <td>{playerInfo["Wettkampfwert"] || ""}</td>
                <td className="info-label">Risikozuschlag:</td>
                <td>{playerInfo["Risikozuschlag"] || ""}</td>
                <td className="info-label">Anzahl Spiele:</td>
                <td>{playerInfo["Anzahl Spiele"] || ""}</td>
                <td className="info-label">Anzahl/Abzug w.o.:</td>
                <td>{playerInfo["Anzahl/Abzug w.o."] || ""}</td>
                <td className="info-label">Letzte Klassierung:</td>
                <td>{playerInfo["Letzte Klassierung"] || ""}</td>
                <td className="info-label">Beste Klassierung seit 2004:</td>
                <td>{playerInfo["Beste Klassierung seit 2004"] || ""}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Neue Box im mytennis-Stil */}
      {matches.length > 0 && (
      <div
        className="result-summary-box"
        style={{
          margin: "0 auto 1.6em auto",
          maxWidth: 450,
          background: "#fff",
          border: "2px solid #e1e7ef",
          borderRadius: "14px",
          boxShadow: "0 3px 16px #0001",
          padding: "28px 36px 22px 36px",
          color: "#143986",
          fontSize: "1.18em",
          fontWeight: 500,
          lineHeight: 1.6,
          letterSpacing: 0,
          textAlign: "center",
        }}
      >
        <div>
          <span style={{ fontSize: "1.13em", color: "#123370", fontWeight: 700 }}>Neue Berechnung:</span>{" "}
        </div>
        <div>
          <span style={{ color: "#123370", fontWeight: 700 }}>Wettkampfwert:</span>{" "}
          <span style={{ color: "#555" }}>{result.newWW}</span>
        </div>
        <div>
          <span style={{ color: "#123370", fontWeight: 700 }}>Risikozuschlag:</span>{" "}
          <span style={{ color: "#555" }}>{result.risk}</span>
        </div>
        <div>
          <span style={{ color: "#123370", fontWeight: 700 }}>Klassierungswert:</span>{" "}
          <span style={{ color: "#555" }}>{result.total}</span>
        </div>
        <div>
          <span style={{ fontSize: "1.13em", color: "#123370", fontWeight: 700 }}>Klassierung:</span>{" "}
          <span style={{ fontSize: "1.13em", color: "#00822b" }}>{result.classification}</span>
        </div>
		{classBoundaries && (
		  <div style={{marginTop: 16, fontSize: "0.98em", color: "#666"}}>
			{classBoundaries.higher && (
			  <div>
				<span><b>Grenze zur höheren Klasse ({classBoundaries.higher.klasse}):</b> {classBoundaries.higher.minWert.toFixed(3)} ({(distanceToHigher > 0 ? "+" : "") + distanceToHigher})</span>
			  </div>
			)}
			<div>
			  <b>Dein Wert:</b> {result.total}
			</div>
			{classBoundaries.lower && (
			  <div>
				<span><b>Grenze zur tieferen Klasse ({classBoundaries.current.klasse}):</b> {classBoundaries.current.minWert.toFixed(3)} ({(distanceToLower > 0 ? "-" : "") + distanceToLower})</span>
			  </div>
			)}
		  </div>
		)}
	{classBoundaries && classBoundaries.higher && classBoundaries.current && (
  <div style={{ margin: "20px 0" }}>
    <div style={{ fontSize: "0.95em", color: "#444", marginBottom: 6 }}>
      <b>Abstand zu Grenzen</b>
    </div>
    <div
      style={{
        position: "relative",
        background: "#e9e9ef",
        borderRadius: 8,
        height: 22,
        width: "100%",
        boxShadow: "0 1px 4px #0001"
      }}
    >
      {/* Fortschritts-Balken (rechts nach links) */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          borderRadius: 8,
          width: `${Math.min(
            100,
            Math.max(
              0,
              ((result.total - classBoundaries.current.minWert) /
                (classBoundaries.higher.minWert - classBoundaries.current.minWert)) *
                100
            )
          )}%`,
          background:
            "linear-gradient(90deg, #00822b 0%, #fbbc05 50%, #e3342f 100%)",
          transition: "width 0.5s cubic-bezier(.5,.2,.2,1)"
        }}
      />
      {/* Labels */}
      {/* Höhere Klasse */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          fontSize: 13,
          color: "#00822b",
          fontWeight: 600,
          paddingLeft: 2,
          lineHeight: "22px",
          background: "#fff",
          borderRadius: 5,
          padding: "0 6px",
          boxShadow: "0 1px 5px #0002",
          zIndex: 2
        }}
      >
        {classBoundaries.higher.minWert.toFixed(3)} ({classBoundaries.higher.klasse})
      </span>
      {/* Aktuelle Klassen-Grenze, Name der nächsttiefen Klasse */}
      <span
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          fontSize: 13,
          color: "#e3342f",
          fontWeight: 600,
          paddingRight: 2,
          lineHeight: "22px",
          background: "#fff",
          borderRadius: 5,
          padding: "0 6px",
          boxShadow: "0 1px 5px #0002",
          zIndex: 2
        }}
      >
        {classBoundaries.current.minWert.toFixed(3)} (
        {getNextLowerClassName(gender, classBoundaries.current.klasse) ||
          classBoundaries.current.klasse}
        )
      </span>
      {/* Marker für aktuellen Wert */}
      <span
        style={{
          position: "absolute",
          left: `${
            ((result.total - classBoundaries.current.minWert) /
              (classBoundaries.higher.minWert)) *
            100
          }%`,
          top: 0,
          transform: "translate(-50%, 0)",
          fontSize: 14,
          fontWeight: 700,
          color: "#143986",
          background: "#fff",
          borderRadius: 5,
          padding: "0 6px",
          boxShadow: "0 1px 5px #0002",
          lineHeight: "22px",
          zIndex: 3
        }}
      >
        {parseFloat(result.total).toFixed(3)}
      </span>
    </div>
    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
      Links = Grenze zur höheren Klasse | Rechts = Grenze zur nächsttieferen Klasse
    </div>
  </div>
)}

      </div>
      )}

      {/* BUTTONS */}
      <div className="btn-row" style={{ marginBottom: 18, textAlign: "center" }}>
        {matches.length === 0 ? (
          <button
            type="button"
            onClick={() => setShowImport(!showImport)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {showImport ? "Import-Feld zuklappen" : "Import-Feld öffnen"}
          </button>
        ) : (
          <button
            type="button"
            onClick={clearAll}
            className="bg-red-600 text-white px-4 py-2 rounded"
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
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => {
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
          .player-info-table {
            font-size: 1.12em;
            margin-bottom: 18px;
          }
          .player-info-table td {
            padding: 4px 10px;
            vertical-align: middle;
            font-size: 1.08em;
          }
          .player-info-table .info-label {
            font-weight: bold;
            color: #143986;
            white-space: nowrap;
          }
          .player-name-main {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 0.3em;
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
          .result-s { background: #3490dc; color: #fff; }
          .result-n { background: #e3342f; color: #fff; }
        `}
      </style>
    </div>
  );
}
