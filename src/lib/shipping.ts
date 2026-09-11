export const PICKUP_PINCODE = '562130'; // Kamadhenu Honey Farms, Taverekere, Bangalore South

export interface CartItemForShipping {
  productId: string;
  weightVariant: string; // '250g', '500g', '1kg'
  quantity: number;
}

export interface ShippingCalculationResult {
  serviceable: boolean;
  shippingFee: number;
  courierName: string;
  estimatedDays: string;
  error?: string;
}

/**
 * Calculates total gross package weight (in kg) including safe honey jar packaging.
 */
export function calculateGrossWeightKg(items: CartItemForShipping[]): number {
  let totalKg = 0;
  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    let itemKg = 0.5; // default 500g

    if (item.weightVariant === '250g') {
      itemKg = 0.35; // 250g net + 100g glass jar packaging
    } else if (item.weightVariant === '500g') {
      itemKg = 0.65; // 500g net + 150g glass jar packaging
    } else if (item.weightVariant === '1kg') {
      itemKg = 1.30; // 1kg net + 300g glass jar packaging
    }

    totalKg += itemKg * qty;
  }
  return Math.round(totalKg * 100) / 100;
}

/**
 * In-memory token cache for Shiprocket API
 */
let shiprocketToken: string | null = null;
let shiprocketTokenExpiry: number = 0;

async function getShiprocketToken(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const directToken = process.env.SHIPROCKET_TOKEN;

  if (directToken) return directToken;
  if (!email || !password) return null;

  const now = Date.now();
  if (shiprocketToken && now < shiprocketTokenExpiry) {
    return shiprocketToken;
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.token) {
      shiprocketToken = data.token;
      shiprocketTokenExpiry = now + 9 * 24 * 60 * 60 * 1000; // 9 days cache
      return shiprocketToken;
    }
  } catch (err) {
    console.error('Failed to authenticate with Shiprocket API', err);
  }
  return null;
}

/**
 * Queries Shiprocket Serviceability API for lowest valid forward shipping rate
 */
async function calculateShiprocketRate(
  deliveryPincode: string,
  weightKg: number
): Promise<ShippingCalculationResult | null> {
  const token = await getShiprocketToken();
  if (!token) return null;

  try {
    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${PICKUP_PINCODE}&delivery_postcode=${deliveryPincode}&weight=${weightKg}&cod=0`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status === 200 && data.data && data.data.available_courier_companies?.length > 0) {
      // Find lowest rate among serviceable forward couriers
      const validCouriers = data.data.available_courier_companies.filter((c: any) => c.rate > 0);
      if (validCouriers.length > 0) {
        validCouriers.sort((a: any, b: any) => a.rate - b.rate);
        const best = validCouriers[0];
        return {
          serviceable: true,
          shippingFee: Math.round(Number(best.rate)),
          courierName: `Shiprocket (${best.courier_name})`,
          estimatedDays: best.etd || '2-4 Business Days',
        };
      }
    }
  } catch (err) {
    console.warn('Shiprocket query failed, falling back to Zonal engine', err);
  }

  return null;
}

/**
 * Zonal Distance Engine for Indian Pincodes
 */
function calculateZonalRate(
  deliveryPincode: string,
  weightKg: number
): ShippingCalculationResult {
  const cleaned = deliveryPincode.trim();

  // Validate 6-digit Indian pincode format
  if (!/^[1-9][0-9]{5}$/.test(cleaned)) {
    return {
      serviceable: false,
      shippingFee: 0,
      courierName: 'Standard Courier',
      estimatedDays: '',
      error: 'Please enter a valid 6-digit delivery pincode',
    };
  }

  const prefix2 = cleaned.substring(0, 2);
  const prefix3 = cleaned.substring(0, 3);
  const extraWeightKg = Math.max(0, weightKg - 0.5);
  const extraHalfKgs = Math.ceil(extraWeightKg / 0.5);

  // Zone 1: Bangalore City & Rural (560xxx, 562xxx)
  if (prefix3 === '560' || prefix3 === '562') {
    const fee = 50 + extraHalfKgs * 20;
    return {
      serviceable: true,
      shippingFee: Math.round(fee),
      courierName: 'Bangalore Express Courier',
      estimatedDays: '1-2 Days (Express Delivery)',
    };
  }

  // Zone 2: Rest of Karnataka (56xxxx, 57xxxx, 58xxxx, 59xxxx)
  if (['56', '57', '58', '59'].includes(prefix2)) {
    const fee = 75 + extraHalfKgs * 25;
    return {
      serviceable: true,
      shippingFee: Math.round(fee),
      courierName: 'Karnataka Regional Courier',
      estimatedDays: '2-3 Business Days',
    };
  }

  // Zone 3: South India (Andhra/Telangana 50-53, Tamil Nadu 60-64, Kerala 67-69)
  const isSouthIndia =
    (Number(prefix2) >= 50 && Number(prefix2) <= 53) ||
    (Number(prefix2) >= 60 && Number(prefix2) <= 64) ||
    (Number(prefix2) >= 67 && Number(prefix2) <= 69);

  if (isSouthIndia) {
    const fee = 95 + extraHalfKgs * 35;
    return {
      serviceable: true,
      shippingFee: Math.round(fee),
      courierName: 'South India Inter-State Courier',
      estimatedDays: '3-4 Business Days',
    };
  }

  // Zone 4: Rest of India
  const fee = 125 + extraHalfKgs * 45;
  return {
    serviceable: true,
    shippingFee: Math.round(fee),
    courierName: 'National All-India Courier',
    estimatedDays: '4-6 Business Days',
  };
}

/**
 * Main Shipping Calculation Function
 */
export async function calculateShippingCharge(
  deliveryPincode: string,
  items: CartItemForShipping[]
): Promise<ShippingCalculationResult> {
  const weightKg = calculateGrossWeightKg(items);

  // Try live Shiprocket rate first if credentials exist
  const shiprocketResult = await calculateShiprocketRate(deliveryPincode, weightKg);
  if (shiprocketResult) {
    return shiprocketResult;
  }

  // Fallback to verified zonal pricing engine
  return calculateZonalRate(deliveryPincode, weightKg);
}
