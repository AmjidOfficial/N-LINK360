/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * N-LINK 360 - National Hierarchy, Market Beats & Universal Team Designations
 */

export interface HierarchyRegion {
  name: string;
  code: string;
  areas: {
    name: string;
    towns: {
      name: string;
      beats: string[];
    }[];
  }[];
}

export const HIERARCHY_REGIONS_DATA: HierarchyRegion[] = [
  {
    name: 'Punjab Central',
    code: 'PB-CEN',
    areas: [
      {
        name: 'Lahore Division',
        towns: [
          {
            name: 'Lahore',
            beats: [
              'Brandreth Road Auto Market',
              'Montgomery Road Beat',
              'Badami Bagh Auto Market',
              'Multan Road Commercial Beat',
              'Ferozepur Road Auto Zone',
              'DHA & Walton Beat',
              'Township & Kot Lakhpat Market',
            ],
          },
          {
            name: 'Kasur',
            beats: ['Railway Road Market', 'Kutchery Road Beat', 'Raja Bazaar'],
          },
          {
            name: 'Sheikhupura',
            beats: ['Lahore Road Auto Beat', 'Bhatti Chowk Market', 'Housing Colony Beat'],
          },
          {
            name: 'Nankana Sahib',
            beats: ['Main Bazaar Beat', 'Gurdwara Road Auto Hub'],
          },
        ],
      },
      {
        name: 'Gujranwala Division',
        towns: [
          {
            name: 'Gujranwala',
            beats: [
              'Small Industrial Estate Beat',
              'G.T Road Market',
              'Rail Bazaar Beat',
              'Circular Road Beat',
              'Nowshera Road Auto Zone',
            ],
          },
          {
            name: 'Sialkot',
            beats: ['Kutchery Road Auto Market', 'Small Industries Estate Sialkot', 'Daska Road Beat'],
          },
          {
            name: 'Gujrat',
            beats: ['Rehman Shaheed Road Beat', 'Circular Road Gujrat', 'Kunjah Road Beat'],
          },
          {
            name: 'Wazirabad',
            beats: ['Sialkot Road Beat', 'Main Bazaar Wazirabad'],
          },
        ],
      },
      {
        name: 'Faisalabad Division',
        towns: [
          {
            name: 'Faisalabad',
            beats: ['Katchery Bazaar Auto Market', 'Jhang Road Market', 'Sargodha Road Beat', 'Samundri Road Beat'],
          },
          {
            name: 'Jhang',
            beats: ['Shaheed Road Auto Beat', 'Session Chowk Market'],
          },
          {
            name: 'Toba Tek Singh',
            beats: ['Shorkot Road Beat', 'Main Auto Market Toba'],
          },
        ],
      },
    ],
  },
  {
    name: 'Punjab North',
    code: 'PB-NOR',
    areas: [
      {
        name: 'Rawalpindi Division',
        towns: [
          {
            name: 'Rawalpindi',
            beats: [
              'Gawalmandi Auto Market',
              'Kashmir Road Commercial Beat',
              'Saddar Auto Market',
              'Peshawar Road Beat',
              'Pirwadhai Auto Spares Beat',
            ],
          },
          {
            name: 'Wah Cantt',
            beats: ['Aslam Market Beat', 'Lala Rukh Auto Hub'],
          },
          {
            name: 'Gujar Khan',
            beats: ['G.T Road Gujar Khan Beat', 'Railway Road Market'],
          },
        ],
      },
      {
        name: 'Islamabad Capital Territory',
        towns: [
          {
            name: 'Islamabad',
            beats: ['I-9 / I-10 Industrial Area', 'Blue Area Commercial Beat', 'G-9 Karachi Company Auto Market', 'G-8 Markaz Auto Zone'],
          },
          {
            name: 'Rawat',
            beats: ['Industrial Triangle Kahuta Road', 'Main G.T Road Rawat Hub'],
          },
        ],
      },
      {
        name: 'Attock Zone',
        towns: [
          {
            name: 'Attock',
            beats: ['Main City Bazaar Attock', 'Kamra Road Beat'],
          },
          {
            name: 'Hassan Abdal',
            beats: ['G.T Road Hub', 'Hazara Road Beat'],
          },
        ],
      },
    ],
  },
  {
    name: 'Punjab South',
    code: 'PB-SOU',
    areas: [
      {
        name: 'Multan Division',
        towns: [
          {
            name: 'Multan',
            beats: ['Haram Gate Auto Market', 'Bosan Road Commercial Beat', 'Chungi #9 Beat', 'Vehari Road Industrial Beat'],
          },
          {
            name: 'Khanewal',
            beats: ['Lahore Mor Beat', 'Civil Lines Auto Market'],
          },
          {
            name: 'Vehari',
            beats: ['Club Road Auto Beat', 'Karkhana Bazaar'],
          },
        ],
      },
      {
        name: 'Bahawalpur Division',
        towns: [
          {
            name: 'Bahawalpur',
            beats: ['Circular Road Auto Market', 'Model Town Beat', 'Ahmedpur East Hub'],
          },
          {
            name: 'Rahim Yar Khan',
            beats: ['Factory Area Beat', 'Shahi Road Auto Market', 'Sadiqabad Bypass Beat'],
          },
        ],
      },
    ],
  },
  {
    name: 'Sindh South',
    code: 'SN-SOU',
    areas: [
      {
        name: 'Karachi South & Central',
        towns: [
          {
            name: 'Karachi',
            beats: [
              'Plaza Auto Market (M.A. Jinnah Road)',
              'Shershah Auto Spares Beat',
              'SITE Industrial Area Hub',
              'Saddar Auto Market',
              'Korangi Industrial Beat',
              'North Nazimabad Auto Beat',
            ],
          },
        ],
      },
      {
        name: 'Hyderabad Division',
        towns: [
          {
            name: 'Hyderabad',
            beats: ['Station Road Auto Market', 'Auto Bhan Road Commercial Beat', 'Latifabad Unit 7 Market'],
          },
          {
            name: 'Kotri',
            beats: ['SITE Kotri Industrial Beat', 'Main Bazaar Kotri'],
          },
          {
            name: 'Mirpur Khas',
            beats: ['Hyderabad Road Beat', 'Station Chowk Auto Market'],
          },
        ],
      },
    ],
  },
  {
    name: 'KPK West',
    code: 'KP-WES',
    areas: [
      {
        name: 'Peshawar Division',
        towns: [
          {
            name: 'Peshawar',
            beats: [
              'Karkhano Market Beat (Jamrud Road)',
              'Ashraf Road Auto Spares Market',
              'Sadar Road Commercial Beat',
              'Ring Road Auto Hub',
              'Hayatabad Industrial Estate',
            ],
          },
          {
            name: 'Charsadda',
            beats: ['Mardan Road Charsadda', 'Main Bazaar Beat'],
          },
          {
            name: 'Nowshera',
            beats: ['G.T Road Nowshera Cantt', 'Risalpur Chowk Market'],
          },
        ],
      },
      {
        name: 'Mardan & Hazara Division',
        towns: [
          {
            name: 'Mardan',
            beats: ['Bank Road Mardan Auto Beat', 'Charsadda Chowk Market'],
          },
          {
            name: 'Abbottabad',
            beats: ['Mansehra Road Auto Beat', 'Supply Bazaar Abbottabad'],
          },
          {
            name: 'Mingora (Swat)',
            beats: ['Green Chowk Auto Market', 'Saidu Sharif Road Beat'],
          },
        ],
      },
    ],
  },
  {
    name: 'Balochistan',
    code: 'BL-WES',
    areas: [
      {
        name: 'Quetta & Hub Zone',
        towns: [
          {
            name: 'Quetta',
            beats: ['Liaquat Bazaar Auto Beat', 'Jinnah Road Auto Hub', 'Sirki Road Spares Market', 'Patel Road Beat'],
          },
          {
            name: 'Hub',
            beats: ['Hub Industrial Area', 'RCD Highway Auto Beat'],
          },
        ],
      },
    ],
  },
  {
    name: 'Federal Capital',
    code: 'IS-FED',
    areas: [
      {
        name: 'Islamabad Metro Hub',
        towns: [
          {
            name: 'Islamabad',
            beats: ['I-9 / I-10 Auto Spares Hub', 'Blue Area Central', 'G-9 Markaz Auto Hub'],
          },
        ],
      },
    ],
  },
];

/**
 * Universal Team Members across ALL Designations for Full Role Assignment Parity
 */
export interface AssignedStaffMember {
  id: string;
  name: string;
  role: string;
  designation: string;
  region: string;
  area: string;
  phone: string;
  email: string;
}

export const ALL_DESIGNATIONS_TEAM: AssignedStaffMember[] = [
  {
    id: 'EMP-001',
    name: 'Ali Raza',
    role: 'TSM',
    designation: 'Territory Sales Manager (Central Lahore)',
    region: 'Punjab Central',
    area: 'Lahore Division',
    phone: '+92 300 4123456',
    email: 'ali.raza@nationallights.com',
  },
  {
    id: 'EMP-002',
    name: 'Muhammad Usman',
    role: 'TSM',
    designation: 'Territory Sales Manager (Gujranwala & Sialkot)',
    region: 'Punjab Central',
    area: 'Gujranwala Division',
    phone: '+92 301 5234567',
    email: 'm.usman@nationallights.com',
  },
  {
    id: 'EMP-003',
    name: 'Farhan Siddiqui',
    role: 'TSM',
    designation: 'Territory Sales Manager (Karachi South & Plaza)',
    region: 'Sindh South',
    area: 'Karachi South & Central',
    phone: '+92 321 8345678',
    email: 'farhan.s@nationallights.com',
  },
  {
    id: 'EMP-004',
    name: 'Zahid Mehmood',
    role: 'ASM',
    designation: 'Area Sales Manager (Rawalpindi & Islamabad)',
    region: 'Punjab North',
    area: 'Rawalpindi Division',
    phone: '+92 333 9456789',
    email: 'zahid.m@nationallights.com',
  },
  {
    id: 'EMP-005',
    name: 'Tariq Mansoor',
    role: 'RSM',
    designation: 'Regional Sales Manager (KPK & Western Corridor)',
    region: 'KPK West',
    area: 'Peshawar Division',
    phone: '+92 302 7567890',
    email: 'tariq.mansoor@nationallights.com',
  },
  {
    id: 'EMP-006',
    name: 'Bilal Ahmed',
    role: 'NSM',
    designation: 'National Sales Manager (Head Office)',
    region: 'National',
    area: 'All Territories',
    phone: '+92 300 8678901',
    email: 'bilal.ahmed@nationallights.com',
  },
  {
    id: 'EMP-007',
    name: 'Kamran Shah',
    role: 'ZSM',
    designation: 'Zonal Sales Manager (Sindh & Balochistan Zone)',
    region: 'Sindh South',
    area: 'South & Western Zone',
    phone: '+92 312 9789012',
    email: 'kamran.shah@nationallights.com',
  },
  {
    id: 'EMP-008',
    name: 'Hamza Sheikh',
    role: 'FIELD_SALES',
    designation: 'Field Order Booker & Recovery Officer (Brandreth Beat)',
    region: 'Punjab Central',
    area: 'Lahore Division',
    phone: '+92 345 1890123',
    email: 'hamza.sheikh@nationallights.com',
  },
  {
    id: 'EMP-009',
    name: 'Waqas Butt',
    role: 'ACCOUNTS',
    designation: 'Commercial Accounts & Credit Controller',
    region: 'Punjab Central',
    area: 'Head Office Accounts',
    phone: '+92 300 2901234',
    email: 'waqas.butt@nationallights.com',
  },
  {
    id: 'EMP-010',
    name: 'Rizwan Malik',
    role: 'BRANCH_MANAGER',
    designation: 'Branch Manager (Central Lahore Depot)',
    region: 'Punjab Central',
    area: 'Lahore Division',
    phone: '+92 322 3012345',
    email: 'rizwan.malik@nationallights.com',
  },
  {
    id: 'EMP-011',
    name: 'Faisal Nadeem',
    role: 'WAREHOUSE_MANAGER',
    designation: 'Head of Warehouse & Dispatch Operations',
    region: 'Punjab Central',
    area: 'Central Warehouse Hub',
    phone: '+92 334 4123456',
    email: 'faisal.nadeem@nationallights.com',
  },
];

export const PAKISTAN_COMMERCIAL_BANKS = [
  'Meezan Bank Ltd',
  'Habib Bank Ltd (HBL)',
  'MCB Bank Ltd',
  'United Bank Ltd (UBL)',
  'Bank Alfalah Ltd',
  'Allied Bank Ltd (ABL)',
  'National Bank of Pakistan (NBP)',
  'Faysal Bank Ltd',
  'Standard Chartered Bank (Pak)',
  'Bank of Punjab (BOP)',
  'Askari Bank Ltd',
  'Dubai Islamic Bank Pakistan',
  'BankIslami Pakistan Ltd',
  'Soneri Bank Ltd',
  'JS Bank Ltd',
];

/**
 * AI Smart Parameters Generator for Dynamic Dealer Registration
 */
export function generateAiSmartDealerDefaults(category: string, region: string, town: string) {
  let recommendedCreditLimit = 1500000;
  let recommendedCreditDays = 30;

  switch (category) {
    case 'DISTRIBUTOR':
      recommendedCreditLimit = 5000000;
      recommendedCreditDays = 45;
      break;
    case 'WHOLESALER':
      recommendedCreditLimit = 2500000;
      recommendedCreditDays = 30;
      break;
    case 'DEALER':
      recommendedCreditLimit = 1000000;
      recommendedCreditDays = 30;
      break;
    case 'RETAIL_SHOP':
      recommendedCreditLimit = 300000;
      recommendedCreditDays = 15;
      break;
    default:
      recommendedCreditLimit = 1000000;
      recommendedCreditDays = 30;
  }

  // Find matching staff officer based on region
  const matchingStaff =
    ALL_DESIGNATIONS_TEAM.find((s) => s.region.toLowerCase().includes(region.toLowerCase())) ||
    ALL_DESIGNATIONS_TEAM[0];

  // Generate valid sample CNIC and NTN formats
  const randomCnicSuffix = Math.floor(1000000 + Math.random() * 9000000);
  const sampleCnic = `35202-${randomCnicSuffix}-1`;
  const sampleNtn = `${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(1 + Math.random() * 9)}`;

  return {
    creditLimit: recommendedCreditLimit,
    creditDays: recommendedCreditDays,
    assignedStaff: matchingStaff,
    sampleCnic,
    sampleNtn,
    recommendedBank: 'Meezan Bank Ltd',
    recommendedStatus: 'NORMAL',
  };
}
