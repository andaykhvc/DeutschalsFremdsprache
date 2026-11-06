export function applyCorrection(
  body: string,
  version: number,
  correction: {
    quote: string;
    replacement: string;
    start_offset: number;
    end_offset: number;
    base_version: number;
  },
) {
  if (version !== correction.base_version)
    throw new Error(
      "Der Text wurde inzwischen geändert. Bitte einen neuen Vorschlag erstellen.",
    );
  const { start_offset: start, end_offset: end } = correction;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end <= start ||
    end > body.length ||
    body.slice(start, end) !== correction.quote
  ) {
    throw new Error("Die markierte Textstelle stimmt nicht mehr überein.");
  }
  return body.slice(0, start) + correction.replacement + body.slice(end);
}
