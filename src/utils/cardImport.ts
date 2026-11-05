export const MAX_IMPORT_CARDS = 1000;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
/** 'csv' for .csv files; 'lines' for pasted text, .tsv and .txt. */
export type ImportFormat = 'csv' | 'lines';
export interface ImportResult {
  cards: { front: string; back: string }[];
  /** 1-based source line numbers. */
  skippedLines: number[];
  /** More than MAX_IMPORT_CARDS cards were found; the caller imports nothing. */
  tooMany: boolean;
}

const MAX_LISTED_LINES = 10;

interface Row {
  fields: string[];
  line: number;
  /** True for an empty line (no quotes, no content). */
  blank: boolean;
}

function finish(rows: { front: string; back: string; line: number }[], skipped: number[]): ImportResult {
  return {
    cards: rows.map(({ front, back }) => ({ front, back })),
    skippedLines: skipped,
    tooMany: rows.length > MAX_IMPORT_CARDS,
  };
}

function splitLine(line: string): [string, string] | null {
  let at = line.indexOf('\t');
  if (at < 0) {
    at = line.indexOf(';');
  }
  return at < 0 ? null : [line.slice(0, at), line.slice(at + 1)];
}

function parseLines(text: string): ImportResult {
  const cards: { front: string; back: string; line: number }[] = [];
  const skipped: number[] = [];
  text.split(/\r\n|\r|\n/).forEach((raw, index) => {
    if (raw.trim() === '') {
      return;
    }
    const parts = splitLine(raw);
    const front = parts?.[0].trim() ?? '';
    const back = parts?.[1].trim() ?? '';
    if (front && back) {
      cards.push({ front, back, line: index + 1 });
    } else {
      skipped.push(index + 1);
    }
  });
  return finish(cards, skipped);
}

/** RFC 4180 rows, each with the line number it starts on. Quoted line breaks stay inside their field. */
function csvRows(text: string): Row[] {
  const rows: Row[] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  const endField = () => {
    fields.push(field);
    field = '';
    quoted = false;
  };
  const endRow = () => {
    const hadQuotes = quoted;
    endField();
    rows.push({ fields, line: rowLine, blank: fields.length === 1 && fields[0] === '' && !hadQuotes });
    fields = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') {
          line++;
        }
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
      quoted = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') {
        i++;
      }
      endRow();
      line++;
      rowLine = line;
    } else {
      field += ch;
    }
  }
  if (field !== '' || fields.length > 0 || quoted) {
    endRow();
  }
  return rows;
}

const HEADERS = ['front,back', 'front,back,learned'];

function parseCsv(text: string): ImportResult {
  const cards: { front: string; back: string; line: number }[] = [];
  const skipped: number[] = [];
  let first = true;
  for (const row of csvRows(text)) {
    if (row.blank) {
      continue;
    }
    if (first) {
      first = false;
      if (HEADERS.includes(row.fields.map((f) => f.trim().toLowerCase()).join(','))) {
        continue;
      }
    }
    const front = (row.fields[0] ?? '').trim();
    const back = (row.fields[1] ?? '').trim();
    if (front && back) {
      cards.push({ front, back, line: row.line });
    } else {
      skipped.push(row.line);
    }
  }
  return finish(cards, skipped);
}

export function parseImport(text: string, format: ImportFormat): ImportResult {
  return format === 'csv' ? parseCsv(text) : parseLines(text);
}

export function importFormatFor(fileName: string): ImportFormat {
  return fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'lines';
}

/** '3, 7, 9', or the first ten followed by ', …' when there are more. */
export function skippedLinesText(lines: number[]): string {
  const shown = lines.slice(0, MAX_LISTED_LINES).join(', ');
  return lines.length > MAX_LISTED_LINES ? `${shown}, …` : shown;
}
