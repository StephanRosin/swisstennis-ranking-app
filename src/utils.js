// utils.js
import ratingConfig from "./ratingConfig.json";

export function extractKlassierungUndRang(klassierungString) {
  // Erwartet z.B. "R5 (3426)"
  const match = /([NR]\d)\s*\((\d+)\)/.exec(klassierungString);
  if (!match) return { klassierung: null, rang: null };
  return { klassierung: match[1], rang: parseInt(match[2], 10) };
}

export function detectGenderAndClassByRang(klassierungStr, config) {
  // Beispiel klassierungStr: "R5 (2800)"
  const match = klassierungStr.match(/(N\d|R\d)\s*\((\d+)\)/);
  if (!match) return { gender: null, klassierung: null, rang: null };

  const klassierung = match[1];    // z.B. "R5"
  const rang = parseInt(match[2]); // z.B. 2800

  let gender = null;

  // Prüfe für Männer
  if (
    config.male[klassierung] &&
    rang >= config.male[klassierung][0] &&
    rang <= config.male[klassierung][1]
  ) {
    gender = "male";
  }
  // Prüfe für Frauen (überschreibt "male", falls beides zutrifft)
  if (
    config.female[klassierung] &&
    rang >= config.female[klassierung][0] &&
    rang <= config.female[klassierung][1]
  ) {
    gender = "female";
  }
  return { gender, klassierung, rang };
}