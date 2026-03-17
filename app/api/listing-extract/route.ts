import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const extractSchema = z.object({
  listingUrl: z.string().url()
});

type ExtractSource = "jsonld" | "platform_state" | "heuristic";

interface ExtractedResult {
  year?: number;
  make?: string;
  model?: string;
  askingPrice?: number;
  mileage?: number;
  zipCode?: string;
  source: ExtractSource;
}

const COMMON_MAKES = [
  "MERCEDES-BENZ",
  "LAND ROVER",
  "ALFA ROMEO",
  "ASTON MARTIN",
  "ROLLS-ROYCE",
  "VOLKSWAGEN",
  "CHEVROLET",
  "CADILLAC",
  "CHRYSLER",
  "MITSUBISHI",
  "MASERATI",
  "BENTLEY",
  "HYUNDAI",
  "SUBARU",
  "NISSAN",
  "TOYOTA",
  "HONDA",
  "LEXUS",
  "INFINITI",
  "GENESIS",
  "PORSCHE",
  "FERRARI",
  "LAMBORGHINI",
  "MCLAREN",
  "JAGUAR",
  "BUICK",
  "GMC",
  "JEEP",
  "DODGE",
  "MAZDA",
  "TESLA",
  "VOLVO",
  "ACURA",
  "AUDI",
  "BMW",
  "MINI",
  "RAM",
  "KIA",
  "FIAT",
  "FORD",
  "LINCOLN"
];

const PLATFORM_STATE_KEYS: Record<string, string[]> = {
  cars: ["__NEXT_DATA__", "__APOLLO_STATE__", "__INITIAL_STATE__", "__PRELOADED_STATE__"],
  autotrader: ["__NEXT_DATA__", "__INITIAL_STATE__", "__PRELOADED_STATE__", "__REDUX_STATE__"],
  cargurus: ["__NEXT_DATA__", "__INITIAL_STATE__", "__PRELOADED_STATE__", "__REDUX_STATE__"],
  generic: ["__NEXT_DATA__", "__INITIAL_STATE__", "__PRELOADED_STATE__", "__REDUX_STATE__", "__APOLLO_STATE__"]
};

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function parseMoney(value: string): number | undefined {
  const match = value.match(/(?:\$|USD\s*)\s*([\d,]{3,9}(?:\.\d{2})?)/i);
  if (!match) {
    return undefined;
  }

  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) {
    return undefined;
  }

  return Math.round(amount);
}

function parseMileage(value: string): number | undefined {
  const match = value.match(/([\d,]{2,7})\s*(?:miles?|mi)\b/i);
  if (!match) {
    return undefined;
  }

  const mileage = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(mileage)) {
    return undefined;
  }

  return Math.round(mileage);
}

function parseYear(value: string): number | undefined {
  const currentYear = new Date().getFullYear();
  const yearRegex = new RegExp(`\\b(19\\d{2}|20\\d{2})\\b`, "g");
  const matches = value.match(yearRegex) ?? [];

  for (const match of matches) {
    const year = Number(match);
    if (year >= 1998 && year <= currentYear + 1) {
      return year;
    }
  }

  return undefined;
}

function parseZip(value: string): string | undefined {
  const match = value.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1];
}

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();

  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".local") ||
    lowerHost === "0.0.0.0" ||
    lowerHost === "::1" ||
    lowerHost.startsWith("127.")
  ) {
    return true;
  }

  const ipv4Match = lowerHost.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (!ipv4Match) {
    return false;
  }

  const parts = lowerHost.split(".").map((part) => Number(part));
  if (parts.some((part) => part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  return false;
}

function parseModelFromTitle(rawTitle: string, make: string, year?: number): string | undefined {
  const title = normalizeSpaces(rawTitle.toUpperCase());
  const makeIndex = title.indexOf(make);

  if (makeIndex === -1) {
    return undefined;
  }

  let start = makeIndex + make.length;
  if (year) {
    const yearIndex = title.indexOf(String(year));
    if (yearIndex >= 0 && yearIndex < makeIndex) {
      start = makeIndex + make.length;
    }
  }

  const sliced = title.slice(start).trim();
  const untilDelimiter = sliced.split(/\||,| - | FOR SALE| SPECIAL| STOCK| VIN/i)[0] ?? sliced;
  const cleaned = normalizeSpaces(untilDelimiter.replace(/[^A-Z0-9\- ]/g, "").trim());

  if (!cleaned) {
    return undefined;
  }

  return cleaned.split(" ").slice(0, 5).join(" ") || undefined;
}

function extractFromText(title: string, description: string): ExtractedResult {
  const combined = `${title} ${description}`;
  const normalized = normalizeSpaces(combined.toUpperCase());

  const year = parseYear(normalized);
  const make = COMMON_MAKES.find((item) => normalized.includes(item));
  const model = make ? parseModelFromTitle(normalized, make, year) : undefined;
  const askingPrice = parseMoney(combined);
  const mileage = parseMileage(combined);
  const zipCode = parseZip(combined);

  return {
    year,
    make,
    model,
    askingPrice,
    mileage,
    zipCode,
    source: "heuristic"
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function collectJsonLdNodes(node: unknown, bucket: Record<string, unknown>[]): void {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    for (const entry of node) {
      collectJsonLdNodes(entry, bucket);
    }

    return;
  }

  bucket.push(node as Record<string, unknown>);

  const graph = (node as Record<string, unknown>)["@graph"];
  if (Array.isArray(graph)) {
    for (const entry of graph) {
      collectJsonLdNodes(entry, bucket);
    }
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return readString(record.name) ?? readString(record.value) ?? readString(record.label);
  }

  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function extractFromJsonLd(html: string): ExtractedResult | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const scripts: string[] = [];

  let scriptMatch: RegExpExecArray | null = scriptRegex.exec(html);
  while (scriptMatch) {
    const content = scriptMatch[1]?.trim();
    if (content) {
      scripts.push(content);
    }

    scriptMatch = scriptRegex.exec(html);
  }

  if (scripts.length === 0) {
    return null;
  }

  const nodes: Record<string, unknown>[] = [];

  for (const script of scripts) {
    const parsed = safeJsonParse(script);
    if (parsed) {
      collectJsonLdNodes(parsed, nodes);
    }
  }

  if (nodes.length === 0) {
    return null;
  }

  let year: number | undefined;
  let make: string | undefined;
  let model: string | undefined;
  let askingPrice: number | undefined;
  let mileage: number | undefined;
  let zipCode: string | undefined;

  for (const node of nodes) {
    const typeValue = node["@type"];
    const typeList = Array.isArray(typeValue)
      ? typeValue.map((entry) => String(entry).toLowerCase())
      : [String(typeValue ?? "").toLowerCase()];
    const hasVehicleSignal = typeList.some((entry) => ["vehicle", "car", "product"].includes(entry));

    if (!hasVehicleSignal) {
      continue;
    }

    year = year ?? parseYear(readString(node["vehicleModelDate"]) ?? readString(node["modelDate"]) ?? readString(node["name"]) ?? "");

    const brandObj = node["brand"] as Record<string, unknown> | undefined;
    const manufacturerObj = node["manufacturer"] as Record<string, unknown> | undefined;
    make = make ?? readString(brandObj?.name) ?? readString(brandObj) ?? readString(manufacturerObj?.name) ?? readString(manufacturerObj);

    model = model ?? readString(node["model"]) ?? readString(node["vehicleModel"]) ?? parseModelFromTitle(readString(node["name"]) ?? "", (make ?? "").toUpperCase(), year);

    const mileageNode = node["mileageFromOdometer"] as Record<string, unknown> | undefined;
    mileage = mileage ?? readNumber(mileageNode?.value) ?? parseMileage(readString(node["description"]) ?? "");

    const offersNode = node["offers"] as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const offers = Array.isArray(offersNode) ? offersNode : offersNode ? [offersNode] : [];

    for (const offer of offers) {
      askingPrice =
        askingPrice ??
        readNumber(offer.price) ??
        readNumber((offer.priceSpecification as Record<string, unknown> | undefined)?.price) ??
        parseMoney(readString(offer.description) ?? "");

      const locationAddress =
        (offer.availableAtOrFrom as Record<string, unknown> | undefined)?.address as Record<string, unknown> | undefined;
      zipCode = zipCode ?? parseZip(readString(locationAddress?.postalCode) ?? "");
    }
  }

  if (!year && !make && !model && !askingPrice && !mileage) {
    return null;
  }

  return {
    year,
    make: make?.toUpperCase(),
    model: model?.toUpperCase(),
    askingPrice: askingPrice ? Math.round(askingPrice) : undefined,
    mileage: mileage ? Math.round(mileage) : undefined,
    zipCode,
    source: "jsonld"
  };
}

function getPlatformKey(hostname: string): keyof typeof PLATFORM_STATE_KEYS {
  const host = hostname.toLowerCase();

  if (host.includes("cars.com")) {
    return "cars";
  }

  if (host.includes("autotrader")) {
    return "autotrader";
  }

  if (host.includes("cargurus")) {
    return "cargurus";
  }

  return "generic";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBalancedJsonObject(text: string, openBraceIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let quoteChar = "";

  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    const prev = index > 0 ? text[index - 1] : "";

    if (inString) {
      if (char === quoteChar && prev !== "\\") {
        inString = false;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openBraceIndex, index + 1);
      }
    }
  }

  return null;
}

function extractScriptJsonById(html: string, id: string): unknown {
  const regex = new RegExp(`<script[^>]*id=["']${escapeRegex(id)}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i");
  const match = html.match(regex);
  const content = match?.[1]?.trim();

  if (!content) {
    return null;
  }

  return safeJsonParse(content);
}

function extractAssignedWindowJson(html: string, variableName: string): unknown {
  const assignmentRegex = new RegExp(`(?:window\\.)?${escapeRegex(variableName)}\\s*=`, "i");
  const assignmentMatch = assignmentRegex.exec(html);

  if (!assignmentMatch) {
    return null;
  }

  const searchStart = assignmentMatch.index + assignmentMatch[0].length;
  const openBraceIndex = html.indexOf("{", searchStart);

  if (openBraceIndex === -1) {
    return null;
  }

  const balanced = extractBalancedJsonObject(html, openBraceIndex);
  if (!balanced) {
    return null;
  }

  return safeJsonParse(balanced);
}

function collectObjects(node: unknown, bucket: Record<string, unknown>[], seen: Set<unknown>): void {
  if (!node || typeof node !== "object" || seen.has(node)) {
    return;
  }

  seen.add(node);

  if (Array.isArray(node)) {
    for (const entry of node) {
      collectObjects(entry, bucket, seen);
    }

    return;
  }

  const record = node as Record<string, unknown>;
  bucket.push(record);

  for (const value of Object.values(record)) {
    collectObjects(value, bucket, seen);
  }
}

function pickStringFromKeys(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const direct = readString(record[key]);
    if (direct) {
      return direct;
    }
  }

  return undefined;
}

function pickNumberFromKeys(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const direct = readNumber(record[key]);
    if (direct !== undefined) {
      return direct;
    }

    const asString = readString(record[key]);
    if (asString) {
      const money = parseMoney(asString);
      if (money !== undefined) {
        return money;
      }

      const mileage = parseMileage(asString);
      if (mileage !== undefined) {
        return mileage;
      }
    }
  }

  return undefined;
}

function normalizeMake(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeSpaces(value.toUpperCase());
  const exact = COMMON_MAKES.find((make) => normalized.includes(make));
  return exact ?? normalized.split(" ").slice(0, 2).join(" ");
}

function normalizeModel(value?: string, make?: string, year?: number): string | undefined {
  if (!value) {
    return undefined;
  }

  let normalized = normalizeSpaces(value.toUpperCase());

  if (make && normalized.startsWith(make)) {
    normalized = normalized.slice(make.length).trim();
  }

  if (year && normalized.startsWith(String(year))) {
    normalized = normalized.slice(String(year).length).trim();
  }

  const cleaned = normalizeSpaces(normalized.replace(/[^A-Z0-9\- ]/g, ""));
  return cleaned.split(" ").slice(0, 5).join(" ") || undefined;
}

function countDefinedFields(result: Partial<ExtractedResult>): number {
  return [result.year, result.make, result.model, result.askingPrice, result.mileage, result.zipCode].filter((value) => value !== undefined).length;
}

function extractFromPlatformState(html: string, hostname: string): ExtractedResult | null {
  const platformKey = getPlatformKey(hostname);
  const variableKeys = PLATFORM_STATE_KEYS[platformKey] ?? PLATFORM_STATE_KEYS.generic;

  const states: unknown[] = [];

  for (const key of variableKeys) {
    const scriptJson = extractScriptJsonById(html, key);
    if (scriptJson) {
      states.push(scriptJson);
    }

    const assignedJson = extractAssignedWindowJson(html, key);
    if (assignedJson) {
      states.push(assignedJson);
    }
  }

  if (states.length === 0) {
    return null;
  }

  let best: Partial<ExtractedResult> | null = null;
  let bestScore = 0;

  for (const state of states) {
    const objects: Record<string, unknown>[] = [];
    collectObjects(state, objects, new Set());

    for (const object of objects) {
      const rawYear = pickNumberFromKeys(object, ["year", "modelYear", "vehicleYear", "vehicle_model_year"]);
      const rawMake = pickStringFromKeys(object, ["make", "makeName", "manufacturer", "brand", "make_name"]);
      const rawModel = pickStringFromKeys(object, ["model", "modelName", "vehicleModel", "model_name", "trimName", "trim"]);
      const rawPrice = pickNumberFromKeys(object, [
        "price",
        "askingPrice",
        "listPrice",
        "internetPrice",
        "internet_price",
        "salePrice",
        "msrp",
        "displayPrice",
        "consumerPrice"
      ]);
      const rawMileage = pickNumberFromKeys(object, ["mileage", "odometer", "odometerValue", "odometerReading", "miles", "mileages"]);
      const rawZip = pickStringFromKeys(object, ["zip", "zipCode", "postalCode", "postal_code"]);

      const year = rawYear !== undefined ? parseYear(String(Math.round(rawYear))) : undefined;
      const make = normalizeMake(rawMake);
      const model = normalizeModel(rawModel, make, year);

      const askingPrice = rawPrice && rawPrice >= 1000 && rawPrice <= 600000 ? Math.round(rawPrice) : undefined;
      const mileage = rawMileage && rawMileage >= 0 && rawMileage <= 500000 ? Math.round(rawMileage) : undefined;
      const zipCode = rawZip ? parseZip(rawZip) : undefined;

      const candidate: Partial<ExtractedResult> = {
        year,
        make,
        model,
        askingPrice,
        mileage,
        zipCode
      };

      const fieldScore = countDefinedFields(candidate);
      const qualityBonus = year && make && model ? 2 : 0;
      const score = fieldScore + qualityBonus;

      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }

  if (!best || bestScore < 3) {
    return null;
  }

  return {
    year: best.year,
    make: best.make,
    model: best.model,
    askingPrice: best.askingPrice,
    mileage: best.mileage,
    zipCode: best.zipCode,
    source: "platform_state"
  };
}

function extractMetaContent(html: string, key: string): string | undefined {
  const pattern = new RegExp(`<meta[^>]*(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)"?[^>]*>`, "i");
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : undefined;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeSpaces(decodeHtmlEntities(match?.[1] ?? ""));
}

function mergeByPriority(results: Array<ExtractedResult | null>): Partial<ExtractedResult> {
  const merged: Partial<ExtractedResult> = {};

  for (const result of results) {
    if (!result) {
      continue;
    }

    merged.year = merged.year ?? result.year;
    merged.make = merged.make ?? result.make;
    merged.model = merged.model ?? result.model;
    merged.askingPrice = merged.askingPrice ?? result.askingPrice;
    merged.mileage = merged.mileage ?? result.mileage;
    merged.zipCode = merged.zipCode ?? result.zipCode;
  }

  return merged;
}

function pickBestSource(results: Array<ExtractedResult | null>): ExtractSource {
  let best: ExtractSource = "heuristic";
  let bestScore = -1;

  for (const result of results) {
    if (!result) {
      continue;
    }

    const score = countDefinedFields(result);
    if (score > bestScore) {
      best = result.source;
      bestScore = score;
    }
  }

  return best;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = extractSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid listing URL." }, { status: 400 });
    }

    const url = new URL(parsed.data.listingUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.json({ error: "Only HTTP/HTTPS listing URLs are allowed." }, { status: 400 });
    }

    if (isPrivateOrBlockedHost(url.hostname)) {
      return NextResponse.json({ error: "Local or private network URLs are not allowed." }, { status: 400 });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "AutovaroBot/1.0 (+listing extraction)",
        Accept: "text/html,application/xhtml+xml"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Could not fetch listing page (HTTP ${response.status}).` }, { status: 400 });
    }

    const html = await response.text();
    const trimmedHtml = html.slice(0, 1_200_000);

    const title = extractTitle(trimmedHtml);
    const description =
      extractMetaContent(trimmedHtml, "og:description") ??
      extractMetaContent(trimmedHtml, "description") ??
      extractMetaContent(trimmedHtml, "twitter:description") ??
      "";

    const metaTitle = extractMetaContent(trimmedHtml, "og:title") ?? extractMetaContent(trimmedHtml, "twitter:title") ?? title;

    const platformResult = extractFromPlatformState(trimmedHtml, url.hostname);
    const jsonLdResult = extractFromJsonLd(trimmedHtml);
    const heuristicResult = extractFromText(metaTitle, description);

    const source = pickBestSource([platformResult, jsonLdResult, heuristicResult]);

    const priorityResults =
      source === "platform_state"
        ? [platformResult, jsonLdResult, heuristicResult]
        : source === "jsonld"
        ? [jsonLdResult, platformResult, heuristicResult]
        : [heuristicResult, jsonLdResult, platformResult];

    const merged = mergeByPriority(priorityResults);

    const result = {
      year: merged.year,
      make: merged.make,
      model: merged.model,
      askingPrice: merged.askingPrice,
      mileage: merged.mileage,
      zipCode: merged.zipCode
    };

    const extractedCount = Object.values(result).filter((value) => value !== undefined).length;

    if (extractedCount === 0) {
      return NextResponse.json(
        {
          error: "Could not detect vehicle details from this listing. You can still enter data manually.",
          title: metaTitle
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      listingUrl: parsed.data.listingUrl,
      parsed: result,
      extractedCount,
      source,
      title: metaTitle
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Listing extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
