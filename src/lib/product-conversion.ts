/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Centralized Product & SKU Packaging Conversion Utility
 * Prevents duplication of units ⇄ packs ⇄ cartons/bags conversion mathematics.
 */

export interface PackagingBreakdown {
  cartons: number;
  packs: number;
  units: number;
}

/**
 * Calculates raw unit quantities from carton, pack, and loose unit values.
 */
export function cartonsAndPacksToUnits(
  cartons: number,
  packs: number,
  units: number,
  unitsPerPack: number = 1,
  packsPerCarton: number = 1
): number {
  const unitsPerCtn = unitsPerPack * packsPerCarton;
  const totalFromCartons = (cartons || 0) * unitsPerCtn;
  const totalFromPacks = (packs || 0) * unitsPerPack;
  return totalFromCartons + totalFromPacks + (units || 0);
}

/**
 * Deconstructs raw unit quantities into cartons, packs, and loose units.
 */
export function unitsToCartonsAndPacks(
  totalUnits: number,
  unitsPerPack: number = 1,
  packsPerCarton: number = 1
): PackagingBreakdown {
  const unitsPerCtn = unitsPerPack * packsPerCarton;
  
  let remaining = Math.max(0, totalUnits);
  
  const cartons = unitsPerCtn > 0 ? Math.floor(remaining / unitsPerCtn) : 0;
  remaining = unitsPerCtn > 0 ? remaining % unitsPerCtn : remaining;
  
  const packs = unitsPerPack > 0 ? Math.floor(remaining / unitsPerPack) : 0;
  const units = unitsPerPack > 0 ? remaining % unitsPerPack : remaining;
  
  return { cartons, packs, units };
}

/**
 * Formats a raw unit quantity into a localized, professional packaging string.
 * Example: "10 Ctn, 2 Pk, 5 Pcs" or "15 Bags, 8 Pcs"
 */
export function formatPackaging(
  totalUnits: number,
  unitsPerPack: number = 1,
  packsPerCarton: number = 1,
  packagingName: string = 'Carton'
): string {
  const { cartons, packs, units } = unitsToCartonsAndPacks(totalUnits, unitsPerPack, packsPerCarton);
  const parts: string[] = [];
  
  const pkgLabel = packagingName || 'Carton';
  
  if (cartons > 0) {
    parts.push(`${cartons} ${cartons === 1 ? pkgLabel : pkgLabel + 's'}`);
  }
  if (packs > 0) {
    parts.push(`${packs} Pk${packs > 1 ? 's' : ''}`);
  }
  if (units > 0 || parts.length === 0) {
    parts.push(`${units} Pc${units !== 1 ? 's' : ''}`);
  }
  
  return parts.join(', ');
}

/**
 * Calculates total carton/bag equivalent for logistical weight and shipping measurements.
 */
export function unitsToCartonFraction(
  totalUnits: number,
  unitsPerPack: number = 1,
  packsPerCarton: number = 1
): number {
  const unitsPerCtn = unitsPerPack * packsPerCarton;
  if (!unitsPerCtn) return 0;
  return totalUnits / unitsPerCtn;
}
