const stripBom = (input: string): string =>
  input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

const escapeControlCharsInJsonStrings = (input: string): string => {
  let output = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const code = input.charCodeAt(i);

    if (!inString) {
      if (char === "\"") inString = true;
      output += char;
      continue;
    }

    if (isEscaped) {
      output += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      isEscaped = true;
      continue;
    }

    if (char === "\"") {
      output += char;
      inString = false;
      continue;
    }

    if (code <= 0x1f) {
      switch (char) {
        case "\b":
          output += "\\b";
          break;
        case "\f":
          output += "\\f";
          break;
        case "\n":
          output += "\\n";
          break;
        case "\r":
          output += "\\r";
          break;
        case "\t":
          output += "\\t";
          break;
        default:
          output += `\\u${code.toString(16).padStart(4, "0")}`;
      }
      continue;
    }

    output += char;
  }

  return output;
};

const replaceSmartQuotes = (input: string): string =>
  input
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'");

const removeTrailingCommas = (input: string): string => {
  let output = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (!inString) {
      if (char === "\"") {
        inString = true;
        output += char;
        continue;
      }
      if (char === ",") {
        let j = i + 1;
        while (j < input.length && /\s/.test(input[j])) j += 1;
        if (j < input.length && (input[j] === "}" || input[j] === "]")) {
          continue;
        }
      }
      output += char;
      continue;
    }

    if (isEscaped) {
      output += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      output += char;
      isEscaped = true;
      continue;
    }

    if (char === "\"") {
      output += char;
      inString = false;
      continue;
    }

    output += char;
  }

  return output;
};

export const parseJsonWithRecovery = <T = unknown>(raw: string): T => {
  const normalized = stripBom(raw);
  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    const repaired = removeTrailingCommas(escapeControlCharsInJsonStrings(replaceSmartQuotes(normalized)));
    if (repaired === normalized) throw error;
    return JSON.parse(repaired) as T;
  }
};
