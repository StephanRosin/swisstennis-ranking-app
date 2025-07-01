// utils.js
import ratingConfig from "./ratingConfig.json";

export function extractKlassierungUndRang(klassierungString) {
  // Erwartet z.B. "R5 (3426)"
  const match = /([NR]\d)\s*\((\d+)\)/.exec(klassierungString);
  if (!match) return { klassierung: null, rang: null };
  return { klassierung: match[1], rang: parseInt(match[2], 10) };
}

export function detectGenderAndClassByRang(klassierungString, config) {
  const { klassierung, rang } = extractKlassierungUndRang(klassierungString);
  if (!rang) return { gender: null, klassierung: null };
  for (const gender of ["male", "female"]) {
    for (const [klasse, [min, max]] of Object.entries(config[gender])) {
      if (rang >= min && rang <= max) {
        return { gender, klassierung: klasse, rang };
      }
    }
  }
  return { gender: null, klassierung: null, rang };
}
