/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - Official National Light Pakistan Product Catalog
 * Synchronized 100% with the Official Rate List
 */

import { NATIONAL_LIGHT_OFFICIAL_CATALOG, NationalLightItem } from './national-light-rate-card';

export interface NLinkSKU {
  id: string;
  skuCode: string;
  name: string;
  category: string;
  categoryLabel: string;
  wattage: string;
  wattageNumber: number;
  tradePrice: number; // TP in PKR
  retailPrice: number; // List Price in PKR
  discountPercentage: string;
  minimumPrice: number;
  cartonQuantity: number;
  stockInHand: number;
  colorTemperature: string;
  specification: string;
  iconName: string;
  isActive: boolean;
}

export const NLINK_OFFICIAL_PRODUCTS: NLinkSKU[] = NATIONAL_LIGHT_OFFICIAL_CATALOG.map((item: NationalLightItem) => {
  // Extract wattage number from name or spec
  const match = item.name.match(/(\d+)W/i) || item.specification.match(/(\d+)W/i);
  const wattageNum = match ? parseInt(match[1], 10) : 20;

  return {
    id: item.id,
    skuCode: item.sku,
    name: item.name,
    category: item.categoryGroup,
    categoryLabel: item.category,
    wattage: `${wattageNum}W`,
    wattageNumber: wattageNum,
    tradePrice: item.tradePrice,
    retailPrice: item.listPrice,
    discountPercentage: item.discountPercentage,
    minimumPrice: Math.round(item.listPrice * 0.95),
    cartonQuantity: item.quantityBox,
    stockInHand: item.stockCount,
    colorTemperature: item.colorTemp,
    specification: item.specification,
    iconName: item.iconName,
    isActive: true,
  };
});

export const NLINK_INITIAL_SKUS = NLINK_OFFICIAL_PRODUCTS;

export const NLINK_PRODUCT_CATEGORIES = [
  { id: 'ALL', key: 'ALL', name: 'All Categories', label: 'All Categories', icon: 'grid_view' },
  { id: 'LED_BULB', key: 'LED_BULB', name: 'LED Bulbs (E27 & B22)', label: 'LED Bulbs (E27 & B22)', icon: 'lightbulb' },
  { id: 'HIGH_WATTAGE', key: 'HIGH_WATTAGE', name: 'High Wattage (T-Bulbs)', label: 'High Wattage (T-Bulbs)', icon: 'wb_sunny' },
  { id: 'PANEL_LIGHT', key: 'PANEL_LIGHT', name: 'Panel & SMDs', label: 'Panel & SMDs', icon: 'crop_square' },
  { id: 'COB', key: 'COB', name: 'COB Spotlights', label: 'COB Spotlights', icon: 'adjust' },
  { id: 'TUBE_LIGHT', key: 'TUBE_LIGHT', name: 'Ice Tube Lights', label: 'Ice Tube Lights', icon: 'horizontal_rule' },
  { id: 'LED_ROD', key: 'LED_ROD', name: 'LED Rods 20W', label: 'LED Rods 20W', icon: 'linear_scale' },
  { id: 'FLOOD_LIGHT', key: 'FLOOD_LIGHT', name: 'Bubble Flood Lights', label: 'Bubble Flood Lights', icon: 'highlight' },
  { id: 'MINI_FLOOD', key: 'MINI_FLOOD', name: 'Mini Flood Lights', label: 'Mini Flood Lights', icon: 'flare' },
  { id: 'ADJ_ICE_PANEL', key: 'ADJ_ICE_PANEL', name: 'Adj. Ice Panels', label: 'Adj. Ice Panels', icon: 'filter_frames' },
  { id: 'PANEL_2X2', key: 'PANEL_2X2', name: '2x2 & 1x4 Panels', label: '2x2 & 1x4 Panels', icon: 'grid_4x4' },
  { id: 'ROOP_LIGHT', key: 'ROOP_LIGHT', name: 'Roop Light Coil', label: 'Roop Light Coil', icon: 'all_inclusive' },
];

