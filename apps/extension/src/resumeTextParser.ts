export type ParsedEducation = {
  school: string;
  degree: string;
  startDate?: string;
  graduationDate?: string;
};

export type ParsedExperience = {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

export type ParsedResume = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  portfolio?: string;
  linkedin?: string;
  education: ParsedEducation[];
  experience: ParsedExperience[];
  evidence: string[];
};

const sectionHeadingPattern =
  /^(?:summary|profile|experience|work experience|professional experience|employment|education|projects?|skills?|certifications?|awards?|volunteering)$/i;
const experienceHeadingPattern =
  /^(?:experience|work experience|professional experience|employment)$/i;
const educationHeadingPattern = /^education$/i;
const rolePattern =
  /\b(?:software|frontend|front-end|backend|back-end|full-stack|developer|engineer|designer|analyst|manager|student|researcher|consultant|intern|co-op|specialist|coordinator|director|assistant)\b/i;
const actionPattern =
  /\b(?:built|created|developed|designed|implemented|shipped|improved|led|managed|tested|automated|delivered|launched|maintained|collaborated|worked|uses?|skilled|experienced|increased|reduced|supported|owned|analyzed)\b/i;
const dateRangePattern =
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Spring|Summer|Fall|Winter)?\s*20\d{2}\s*(?:-|–|—|to)\s*(?:Present|Current|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Spring|Summer|Fall|Winter)?\s*20\d{2})\b/i;

function cleanLine(value: string) {
  return value
    .replace(/^[\s•●▪◦‣⁃*-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function linesFrom(text: string) {
  return text.replace(/\r/g, "").split("\n").map(cleanLine).filter(Boolean);
}

function firstMatch(lines: string[], pattern: RegExp) {
  return lines.map((line) => line.match(pattern)?.[0]).find(Boolean);
}

function normalizeUrl(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.replace(/[),.;]+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function linkCandidates(lines: string[]) {
  const pattern =
    /(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|linkedin\.com\/in|[\w-]+\.(?:dev|io|me|com|ca))(?:\/[\w./?=#%-]*)?/gi;
  return lines.flatMap((line) =>
    Array.from(line.matchAll(pattern))
      .filter((match) => match.index === 0 || line[match.index - 1] !== "@")
      .map((match) => match[0]),
  );
}

function likelyName(lines: string[]) {
  return lines.slice(0, 15).find((line) => {
    if (line.length > 70 || /[@|:/\d,]/.test(line)) return false;
    if (sectionHeadingPattern.test(line) || rolePattern.test(line))
      return false;
    const parts = line.split(/\s+/);
    return (
      parts.length >= 2 &&
      parts.length <= 4 &&
      parts.every((part) => /^[\p{L}][\p{L}'.-]*$/u.test(part))
    );
  });
}

function parseMonthYear(value: string) {
  const match = value.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i,
  );
  if (!match) return undefined;
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const monthIndex = months.findIndex((month) =>
    month.startsWith(match[1].toLowerCase().slice(0, 3)),
  );
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function sectionLines(lines: string[], heading: RegExp) {
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) return [];
  const relativeEnd = lines
    .slice(start + 1)
    .findIndex((line) => sectionHeadingPattern.test(line));
  return lines.slice(
    start + 1,
    relativeEnd < 0 ? lines.length : start + 1 + relativeEnd,
  );
}

function parseEducation(lines: string[]): ParsedEducation[] {
  const source = sectionLines(lines, educationHeadingPattern);
  const candidates = source.length ? source : lines;
  const schoolIndexes = candidates
    .map((line, index) =>
      /\b(?:university|college|institute|polytechnic|school of)\b/i.test(line)
        ? index
        : -1,
    )
    .filter((index) => index >= 0);

  return schoolIndexes
    .map((index, position) => {
      const next =
        schoolIndexes[position + 1] ?? Math.min(candidates.length, index + 5);
      const nearby = candidates.slice(index, next);
      const degree = nearby.find((line) =>
        /\b(?:Bachelor|Master|Doctor|B\.?Sc\.?|M\.?Sc\.?|B\.?A\.?|M\.?A\.?|BEng|MEng|Diploma|Degree|Certificate)\b/i.test(
          line,
        ),
      );
      if (!degree) return undefined;
      const range = nearby.find((line) => dateRangePattern.test(line));
      const dates = range ? splitDateRange(range) : {};
      const startDate = dates.startDate
        ? parseMonthYear(dates.startDate)
        : undefined;
      const graduationDate = dates.endDate
        ? parseMonthYear(dates.endDate)
        : nearby.map(parseMonthYear).find(Boolean);
      return {
        school: candidates[index],
        degree,
        ...(startDate ? { startDate } : {}),
        ...(graduationDate ? { graduationDate } : {}),
      };
    })
    .filter((entry): entry is ParsedEducation => Boolean(entry));
}

function splitDateRange(value: string) {
  const match = value.match(dateRangePattern)?.[0];
  if (!match) return {};
  const [startDate, endDate] = match.split(/\s*(?:-|–|—|to)\s*/i);
  return { startDate, endDate };
}

function parseExperience(lines: string[]): ParsedExperience[] {
  const source = sectionLines(lines, experienceHeadingPattern);
  if (!source.length) return [];
  const dateIndexes = source
    .map((line, index) => (dateRangePattern.test(line) ? index : -1))
    .filter((index) => index >= 0);

  return dateIndexes
    .map((dateIndex, position): ParsedExperience | undefined => {
      const before = source.slice(Math.max(0, dateIndex - 3), dateIndex);
      const combined = before.find((line) => /\s(?:at|@)\s/i.test(line));
      const combinedParts = combined?.split(/\s+(?:at|@)\s+/i);
      const title =
        combinedParts?.[0] ??
        [...before].reverse().find((line) => rolePattern.test(line));
      const company =
        combinedParts?.slice(1).join(" at ") ??
        [...before]
          .reverse()
          .find(
            (line) =>
              line !== title &&
              !rolePattern.test(line) &&
              !/,\s*[A-Z]{2}\b/.test(line),
          );
      if (!title || !company) return undefined;

      const nextDate = dateIndexes[position + 1] ?? source.length;
      const descriptionLines = source
        .slice(dateIndex + 1, nextDate)
        .filter((line) => actionPattern.test(line));
      const location = before.find(
        (line) =>
          line !== title && line !== company && /,\s*[A-Z]{2}\b/.test(line),
      );
      return {
        company,
        title,
        ...(location ? { location } : {}),
        ...splitDateRange(source[dateIndex]),
        ...(descriptionLines.length
          ? { description: descriptionLines.join(" ") }
          : {}),
      };
    })
    .filter((entry): entry is ParsedExperience => Boolean(entry));
}

function findLocation(lines: string[]) {
  const headerEnd = lines.findIndex((line) => sectionHeadingPattern.test(line));
  const header = lines.slice(0, headerEnd < 0 ? 15 : headerEnd);
  const labeled = header
    .find((line) => /^(?:location|address)\s*:/i.test(line))
    ?.replace(/^(?:location|address)\s*:\s*/i, "");
  if (labeled) return labeled;
  return header
    .map((line) =>
      line
        .match(
          /\b([A-Za-z][A-Za-z .'-]{1,40},\s*(?:AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Northwest Territories|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon|[A-Z]{2}))\b/i,
        )?.[1]
        .trim(),
    )
    .find(Boolean);
}

function usefulEvidence(lines: string[], excluded: Set<string>) {
  return lines
    .filter(
      (line) =>
        !excluded.has(line) &&
        !sectionHeadingPattern.test(line) &&
        line.length >= 24 &&
        line.length <= 300 &&
        (actionPattern.test(line) ||
          /\b(?:React|TypeScript|Python|Java|C\+\+|SQL|AWS|Git)\b/i.test(line)),
    )
    .filter((line, index, all) => all.indexOf(line) === index)
    .slice(0, 16);
}

export function parseResumeText(text: string): ParsedResume {
  const lines = linesFrom(text);
  if (!lines.length)
    throw new Error("No readable text was found in this resume.");

  const email = firstMatch(lines, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  const phone = firstMatch(
    lines.slice(0, 20),
    /(?:\+?\d{1,3}[\s().-]*)?(?:\d[\s().-]*){9,14}\d/,
  )?.trim();
  const links = linkCandidates(lines.slice(0, 25));
  const linkedin = normalizeUrl(
    links.find((value) => /linkedin\.com\/in/i.test(value)),
  );
  const portfolio = normalizeUrl(
    links.find((value) => !/linkedin\.com\/in/i.test(value)),
  );
  const name = likelyName(lines);
  const nameParts = name?.split(/\s+/) ?? [];
  const location = findLocation(lines);
  const education = parseEducation(lines);
  const experience = parseExperience(lines);
  const excluded = new Set(
    [name, email, phone, location, portfolio, linkedin].filter(
      (value): value is string => Boolean(value),
    ),
  );

  return {
    ...(nameParts[0] ? { firstName: nameParts[0] } : {}),
    ...(nameParts.length > 1 ? { lastName: nameParts.slice(1).join(" ") } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(location ? { location } : {}),
    ...(portfolio ? { portfolio } : {}),
    ...(linkedin ? { linkedin } : {}),
    education,
    experience,
    evidence: usefulEvidence(lines, excluded),
  };
}
