// Area code to geographic location mapping for North America
export interface AreaCodeLocation {
  areaCode: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const AREA_CODE_LOCATIONS: Record<string, AreaCodeLocation> = {
  // Major US Area Codes
  '212': { areaCode: '212', city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'EST' },
  '213': { areaCode: '213', city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 34.0522, longitude: -118.2437, timezone: 'PST' },
  '214': { areaCode: '214', city: 'Dallas', state: 'TX', country: 'USA', latitude: 32.7767, longitude: -96.7970, timezone: 'CST' },
  '215': { areaCode: '215', city: 'Philadelphia', state: 'PA', country: 'USA', latitude: 39.9526, longitude: -75.1652, timezone: 'EST' },
  '216': { areaCode: '216', city: 'Cleveland', state: 'OH', country: 'USA', latitude: 41.4993, longitude: -81.6944, timezone: 'EST' },
  '217': { areaCode: '217', city: 'Springfield', state: 'IL', country: 'USA', latitude: 39.7817, longitude: -89.6501, timezone: 'CST' },
  '218': { areaCode: '218', city: 'Duluth', state: 'MN', country: 'USA', latitude: 46.7867, longitude: -92.1005, timezone: 'CST' },
  '219': { areaCode: '219', city: 'Gary', state: 'IN', country: 'USA', latitude: 41.5868, longitude: -87.3464, timezone: 'CST' },
  
  '301': { areaCode: '301', city: 'Rockville', state: 'MD', country: 'USA', latitude: 39.0840, longitude: -77.1528, timezone: 'EST' },
  '302': { areaCode: '302', city: 'Wilmington', state: 'DE', country: 'USA', latitude: 39.7391, longitude: -75.5398, timezone: 'EST' },
  '303': { areaCode: '303', city: 'Denver', state: 'CO', country: 'USA', latitude: 39.7392, longitude: -104.9903, timezone: 'MST' },
  '304': { areaCode: '304', city: 'Charleston', state: 'WV', country: 'USA', latitude: 38.3498, longitude: -81.6326, timezone: 'EST' },
  '305': { areaCode: '305', city: 'Miami', state: 'FL', country: 'USA', latitude: 25.7617, longitude: -80.1918, timezone: 'EST' },
  '307': { areaCode: '307', city: 'Cheyenne', state: 'WY', country: 'USA', latitude: 41.1400, longitude: -104.8197, timezone: 'MST' },
  '308': { areaCode: '308', city: 'North Platte', state: 'NE', country: 'USA', latitude: 41.1239, longitude: -100.7654, timezone: 'CST' },
  '309': { areaCode: '309', city: 'Peoria', state: 'IL', country: 'USA', latitude: 40.6936, longitude: -89.5890, timezone: 'CST' },
  '310': { areaCode: '310', city: 'Beverly Hills', state: 'CA', country: 'USA', latitude: 34.0736, longitude: -118.4004, timezone: 'PST' },
  '312': { areaCode: '312', city: 'Chicago', state: 'IL', country: 'USA', latitude: 41.8781, longitude: -87.6298, timezone: 'CST' },
  '313': { areaCode: '313', city: 'Detroit', state: 'MI', country: 'USA', latitude: 42.3314, longitude: -83.0458, timezone: 'EST' },
  '314': { areaCode: '314', city: 'St. Louis', state: 'MO', country: 'USA', latitude: 38.6270, longitude: -90.1994, timezone: 'CST' },
  '316': { areaCode: '316', city: 'Wichita', state: 'KS', country: 'USA', latitude: 37.6872, longitude: -97.3301, timezone: 'CST' },
  '317': { areaCode: '317', city: 'Indianapolis', state: 'IN', country: 'USA', latitude: 39.7684, longitude: -86.1581, timezone: 'EST' },
  '318': { areaCode: '318', city: 'Shreveport', state: 'LA', country: 'USA', latitude: 32.5252, longitude: -93.7502, timezone: 'CST' },
  '319': { areaCode: '319', city: 'Cedar Rapids', state: 'IA', country: 'USA', latitude: 41.9778, longitude: -91.6656, timezone: 'CST' },
  '320': { areaCode: '320', city: 'St. Cloud', state: 'MN', country: 'USA', latitude: 45.5608, longitude: -94.1622, timezone: 'CST' },

  // Major California Area Codes
  '323': { areaCode: '323', city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 34.0522, longitude: -118.2437, timezone: 'PST' },
  '408': { areaCode: '408', city: 'San Jose', state: 'CA', country: 'USA', latitude: 37.3382, longitude: -121.8863, timezone: 'PST' },
  '415': { areaCode: '415', city: 'San Francisco', state: 'CA', country: 'USA', latitude: 37.7749, longitude: -122.4194, timezone: 'PST' },
  '510': { areaCode: '510', city: 'Oakland', state: 'CA', country: 'USA', latitude: 37.8044, longitude: -122.2712, timezone: 'PST' },
  '562': { areaCode: '562', city: 'Long Beach', state: 'CA', country: 'USA', latitude: 33.7701, longitude: -118.1937, timezone: 'PST' },
  '619': { areaCode: '619', city: 'San Diego', state: 'CA', country: 'USA', latitude: 32.7157, longitude: -117.1611, timezone: 'PST' },
  '626': { areaCode: '626', city: 'Pasadena', state: 'CA', country: 'USA', latitude: 34.1478, longitude: -118.1445, timezone: 'PST' },
  '650': { areaCode: '650', city: 'Palo Alto', state: 'CA', country: 'USA', latitude: 37.4419, longitude: -122.1430, timezone: 'PST' },
  '661': { areaCode: '661', city: 'Bakersfield', state: 'CA', country: 'USA', latitude: 35.3733, longitude: -119.0187, timezone: 'PST' },
  '707': { areaCode: '707', city: 'Santa Rosa', state: 'CA', country: 'USA', latitude: 38.4404, longitude: -122.7144, timezone: 'PST' },
  '714': { areaCode: '714', city: 'Anaheim', state: 'CA', country: 'USA', latitude: 33.8366, longitude: -117.9143, timezone: 'PST' },
  '760': { areaCode: '760', city: 'Oceanside', state: 'CA', country: 'USA', latitude: 33.1959, longitude: -117.3795, timezone: 'PST' },
  '805': { areaCode: '805', city: 'Santa Barbara', state: 'CA', country: 'USA', latitude: 34.4208, longitude: -119.6982, timezone: 'PST' },
  '818': { areaCode: '818', city: 'Burbank', state: 'CA', country: 'USA', latitude: 34.1808, longitude: -118.3090, timezone: 'PST' },
  '831': { areaCode: '831', city: 'Salinas', state: 'CA', country: 'USA', latitude: 36.6777, longitude: -121.6555, timezone: 'PST' },
  '858': { areaCode: '858', city: 'San Diego', state: 'CA', country: 'USA', latitude: 32.7157, longitude: -117.1611, timezone: 'PST' },
  '909': { areaCode: '909', city: 'San Bernardino', state: 'CA', country: 'USA', latitude: 34.1083, longitude: -117.2898, timezone: 'PST' },
  '916': { areaCode: '916', city: 'Sacramento', state: 'CA', country: 'USA', latitude: 38.5816, longitude: -121.4944, timezone: 'PST' },
  '925': { areaCode: '925', city: 'Concord', state: 'CA', country: 'USA', latitude: 37.9780, longitude: -122.0311, timezone: 'PST' },
  '949': { areaCode: '949', city: 'Irvine', state: 'CA', country: 'USA', latitude: 33.6846, longitude: -117.8265, timezone: 'PST' },
  '951': { areaCode: '951', city: 'Riverside', state: 'CA', country: 'USA', latitude: 33.9533, longitude: -117.3962, timezone: 'PST' },

  // Major Texas Area Codes
  '281': { areaCode: '281', city: 'Houston', state: 'TX', country: 'USA', latitude: 29.7604, longitude: -95.3698, timezone: 'CST' },
  '409': { areaCode: '409', city: 'Beaumont', state: 'TX', country: 'USA', latitude: 30.0860, longitude: -94.1018, timezone: 'CST' },
  '432': { areaCode: '432', city: 'Midland', state: 'TX', country: 'USA', latitude: 32.0251, longitude: -102.0779, timezone: 'CST' },
  '469': { areaCode: '469', city: 'Dallas', state: 'TX', country: 'USA', latitude: 32.7767, longitude: -96.7970, timezone: 'CST' },
  '512': { areaCode: '512', city: 'Austin', state: 'TX', country: 'USA', latitude: 30.2672, longitude: -97.7431, timezone: 'CST' },
  '713': { areaCode: '713', city: 'Houston', state: 'TX', country: 'USA', latitude: 29.7604, longitude: -95.3698, timezone: 'CST' },
  '737': { areaCode: '737', city: 'Austin', state: 'TX', country: 'USA', latitude: 30.2672, longitude: -97.7431, timezone: 'CST' },
  '806': { areaCode: '806', city: 'Lubbock', state: 'TX', country: 'USA', latitude: 33.5779, longitude: -101.8552, timezone: 'CST' },
  '817': { areaCode: '817', city: 'Fort Worth', state: 'TX', country: 'USA', latitude: 32.7555, longitude: -97.3308, timezone: 'CST' },
  '832': { areaCode: '832', city: 'Houston', state: 'TX', country: 'USA', latitude: 29.7604, longitude: -95.3698, timezone: 'CST' },
  '903': { areaCode: '903', city: 'Tyler', state: 'TX', country: 'USA', latitude: 32.3513, longitude: -95.3011, timezone: 'CST' },
  '915': { areaCode: '915', city: 'El Paso', state: 'TX', country: 'USA', latitude: 31.7619, longitude: -106.4850, timezone: 'MST' },
  '936': { areaCode: '936', city: 'Huntsville', state: 'TX', country: 'USA', latitude: 30.7235, longitude: -95.5508, timezone: 'CST' },
  '940': { areaCode: '940', city: 'Wichita Falls', state: 'TX', country: 'USA', latitude: 33.9137, longitude: -98.4934, timezone: 'CST' },
  '956': { areaCode: '956', city: 'Laredo', state: 'TX', country: 'USA', latitude: 27.5306, longitude: -99.4803, timezone: 'CST' },
  '972': { areaCode: '972', city: 'Dallas', state: 'TX', country: 'USA', latitude: 32.7767, longitude: -96.7970, timezone: 'CST' },
  '979': { areaCode: '979', city: 'College Station', state: 'TX', country: 'USA', latitude: 30.6280, longitude: -96.3344, timezone: 'CST' },

  // Major Florida Area Codes
  '239': { areaCode: '239', city: 'Fort Myers', state: 'FL', country: 'USA', latitude: 26.6406, longitude: -81.8723, timezone: 'EST' },
  '321': { areaCode: '321', city: 'Orlando', state: 'FL', country: 'USA', latitude: 28.5383, longitude: -81.3792, timezone: 'EST' },
  '352': { areaCode: '352', city: 'Gainesville', state: 'FL', country: 'USA', latitude: 29.6516, longitude: -82.3248, timezone: 'EST' },
  '386': { areaCode: '386', city: 'Daytona Beach', state: 'FL', country: 'USA', latitude: 29.2108, longitude: -81.0228, timezone: 'EST' },
  '407': { areaCode: '407', city: 'Orlando', state: 'FL', country: 'USA', latitude: 28.5383, longitude: -81.3792, timezone: 'EST' },
  '561': { areaCode: '561', city: 'West Palm Beach', state: 'FL', country: 'USA', latitude: 26.7153, longitude: -80.0534, timezone: 'EST' },
  '727': { areaCode: '727', city: 'St. Petersburg', state: 'FL', country: 'USA', latitude: 27.7676, longitude: -82.6404, timezone: 'EST' },
  '754': { areaCode: '754', city: 'Fort Lauderdale', state: 'FL', country: 'USA', latitude: 26.1224, longitude: -80.1373, timezone: 'EST' },
  '772': { areaCode: '772', city: 'Port St. Lucie', state: 'FL', country: 'USA', latitude: 27.2730, longitude: -80.3582, timezone: 'EST' },
  '786': { areaCode: '786', city: 'Miami', state: 'FL', country: 'USA', latitude: 25.7617, longitude: -80.1918, timezone: 'EST' },
  '813': { areaCode: '813', city: 'Tampa', state: 'FL', country: 'USA', latitude: 27.9506, longitude: -82.4572, timezone: 'EST' },
  '850': { areaCode: '850', city: 'Tallahassee', state: 'FL', country: 'USA', latitude: 30.4518, longitude: -84.2807, timezone: 'EST' },
  '863': { areaCode: '863', city: 'Lakeland', state: 'FL', country: 'USA', latitude: 28.0395, longitude: -81.9498, timezone: 'EST' },
  '904': { areaCode: '904', city: 'Jacksonville', state: 'FL', country: 'USA', latitude: 30.3322, longitude: -81.6557, timezone: 'EST' },
  '941': { areaCode: '941', city: 'Sarasota', state: 'FL', country: 'USA', latitude: 27.3364, longitude: -82.5307, timezone: 'EST' },
  '954': { areaCode: '954', city: 'Fort Lauderdale', state: 'FL', country: 'USA', latitude: 26.1224, longitude: -80.1373, timezone: 'EST' },

  // Major New York Area Codes
  '315': { areaCode: '315', city: 'Syracuse', state: 'NY', country: 'USA', latitude: 43.0481, longitude: -76.1474, timezone: 'EST' },
  '347': { areaCode: '347', city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'EST' },
  '516': { areaCode: '516', city: 'Hempstead', state: 'NY', country: 'USA', latitude: 40.7062, longitude: -73.6187, timezone: 'EST' },
  '518': { areaCode: '518', city: 'Albany', state: 'NY', country: 'USA', latitude: 42.6526, longitude: -73.7562, timezone: 'EST' },
  '585': { areaCode: '585', city: 'Rochester', state: 'NY', country: 'USA', latitude: 43.1566, longitude: -77.6088, timezone: 'EST' },
  '607': { areaCode: '607', city: 'Binghamton', state: 'NY', country: 'USA', latitude: 42.0987, longitude: -75.9180, timezone: 'EST' },
  '631': { areaCode: '631', city: 'Islip', state: 'NY', country: 'USA', latitude: 40.7451, longitude: -73.2090, timezone: 'EST' },
  '646': { areaCode: '646', city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'EST' },
  '716': { areaCode: '716', city: 'Buffalo', state: 'NY', country: 'USA', latitude: 42.8864, longitude: -78.8784, timezone: 'EST' },
  '718': { areaCode: '718', city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'EST' },
  '845': { areaCode: '845', city: 'Poughkeepsie', state: 'NY', country: 'USA', latitude: 41.7004, longitude: -73.9209, timezone: 'EST' },
  '914': { areaCode: '914', city: 'Yonkers', state: 'NY', country: 'USA', latitude: 40.9312, longitude: -73.8987, timezone: 'EST' },
  '917': { areaCode: '917', city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'EST' },
  '929': { areaCode: '929', city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'EST' },

  // Other Major Area Codes
  '404': { areaCode: '404', city: 'Atlanta', state: 'GA', country: 'USA', latitude: 33.7490, longitude: -84.3880, timezone: 'EST' },
  '502': { areaCode: '502', city: 'Louisville', state: 'KY', country: 'USA', latitude: 38.2527, longitude: -85.7585, timezone: 'EST' },
  '503': { areaCode: '503', city: 'Portland', state: 'OR', country: 'USA', latitude: 45.5152, longitude: -122.6784, timezone: 'PST' },
  '504': { areaCode: '504', city: 'New Orleans', state: 'LA', country: 'USA', latitude: 29.9511, longitude: -90.0715, timezone: 'CST' },
  '505': { areaCode: '505', city: 'Albuquerque', state: 'NM', country: 'USA', latitude: 35.0844, longitude: -106.6504, timezone: 'MST' },
  '508': { areaCode: '508', city: 'Worcester', state: 'MA', country: 'USA', latitude: 42.2626, longitude: -71.8023, timezone: 'EST' },
  '509': { areaCode: '509', city: 'Spokane', state: 'WA', country: 'USA', latitude: 47.6587, longitude: -117.4260, timezone: 'PST' },
  '602': { areaCode: '602', city: 'Phoenix', state: 'AZ', country: 'USA', latitude: 33.4484, longitude: -112.0740, timezone: 'MST' },
  '603': { areaCode: '603', city: 'Manchester', state: 'NH', country: 'USA', latitude: 42.9956, longitude: -71.4548, timezone: 'EST' },
  '617': { areaCode: '617', city: 'Boston', state: 'MA', country: 'USA', latitude: 42.3601, longitude: -71.0589, timezone: 'EST' },
  '618': { areaCode: '618', city: 'Belleville', state: 'IL', country: 'USA', latitude: 38.5201, longitude: -89.9840, timezone: 'CST' },
  '701': { areaCode: '701', city: 'Fargo', state: 'ND', country: 'USA', latitude: 46.8772, longitude: -96.7898, timezone: 'CST' },
  '702': { areaCode: '702', city: 'Las Vegas', state: 'NV', country: 'USA', latitude: 36.1699, longitude: -115.1398, timezone: 'PST' },
  '703': { areaCode: '703', city: 'Arlington', state: 'VA', country: 'USA', latitude: 38.8816, longitude: -77.0910, timezone: 'EST' },
  '704': { areaCode: '704', city: 'Charlotte', state: 'NC', country: 'USA', latitude: 35.2271, longitude: -80.8431, timezone: 'EST' },
  '706': { areaCode: '706', city: 'Augusta', state: 'GA', country: 'USA', latitude: 33.4735, longitude: -82.0105, timezone: 'EST' },
  '708': { areaCode: '708', city: 'Cicero', state: 'IL', country: 'USA', latitude: 41.8456, longitude: -87.7539, timezone: 'CST' },
  '712': { areaCode: '712', city: 'Sioux City', state: 'IA', country: 'USA', latitude: 42.4999, longitude: -96.4003, timezone: 'CST' },
  '717': { areaCode: '717', city: 'Harrisburg', state: 'PA', country: 'USA', latitude: 40.2732, longitude: -76.8839, timezone: 'EST' },
  '719': { areaCode: '719', city: 'Colorado Springs', state: 'CO', country: 'USA', latitude: 38.8339, longitude: -104.8214, timezone: 'MST' },
  '720': { areaCode: '720', city: 'Denver', state: 'CO', country: 'USA', latitude: 39.7392, longitude: -104.9903, timezone: 'MST' },
  '773': { areaCode: '773', city: 'Chicago', state: 'IL', country: 'USA', latitude: 41.8781, longitude: -87.6298, timezone: 'CST' },
  '774': { areaCode: '774', city: 'Worcester', state: 'MA', country: 'USA', latitude: 42.2626, longitude: -71.8023, timezone: 'EST' },
  '801': { areaCode: '801', city: 'Salt Lake City', state: 'UT', country: 'USA', latitude: 40.7608, longitude: -111.8910, timezone: 'MST' },
  '802': { areaCode: '802', city: 'Burlington', state: 'VT', country: 'USA', latitude: 44.4759, longitude: -73.2121, timezone: 'EST' },
  '803': { areaCode: '803', city: 'Columbia', state: 'SC', country: 'USA', latitude: 34.0007, longitude: -81.0348, timezone: 'EST' },
  '804': { areaCode: '804', city: 'Richmond', state: 'VA', country: 'USA', latitude: 37.5407, longitude: -77.4360, timezone: 'EST' },
  '808': { areaCode: '808', city: 'Honolulu', state: 'HI', country: 'USA', latitude: 21.3099, longitude: -157.8581, timezone: 'HST' },
  '810': { areaCode: '810', city: 'Flint', state: 'MI', country: 'USA', latitude: 43.0125, longitude: -83.6875, timezone: 'EST' },
  '812': { areaCode: '812', city: 'Evansville', state: 'IN', country: 'USA', latitude: 37.9716, longitude: -87.5711, timezone: 'CST' },
  '814': { areaCode: '814', city: 'Erie', state: 'PA', country: 'USA', latitude: 42.1292, longitude: -80.0851, timezone: 'EST' },
  '815': { areaCode: '815', city: 'Rockford', state: 'IL', country: 'USA', latitude: 42.2711, longitude: -89.0940, timezone: 'CST' },
  '816': { areaCode: '816', city: 'Kansas City', state: 'MO', country: 'USA', latitude: 39.0997, longitude: -94.5786, timezone: 'CST' },
  '901': { areaCode: '901', city: 'Memphis', state: 'TN', country: 'USA', latitude: 35.1495, longitude: -90.0490, timezone: 'CST' },
  '905': { areaCode: '905', city: 'Hamilton', state: 'ON', country: 'Canada', latitude: 43.2557, longitude: -79.8711, timezone: 'EST' },
  '906': { areaCode: '906', city: 'Marquette', state: 'MI', country: 'USA', latitude: 46.5436, longitude: -87.3954, timezone: 'EST' },
  '907': { areaCode: '907', city: 'Anchorage', state: 'AK', country: 'USA', latitude: 61.2181, longitude: -149.9003, timezone: 'AKST' },
  '908': { areaCode: '908', city: 'Elizabeth', state: 'NJ', country: 'USA', latitude: 40.6640, longitude: -74.2107, timezone: 'EST' },
  '910': { areaCode: '910', city: 'Fayetteville', state: 'NC', country: 'USA', latitude: 35.0527, longitude: -78.8784, timezone: 'EST' },
  '912': { areaCode: '912', city: 'Savannah', state: 'GA', country: 'USA', latitude: 32.0835, longitude: -81.0998, timezone: 'EST' },
  '913': { areaCode: '913', city: 'Kansas City', state: 'KS', country: 'USA', latitude: 39.0997, longitude: -94.5786, timezone: 'CST' },
  '918': { areaCode: '918', city: 'Tulsa', state: 'OK', country: 'USA', latitude: 36.1540, longitude: -95.9928, timezone: 'CST' },
  '919': { areaCode: '919', city: 'Raleigh', state: 'NC', country: 'USA', latitude: 35.7796, longitude: -78.6382, timezone: 'EST' },
  '920': { areaCode: '920', city: 'Green Bay', state: 'WI', country: 'USA', latitude: 44.5133, longitude: -88.0133, timezone: 'CST' },

  // Canadian Area Codes
  '403': { areaCode: '403', city: 'Calgary', state: 'AB', country: 'Canada', latitude: 51.0447, longitude: -114.0719, timezone: 'MST' },
  '416': { areaCode: '416', city: 'Toronto', state: 'ON', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'EST' },
  '418': { areaCode: '418', city: 'Quebec City', state: 'QC', country: 'Canada', latitude: 46.8139, longitude: -71.2080, timezone: 'EST' },
  '438': { areaCode: '438', city: 'Montreal', state: 'QC', country: 'Canada', latitude: 45.5017, longitude: -73.5673, timezone: 'EST' },
  '450': { areaCode: '450', city: 'Laval', state: 'QC', country: 'Canada', latitude: 45.6066, longitude: -73.7124, timezone: 'EST' },
  '506': { areaCode: '506', city: 'Moncton', state: 'NB', country: 'Canada', latitude: 46.0878, longitude: -64.7782, timezone: 'AST' },
  '514': { areaCode: '514', city: 'Montreal', state: 'QC', country: 'Canada', latitude: 45.5017, longitude: -73.5673, timezone: 'EST' },
  '519': { areaCode: '519', city: 'London', state: 'ON', country: 'Canada', latitude: 42.9849, longitude: -81.2453, timezone: 'EST' },
  '581': { areaCode: '581', city: 'Quebec City', state: 'QC', country: 'Canada', latitude: 46.8139, longitude: -71.2080, timezone: 'EST' },
  '587': { areaCode: '587', city: 'Calgary', state: 'AB', country: 'Canada', latitude: 51.0447, longitude: -114.0719, timezone: 'MST' },
  '604': { areaCode: '604', city: 'Vancouver', state: 'BC', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'PST' },
  '613': { areaCode: '613', city: 'Ottawa', state: 'ON', country: 'Canada', latitude: 45.4215, longitude: -75.6972, timezone: 'EST' },
  '647': { areaCode: '647', city: 'Toronto', state: 'ON', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'EST' },
  '705': { areaCode: '705', city: 'Sudbury', state: 'ON', country: 'Canada', latitude: 46.4917, longitude: -80.9930, timezone: 'EST' },
  '709': { areaCode: '709', city: 'St. Johns', state: 'NL', country: 'Canada', latitude: 47.5615, longitude: -52.7126, timezone: 'NST' },
  '778': { areaCode: '778', city: 'Vancouver', state: 'BC', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'PST' },
  '780': { areaCode: '780', city: 'Edmonton', state: 'AB', country: 'Canada', latitude: 53.5461, longitude: -113.4938, timezone: 'MST' },
  '782': { areaCode: '782', city: 'Halifax', state: 'NS', country: 'Canada', latitude: 44.6488, longitude: -63.5752, timezone: 'AST' },
  '807': { areaCode: '807', city: 'Thunder Bay', state: 'ON', country: 'Canada', latitude: 48.3809, longitude: -89.2477, timezone: 'EST' },
  '819': { areaCode: '819', city: 'Gatineau', state: 'QC', country: 'Canada', latitude: 45.4765, longitude: -75.7013, timezone: 'EST' },
  '825': { areaCode: '825', city: 'Calgary', state: 'AB', country: 'Canada', latitude: 51.0447, longitude: -114.0719, timezone: 'MST' },
  '867': { areaCode: '867', city: 'Yellowknife', state: 'NT', country: 'Canada', latitude: 62.4540, longitude: -114.3718, timezone: 'MST' },
  '873': { areaCode: '873', city: 'Montreal', state: 'QC', country: 'Canada', latitude: 45.5017, longitude: -73.5673, timezone: 'EST' },
  '902': { areaCode: '902', city: 'Halifax', state: 'NS', country: 'Canada', latitude: 44.6488, longitude: -63.5752, timezone: 'AST' }
};

export const getLocationFromAreaCode = (phoneNumber: string): AreaCodeLocation | null => {
  if (!phoneNumber) return null;
  
  // Extract area code from phone number (first 3 digits after country code)
  const cleaned = phoneNumber.replace(/\D/g, '');
  let areaCode = '';
  
  if (cleaned.length === 10) {
    // US/Canada format: 1234567890
    areaCode = cleaned.substring(0, 3);
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // With country code: 11234567890
    areaCode = cleaned.substring(1, 4);
  } else if (cleaned.length >= 3) {
    // Fallback: take first 3 digits
    areaCode = cleaned.substring(0, 3);
  }
  
  return AREA_CODE_LOCATIONS[areaCode] || null;
};

export const getAreaCodeStats = (leads: any[]): {
  location: AreaCodeLocation;
  count: number;
  percentage: number;
}[] => {
  const locationCounts = new Map<string, { location: AreaCodeLocation; count: number }>();
  let totalWithLocation = 0;
  
  leads.forEach(lead => {
    if (lead.phone) {
      const location = getLocationFromAreaCode(lead.phone);
      if (location) {
        const key = `${location.city}, ${location.state}`;
        const existing = locationCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          locationCounts.set(key, { location, count: 1 });
        }
        totalWithLocation++;
      }
    }
  });
  
  return Array.from(locationCounts.values())
    .map(item => ({
      ...item,
      percentage: totalWithLocation > 0 ? (item.count / totalWithLocation) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
};