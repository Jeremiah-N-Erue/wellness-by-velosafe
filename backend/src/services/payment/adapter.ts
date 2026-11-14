// Payment provider adapter interface.
//
// WHY THIS EXISTS: MoMo, ZaloPay and VNPay all require a Vietnamese merchant entity to
// onboard, which doesn't exist yet (see docs/architecture.md). Interestingly, the reverse
// problem doesn't hold for Nigeria — Velosafe Technologies Ltd IS Nigerian-registered, so
// Paystack/Flutterwave are realistically closer to reach there. Either way, nothing here
// pretends to be live until it actually is: every provider implements the same interface,
// and only MockPaymentProvider is wired to actually run right now. Standing up a real
// integration for either country later means writing one more class and flipping an env
// var — not touching booking/credit logic at all.

export interface ChargeRequest {
  amount: number;
  currency: string; // ISO 4217, e.g. "VND", "NGN"
  userId: string;
  creditPackId: string;
  description: string;
}

export interface ChargeResult {
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  externalRef: string;
}

export type PaymentProviderName = "MOCK" | "MOMO" | "ZALOPAY" | "VNPAY" | "PAYSTACK" | "FLUTTERWAVE";

export interface PaymentProviderAdapter {
  readonly name: PaymentProviderName;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/** Always succeeds instantly. This is what actually runs in the MVP today, for every market. */
export class MockPaymentProvider implements PaymentProviderAdapter {
  readonly name = "MOCK" as const;

  async charge(_req: ChargeRequest): Promise<ChargeResult> {
    const externalRef = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return { status: "SUCCEEDED", externalRef };
  }
}

/**
 * Not implemented. Placeholder for when a Vietnamese merchant entity exists and a real
 * MoMo merchant API key is available. Left here so the swap is obvious and contained.
 */
export class MomoPaymentProvider implements PaymentProviderAdapter {
  readonly name = "MOMO" as const;
  async charge(_req: ChargeRequest): Promise<ChargeResult> {
    throw new Error(
      "MoMo integration requires a Vietnamese merchant account, which requires a " +
        "Vietnamese legal entity that does not yet exist. See docs/architecture.md."
    );
  }
}

export class ZaloPayPaymentProvider implements PaymentProviderAdapter {
  readonly name = "ZALOPAY" as const;
  async charge(_req: ChargeRequest): Promise<ChargeResult> {
    throw new Error("ZaloPay integration not yet available — see docs/architecture.md.");
  }
}

export class VnPayPaymentProvider implements PaymentProviderAdapter {
  readonly name = "VNPAY" as const;
  async charge(_req: ChargeRequest): Promise<ChargeResult> {
    throw new Error("VNPay integration not yet available — see docs/architecture.md.");
  }
}

/**
 * Not implemented, but much closer to reachable than the Vietnamese rails: Velosafe
 * Technologies Ltd is itself a Nigerian-registered entity, so a real Paystack merchant
 * account doesn't require forming a new company first — just API keys and the usual
 * Paystack business verification. See docs/architecture.md.
 */
export class PaystackPaymentProvider implements PaymentProviderAdapter {
  readonly name = "PAYSTACK" as const;
  async charge(_req: ChargeRequest): Promise<ChargeResult> {
    throw new Error(
      "Paystack integration not yet wired up (no API keys configured yet), though Velosafe's " +
        "own Nigerian registration means this is realistically closer than the Vietnamese rails. " +
        "See docs/architecture.md."
    );
  }
}

export class FlutterwavePaymentProvider implements PaymentProviderAdapter {
  readonly name = "FLUTTERWAVE" as const;
  async charge(_req: ChargeRequest): Promise<ChargeResult> {
    throw new Error("Flutterwave integration not yet available — see docs/architecture.md.");
  }
}

export function getActivePaymentProvider(): PaymentProviderAdapter {
  const configured = (process.env.PAYMENT_PROVIDER || "MOCK").toUpperCase();
  switch (configured) {
    case "MOMO":
      return new MomoPaymentProvider();
    case "ZALOPAY":
      return new ZaloPayPaymentProvider();
    case "VNPAY":
      return new VnPayPaymentProvider();
    case "PAYSTACK":
      return new PaystackPaymentProvider();
    case "FLUTTERWAVE":
      return new FlutterwavePaymentProvider();
    default:
      return new MockPaymentProvider();
  }
}
