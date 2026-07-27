/**
 * ISO 3166-1 Standard Country & Nationality Reference Dataset
 * 
 * Provides complete ISO country records with Alpha-2, Alpha-3, Numeric codes,
 * official names, common names, demonyms, Unicode flags, and regions.
 */

export interface Country {
  code: string;         // ISO 3166-1 alpha-3 code (e.g. "IND")
  alpha2: string;       // ISO 3166-1 alpha-2 code (e.g. "IN")
  numeric: string;      // ISO 3166-1 numeric code (e.g. "356")
  name: string;         // Common country name (e.g. "India")
  officialName: string; // Official country name (e.g. "Republic of India")
  nationality: string;  // Demonym (e.g. "Indian")
  flag: string;         // Unicode flag emoji (e.g. "🇮🇳")
  region: string;       // Geographic region (e.g. "Asia")
  subregion: string;    // Geographic subregion (e.g. "Southern Asia")
}

export const countryList: Country[] = [
  { code: "AFG", alpha2: "AF", numeric: "004", name: "Afghanistan", officialName: "Islamic Republic of Afghanistan", nationality: "Afghan", flag: "🇦🇫", region: "Asia", subregion: "Southern Asia" },
  { code: "ALB", alpha2: "AL", numeric: "008", name: "Albania", officialName: "Republic of Albania", nationality: "Albanian", flag: "🇦🇱", region: "Europe", subregion: "Southern Europe" },
  { code: "DZA", alpha2: "DZ", numeric: "012", name: "Algeria", officialName: "People's Democratic Republic of Algeria", nationality: "Algerian", flag: "🇩🇿", region: "Africa", subregion: "Northern Africa" },
  { code: "AND", alpha2: "AD", numeric: "020", name: "Andorra", officialName: "Principality of Andorra", nationality: "Andorran", flag: "🇦🇩", region: "Europe", subregion: "Southern Europe" },
  { code: "AGO", alpha2: "AO", numeric: "024", name: "Angola", officialName: "Republic of Angola", nationality: "Angolan", flag: "🇦🇴", region: "Africa", subregion: "Middle Africa" },
  { code: "ARG", alpha2: "AR", numeric: "032", name: "Argentina", officialName: "Argentine Republic", nationality: "Argentine", flag: "🇦🇷", region: "Americas", subregion: "South America" },
  { code: "ARM", alpha2: "AM", numeric: "051", name: "Armenia", officialName: "Republic of Armenia", nationality: "Armenian", flag: "🇦🇲", region: "Asia", subregion: "Western Asia" },
  { code: "AUS", alpha2: "AU", numeric: "036", name: "Australia", officialName: "Commonwealth of Australia", nationality: "Australian", flag: "🇦🇺", region: "Oceania", subregion: "Australia and New Zealand" },
  { code: "AUT", alpha2: "AT", numeric: "040", name: "Austria", officialName: "Republic of Austria", nationality: "Austrian", flag: "🇦🇹", region: "Europe", subregion: "Western Europe" },
  { code: "AZE", alpha2: "AZ", numeric: "031", name: "Azerbaijan", officialName: "Republic of Azerbaijan", nationality: "Azerbaijani", flag: "🇦🇿", region: "Asia", subregion: "Western Asia" },
  { code: "BHS", alpha2: "BS", numeric: "044", name: "Bahamas", officialName: "Commonwealth of the Bahamas", nationality: "Bahamian", flag: "🇧🇸", region: "Americas", subregion: "Caribbean" },
  { code: "BHR", alpha2: "BH", numeric: "048", name: "Bahrain", officialName: "Kingdom of Bahrain", nationality: "Bahraini", flag: "🇧🇭", region: "Asia", subregion: "Western Asia" },
  { code: "BGD", alpha2: "BD", numeric: "050", name: "Bangladesh", officialName: "People's Republic of Bangladesh", nationality: "Bangladeshi", flag: "🇧🇩", region: "Asia", subregion: "Southern Asia" },
  { code: "BLR", alpha2: "BY", numeric: "112", name: "Belarus", officialName: "Republic of Belarus", nationality: "Belarusian", flag: "🇧🇾", region: "Europe", subregion: "Eastern Europe" },
  { code: "BEL", alpha2: "BE", numeric: "056", name: "Belgium", officialName: "Kingdom of Belgium", nationality: "Belgian", flag: "🇧🇪", region: "Europe", subregion: "Western Europe" },
  { code: "BTN", alpha2: "BT", numeric: "064", name: "Bhutan", officialName: "Kingdom of Bhutan", nationality: "Bhutanese", flag: "🇧🇹", region: "Asia", subregion: "Southern Asia" },
  { code: "BOL", alpha2: "BO", numeric: "068", name: "Bolivia", officialName: "Plurinational State of Bolivia", nationality: "Bolivian", flag: "🇧🇴", region: "Americas", subregion: "South America" },
  { code: "BRA", alpha2: "BR", numeric: "076", name: "Brazil", officialName: "Federative Republic of Brazil", nationality: "Brazilian", flag: "🇧🇷", region: "Americas", subregion: "South America" },
  { code: "BRN", alpha2: "BN", numeric: "096", name: "Brunei", officialName: "Brunei Darussalam", nationality: "Bruneian", flag: "🇧🇳", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "BGR", alpha2: "BG", numeric: "100", name: "Bulgaria", officialName: "Republic of Bulgaria", nationality: "Bulgarian", flag: "🇧🇬", region: "Europe", subregion: "Eastern Europe" },
  { code: "KHM", alpha2: "KH", numeric: "116", name: "Cambodia", officialName: "Kingdom of Cambodia", nationality: "Cambodian", flag: "🇰🇭", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "CMR", alpha2: "CM", numeric: "120", name: "Cameroon", officialName: "Republic of Cameroon", nationality: "Cameroonian", flag: "🇨🇲", region: "Africa", subregion: "Middle Africa" },
  { code: "CAN", alpha2: "CA", numeric: "124", name: "Canada", officialName: "Canada", nationality: "Canadian", flag: "🇨🇦", region: "Americas", subregion: "Northern America" },
  { code: "CHL", alpha2: "CL", numeric: "152", name: "Chile", officialName: "Republic of Chile", nationality: "Chilean", flag: "🇨🇱", region: "Americas", subregion: "South America" },
  { code: "CHN", alpha2: "CN", numeric: "156", name: "China", officialName: "People's Republic of China", nationality: "Chinese", flag: "🇨🇳", region: "Asia", subregion: "Eastern Asia" },
  { code: "COL", alpha2: "CO", numeric: "170", name: "Colombia", officialName: "Republic of Colombia", nationality: "Colombian", flag: "🇨🇴", region: "Americas", subregion: "South America" },
  { code: "CRI", alpha2: "CR", numeric: "188", name: "Costa Rica", officialName: "Republic of Costa Rica", nationality: "Costa Rican", flag: "🇨🇷", region: "Americas", subregion: "Central America" },
  { code: "HRV", alpha2: "HR", numeric: "191", name: "Croatia", officialName: "Republic of Croatia", nationality: "Croatian", flag: "🇭🇷", region: "Europe", subregion: "Southern Europe" },
  { code: "CUB", alpha2: "CU", numeric: "192", name: "Cuba", officialName: "Republic of Cuba", nationality: "Cuban", flag: "🇨🇺", region: "Americas", subregion: "Caribbean" },
  { code: "CYP", alpha2: "CY", numeric: "196", name: "Cyprus", officialName: "Republic of Cyprus", nationality: "Cypriot", flag: "🇨🇾", region: "Europe", subregion: "Southern Europe" },
  { code: "CZE", alpha2: "CZ", numeric: "203", name: "Czech Republic", officialName: "Czech Republic", nationality: "Czech", flag: "🇨🇿", region: "Europe", subregion: "Eastern Europe" },
  { code: "DNK", alpha2: "DK", numeric: "208", name: "Denmark", officialName: "Kingdom of Denmark", nationality: "Danish", flag: "🇩🇰", region: "Europe", subregion: "Northern Europe" },
  { code: "ECU", alpha2: "EC", numeric: "218", name: "Ecuador", officialName: "Republic of Ecuador", nationality: "Ecuadorean", flag: "🇪🇨", region: "Americas", subregion: "South America" },
  { code: "EGY", alpha2: "EG", numeric: "818", name: "Egypt", officialName: "Arab Republic of Egypt", nationality: "Egyptian", flag: "🇪🇬", region: "Africa", subregion: "Northern Africa" },
  { code: "ETH", alpha2: "ET", numeric: "231", name: "Ethiopia", officialName: "Federal Democratic Republic of Ethiopia", nationality: "Ethiopian", flag: "🇪🇹", region: "Africa", subregion: "Eastern Africa" },
  { code: "FIN", alpha2: "FI", numeric: "246", name: "Finland", officialName: "Republic of Finland", nationality: "Finnish", flag: "🇫🇮", region: "Europe", subregion: "Northern Europe" },
  { code: "FRA", alpha2: "FR", numeric: "250", name: "France", officialName: "French Republic", nationality: "French", flag: "🇫🇷", region: "Europe", subregion: "Western Europe" },
  { code: "GEO", alpha2: "GE", numeric: "268", name: "Georgia", officialName: "Georgia", nationality: "Georgian", flag: "🇬🇪", region: "Asia", subregion: "Western Asia" },
  { code: "DEU", alpha2: "DE", numeric: "276", name: "Germany", officialName: "Federal Republic of Germany", nationality: "German", flag: "🇩🇪", region: "Europe", subregion: "Western Europe" },
  { code: "GHA", alpha2: "GH", numeric: "288", name: "Ghana", officialName: "Republic of Ghana", nationality: "Ghanaian", flag: "🇬🇭", region: "Africa", subregion: "Western Africa" },
  { code: "GRC", alpha2: "GR", numeric: "300", name: "Greece", officialName: "Hellenic Republic", nationality: "Greek", flag: "🇬🇷", region: "Europe", subregion: "Southern Europe" },
  { code: "HND", alpha2: "HN", numeric: "340", name: "Honduras", officialName: "Republic of Honduras", nationality: "Honduran", flag: "🇭🇳", region: "Americas", subregion: "Central America" },
  { code: "HUN", alpha2: "HU", numeric: "348", name: "Hungary", officialName: "Hungary", nationality: "Hungarian", flag: "🇭🇺", region: "Europe", subregion: "Eastern Europe" },
  { code: "ISL", alpha2: "IS", numeric: "352", name: "Iceland", officialName: "Republic of Iceland", nationality: "Icelandic", flag: "🇮🇸", region: "Europe", subregion: "Northern Europe" },
  { code: "IND", alpha2: "IN", numeric: "356", name: "India", officialName: "Republic of India", nationality: "Indian", flag: "🇮🇳", region: "Asia", subregion: "Southern Asia" },
  { code: "IDN", alpha2: "ID", numeric: "360", name: "Indonesia", officialName: "Republic of Indonesia", nationality: "Indonesian", flag: "🇮🇩", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "IRN", alpha2: "IR", numeric: "364", name: "Iran", officialName: "Islamic Republic of Iran", nationality: "Iranian", flag: "🇮🇷", region: "Asia", subregion: "Southern Asia" },
  { code: "IRQ", alpha2: "IQ", numeric: "368", name: "Iraq", officialName: "Republic of Iraq", nationality: "Iraqi", flag: "🇮🇶", region: "Asia", subregion: "Western Asia" },
  { code: "IRL", alpha2: "IE", numeric: "372", name: "Ireland", officialName: "Ireland", nationality: "Irish", flag: "🇮🇪", region: "Europe", subregion: "Northern Europe" },
  { code: "ISR", alpha2: "IL", numeric: "376", name: "Israel", officialName: "State of Israel", nationality: "Israeli", flag: "🇮🇱", region: "Asia", subregion: "Western Asia" },
  { code: "ITA", alpha2: "IT", numeric: "380", name: "Italy", officialName: "Italian Republic", nationality: "Italian", flag: "🇮🇹", region: "Europe", subregion: "Southern Europe" },
  { code: "JAM", alpha2: "JM", numeric: "388", name: "Jamaica", officialName: "Jamaica", nationality: "Jamaican", flag: "🇯🇲", region: "Americas", subregion: "Caribbean" },
  { code: "JPN", alpha2: "JP", numeric: "392", name: "Japan", officialName: "Japan", nationality: "Japanese", flag: "🇯🇵", region: "Asia", subregion: "Eastern Asia" },
  { code: "JOR", alpha2: "JO", numeric: "400", name: "Jordan", officialName: "Hashemite Kingdom of Jordan", nationality: "Jordanian", flag: "🇯🇴", region: "Asia", subregion: "Western Asia" },
  { code: "KAZ", alpha2: "KZ", numeric: "398", name: "Kazakhstan", officialName: "Republic of Kazakhstan", nationality: "Kazakhstani", flag: "🇰🇿", region: "Asia", subregion: "Central Asia" },
  { code: "KEN", alpha2: "KE", numeric: "404", name: "Kenya", officialName: "Republic of Kenya", nationality: "Kenyan", flag: "🇰🇪", region: "Africa", subregion: "Eastern Africa" },
  { code: "KWT", alpha2: "KW", numeric: "414", name: "Kuwait", officialName: "State of Kuwait", nationality: "Kuwaiti", flag: "🇰🇼", region: "Asia", subregion: "Western Asia" },
  { code: "KGZ", alpha2: "KG", numeric: "417", name: "Kyrgyzstan", officialName: "Kyrgyz Republic", nationality: "Kyrgyzstani", flag: "🇰🇬", region: "Asia", subregion: "Central Asia" },
  { code: "LAO", alpha2: "LA", numeric: "418", name: "Laos", officialName: "Lao People's Democratic Republic", nationality: "Laotian", flag: "🇱🇦", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "LVA", alpha2: "LV", numeric: "428", name: "Latvia", officialName: "Republic of Latvia", nationality: "Latvian", flag: "🇱🇻", region: "Europe", subregion: "Northern Europe" },
  { code: "LBN", alpha2: "LB", numeric: "422", name: "Lebanon", officialName: "Lebanese Republic", nationality: "Lebanese", flag: "🇱🇧", region: "Asia", subregion: "Western Asia" },
  { code: "LBR", alpha2: "LR", numeric: "430", name: "Liberia", officialName: "Republic of Liberia", nationality: "Liberian", flag: "🇱🇷", region: "Africa", subregion: "Western Africa" },
  { code: "LBY", alpha2: "LY", numeric: "434", name: "Libya", officialName: "State of Libya", nationality: "Libyan", flag: "🇱🇾", region: "Africa", subregion: "Northern Africa" },
  { code: "LIE", alpha2: "LI", numeric: "438", name: "Liechtenstein", officialName: "Principality of Liechtenstein", nationality: "Liechtensteiner", flag: "🇱🇮", region: "Europe", subregion: "Western Europe" },
  { code: "LTU", alpha2: "LT", numeric: "440", name: "Lithuania", officialName: "Republic of Lithuania", nationality: "Lithuanian", flag: "🇱🇹", region: "Europe", subregion: "Northern Europe" },
  { code: "LUX", alpha2: "LU", numeric: "442", name: "Luxembourg", officialName: "Grand Duchy of Luxembourg", nationality: "Luxembourger", flag: "🇱🇺", region: "Europe", subregion: "Western Europe" },
  { code: "MDG", alpha2: "MG", numeric: "450", name: "Madagascar", officialName: "Republic of Madagascar", nationality: "Malagasy", flag: "🇲🇬", region: "Africa", subregion: "Eastern Africa" },
  { code: "MYS", alpha2: "MY", numeric: "458", name: "Malaysia", officialName: "Malaysia", nationality: "Malaysian", flag: "🇲🇾", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "MDV", alpha2: "MV", numeric: "462", name: "Maldives", officialName: "Republic of Maldives", nationality: "Maldivian", flag: "🇲🇻", region: "Asia", subregion: "Southern Asia" },
  { code: "MLT", alpha2: "MT", numeric: "470", name: "Malta", officialName: "Republic of Malta", nationality: "Maltese", flag: "🇲🇹", region: "Europe", subregion: "Southern Europe" },
  { code: "MEX", alpha2: "MX", numeric: "484", name: "Mexico", officialName: "United Mexican States", nationality: "Mexican", flag: "🇲🇽", region: "Americas", subregion: "Central America" },
  { code: "MCO", alpha2: "MC", numeric: "492", name: "Monaco", officialName: "Principality of Monaco", nationality: "Monégasque", flag: "🇲🇨", region: "Europe", subregion: "Western Europe" },
  { code: "MNG", alpha2: "MN", numeric: "496", name: "Mongolia", officialName: "Mongolia", nationality: "Mongolian", flag: "🇲🇳", region: "Asia", subregion: "Eastern Asia" },
  { code: "MAR", alpha2: "MA", numeric: "504", name: "Morocco", officialName: "Kingdom of Morocco", nationality: "Moroccan", flag: "🇲🇦", region: "Africa", subregion: "Northern Africa" },
  { code: "MMR", alpha2: "MM", numeric: "104", name: "Myanmar", officialName: "Republic of the Union of Myanmar", nationality: "Burmese", flag: "🇲🇲", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "NPL", alpha2: "NP", numeric: "524", name: "Nepal", officialName: "Federal Democratic Republic of Nepal", nationality: "Nepalese", flag: "🇳🇵", region: "Asia", subregion: "Southern Asia" },
  { code: "NLD", alpha2: "NL", numeric: "528", name: "Netherlands", officialName: "Kingdom of the Netherlands", nationality: "Dutch", flag: "🇳🇱", region: "Europe", subregion: "Western Europe" },
  { code: "NZL", alpha2: "NZ", numeric: "554", name: "New Zealand", officialName: "New Zealand", nationality: "New Zealander", flag: "🇳🇿", region: "Oceania", subregion: "Australia and New Zealand" },
  { code: "NGA", alpha2: "NG", numeric: "566", name: "Nigeria", officialName: "Federal Republic of Nigeria", nationality: "Nigerian", flag: "🇳🇬", region: "Africa", subregion: "Western Africa" },
  { code: "PRK", alpha2: "KP", numeric: "408", name: "North Korea", officialName: "Democratic People's Republic of Korea", nationality: "North Korean", flag: "🇰🇵", region: "Asia", subregion: "Eastern Asia" },
  { code: "NOR", alpha2: "NO", numeric: "578", name: "Norway", officialName: "Kingdom of Norway", nationality: "Norwegian", flag: "🇳🇴", region: "Europe", subregion: "Northern Europe" },
  { code: "OMN", alpha2: "OM", numeric: "512", name: "Oman", officialName: "Sultanate of Oman", nationality: "Omani", flag: "🇴🇲", region: "Asia", subregion: "Western Asia" },
  { code: "PAK", alpha2: "PK", numeric: "586", name: "Pakistan", officialName: "Islamic Republic of Pakistan", nationality: "Pakistani", flag: "🇵🇰", region: "Asia", subregion: "Southern Asia" },
  { code: "PAN", alpha2: "PA", numeric: "591", name: "Panama", officialName: "Republic of Panama", nationality: "Panamanian", flag: "🇵🇦", region: "Americas", subregion: "Central America" },
  { code: "PRY", alpha2: "PY", numeric: "600", name: "Paraguay", officialName: "Republic of Paraguay", nationality: "Paraguayan", flag: "🇵🇾", region: "Americas", subregion: "South America" },
  { code: "PER", alpha2: "PE", numeric: "604", name: "Peru", officialName: "Republic of Peru", nationality: "Peruvian", flag: "🇵🇪", region: "Americas", subregion: "South America" },
  { code: "PHL", alpha2: "PH", numeric: "608", name: "Philippines", officialName: "Republic of the Philippines", nationality: "Filipino", flag: "🇵🇭", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "POL", alpha2: "PL", numeric: "616", name: "Poland", officialName: "Republic of Poland", nationality: "Polish", flag: "🇵🇱", region: "Europe", subregion: "Eastern Europe" },
  { code: "PRT", alpha2: "PT", numeric: "620", name: "Portugal", officialName: "Portuguese Republic", nationality: "Portuguese", flag: "🇵🇹", region: "Europe", subregion: "Southern Europe" },
  { code: "QAT", alpha2: "QA", numeric: "634", name: "Qatar", officialName: "State of Qatar", nationality: "Qatari", flag: "🇶🇦", region: "Asia", subregion: "Western Asia" },
  { code: "ROU", alpha2: "RO", numeric: "642", name: "Romania", officialName: "Romania", nationality: "Romanian", flag: "🇷🇴", region: "Europe", subregion: "Eastern Europe" },
  { code: "RUS", alpha2: "RU", numeric: "643", name: "Russia", officialName: "Russian Federation", nationality: "Russian", flag: "🇷🇺", region: "Europe", subregion: "Eastern Europe" },
  { code: "SAU", alpha2: "SA", numeric: "682", name: "Saudi Arabia", officialName: "Kingdom of Saudi Arabia", nationality: "Saudi", flag: "🇸🇦", region: "Asia", subregion: "Western Asia" },
  { code: "SGP", alpha2: "SG", numeric: "702", name: "Singapore", officialName: "Republic of Singapore", nationality: "Singaporean", flag: "🇸🇬", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "SVK", alpha2: "SK", numeric: "703", name: "Slovakia", officialName: "Slovak Republic", nationality: "Slovak", flag: "🇸🇰", region: "Europe", subregion: "Eastern Europe" },
  { code: "ZAF", alpha2: "ZA", numeric: "710", name: "South Africa", officialName: "Republic of South Africa", nationality: "South African", flag: "🇿🇦", region: "Africa", subregion: "Southern Africa" },
  { code: "KOR", alpha2: "KR", numeric: "410", name: "South Korea", officialName: "Republic of Korea", nationality: "South Korean", flag: "🇰🇷", region: "Asia", subregion: "Eastern Asia" },
  { code: "ESP", alpha2: "ES", numeric: "724", name: "Spain", officialName: "Kingdom of Spain", nationality: "Spanish", flag: "🇪🇸", region: "Europe", subregion: "Southern Europe" },
  { code: "LKA", alpha2: "LK", numeric: "144", name: "Sri Lanka", officialName: "Democratic Socialist Republic of Sri Lanka", nationality: "Sri Lankan", flag: "🇱🇰", region: "Asia", subregion: "Southern Asia" },
  { code: "SDN", alpha2: "SD", numeric: "729", name: "Sudan", officialName: "Republic of the Sudan", nationality: "Sudanese", flag: "🇸🇩", region: "Africa", subregion: "Northern Africa" },
  { code: "SWE", alpha2: "SE", numeric: "752", name: "Sweden", officialName: "Kingdom of Sweden", nationality: "Swedish", flag: "🇸🇪", region: "Europe", subregion: "Northern Europe" },
  { code: "CHE", alpha2: "CH", numeric: "756", name: "Switzerland", officialName: "Swiss Confederation", nationality: "Swiss", flag: "🇨🇭", region: "Europe", subregion: "Western Europe" },
  { code: "SYR", alpha2: "SY", numeric: "760", name: "Syria", officialName: "Syrian Arab Republic", nationality: "Syrian", flag: "🇸🇾", region: "Asia", subregion: "Western Asia" },
  { code: "TWN", alpha2: "TW", numeric: "158", name: "Taiwan", officialName: "Republic of China (Taiwan)", nationality: "Taiwanese", flag: "🇹🇼", region: "Asia", subregion: "Eastern Asia" },
  { code: "TJK", alpha2: "TJ", numeric: "762", name: "Tajikistan", officialName: "Republic of Tajikistan", nationality: "Tajikistani", flag: "🇹🇯", region: "Asia", subregion: "Central Asia" },
  { code: "THA", alpha2: "TH", numeric: "764", name: "Thailand", officialName: "Kingdom of Thailand", nationality: "Thai", flag: "🇹🇭", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "TUR", alpha2: "TR", numeric: "792", name: "Turkey", officialName: "Republic of Türkiye", nationality: "Turkish", flag: "🇹🇷", region: "Asia", subregion: "Western Asia" },
  { code: "UKR", alpha2: "UA", numeric: "804", name: "Ukraine", officialName: "Ukraine", nationality: "Ukrainian", flag: "🇺🇦", region: "Europe", subregion: "Eastern Europe" },
  { code: "ARE", alpha2: "AE", numeric: "784", name: "United Arab Emirates", officialName: "United Arab Emirates", nationality: "Emirati", flag: "🇦🇪", region: "Asia", subregion: "Western Asia" },
  { code: "GBR", alpha2: "GB", numeric: "826", name: "United Kingdom", officialName: "United Kingdom of Great Britain and Northern Ireland", nationality: "British", flag: "🇬🇧", region: "Europe", subregion: "Northern Europe" },
  { code: "USA", alpha2: "US", numeric: "840", name: "United States", officialName: "United States of America", nationality: "American", flag: "🇺🇸", region: "Americas", subregion: "Northern America" },
  { code: "URY", alpha2: "UY", numeric: "858", name: "Uruguay", officialName: "Oriental Republic of Uruguay", nationality: "Uruguayan", flag: "🇺🇾", region: "Americas", subregion: "South America" },
  { code: "UZB", alpha2: "UZ", numeric: "860", name: "Uzbekistan", officialName: "Republic of Uzbekistan", nationality: "Uzbekistani", flag: "🇺🇿", region: "Asia", subregion: "Central Asia" },
  { code: "VEN", alpha2: "VE", numeric: "862", name: "Venezuela", officialName: "Bolivarian Republic of Venezuela", nationality: "Venezuelan", flag: "🇻🇪", region: "Americas", subregion: "South America" },
  { code: "VNM", alpha2: "VN", numeric: "704", name: "Vietnam", officialName: "Socialist Republic of Vietnam", nationality: "Vietnamese", flag: "🇻🇳", region: "Asia", subregion: "South-Eastern Asia" },
  { code: "YEM", alpha2: "YE", numeric: "887", name: "Yemen", officialName: "Republic of Yemen", nationality: "Yemeni", flag: "🇾🇪", region: "Asia", subregion: "Western Asia" },
  { code: "ZWE", alpha2: "ZW", numeric: "716", name: "Zimbabwe", officialName: "Republic of Zimbabwe", nationality: "Zimbabwean", flag: "🇿🇼", region: "Africa", subregion: "Eastern Africa" }
];

/**
 * Utility helper to retrieve country record by ISO code (Alpha-3, Alpha-2, or Numeric).
 */
export function getCountryByCode(code: string): Country | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return countryList.find(
    c => c.code === upper || c.alpha2 === upper || c.numeric === upper
  );
}

/**
 * Filter countries by search query matching name, official name, demonym, ISO codes, or region.
 */
export function searchCountries(query: string): Country[] {
  if (!query || !query.trim()) return countryList;
  const s = query.trim().toLowerCase();
  return countryList.filter(c =>
    c.name.toLowerCase().includes(s) ||
    c.officialName.toLowerCase().includes(s) ||
    c.nationality.toLowerCase().includes(s) ||
    c.code.toLowerCase().includes(s) ||
    c.alpha2.toLowerCase().includes(s) ||
    c.numeric.includes(s) ||
    c.region.toLowerCase().includes(s)
  );
}

/**
 * Get countries belonging to a specific geographic region.
 */
export function getCountriesByRegion(region: string): Country[] {
  if (!region) return countryList;
  const r = region.toLowerCase();
  return countryList.filter(c => c.region.toLowerCase() === r);
}
