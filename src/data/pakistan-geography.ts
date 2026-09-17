/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pakistan Comprehensive Geography Data
 * All Provinces, Regions, Districts, and Major Commercial Lighting Trade Cities
 */

export interface PakistanRegion {
  id: string;
  name: string;
  shortCode: string;
  capital: string;
  cities: PakistanCity[];
}

export interface PakistanCity {
  id: string;
  name: string;
  regionId: string;
  commercialHub?: string;
  majorBeats?: string[];
}

export const PAKISTAN_REGIONS: PakistanRegion[] = [
  {
    id: 'KPK',
    name: 'Khyber Pakhtunkhwa',
    shortCode: 'KPK',
    capital: 'Peshawar',
    cities: [
      { id: 'KPK-PSH', name: 'Peshawar', regionId: 'KPK', commercialHub: 'Sheikh Yaseen Tower / Karkhano / Saddar', majorBeats: ['City Circular Road', 'University Road', 'Karkhano Market', 'Majid Mohabbad Khan Road', 'Hayatabad Trade Zone', 'Kohat Road'] },
      { id: 'KPK-MDN', name: 'Mardan', regionId: 'KPK', commercialHub: 'Bank Road / Cantt Market', majorBeats: ['Bank Road', 'Shahbaz Garhi', 'Gujar Garhi Market'] },
      { id: 'KPK-SWT', name: 'Swat (Mingora)', regionId: 'KPK', commercialHub: 'Mingora Bazar / Saidu Sharif', majorBeats: ['Main Mingora Bazar', 'New Road', 'Matta Commercial'] },
      { id: 'KPK-ABT', name: 'Abbottabad', regionId: 'KPK', commercialHub: 'Jinnah Road / Cantonment', majorBeats: ['Supply Bazar', 'Mansehra Road', 'Cantonment Plaza'] },
      { id: 'KPK-KHT', name: 'Kohat', regionId: 'KPK', commercialHub: 'Main Bazar / Bannu Road', majorBeats: ['Main Bazar', 'Bannu Road', 'KDA Commercial'] },
      { id: 'KPK-BNU', name: 'Bannu', regionId: 'KPK', commercialHub: 'Chowk Bazar / Miran Shah Road', majorBeats: ['Chowk Bazar', 'Railway Road'] },
      { id: 'KPK-DIK', name: 'Dera Ismail Khan', regionId: 'KPK', commercialHub: 'Topanwala Bazar', majorBeats: ['Topanwala', 'Circular Road', 'University Road'] },
      { id: 'KPK-NWS', name: 'Nowshera', regionId: 'KPK', commercialHub: 'Shandu Road / GT Road', majorBeats: ['Main GT Road', 'Cantt Market', 'Risalpur Beat'] },
      { id: 'KPK-CSD', name: 'Charsadda', regionId: 'KPK', commercialHub: 'Main Bazar / Utmanzai', majorBeats: ['Tehsil Bazar', 'Farooq Azam Chowk', 'Utmanzai'] },
      { id: 'KPK-SWB', name: 'Swabi', regionId: 'KPK', commercialHub: 'Topi / Jehangira Road', majorBeats: ['Main Swabi Chowk', 'Topi Bazar', 'Zaida Market'] },
      { id: 'KPK-HRP', name: 'Haripur', regionId: 'KPK', commercialHub: 'Main GT Road / Circular', majorBeats: ['Sikandar Pur', 'Main Bazar', 'Khanpur Road'] },
      { id: 'KPK-MSR', name: 'Mansehra', regionId: 'KPK', commercialHub: 'Shinkiari Road / Karakoram Highway', majorBeats: ['Kashmir Road', 'Main Bazar', 'Lari Adda Market'] },
      { id: 'KPK-MLK', name: 'Malakand (Batkhela)', regionId: 'KPK', commercialHub: 'Batkhela Main Bazar', majorBeats: ['Main Bazar Batkhela', 'Dargai Trade Center'] },
      { id: 'KPK-DIR-L', name: 'Dir Lower (Timergara)', regionId: 'KPK', commercialHub: 'Timergara Bazar', majorBeats: ['Main Timergara Road', 'Balambat Market'] },
      { id: 'KPK-DIR-U', name: 'Dir Upper', regionId: 'KPK', commercialHub: 'Dir Bazar', majorBeats: ['Main Dir Commercial'] },
      { id: 'KPK-HNG', name: 'Hangu', regionId: 'KPK', commercialHub: 'Main Hangu Bazar', majorBeats: ['Doaba Market', 'Thall Commercial'] },
      { id: 'KPK-KRK', name: 'Karak', regionId: 'KPK', commercialHub: 'Main Karak Chowk', majorBeats: ['Amberi Kalla', 'Sabir Abad'] },
      { id: 'KPK-BNR', name: 'Buner (Daggar)', regionId: 'KPK', commercialHub: 'Sowari / Daggar', majorBeats: ['Sowari Bazar', 'Daggar Commercial'] },
      { id: 'KPK-CHT', name: 'Chitral', regionId: 'KPK', commercialHub: 'Ataliq Bazar Chitral', majorBeats: ['Main Shahi Bazar', 'Drosh Commercial'] },
      { id: 'KPK-TNK', name: 'Tank', regionId: 'KPK', commercialHub: 'Main Tank Bazar', majorBeats: ['Main Commercial Hub'] },
      { id: 'KPK-LKK', name: 'Lakki Marwat', regionId: 'KPK', commercialHub: 'Main Lakki Bazar', majorBeats: ['Serai Naurang Market'] },
      { id: 'KPK-KHY', name: 'Khyber (Jamrud / Landi Kotal)', regionId: 'KPK', commercialHub: 'Karkhano Border Gate', majorBeats: ['Jamrud Bazar', 'Landi Kotal'] },
      { id: 'KPK-KUR', name: 'Kurram (Parachinar)', regionId: 'KPK', commercialHub: 'Parachinar Main Market', majorBeats: ['Turi Market', 'Sadda Bazar'] },
      { id: 'KPK-BAJ', name: 'Bajaur (Khar)', regionId: 'KPK', commercialHub: 'Khar Bazar', majorBeats: ['Inayat Killi', 'Nawagai'] },
      { id: 'KPK-WZR', name: 'Waziristan (Miran Shah / Wana)', regionId: 'KPK', commercialHub: 'Miran Shah Market', majorBeats: ['Miran Shah Main Bazar', 'Wana Commercial'] },
    ],
  },
  {
    id: 'PUNJAB',
    name: 'Punjab',
    shortCode: 'PB',
    capital: 'Lahore',
    cities: [
      { id: 'PB-LHR', name: 'Lahore', regionId: 'PUNJAB', commercialHub: 'Shah Alam Market / Hall Road / Brandreth Road', majorBeats: ['Hall Road Electronics', 'Shah Alam Market', 'Brandreth Road Electricals', 'DHA Phase 5 & 6', 'Gulberg Liberty', 'Ferozepur Road', 'Badami Bagh'] },
      { id: 'PB-FSD', name: 'Faisalabad', regionId: 'PUNJAB', commercialHub: 'Katchery Bazar / Clock Tower Electrical Hub', majorBeats: ['Rail Bazar', 'Aminpur Bazar', 'Jhang Road', 'Satyana Road Electricals'] },
      { id: 'PB-RWP', name: 'Rawalpindi', regionId: 'PUNJAB', commercialHub: 'Raja Bazar / College Road / Saddar', majorBeats: ['College Road Electronics', 'Raja Bazar', 'Saddar Commercial', 'Murree Road Electricals'] },
      { id: 'PB-GRW', name: 'Gujranwala', regionId: 'PUNJAB', commercialHub: 'Gondlanwala Road / Trust Plaza / GT Road', majorBeats: ['Model Town Market', 'Gondlanwala Road', 'Rail Bazar Gujranwala'] },
      { id: 'PB-MUL', name: 'Multan', regionId: 'PUNJAB', commercialHub: 'Hussain Agahi / Loha Market / Bohar Gate', majorBeats: ['Hussain Agahi Electricals', 'Bohar Gate', 'Cantt Mall Plaza', 'Nishtar Road'] },
      { id: 'PB-SKT', name: 'Sialkot', regionId: 'PUNJAB', commercialHub: 'Khadim Ali Road / Railway Road', majorBeats: ['Khadim Ali Road', 'Kashmir Road', 'Rangpura Bazar'] },
      { id: 'PB-BWP', name: 'Bahawalpur', regionId: 'PUNJAB', commercialHub: 'Shahi Bazar / Circular Road', majorBeats: ['Farid Gate', 'Model Town C', 'Circular Road'] },
      { id: 'PB-SRG', name: 'Sargodha', regionId: 'PUNJAB', commercialHub: 'Block 12 / Liaquat Market / Kutchery Road', majorBeats: ['Fatima Jinnah Road', 'Trust Plaza Sargodha', 'Satellite Town'] },
      { id: 'PB-GJR', name: 'Gujrat', regionId: 'PUNJAB', commercialHub: 'Railway Road / Court Road', majorBeats: ['Bhimber Road', 'Circular Road Gujrat', 'GT Road Hub'] },
      { id: 'PB-SKP', name: 'Sheikhupura', regionId: 'PUNJAB', commercialHub: 'Main Lahore-Sargodha Road', majorBeats: ['Bhatti Chowk', 'Housing Colony Market'] },
      { id: 'PB-JHG', name: 'Jhang', regionId: 'PUNJAB', commercialHub: 'Shaheed Road / Rail Bazar Jhang', majorBeats: ['Gojra Road', 'Ayub Chowk'] },
      { id: 'PB-RYK', name: 'Rahim Yar Khan', regionId: 'PUNJAB', commercialHub: 'Shahi Road / Factory Area', majorBeats: ['Town Hall Market', 'Sadiq Bazar'] },
      { id: 'PB-SWL', name: 'Sahiwal', regionId: 'PUNJAB', commercialHub: 'Liaquat Road / High Street', majorBeats: ['Saddar Bazar', 'Jinnah Chowk'] },
      { id: 'PB-KSR', name: 'Kasur', regionId: 'PUNJAB', commercialHub: 'Railway Road / Shahbaz Khan Road', majorBeats: ['Main Bazar Kasur', 'Kot Ghulam Muhammad'] },
      { id: 'PB-OKR', name: 'Okara', regionId: 'PUNJAB', commercialHub: 'Gole Chowk / Katchery Road', majorBeats: ['Main GT Road Okara', 'Depalpur Road'] },
      { id: 'PB-WAH', name: 'Wah Cantt / Taxila', regionId: 'PUNJAB', commercialHub: 'Lala Rukh / Aslam Market', majorBeats: ['Main GT Road Taxila', 'Barrier 3 Market'] },
      { id: 'PB-DGK', name: 'Dera Ghazi Khan', regionId: 'PUNJAB', commercialHub: 'Block 17 / Saddar Bazar', majorBeats: ['Jampur Road', 'Taunsa Chowk'] },
      { id: 'PB-CKW', name: 'Chakwal', regionId: 'PUNJAB', commercialHub: 'Talagang Road / Bhoun Chowk', majorBeats: ['Pinwal Road', 'Saddar Market'] },
      { id: 'PB-MNW', name: 'Mianwali', regionId: 'PUNJAB', commercialHub: 'Ballokhel Road / Main Bazar', majorBeats: ['PAF Road', 'Watta Khel Chowk'] },
      { id: 'PB-ATK', name: 'Attock', regionId: 'PUNJAB', commercialHub: 'Kamra Road / Fawara Chowk', majorBeats: ['Madni Market', 'Haidery Chowk'] },
      { id: 'PB-JHL', name: 'Jhelum', regionId: 'PUNJAB', commercialHub: 'Civil Lines / Shandar Chowk', majorBeats: ['GT Road Jhelum', 'Kazmi Bazar'] },
      { id: 'PB-KNW', name: 'Khanewal', regionId: 'PUNJAB', commercialHub: 'Block 8 / Ayub Chowk', majorBeats: ['Railway Road', 'Jahanian Road'] },
      { id: 'PB-MZF', name: 'Muzaffargarh', regionId: 'PUNJAB', commercialHub: 'Jhang Road / Kutchery Chowk', majorBeats: ['Multan Road', 'Alipur Chowk'] },
      { id: 'PB-HFZ', name: 'Hafizabad', regionId: 'PUNJAB', commercialHub: 'Gujranwala Road / Main Bazar', majorBeats: ['Kassoki Road', 'Post Office Chowk'] },
      { id: 'PB-MBD', name: 'Mandi Bahauddin', regionId: 'PUNJAB', commercialHub: 'Saddar Bazar / Phalia Road', majorBeats: ['Cinema Road', 'King Gate'] },
      { id: 'PB-BWN', name: 'Bahawalnagar', regionId: 'PUNJAB', commercialHub: 'Haroonabad Road / Minchinabad Chowk', majorBeats: ['Jail Road', 'Baldia Market'] },
      { id: 'PB-VHR', name: 'Vehari', regionId: 'PUNJAB', commercialHub: 'Club Road / Karkhana Bazar', majorBeats: ['Burewala Commercial', 'Mailsi Market'] },
      { id: 'PB-TTS', name: 'Toba Tek Singh', regionId: 'PUNJAB', commercialHub: 'Shor Kot Road / Allama Iqbal Chowk', majorBeats: ['Kamalia Road', 'Sadar Market'] },
      { id: 'PB-PKP', name: 'Pakpattan', regionId: 'PUNJAB', commercialHub: 'Nagpal Road / Farid Kot Market', majorBeats: ['College Road', 'Main Bazar'] },
      { id: 'PB-LYH', name: 'Layyah', regionId: 'PUNJAB', commercialHub: 'Choubara Road / Kehal Chowk', majorBeats: ['Karor Lal Bazar', 'College Road'] },
      { id: 'PB-BHK', name: 'Bhakkar', regionId: 'PUNJAB', commercialHub: 'Jhang Road / Darya Khan Road', majorBeats: ['Mandi Town', 'Railway Road'] },
      { id: 'PB-CHN', name: 'Chiniot', regionId: 'PUNJAB', commercialHub: 'Katchehry Road / Faisalabad Road', majorBeats: ['Shahrah-e-Quaid', 'Anjuman Bazar'] },
    ],
  },
  {
    id: 'SINDH',
    name: 'Sindh',
    shortCode: 'SD',
    capital: 'Karachi',
    cities: [
      { id: 'SD-KHI', name: 'Karachi', regionId: 'SINDH', commercialHub: 'Denso Hall (Light House) / Saddar / Regal Chowk', majorBeats: ['Denso Hall Electrical Market', 'Regal Chowk Saddar', 'Jama Cloth Market', 'Shershah / SITE Industrial', 'Korangi Industrial Area', 'Gulshan-e-Iqbal Trade Zone', 'North Nazimabad Hydari', 'DHA Phase 2 Ext / Clifton'] },
      { id: 'SD-HYD', name: 'Hyderabad', regionId: 'SINDH', commercialHub: 'Tilak Incline / Shahi Bazar / Auto Bhan', majorBeats: ['Tilak Chari Electrical Market', 'Saddar Cantt', 'Resham Gali', 'Latifabad Unit 7 & 8', 'Auto Bhan Road Commercial'] },
      { id: 'SD-SKR', name: 'Sukkur', regionId: 'SINDH', commercialHub: 'Sarafa Bazar / Clock Tower / Barrage Road', majorBeats: ['Frere Road', 'Minara Road', 'Neem Ki Chari Market'] },
      { id: 'SD-LRK', name: 'Larkana', regionId: 'SINDH', commercialHub: 'Station Road / Bunder Road', majorBeats: ['Shahi Bazar Larkana', 'VIP Road', 'Lahori Mohalla'] },
      { id: 'SD-NWB', name: 'Nawabshah (Shaheed Benazirabad)', regionId: 'SINDH', commercialHub: 'Sakrand Road / Masjid Road', majorBeats: ['Hospital Road', 'Chakra Bazar', 'Mono Technical Chowk'] },
      { id: 'SD-MPK', name: 'Mirpur Khas', regionId: 'SINDH', commercialHub: 'Station Road / Shahi Bazar', majorBeats: ['Khipro Road', 'Jinnah Road', 'Baldia Shopping Center'] },
      { id: 'SD-SHK', name: 'Shikarpur', regionId: 'SINDH', commercialHub: 'Dhobi Ghat / Lakhi Gate', majorBeats: ['Hathi Gate', 'Stuart Ganj Bazar'] },
      { id: 'SD-JAC', name: 'Jacobabad', regionId: 'SINDH', commercialHub: 'Quetta Road / Tower Chowk', majorBeats: ['Shahi Bazar', 'DC Road'] },
      { id: 'SD-THT', name: 'Thatta', regionId: 'SINDH', commercialHub: 'Main Highway Market', majorBeats: ['Sujawal Road', 'Makli Bazar'] },
      { id: 'SD-BDN', name: 'Badin', regionId: 'SINDH', commercialHub: 'Qazi Ahmed Road / Shahi Bazar', majorBeats: ['DC Chowk', 'Railway Road'] },
      { id: 'SD-GHT', name: 'Ghotki', regionId: 'SINDH', commercialHub: 'Station Road / Mirpur Mathelo', majorBeats: ['Dahar Market', 'GT Road Ghotki'] },
      { id: 'SD-KHP', name: 'Khairpur', regionId: 'SINDH', commercialHub: 'Mall Road / Luqman Bazar', majorBeats: ['Panj Gulla Chowk', 'Khangarh Road'] },
      { id: 'SD-DDU', name: 'Dadu', regionId: 'SINDH', commercialHub: 'Cinema Road / Station Road', majorBeats: ['Makhdoom Bilawal Chowk', 'Shahi Bazar'] },
      { id: 'SD-TDA', name: 'Tando Adam', regionId: 'SINDH', commercialHub: 'Muhammadi Chowk / Jinnah Road', majorBeats: ['Station Road', 'Bara Bazar'] },
      { id: 'SD-SNG', name: 'Sanghar', regionId: 'SINDH', commercialHub: 'Mirpur Khas Road', majorBeats: ['Main Chowk', 'Nawabshah Road'] },
    ],
  },
  {
    id: 'BALOCHISTAN',
    name: 'Balochistan',
    shortCode: 'BA',
    capital: 'Quetta',
    cities: [
      { id: 'BA-QTA', name: 'Quetta', regionId: 'BALOCHISTAN', commercialHub: 'Liaquat Bazar / Abdul Sattar Road / Suraj Ganj', majorBeats: ['Abdul Sattar Road Electrical Market', 'Liaquat Bazar', 'Suraj Ganj Bazar', 'Zarghoon Road', 'Jinnah Road Quetta', 'Chaman Phatak'] },
      { id: 'BA-GWD', name: 'Gwadar', regionId: 'BALOCHISTAN', commercialHub: 'Jinnah Avenue / Airport Road / Marine Drive', majorBeats: ['Airport Road Commercial', 'New Port City', 'Shahi Bazar Gwadar'] },
      { id: 'BA-TRB', name: 'Turbat (Kech)', regionId: 'BALOCHISTAN', commercialHub: 'Main Bazar / Cinema Road', majorBeats: ['Absor Road', 'Tump Commercial'] },
      { id: 'BA-KHZ', name: 'Khuzdar', regionId: 'BALOCHISTAN', commercialHub: 'RCD Highway / Chandni Chowk', majorBeats: ['Sultan Ibrahim Road', 'Main Bazar Khuzdar'] },
      { id: 'BA-HUB', name: 'Hub Chowki', regionId: 'BALOCHISTAN', commercialHub: 'Lasbela Industrial Estate / RCD Highway', majorBeats: ['Main Hub Chowki', 'Industrial Zone'] },
      { id: 'BA-CHM', name: 'Chaman', regionId: 'BALOCHISTAN', commercialHub: 'Boghara Road / Border Trade Center', majorBeats: ['Taj Road', 'Kandahari Bazar'] },
      { id: 'BA-SBI', name: 'Sibi', regionId: 'BALOCHISTAN', commercialHub: 'Jinnah Road / Luni Bazar', majorBeats: ['Station Road', 'Chakar Khan Market'] },
      { id: 'BA-ZHB', name: 'Zhob (Fort Sandeman)', regionId: 'BALOCHISTAN', commercialHub: 'Main Zhob Bazar / D.I. Khan Road', majorBeats: ['Appozai Road', 'City Chowk'] },
      { id: 'BA-LRL', name: 'Loralai', regionId: 'BALOCHISTAN', commercialHub: 'Bori Road / Shahi Bazar', majorBeats: ['Ziarat Road', 'Cantt Market'] },
      { id: 'BA-PSH', name: 'Pishin', regionId: 'BALOCHISTAN', commercialHub: 'Main Yateem Khana Road / Bund Road', majorBeats: ['Main Bazar Pishin', 'Bostan Market'] },
    ],
  },
  {
    id: 'ICT',
    name: 'Islamabad (Capital Territory)',
    shortCode: 'ISB',
    capital: 'Islamabad',
    cities: [
      { id: 'ISB-ISB', name: 'Islamabad', regionId: 'ICT', commercialHub: 'Blue Area / G-9 Karachi Company / I-9 Industrial', majorBeats: ['Blue Area Electrical Corridor', 'G-9 Karachi Company', 'G-8 Markaz', 'I-8 Markaz', 'I-9 / I-10 Industrial Area', 'F-10 Markaz', 'PWD / Pakistan Town', 'Bahria Town Islamabad / DHA 2'] },
    ],
  },
  {
    id: 'AJK',
    name: 'Azad Jammu & Kashmir',
    shortCode: 'AJK',
    capital: 'Muzaffarabad',
    cities: [
      { id: 'AJK-MZF', name: 'Muzaffarabad', regionId: 'AJK', commercialHub: 'Madina Market / Bank Road / Domail', majorBeats: ['Madina Market', 'Upper Adda', 'Secretariat Road', 'Chehla Bandi'] },
      { id: 'AJK-MPR', name: 'Mirpur', regionId: 'AJK', commercialHub: 'Allama Iqbal Road / F-1 Commercial / Sector C-3', majorBeats: ['Allama Iqbal Road Electricals', 'Chowk Shaheedan', 'Sector F-1', 'Kalyal Chowk'] },
      { id: 'AJK-RWK', name: 'Rawalakot (Poonch)', regionId: 'AJK', commercialHub: 'Katchehry Road / Main Bazar', majorBeats: ['CMH Road', 'Hajira Road Market'] },
      { id: 'AJK-KTL', name: 'Kotli', regionId: 'AJK', commercialHub: 'Pindi Road / Shaheed Chowk', majorBeats: ['Gulhar Market', 'Main Bazar Kotli'] },
      { id: 'AJK-BHM', name: 'Bhimber', regionId: 'AJK', commercialHub: 'Gujrat Road / Samahni Chowk', majorBeats: ['Main Chowk Bhimber', 'Barnala Road'] },
      { id: 'AJK-BGH', name: 'Bagh', regionId: 'AJK', commercialHub: 'Main Bazar / Zaman Chowk', majorBeats: ['Sudhan Gali Road', 'Hydel Road'] },
    ],
  },
  {
    id: 'GB',
    name: 'Gilgit-Baltistan',
    shortCode: 'GB',
    capital: 'Gilgit',
    cities: [
      { id: 'GB-GLT', name: 'Gilgit', regionId: 'GB', commercialHub: 'NLI Market / Airport Road / Saddar Bazar', majorBeats: ['NLI Market', 'Jutial Commercial', 'River View Road'] },
      { id: 'GB-SKD', name: 'Skardu', regionId: 'GB', commercialHub: 'Hameed Ghar Bazar / Main Yadgar Chowk', majorBeats: ['Main Bazar Skardu', 'Kazmi Bazar', 'Airport Road'] },
      { id: 'GB-HNZ', name: 'Hunza (Karimabad / Aliabad)', regionId: 'GB', commercialHub: 'Aliabad Main Karakoram Highway', majorBeats: ['Aliabad Market', 'Karimabad Bazar'] },
      { id: 'GB-CLS', name: 'Chilas (Diamer)', regionId: 'GB', commercialHub: 'Main Karakoram Highway Bazar', majorBeats: ['Babusar Chowk', 'Main Chilas Bazar'] },
    ],
  },
];

// Helper Functions
export const getAllPakistanProvinces = (): PakistanRegion[] => PAKISTAN_REGIONS;

export const getCitiesByRegionId = (regionId: string): PakistanCity[] => {
  const found = PAKISTAN_REGIONS.find((r) => r.id === regionId || r.name.toLowerCase() === regionId.toLowerCase());
  return found ? found.cities : [];
};

export const getAllPakistanCities = (): PakistanCity[] => {
  return PAKISTAN_REGIONS.flatMap((r) => r.cities);
};

export const searchPakistanCities = (query: string): PakistanCity[] => {
  if (!query) return getAllPakistanCities();
  const lower = query.toLowerCase();
  return getAllPakistanCities().filter(
    (c) => c.name.toLowerCase().includes(lower) || (c.commercialHub && c.commercialHub.toLowerCase().includes(lower))
  );
};
