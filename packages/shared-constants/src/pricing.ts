export const PRICING = {
  BASE_FEE: 60,
  PERIPHERAL_FEE: 40,
  EXTRA_STORE_FEE: 20,
  RUNNER_SHARE: 0.75,
  PLATFORM_SHARE: 0.25,
} as const;

export function calculateFee(params: {
  isPeripheral: boolean;
  purchasedStoreCount: number;
}): {
  baseFee: number;
  peripheralFee: number;
  extraStoresFee: number;
  totalFee: number;
  runnerShare: number;
  platformShare: number;
} {
  const baseFee = PRICING.BASE_FEE;
  const peripheralFee = params.isPeripheral ? PRICING.PERIPHERAL_FEE : 0;
  const extraStoresFee =
    Math.max(0, params.purchasedStoreCount - 1) * PRICING.EXTRA_STORE_FEE;
  const totalFee = baseFee + peripheralFee + extraStoresFee;

  return {
    baseFee,
    peripheralFee,
    extraStoresFee,
    totalFee,
    runnerShare: Math.floor(totalFee * PRICING.RUNNER_SHARE),
    platformShare: Math.ceil(totalFee * PRICING.PLATFORM_SHARE),
  };
}
