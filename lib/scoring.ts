import { humanizeMatchLevel, humanizeSegment, resolveBaseline, type BaselineMatchLevel } from "@/lib/pricing-baseline";
import type {
  FeeRiskPanel,
  FinanceEstimate,
  MethodologyPreview,
  NegotiationOpportunity,
  OfferLadder,
  PriceIndicator,
  QuoteInput,
  ReportOutput
} from "@/types/report";

const DISCLAIMER =
  "Autovaro provides educational pricing guidance based on aggregated market data. Estimates are not guarantees and may not reflect final out-the-door pricing.";

const STATE_DOC_FEES: Record<string, number> = {
  AL: 499,
  AZ: 499,
  CA: 85,
  CO: 799,
  CT: 699,
  FL: 999,
  GA: 799,
  IL: 347,
  IN: 245,
  MA: 499,
  MD: 500,
  MI: 260,
  NC: 799,
  NJ: 499,
  NY: 175,
  OH: 250,
  PA: 477,
  SC: 699,
  TN: 699,
  TX: 225,
  VA: 899,
  WA: 200,
  WI: 395,
  DEFAULT: 450
};

const MATCH_PENALTY: Record<BaselineMatchLevel, number> = {
  exact_model: 0,
  make_segment: 1,
  segment: 2,
  market_generic: 4
};

const ZIP_PREFIX_TO_STATE: Array<{ min: number; max: number; state: string }> = [
  { min: 1000, max: 2999, state: "MA" },
  { min: 3000, max: 4999, state: "NH" },
  { min: 5000, max: 5999, state: "VT" },
  { min: 6000, max: 6999, state: "CT" },
  { min: 7000, max: 8999, state: "NJ" },
  { min: 10000, max: 14999, state: "NY" },
  { min: 15000, max: 19999, state: "PA" },
  { min: 20000, max: 21999, state: "MD" },
  { min: 22000, max: 24699, state: "VA" },
  { min: 27000, max: 28999, state: "NC" },
  { min: 29000, max: 29999, state: "SC" },
  { min: 30000, max: 31999, state: "GA" },
  { min: 32000, max: 34999, state: "FL" },
  { min: 35000, max: 36999, state: "AL" },
  { min: 37000, max: 38599, state: "TN" },
  { min: 43000, max: 45999, state: "OH" },
  { min: 46000, max: 47999, state: "IN" },
  { min: 48000, max: 49999, state: "MI" },
  { min: 53000, max: 54999, state: "WI" },
  { min: 55000, max: 56999, state: "MN" },
  { min: 60000, max: 62999, state: "IL" },
  { min: 70000, max: 71599, state: "LA" },
  { min: 73000, max: 74999, state: "OK" },
  { min: 75000, max: 79999, state: "TX" },
  { min: 80000, max: 81999, state: "CO" },
  { min: 85000, max: 86999, state: "AZ" },
  { min: 90000, max: 96699, state: "CA" },
  { min: 97000, max: 97999, state: "OR" },
  { min: 98000, max: 99499, state: "WA" }
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number): number {
  return Math.round(value);
}

function roundToNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function inferStateFromZip(zipCode: string): string {
  const zip = Number(zipCode);
  const match = ZIP_PREFIX_TO_STATE.find((row) => zip >= row.min && zip <= row.max);
  return match?.state ?? "Unknown";
}

function buildFeeRisk(zipCode: string): FeeRiskPanel {
  const state = inferStateFromZip(zipCode);
  const docFeeEstimate = STATE_DOC_FEES[state] ?? STATE_DOC_FEES.DEFAULT;

  let riskLevel: FeeRiskPanel["riskLevel"] = "Medium";
  if (docFeeEstimate <= 250) {
    riskLevel = "Low";
  } else if (docFeeEstimate >= 700) {
    riskLevel = "High";
  }

  return { state, docFeeEstimate, riskLevel };
}

function computeFinanceEstimate(input: QuoteInput): FinanceEstimate | undefined {
  if (input.purchaseMethod !== "finance") {
    return undefined;
  }

  const principal = Math.max(0, input.askingPrice - (input.downPayment ?? 0));
  const aprPercent = input.aprPercent ?? 7.5;
  const termMonths = input.loanTermMonths ?? 60;

  const monthlyRate = aprPercent / 100 / 12;
  const numerator = monthlyRate * (1 + monthlyRate) ** termMonths;
  const denominator = (1 + monthlyRate) ** termMonths - 1;
  const monthlyPayment = denominator <= 0 ? principal / termMonths : principal * (numerator / denominator);

  return {
    principal: roundMoney(principal),
    aprPercent,
    termMonths,
    monthlyPayment: roundMoney(monthlyPayment)
  };
}

function buildOfferLadder(askingPrice: number, fairLow: number, fairMid: number, fairHigh: number, indicator: PriceIndicator): OfferLadder {
  let opening = fairLow;
  let target = fairMid;
  let walkAway = fairHigh;

  if (indicator === "Overpriced") {
    opening = fairLow * 0.985;
    target = fairMid;
    walkAway = fairHigh * 1.005;
  }

  if (indicator === "Fair") {
    opening = fairLow * 0.995;
    target = fairMid;
    walkAway = Math.min(askingPrice, fairHigh * 1.01);
  }

  if (indicator === "Underpriced") {
    opening = askingPrice * 0.985;
    target = askingPrice * 0.997;
    walkAway = Math.min(fairHigh, fairMid * 1.01);
  }

  const openingOffer = roundToNearest(opening, 50);
  const targetPrice = Math.max(openingOffer, roundToNearest(target, 50));
  const walkAwayPrice = Math.max(targetPrice, roundToNearest(walkAway, 50));

  return { openingOffer, targetPrice, walkAwayPrice };
}

function buildNegotiationOpportunity(askingPrice: number, fairLow: number, fairMid: number, fairHigh: number, indicator: PriceIndicator): NegotiationOpportunity {
  const conservativeGap = Math.max(0, askingPrice - fairHigh);
  const midGap = Math.max(0, askingPrice - fairMid);
  const aggressiveGap = Math.max(0, askingPrice - fairLow);

  if (indicator === "Overpriced") {
    const low = roundToNearest(Math.max(conservativeGap, 400), 50);
    const high = roundToNearest(Math.max(aggressiveGap, low + 350), 50);

    return {
      low,
      high,
      note: "Meaningful room to negotiate if you stay disciplined on out-the-door numbers."
    };
  }

  if (indicator === "Fair") {
    const low = roundToNearest(Math.max(midGap * 0.4, 150), 50);
    const high = roundToNearest(Math.max(midGap + 250, low + 200), 50);

    return {
      low,
      high,
      note: "Moderate room. Focus on fees and accessories as much as sale price."
    };
  }

  return {
    low: 0,
    high: roundToNearest(Math.max(midGap * 0.3 + 200, 200), 50),
    note: "Limited room. Prioritize condition checks and a fast, clean close."
  };
}

function buildNegotiationScript(input: QuoteInput, offerLadder: OfferLadder, indicator: PriceIndicator): string {
  const tone = indicator === "Overpriced" ? "firm" : "professional";

  return [
    `I compared this ${input.make} ${input.model} against condition-adjusted market pricing in this ZIP area.`,
    `I can offer $${offerLadder.openingOffer.toLocaleString()} today based on mileage and price position.`,
    `My target is around $${offerLadder.targetPrice.toLocaleString()} if fees stay reasonable.`,
    `If total numbers stay above $${offerLadder.walkAwayPrice.toLocaleString()}, I will continue shopping.`,
    `I want this to stay ${tone}, quick, and transparent.`
  ].join(" ");
}

function buildWhyBullets(
  indicator: PriceIndicator,
  priceDeltaPct: number,
  feeRisk: FeeRiskPanel,
  mileageDelta: number,
  purchaseMethod: QuoteInput["purchaseMethod"],
  matchLevel: MethodologyPreview["matchLevel"],
  confidenceLabel: MethodologyPreview["confidenceLabel"]
): string[] {
  const pricingSentence =
    indicator === "Overpriced"
      ? `The asking price is ${Math.abs(priceDeltaPct).toFixed(1)}% above the modeled fair value.`
      : indicator === "Underpriced"
      ? `The asking price is ${Math.abs(priceDeltaPct).toFixed(1)}% below modeled fair value.`
      : "The asking price sits inside the modeled fair-value tolerance band.";

  const mileageSentence =
    mileageDelta > 0
      ? `Mileage is about ${Math.round(mileageDelta).toLocaleString()} miles above expected use for its age.`
      : `Mileage is favorable by about ${Math.round(Math.abs(mileageDelta)).toLocaleString()} miles versus expected use.`;

  const feeSentence = `Estimated dealer documentation fee in ${feeRisk.state} is about $${feeRisk.docFeeEstimate} (${feeRisk.riskLevel.toLowerCase()} risk).`;

  const methodSentence =
    purchaseMethod === "finance"
      ? "Negotiate vehicle price first, then loan APR and extras to avoid payment-padding."
      : purchaseMethod === "lease"
      ? "On leases, verify residual value and money factor before accepting monthly payment figures."
      : "Cash deals can use fast-close certainty to ask for a cleaner final number.";

  const confidenceSentence = `Model matching used ${matchLevel} baseline with ${confidenceLabel.toLowerCase()} confidence.`;

  return [pricingSentence, mileageSentence, feeSentence, methodSentence, confidenceSentence, DISCLAIMER];
}

function calculateConfidenceScore(input: QuoteInput, matchLevel: BaselineMatchLevel): number {
  let confidence = 10 - MATCH_PENALTY[matchLevel];

  if (!input.listingUrl) {
    confidence -= 1;
  }

  if (input.purchaseMethod === "finance") {
    if (!input.loanTermMonths || input.aprPercent === undefined) {
      confidence -= 2;
    }
  }

  if (input.purchaseMethod === "lease") {
    if (!input.leaseTermMonths || !input.leaseMilesPerYear) {
      confidence -= 2;
    }
  }

  return clamp(confidence, 1, 10);
}

function confidenceLabelFromScore(score: number): MethodologyPreview["confidenceLabel"] {
  if (score >= 8) {
    return "High";
  }

  if (score >= 5) {
    return "Medium";
  }

  return "Low";
}

export function buildReport(input: QuoteInput): ReportOutput {
  const baseline = resolveBaseline(input.make, input.model);
  const currentYear = new Date().getFullYear();

  const modelYearGap = clamp(baseline.baseYear - input.year, -1, 20);
  const expectedMileage = Math.max(0, (currentYear - input.year) * baseline.typicalMileagePerYear);
  const mileageDelta = input.mileage - expectedMileage;

  const ageAdjustedBase = baseline.basePrice * Math.exp(-baseline.depreciationPerYear * modelYearGap);
  const mileageAdjustment = Math.sign(mileageDelta) * Math.sqrt(Math.abs(mileageDelta || 0)) * baseline.pricePerMile * 150;
  const fairPriceRaw = ageAdjustedBase - mileageAdjustment;
  const fairPrice = clamp(fairPriceRaw, 2000, 250000);
  const fairBandLow = fairPrice * 0.94;
  const fairBandHigh = fairPrice * 1.06;

  const priceDiffPct = ((input.askingPrice - fairPrice) / fairPrice) * 100;

  const priceIndicator: PriceIndicator =
    input.askingPrice > fairBandHigh ? "Overpriced" : input.askingPrice < fairBandLow ? "Underpriced" : "Fair";

  const distanceFromBandPct =
    input.askingPrice > fairBandHigh
      ? ((input.askingPrice - fairBandHigh) / fairPrice) * 100
      : input.askingPrice < fairBandLow
      ? ((fairBandLow - input.askingPrice) / fairPrice) * 100
      : 0;

  let pricingFairnessScore = clamp(40 - distanceFromBandPct * 2.2, 0, 40);
  if (priceIndicator === "Underpriced") {
    pricingFairnessScore = clamp(pricingFairnessScore + 2, 0, 40);
  }

  const feeRiskPanel = buildFeeRisk(input.zipCode);
  const feeRiskScore = clamp(25 - feeRiskPanel.docFeeEstimate / 70, 0, 25);

  const leverageBase = priceIndicator === "Overpriced" ? 18 : priceIndicator === "Fair" ? 13 : 9;
  const mileageLeverageAdj = mileageDelta > 0 ? 4 : 1;
  const methodAdj = input.purchaseMethod === "cash" ? 2 : 1;
  const negotiationLeverageScore = clamp(leverageBase + mileageLeverageAdj + methodAdj, 0, 25);

  const confidenceScore = calculateConfidenceScore(input, baseline.matchLevel);
  const totalScore = clamp(
    Math.round(pricingFairnessScore + feeRiskScore + negotiationLeverageScore + confidenceScore),
    0,
    100
  );

  const offerLadder = buildOfferLadder(input.askingPrice, fairBandLow, fairPrice, fairBandHigh, priceIndicator);
  const financeEstimate = computeFinanceEstimate(input);
  const opportunity = buildNegotiationOpportunity(input.askingPrice, fairBandLow, fairPrice, fairBandHigh, priceIndicator);

  const methodologyPreview: MethodologyPreview = {
    matchLevel: humanizeMatchLevel(baseline.matchLevel),
    confidenceLabel: confidenceLabelFromScore(confidenceScore),
    vehicleSegment: humanizeSegment(baseline.segment),
    baselineReference: baseline.baselineReference,
    expectedMileage: roundMoney(expectedMileage),
    ageAdjustment: roundMoney(ageAdjustedBase - baseline.basePrice),
    mileageAdjustment: roundMoney(-mileageAdjustment)
  };

  const whyBullets = buildWhyBullets(
    priceIndicator,
    priceDiffPct,
    feeRiskPanel,
    mileageDelta,
    input.purchaseMethod,
    methodologyPreview.matchLevel,
    methodologyPreview.confidenceLabel
  );

  const topInsight =
    priceIndicator === "Overpriced"
      ? `Modeled fair value is around $${roundMoney(fairPrice).toLocaleString()}, with likely negotiation room of $${opportunity.low.toLocaleString()}-$${opportunity.high.toLocaleString()}.`
      : priceIndicator === "Underpriced"
      ? "This listing appears below market; move quickly and focus on inspection quality rather than deep discounting."
      : `This listing is in the fair-value zone, with realistic negotiation room around $${opportunity.low.toLocaleString()}-$${opportunity.high.toLocaleString()}.`;

  return {
    dealConfidenceScore: totalScore,
    priceIndicator,
    topInsight,
    whyBullets,
    fairPriceBand: {
      low: roundMoney(fairBandLow),
      mid: roundMoney(fairPrice),
      high: roundMoney(fairBandHigh)
    },
    offerLadder,
    feeRiskPanel,
    negotiationScript: buildNegotiationScript(input, offerLadder, priceIndicator),
    financeEstimate,
    negotiationOpportunity: opportunity,
    methodologyPreview,
    watermark: "Generated by Autovaro"
  };
}
