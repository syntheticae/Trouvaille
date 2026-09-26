/**
 * Monte Carlo & FIRE (Financial Independence, Retire Early) Stochastic Simulation Engine
 * 
 * Implements Geometric Brownian Motion with lognormal monthly return distributions,
 * computing multi-percentile confidence bands (P10, P25, P50, P75, P90),
 * Sequence of Returns Risk (SORR) stress shocks, and FIRE milestone projections.
 */

export interface MonteCarloConfig {
  initialNetWorth: number;
  monthlyContribution: number;
  annualExpenses: number;
  years?: number; // default 20
  expectedAnnualReturn?: number; // e.g. 0.085 for 8.5%
  annualVolatility?: number; // e.g. 0.15 for 15%
  annualInflation?: number; // e.g. 0.035 for 3.5%
  safeWithdrawalRate?: number; // e.g. 0.04 for 4%
  iterations?: number; // default 1000
  earlyShock?: boolean; // simulates a -25% market crash in Year 1
  language?: "en" | "id";
}

export interface YearlyPercentiles {
  year: number;
  p10: number; // Bear / Stress scenario
  p25: number;
  p50: number; // Median / Most probable scenario
  p75: number;
  p90: number; // Bull / Optimistic scenario
  fireTarget: number;
}

export interface FireMilestone {
  type: "lean" | "standard" | "fat" | "coast";
  label: string;
  description: string;
  targetAmount: number;
  currentProgressPct: number;
  isAchieved: boolean;
  estimatedYearsMedian: number | null; // null if not achieved within horizon
  estimatedYearsBear: number | null;
  estimatedYearsBull: number | null;
}

export interface MonteCarloSimulationResult {
  config: Required<MonteCarloConfig>;
  yearlyTrajectory: YearlyPercentiles[];
  terminalValues: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  fireMilestones: {
    lean: FireMilestone;
    standard: FireMilestone;
    fat: FireMilestone;
    coast: FireMilestone;
  };
  successRate: number; // 0 - 100 (%)
  resilienceRating: "Exceptional" | "High Resilience" | "Moderate" | "Vulnerable" | "Critical";
  sequenceOfReturnsImpact: {
    terminalDifference: number;
    terminalPercentageLoss: number;
  } | null;
  insights: string[];
}

/**
 * Box-Muller transform producing two standard normal variates N(0, 1)
 */
function generateStandardNormal(): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Runs a 1,000-path Monte Carlo stochastic simulation over the specified horizon.
 */
export function runMonteCarloSimulation(
  rawConfig: MonteCarloConfig
): MonteCarloSimulationResult {
  const config: Required<MonteCarloConfig> = {
    initialNetWorth: Math.max(0, rawConfig.initialNetWorth),
    monthlyContribution: Math.max(0, rawConfig.monthlyContribution),
    annualExpenses: Math.max(1000000, rawConfig.annualExpenses),
    years: Math.min(40, Math.max(5, rawConfig.years ?? 20)),
    expectedAnnualReturn: Math.max(0.01, Math.min(0.30, rawConfig.expectedAnnualReturn ?? 0.085)),
    annualVolatility: Math.max(0.01, Math.min(0.50, rawConfig.annualVolatility ?? 0.15)),
    annualInflation: Math.max(0.0, Math.min(0.20, rawConfig.annualInflation ?? 0.035)),
    safeWithdrawalRate: Math.max(0.02, Math.min(0.10, rawConfig.safeWithdrawalRate ?? 0.04)),
    iterations: Math.min(2500, Math.max(100, rawConfig.iterations ?? 1000)),
    earlyShock: Boolean(rawConfig.earlyShock),
    language: rawConfig.language ?? "en",
  };

  const {
    initialNetWorth,
    monthlyContribution,
    annualExpenses,
    years,
    expectedAnnualReturn,
    annualVolatility,
    annualInflation,
    safeWithdrawalRate,
    iterations,
    earlyShock,
  } = config;

  // Real annualized return adjusting for inflation
  const realAnnualReturn = (1 + expectedAnnualReturn) / (1 + annualInflation) - 1;

  // Monthly parameters for Geometric Brownian Motion
  const monthlyDrift = (realAnnualReturn - 0.5 * annualVolatility * annualVolatility) / 12;
  const monthlyVol = annualVolatility / Math.sqrt(12);

  // Pre-allocate paths matrix: [iteration][year]
  const paths: number[][] = Array.from({ length: iterations }, () =>
    new Array(years + 1).fill(0)
  );

  // Set Year 0
  for (let i = 0; i < iterations; i++) {
    paths[i][0] = initialNetWorth;
  }

  // Simulate monthly compounding across all iterations
  for (let i = 0; i < iterations; i++) {
    let currentCapital = initialNetWorth;

    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        const z = generateStandardNormal();
        const monthlyReturn = Math.exp(monthlyDrift + monthlyVol * z) - 1;

        // Apply Sequence of Returns Risk shock in Year 1 if earlyShock is active
        let adjustedReturn = monthlyReturn;
        if (earlyShock && y === 1 && m === 6) {
          adjustedReturn = -0.25; // 25% single-month market drawdown
        }

        currentCapital = Math.max(
          0,
          (currentCapital + monthlyContribution) * (1 + adjustedReturn)
        );
      }
      paths[i][y] = currentCapital;
    }
  }

  // FIRE Milestones Numbers
  const standardFireTarget = Math.round(annualExpenses / safeWithdrawalRate);
  const leanFireTarget = Math.round(standardFireTarget * 0.7);
  const fatFireTarget = Math.round(standardFireTarget * 1.4);
  const coastFireTarget = Math.round(
    standardFireTarget / Math.pow(1 + Math.max(0.01, realAnnualReturn), years)
  );

  // Compute Percentile Trajectory per year
  const yearlyTrajectory: YearlyPercentiles[] = [];

  for (let y = 0; y <= years; y++) {
    const valuesAtYear = paths.map((p) => p[y]).sort((a, b) => a - b);

    const p10 = getPercentile(valuesAtYear, 10);
    const p25 = getPercentile(valuesAtYear, 25);
    const p50 = getPercentile(valuesAtYear, 50);
    const p75 = getPercentile(valuesAtYear, 75);
    const p90 = getPercentile(valuesAtYear, 90);

    yearlyTrajectory.push({
      year: y,
      p10,
      p25,
      p50,
      p75,
      p90,
      fireTarget: standardFireTarget,
    });
  }

  // Terminal values
  const terminalValues = {
    p10: yearlyTrajectory[years].p10,
    p25: yearlyTrajectory[years].p25,
    p50: yearlyTrajectory[years].p50,
    p75: yearlyTrajectory[years].p75,
    p90: yearlyTrajectory[years].p90,
  };

  // Helper to find estimated year when a percentile hits a target
  const findYearThreshold = (percentileKey: "p10" | "p50" | "p90", target: number): number | null => {
    if (initialNetWorth >= target) return 0;
    for (let y = 1; y <= years; y++) {
      if (yearlyTrajectory[y][percentileKey] >= target) {
        // Interpolate fractional year for smoother estimate
        const prev = yearlyTrajectory[y - 1][percentileKey];
        const curr = yearlyTrajectory[y][percentileKey];
        if (curr === prev) return y;
        const frac = Math.max(0, Math.min(1, (target - prev) / (curr - prev)));
        return Number((y - 1 + frac).toFixed(1));
      }
    }
    return null;
  };

  const isId = rawConfig.language === "id";

  // Milestone objects
  const leanMilestone: FireMilestone = {
    type: "lean",
    label: "Lean FIRE",
    description: isId
      ? "Mencakup kebutuhan pokok esensial (70% dari pengeluaran saat ini)."
      : "Covers essential baseline living expenses (70% of current spend).",
    targetAmount: leanFireTarget,
    currentProgressPct: Math.min(100, Number(((initialNetWorth / leanFireTarget) * 100).toFixed(1))),
    isAchieved: initialNetWorth >= leanFireTarget,
    estimatedYearsMedian: findYearThreshold("p50", leanFireTarget),
    estimatedYearsBear: findYearThreshold("p10", leanFireTarget),
    estimatedYearsBull: findYearThreshold("p90", leanFireTarget),
  };

  const standardMilestone: FireMilestone = {
    type: "standard",
    label: "Standard FIRE",
    description: isId
      ? "Kemandirian finansial penuh mempertahankan 100% gaya hidup saat ini."
      : "Full financial independence maintaining 100% of current lifestyle.",
    targetAmount: standardFireTarget,
    currentProgressPct: Math.min(100, Number(((initialNetWorth / standardFireTarget) * 100).toFixed(1))),
    isAchieved: initialNetWorth >= standardFireTarget,
    estimatedYearsMedian: findYearThreshold("p50", standardFireTarget),
    estimatedYearsBear: findYearThreshold("p10", standardFireTarget),
    estimatedYearsBull: findYearThreshold("p90", standardFireTarget),
  };

  const fatMilestone: FireMilestone = {
    type: "fat",
    label: "Fat FIRE",
    description: isId
      ? "Memberikan buffer kemewahan, perjalanan internasional, dan dana cadangan melimpah (140%)."
      : "Affords luxury buffer, international travel, and generous contingencies (140%).",
    targetAmount: fatFireTarget,
    currentProgressPct: Math.min(100, Number(((initialNetWorth / fatFireTarget) * 100).toFixed(1))),
    isAchieved: initialNetWorth >= fatFireTarget,
    estimatedYearsMedian: findYearThreshold("p50", fatFireTarget),
    estimatedYearsBear: findYearThreshold("p10", fatFireTarget),
    estimatedYearsBull: findYearThreshold("p90", fatFireTarget),
  };

  const coastMilestone: FireMilestone = {
    type: "coast",
    label: "Coast FIRE",
    description: isId
      ? "Modal yang dibutuhkan hari ini untuk tumbuh menjadi Standard FIRE pada akhir horizon tanpa tambahan tabungan."
      : "Capital needed today to compound into Standard FIRE by horizon without more savings.",
    targetAmount: coastFireTarget,
    currentProgressPct: Math.min(100, Number(((initialNetWorth / coastFireTarget) * 100).toFixed(1))),
    isAchieved: initialNetWorth >= coastFireTarget,
    estimatedYearsMedian: initialNetWorth >= coastFireTarget ? 0 : null,
    estimatedYearsBear: null,
    estimatedYearsBull: null,
  };

  // Success Rate Calculation
  // Success is defined as either:
  // 1) Reaching the Standard FIRE target at or before terminal year, OR
  // 2) Terminal capital >= Standard FIRE Target
  let successCount = 0;
  for (let i = 0; i < iterations; i++) {
    const hasReached = paths[i].some((val) => val >= standardFireTarget);
    if (hasReached || paths[i][years] >= standardFireTarget) {
      successCount++;
    }
  }
  const successRate = Math.round((successCount / iterations) * 100);

  // Resilience Rating
  let resilienceRating: MonteCarloSimulationResult["resilienceRating"] = "Moderate";
  if (successRate >= 90) resilienceRating = "Exceptional";
  else if (successRate >= 75) resilienceRating = "High Resilience";
  else if (successRate >= 50) resilienceRating = "Moderate";
  else if (successRate >= 25) resilienceRating = "Vulnerable";
  else resilienceRating = "Critical";

  // Sequence of Returns Risk shock assessment
  let sequenceOfReturnsImpact: MonteCarloSimulationResult["sequenceOfReturnsImpact"] = null;
  if (earlyShock) {
    // Run an un-shocked baseline simulation with identical parameters for comparison
    const unshocked = runMonteCarloSimulation({
      ...rawConfig,
      earlyShock: false,
    });
    const diff = unshocked.terminalValues.p50 - terminalValues.p50;
    const pct = unshocked.terminalValues.p50 > 0 ? (diff / unshocked.terminalValues.p50) * 100 : 0;
    sequenceOfReturnsImpact = {
      terminalDifference: diff,
      terminalPercentageLoss: Number(pct.toFixed(1)),
    };
  }

  // Generate actionable, plain English insights
  const insights: string[] = [];

  if (standardMilestone.isAchieved) {
    insights.push(
      isId
        ? "Kekayaan bersih Anda saat ini telah melampaui angka Standard FIRE. Fokus utama Anda adalah pelestarian modal dan distribusi yang efisien pajak."
        : "Your current net worth already surpasses your Standard FIRE number. Your primary focus is capital preservation and optimal tax-efficient distribution."
    );
  } else if (standardMilestone.estimatedYearsMedian !== null) {
    insights.push(
      isId
        ? `Pada tingkat tabungan Anda saat ini, Anda diproyeksikan mencapai Kemandirian Finansial penuh dalam sekitar ${standardMilestone.estimatedYearsMedian} tahun dalam kondisi pasar yang diharapkan.`
        : `At your current savings rate, you are projected to reach full Financial Independence in approximately ${standardMilestone.estimatedYearsMedian} years in expected market conditions.`
    );
  } else {
    insights.push(
      isId
        ? `Berdasarkan tingkat kontribusi saat ini, pencapaian Standard FIRE melampaui horizon ${years} tahun. Meningkatkan tabungan bulanan sebesar 20% akan mempercepat garis waktu ini secara signifikan.`
        : `Under current contribution levels, achieving Standard FIRE extends beyond the ${years}-year horizon. Boosting monthly savings by 20% would dramatically compress this timeline.`
    );
  }

  if (terminalValues.p10 > 0) {
    insights.push(
      isId
        ? "Dalam pasar bear persentil ke-10 yang konservatif, modal akhir Anda mempertahankan solvabilitas struktural yang kuat, membuktikan ketahanan tinggi terhadap stagnasi pasar yang berkepanjangan."
        : "In a conservative 10th-percentile bear market, your terminal capital retains strong structural solvency, evidencing high resilience against prolonged market stagnation."
    );
  } else {
    insights.push(
      isId
        ? "Dalam pasar bear yang parah, penurunan modal mungkin terjadi sebelum akhir horizon. Pertimbangkan untuk mendiversifikasi kelas aset untuk menekan volatilitas."
        : "In a severe bear market, capital depletion is possible before the horizon. Consider diversifying asset classes to curtail volatility."
    );
  }

  if (coastMilestone.isAchieved) {
    insights.push(
      isId
        ? "Anda telah mencapai Coast FIRE. Bahkan jika Anda menghentikan kontribusi pensiun mulai hari ini, saldo yang ada diproyeksikan akan berkembang menjadi target FIRE penuh Anda."
        : "You have achieved Coast FIRE. Even if you pause further retirement contributions today, your existing balance is projected to compound into your full FIRE number."
    );
  }

  return {
    config,
    yearlyTrajectory,
    terminalValues,
    fireMilestones: {
      lean: leanMilestone,
      standard: standardMilestone,
      fat: fatMilestone,
      coast: coastMilestone,
    },
    successRate,
    resilienceRating,
    sequenceOfReturnsImpact,
    insights,
  };
}

/**
 * Percentile helper for an ascending sorted array
 */
function getPercentile(sortedArr: number[], percentile: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (percentile / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Math.round(sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight);
}
