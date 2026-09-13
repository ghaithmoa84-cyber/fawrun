import { Injectable, BadRequestException } from '@nestjs/common';
import { PRICING } from '@fawrun/shared-constants';

export interface FeeResult {
  baseFee: number;
  peripheralFee: number;
  extraStoresFee: number;
  totalFee: number;
  runnerShare: number;
  platformShare: number;
}

@Injectable()
export class PricingService {
  calculateFee(params: {
    isPeripheral: boolean;
    purchasedStoreCount: number;
  }): FeeResult {
    if (
      !Number.isInteger(params.purchasedStoreCount) ||
      params.purchasedStoreCount < 0
    ) {
      throw new BadRequestException(
        'purchasedStoreCount must be a non-negative integer',
      );
    }

    const baseFee = PRICING.BASE_FEE;
    const peripheralFee = params.isPeripheral
      ? PRICING.PERIPHERAL_FEE
      : 0;
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
}
