// =====================================================
// [DATA: POPCYCLE_AREA_MAP_DATA]
// Area Explorer records recalibrated for the dedicated
// South Los Santos and North Country Popcycle maps.
// Approximate visual pin positions are references, not
// official Rockstar Popcycle polygons.
//
// 2026-07-06: The original popcycle-city-south.jpg /
// popcycle-north-country.jpg reference images were missing
// from the repo (this is why the "Focused Area" panel showed
// "Focused map image could not be loaded."). Both city and
// county now point at the same single full-island reference
// map (gta5map2-1600.jpg). Each area's "pin" was recalculated
// from real popcycle zone world coordinates against that image.
// The focused panel shows a FIXED north/south crop (see
// POPCYCLE_FIXED_FOCUS in popcycleareamap.js) with a dot at the
// pin - not a per-area zoom - since auto-zoomed boxes drifted
// noticeably for smaller areas. This is a visual approximation,
// good enough to show roughly where a schedule sits on the map.
// =====================================================

window.GTATrafficAreaMapData = {
  "version": "2.2-fixed-focus-dot-marker",
  "imagePaths": {
    "overview": "assets/area-maps/gta5map2-1600.jpg",
    "city": "assets/area-maps/gta5map2-1600.jpg",
    "county": "assets/area-maps/gta5map2-1600.jpg"
  },
  "areas": [
    {
      "id": "ALAMO_SEA",
      "name": "Alamo Sea",
      "county": "Blaine County",
      "category": "Central Blaine",
      "map": "county",
      "pin": [
        1011.6,
        471.89
      ],
      "popcycle": [
        "ALAMO_SEA"
      ],
      "popgroups": [
        "Birds_Ocean",
        "Fish",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Inland lake",
        "Galilee",
        "Shore roads"
      ],
      "notes": "Central body of water. Mostly acts as a landmark between Sandy Shores, Grapeseed, and the mountain regions."
    },
    {
      "id": "GRAND_SENORA_DESERT",
      "name": "Grand Senora Desert",
      "county": "Blaine County",
      "category": "Central Blaine",
      "map": "county",
      "pin": [
        1131.69,
        616.77
      ],
      "popcycle": [
        "GRAND_SENORA_DESERT",
        "DESERT"
      ],
      "popgroups": [
        "FREEWAY_COUNTRYSIDE",
        "SALTON",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Open desert",
        "Grand Senora airstrip",
        "Route 68 corridor"
      ],
      "notes": "Large central desert region. Use low-to-medium traffic, rural vehicles, off-road, utility, and some highway mix."
    },
    {
      "id": "GRAPESEED",
      "name": "Grapeseed",
      "county": "Blaine County",
      "category": "Central Blaine",
      "map": "county",
      "pin": [
        1066.18,
        365.43
      ],
      "popcycle": [
        "GRAPESEED"
      ],
      "popgroups": [
        "Grapeseed_General",
        "Grapeseed_Farm"
      ],
      "landmarks": [
        "Farm grid",
        "Northeast Alamo Sea shore",
        "McKenzie Field nearby"
      ],
      "notes": "Agricultural town. Country on-road/off-road cars, trucks, farm vehicles, workers, and rural peds fit."
    },
    {
      "id": "HARMONY",
      "name": "Harmony",
      "county": "Blaine County",
      "category": "Central Blaine",
      "map": "county",
      "pin": [
        767.38,
        691.64
      ],
      "popcycle": [
        "HARMONY"
      ],
      "popgroups": [
        "FREEWAY_COUNTRYSIDE",
        "SALTON"
      ],
      "landmarks": [
        "Harmony town strip",
        "Route 68",
        "Central county junction"
      ],
      "notes": "Small Route 68 settlement. Good for country traffic, trucks, poor/mid cars, and light rural law enforcement."
    },
    {
      "id": "HIPPY",
      "name": "Hippy / Stab City Area",
      "county": "Blaine County",
      "category": "Central Blaine",
      "map": "county",
      "pin": [
        701.79,
        534.7
      ],
      "popcycle": [
        "Hippy"
      ],
      "popgroups": [
        "Hippy",
        "FREEWAY_COUNTRYSIDE",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Stab City area",
        "Alamo Sea southwest shore",
        "Trailer/camp settlement"
      ],
      "notes": "Special settlement area. Good for unique ped populations, older vehicles, off-road, and low-density traffic."
    },
    {
      "id": "SANDY_SHORES",
      "name": "Sandy Shores",
      "county": "Blaine County",
      "category": "Central Blaine",
      "map": "county",
      "pin": [
        1011.6,
        534.35
      ],
      "popcycle": [
        "SANDY_SHORES"
      ],
      "popgroups": [
        "Sandy_Shores",
        "Sandy_Shores_Tramps",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Sandy Shores town",
        "Airfield",
        "South Alamo Sea shore"
      ],
      "notes": "Desert town. Poor cars, country cars, off-road, bikes, old trucks, and unusual peds fit the feel."
    },
    {
      "id": "SAN_CHIANSKI",
      "name": "San Chianski Mountain Range",
      "county": "Blaine County",
      "category": "East Blaine",
      "map": "county",
      "pin": [
        1117.04,
        1144.8
      ],
      "popcycle": [
        "SAN_CHIANSKI",
        "PALOMINO_HIGHLANDS"
      ],
      "popgroups": [
        "FREEWAY_COUNTRYSIDE",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Eastern mountain roads",
        "Humane Labs area",
        "Wind farm edge"
      ],
      "notes": "Far east mountain/wilderness region. Low traffic, utility, rural, and off-road vehicles make the most sense."
    },
    {
      "id": "FORT_ZANCUDO",
      "name": "Fort Zancudo",
      "county": "Blaine County",
      "category": "Military / Restricted",
      "map": "county",
      "pin": [
        267.5,
        614.25
      ],
      "popcycle": [
        "ARMY",
        "FORT_ZANCUDO"
      ],
      "popgroups": [
        "ARMY",
        "VEH_ARMY",
        "VEH_ARMYPOLICE"
      ],
      "landmarks": [
        "Military air base",
        "Runways",
        "Lago Zancudo"
      ],
      "notes": "Restricted military zone. Army/MP vehicles and low civilian traffic are correct here."
    },
    {
      "id": "CULT",
      "name": "Altruist Camp / Cult Area",
      "county": "Blaine County",
      "category": "Mountains / Wilderness",
      "map": "county",
      "pin": [
        374.71,
        650.89
      ],
      "popcycle": [
        "CULT"
      ],
      "popgroups": [
        "CULT",
        "FREEWAY_COUNTRYSIDE",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Altruist camp area",
        "Mountain trails",
        "Remote western hills"
      ],
      "notes": "Special rural/cult zone. This is a unique ped group area, so keep it separate from generic countryside."
    },
    {
      "id": "MOUNT_CHILIAD",
      "name": "Mount Chiliad / Chiliad Wilderness",
      "county": "Blaine County",
      "category": "Mountains / Wilderness",
      "map": "county",
      "pin": [
        1066.48,
        181.36
      ],
      "popcycle": [
        "CHILIAD",
        "MOUNT_CHILIAD"
      ],
      "popgroups": [
        "Birds_Countryside",
        "FREEWAY_COUNTRYSIDE"
      ],
      "landmarks": [
        "Mount Chiliad summit",
        "State wilderness",
        "Cable car / mountain roads"
      ],
      "notes": "Major wilderness zone. Keep density low; ranger, off-road, hikers/folk/countryside birds make more sense than city traffic."
    },
    {
      "id": "MOUNT_JOSIAH",
      "name": "Mount Josiah",
      "county": "Blaine County",
      "category": "Mountains / Wilderness",
      "map": "county",
      "pin": [
        383.72,
        527.29
      ],
      "popcycle": [
        "MOUNT_JOSIAH"
      ],
      "popgroups": [
        "FREEWAY_COUNTRYSIDE",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Mount Josiah",
        "Western slopes",
        "Near Raton Canyon and Zancudo"
      ],
      "notes": "Western mountain/wilderness. Keep spawns sparse and rural."
    },
    {
      "id": "RATON_CANYON",
      "name": "Raton Canyon",
      "county": "Blaine County",
      "category": "Mountains / Wilderness",
      "map": "county",
      "pin": [
        309.06,
        427.88
      ],
      "popcycle": [
        "RATON_CANYON"
      ],
      "popgroups": [
        "FREEWAY_COUNTRYSIDE",
        "Birds_Countryside"
      ],
      "landmarks": [
        "River canyon",
        "Western trails",
        "Southwest of Alamo Sea"
      ],
      "notes": "Canyon/trail area. Low peds, countryside/off-road traffic, and wildlife-style groups fit best."
    },
    {
      "id": "PALETO_BAY",
      "name": "Paleto Bay",
      "county": "Blaine County",
      "category": "North Blaine",
      "map": "county",
      "pin": [
        637.65,
        196.76
      ],
      "popcycle": [
        "PALETO_BAY"
      ],
      "popgroups": [
        "Paleto_Bay_General",
        "Paleto_Bay_Beach"
      ],
      "landmarks": [
        "Paleto Bay town grid",
        "Procopio Beach",
        "Great Ocean Highway"
      ],
      "notes": "Northern coastal town. Rural/country cars, older traffic, bikes, and small-town peds fit well."
    },
    {
      "id": "PALETO_FOREST",
      "name": "Paleto Forest",
      "county": "Blaine County",
      "category": "North Blaine",
      "map": "county",
      "pin": [
        558.02,
        271.57
      ],
      "popcycle": [
        "PALETO_FOREST"
      ],
      "popgroups": [
        "FREEWAY_COUNTRYSIDE",
        "Birds_Countryside"
      ],
      "landmarks": [
        "Lumber Yard",
        "Paleto Forest roads",
        "South of Paleto Bay"
      ],
      "notes": "Forest/wilderness transition. Use low density, off-road, ranger, utility, and rural vehicles."
    },
    {
      "id": "NORTH_CHUMASH",
      "name": "North Chumash / Chumash Coast",
      "county": "Blaine County",
      "category": "West Coast",
      "map": "county",
      "pin": [
        222.41,
        544.21
      ],
      "popcycle": [
        "CHUMASH",
        "NORTH_CHUMASH"
      ],
      "popgroups": [
        "CHUMASH",
        "FREEWAY_COUNTRYSIDE",
        "Birds_Ocean"
      ],
      "landmarks": [
        "Great Ocean Highway",
        "Western coastline",
        "Coastal houses"
      ],
      "notes": "Coastal highway strip. Good for mid/poor cars, beach/coast peds, bikes, boats, and light rural cops."
    },
    {
      "id": "TONGVA",
      "name": "Tongva Hills / Tongva Valley",
      "county": "Blaine County",
      "category": "West Coast",
      "map": "county",
      "pin": [
        277.69,
        790.77
      ],
      "popcycle": [
        "TONGVA_HILLS",
        "TONGVA_VALLEY"
      ],
      "popgroups": [
        "FREEWAY_COUNTRYSIDE",
        "Rockford_Hills_Night"
      ],
      "landmarks": [
        "Tongva Valley",
        "Marlowe vineyards",
        "Western rural roads"
      ],
      "notes": "Rural wealthy hills between city and county. Mid/rich cars mixed with countryside vehicles work well."
    },
    {
      "id": "DOWNTOWN",
      "name": "Downtown / Pillbox / Mission Row",
      "county": "Los Santos County",
      "category": "Downtown Los Santos",
      "map": "city",
      "pin": [
        615.87,
        1161.18
      ],
      "popcycle": [
        "DOWN_TOWN",
        "DOWNTOWN"
      ],
      "popgroups": [
        "Pillbox_Business",
        "Pillbox_BevHills",
        "Pillbox_Tramps",
        "RESTAURANT_NIGHT"
      ],
      "landmarks": [
        "Maze Bank Tower",
        "FIB / IAA buildings",
        "Mission Row",
        "Legion Square"
      ],
      "notes": "Financial and government core. Best for dense peds, taxis, business peds, buses, and moderate police presence."
    },
    {
      "id": "CYPRESS_FLATS",
      "name": "Cypress Flats",
      "county": "Los Santos County",
      "category": "East / Industrial Los Santos",
      "map": "city",
      "pin": [
        821.57,
        1391.12
      ],
      "popcycle": [
        "CYPRESS_FLATS"
      ],
      "popgroups": [
        "Cypress_General",
        "Cypress_Tramps"
      ],
      "landmarks": [
        "Industrial blocks",
        "Warehouses",
        "East side freight roads"
      ],
      "notes": "Industrial east side. Poor/mid cars, haulage, utility, courier, and workers are the correct feel."
    },
    {
      "id": "EL_BURRO",
      "name": "El Burro Heights",
      "county": "Los Santos County",
      "category": "East / Industrial Los Santos",
      "map": "city",
      "pin": [
        926.1,
        1411.5
      ],
      "popcycle": [
        "EL_BURRO"
      ],
      "popgroups": [
        "El_Burro_General",
        "Birds_Ground_City"
      ],
      "landmarks": [
        "El Burro Heights",
        "Oil field edge",
        "Industrial east side"
      ],
      "notes": "Industrial/hillside edge district. Good for poor/mid cars, utility, haulage, and light rural crossover."
    },
    {
      "id": "LA_MESA",
      "name": "La Mesa",
      "county": "Los Santos County",
      "category": "East / Industrial Los Santos",
      "map": "city",
      "pin": [
        816.68,
        1161.42
      ],
      "popcycle": [
        "LA_MESA",
        "EAST_LOS_SANTOS"
      ],
      "popgroups": [
        "La_Mesa_General",
        "La_Mesa_Tramps",
        "InCar_General"
      ],
      "landmarks": [
        "Arts/industrial district",
        "Freeway intersections",
        "East of Downtown"
      ],
      "notes": "Useful for east-side city traffic. Mostly poor/mid, haulage, utility, taxis, and couriers."
    },
    {
      "id": "EAST_VINEWOOD",
      "name": "East Vinewood",
      "county": "Los Santos County",
      "category": "East Los Santos",
      "map": "city",
      "pin": [
        814.87,
        1136.37
      ],
      "popcycle": [
        "EAST_VINEWOOD"
      ],
      "popgroups": [
        "East_Vinewood_Local",
        "East_Vinewood_Hipster",
        "East_Vinewood_StreetGeneral"
      ],
      "landmarks": [
        "East Vinewood streets",
        "Mirror Park west edge",
        "Del Perro Freeway access"
      ],
      "notes": "Bridge between Vinewood and the east side. Good for mostly mid traffic with some poorer cars."
    },
    {
      "id": "MIRROR_PARK",
      "name": "Mirror Park",
      "county": "Los Santos County",
      "category": "East Los Santos",
      "map": "city",
      "pin": [
        900.28,
        1151.72
      ],
      "popcycle": [
        "MIRROR_PARK"
      ],
      "popgroups": [
        "Mirror_Park_Hipsters",
        "Mirror_Park_StreetGeneral",
        "East_Vinewood_Local"
      ],
      "landmarks": [
        "Mirror Park lake",
        "Suburban loop roads",
        "East Vinewood border"
      ],
      "notes": "Residential hipster/suburban zone. Good place for mid cars, older compacts, bikes, bicycles, and lighter police."
    },
    {
      "id": "RICHMAN",
      "name": "Richman",
      "county": "Los Santos County",
      "category": "Hills / Wealthy Residential",
      "map": "city",
      "pin": [
        392.78,
        1073.6
      ],
      "popcycle": [
        "RICHMAN"
      ],
      "popgroups": [
        "Richman_BevHills",
        "Richman_StreetGeneral"
      ],
      "landmarks": [
        "Los Santos Golf Club",
        "Large mansions",
        "Northwest of Rockford Hills"
      ],
      "notes": "Wealthy residential area. Rich cars, golf/country club peds, and low traffic density feel right."
    },
    {
      "id": "ROCKFORD_HILLS",
      "name": "Rockford Hills",
      "county": "Los Santos County",
      "category": "Hills / Wealthy Residential",
      "map": "city",
      "pin": [
        503.49,
        1023.99
      ],
      "popcycle": [
        "ROCKFORD_HILLS"
      ],
      "popgroups": [
        "Rockford_Hills_Day",
        "Rockford_Hills_Night"
      ],
      "landmarks": [
        "Portola Drive",
        "Rockford Plaza",
        "Luxury retail / mansions"
      ],
      "notes": "High-income core. This is where rich, rare, and occasional super vehicles make the most sense."
    },
    {
      "id": "VINEWOOD_HILLS",
      "name": "Vinewood Hills",
      "county": "Los Santos County",
      "category": "Hills / Wealthy Residential",
      "map": "city",
      "pin": [
        995.61,
        916.95
      ],
      "popcycle": [
        "VINEWOOD_HILLS",
        "MARLOWE_DRIVE",
        "GALILEO_PARK"
      ],
      "popgroups": [
        "Rockford_Hills_Day",
        "Rockford_Hills_Night",
        "Marlowe_Drive_BevHills",
        "Galileo_Park_BevHills"
      ],
      "landmarks": [
        "Vinewood sign",
        "Lake Vinewood Estates",
        "Galileo Observatory",
        "Marlowe Drive"
      ],
      "notes": "Use this as the big hill-region bucket. Rich cars, mid cars, ranger/park traffic, and low density fit better here."
    },
    {
      "id": "ALTA",
      "name": "Alta",
      "county": "Los Santos County",
      "category": "North/Central Los Santos",
      "map": "city",
      "pin": [
        718.84,
        1132.16
      ],
      "popcycle": [
        "ALTA"
      ],
      "popgroups": [
        "Alta_Business",
        "Alta_Tramps",
        "Alta_BevHills",
        "Alta_StreetGeneral"
      ],
      "landmarks": [
        "Alta Street / central corridor",
        "Downtown edge",
        "Near Pillbox Hill"
      ],
      "notes": "Good transition district between Downtown, Vinewood, and Burton. In popcycle this is usually a mid-class city traffic area."
    },
    {
      "id": "BACKLOT_CITY",
      "name": "Backlot City",
      "county": "Los Santos County",
      "category": "North/Central Los Santos",
      "map": "city",
      "pin": [
        607.62,
        1080.42
      ],
      "popcycle": [
        "BACKLOT_CITY"
      ],
      "popgroups": [
        "Backlot_Film",
        "Backlot_StreetGeneral"
      ],
      "landmarks": [
        "Movie studio backlot",
        "West of Downtown",
        "Near Burton/Rockford"
      ],
      "notes": "Useful for film/studio-style pedestrian pools and lighter commercial traffic."
    },
    {
      "id": "BURTON",
      "name": "Burton",
      "county": "Los Santos County",
      "category": "North/Central Los Santos",
      "map": "city",
      "pin": [
        607.62,
        1080.42
      ],
      "popcycle": [
        "BURTON"
      ],
      "popgroups": [
        "Burton_Business",
        "Burton_BevHills",
        "Burton_Hipsters",
        "Burton_StreetGeneral",
        "Burton_Tramps"
      ],
      "landmarks": [
        "Rockford Plaza edge",
        "Portola Drive nearby",
        "Between Rockford Hills and Little Seoul"
      ],
      "notes": "Mixed upscale/commercial city zone. Good place for rich, mid, taxi, courier, and light supercar traffic."
    },
    {
      "id": "ECLIPSE",
      "name": "Eclipse / West Vinewood",
      "county": "Los Santos County",
      "category": "North/Central Los Santos",
      "map": "city",
      "pin": [
        593.61,
        1025.91
      ],
      "popcycle": [
        "ECLIPSE"
      ],
      "popgroups": [
        "Eclipse_Hipsters",
        "Eclipse_StreetGeneral",
        "Eclipse_Vinewood",
        "Club_Nighttime"
      ],
      "landmarks": [
        "Eclipse Boulevard",
        "West Vinewood edge",
        "Club/nightlife area"
      ],
      "notes": "Nightlife and affluent city traffic. Good place for club nighttime peds, rich cars, mid cars, bikes, and rare/super cars."
    },
    {
      "id": "HAWICK",
      "name": "Hawick",
      "county": "Los Santos County",
      "category": "North/Central Los Santos",
      "map": "city",
      "pin": [
        811.78,
        1098.55
      ],
      "popcycle": [
        "HAWICK"
      ],
      "popgroups": [
        "Hawick_Vinewood",
        "Hawick_BevHills",
        "Hawick_Hipsters",
        "Hawick_StreetGeneral",
        "Hawick_Tramps"
      ],
      "landmarks": [
        "Hawick Avenue",
        "Vinewood commercial edge",
        "East of Rockford Hills"
      ],
      "notes": "Urban mid-class / trendy district. Usually not as rich as Rockford, but nicer than the industrial zones."
    },
    {
      "id": "VINEWOOD",
      "name": "Vinewood",
      "county": "Los Santos County",
      "category": "North/Central Los Santos",
      "map": "city",
      "pin": [
        700.26,
        1141.73
      ],
      "popcycle": [
        "Downtown_Vinewood",
        "VINEWOOD"
      ],
      "popgroups": [
        "Downtown_Vinewood",
        "Club_Nighttime",
        "Eclipse_StreetGeneral"
      ],
      "landmarks": [
        "Vinewood Boulevard",
        "Vinewood entertainment strip",
        "Vinewood Bowl nearby"
      ],
      "notes": "Entertainment/nightlife district. Useful for club peds, rich/mid cars, taxis, rare cars, and occasional supercars."
    },
    {
      "id": "BANNING",
      "name": "Banning",
      "county": "Los Santos County",
      "category": "South / Industrial Los Santos",
      "map": "city",
      "pin": [
        685.48,
        1374.17
      ],
      "popcycle": [
        "BANNING"
      ],
      "popgroups": [
        "Banning_Construction",
        "Banning_StreetGeneral",
        "Banning_Tramps"
      ],
      "landmarks": [
        "Industrial south side",
        "Port approaches",
        "Warehouse roads"
      ],
      "notes": "Lower-income industrial zone. Poor cars, workers, construction, and haulage fit best."
    },
    {
      "id": "LA_PUERTA",
      "name": "La Puerta",
      "county": "Los Santos County",
      "category": "South / Industrial Los Santos",
      "map": "city",
      "pin": [
        506.13,
        1287.07
      ],
      "popcycle": [
        "LA_PUERTA",
        "LOS_PUERTA"
      ],
      "popgroups": [
        "Los_Puerta_StreetGeneral",
        "Stadium_StreetGeneral"
      ],
      "landmarks": [
        "Maze Bank Arena",
        "Industrial lots",
        "Bridge access to port"
      ],
      "notes": "Industrial/sports arena zone. Good for poor/mid cars, haulage, taxis, courier, and event/stadium peds."
    },
    {
      "id": "LSIA",
      "name": "Los Santos International Airport",
      "county": "Los Santos County",
      "category": "South / Industrial Los Santos",
      "map": "city",
      "pin": [
        572.14,
        1424.49
      ],
      "popcycle": [
        "LOS_SANTOS_INTERNATIONAL",
        "LSIA"
      ],
      "popgroups": [
        "LSA_Airport",
        "LSA_StreetGeneral"
      ],
      "landmarks": [
        "Airport terminals",
        "Runways",
        "LSIA parking / access roads"
      ],
      "notes": "Airport zone. Taxi, airport vehicles, coaches, workers, security, and moderate civilian traffic fit well."
    },
    {
      "id": "PORT",
      "name": "Port of South Los Santos / Elysian Island",
      "county": "Los Santos County",
      "category": "South / Industrial Los Santos",
      "map": "city",
      "pin": [
        799.77,
        1513.73
      ],
      "popcycle": [
        "ELYSIAN_ISLAND",
        "PORT_OF_SOUTH_LOS_SANTOS"
      ],
      "popgroups": [
        "Elysian_Island_StreetGeneral",
        "Elysian_Island_GenPed"
      ],
      "landmarks": [
        "Container yards",
        "Docks",
        "Elysian Island",
        "Merryweather zone"
      ],
      "notes": "Heavy industrial port. Haulage, utility, workers, boats, and occasional Merryweather make sense."
    },
    {
      "id": "CHAMBERLAIN",
      "name": "Chamberlain Hills",
      "county": "Los Santos County",
      "category": "South Los Santos",
      "map": "city",
      "pin": [
        654.17,
        1309.05
      ],
      "popcycle": [
        "Chamberlain"
      ],
      "popgroups": [
        "Chamberlain_SC",
        "Chamberlain_Tramps"
      ],
      "landmarks": [
        "Chamberlain Hills",
        "Southwest of Strawberry",
        "Residential hills"
      ],
      "notes": "South LS hill/residential district. Similar to Davis but more hillside/residential."
    },
    {
      "id": "DAVIS",
      "name": "Davis",
      "county": "Los Santos County",
      "category": "South Los Santos",
      "map": "city",
      "pin": [
        706.57,
        1321.66
      ],
      "popcycle": [
        "DAVIS"
      ],
      "popgroups": [
        "Davis_SC",
        "Davis_Tramps"
      ],
      "landmarks": [
        "Davis blocks",
        "South Los Santos",
        "Near Strawberry and Chamberlain Hills"
      ],
      "notes": "South LS neighborhood. Poor cars, mid cars, transport, couriers, workers, and more police presence fit."
    },
    {
      "id": "STRAWBERRY",
      "name": "Strawberry",
      "county": "Los Santos County",
      "category": "South Los Santos",
      "map": "city",
      "pin": [
        628.77,
        1267.76
      ],
      "popcycle": [
        "STRAWBERRY"
      ],
      "popgroups": [
        "Strawberry_General",
        "Strawberry_Gang"
      ],
      "landmarks": [
        "Olympic Freeway",
        "South of Downtown",
        "Near Davis/Chamberlain"
      ],
      "notes": "Dense south-central neighborhood. Good for poor/mid cars, gang-adjacent peds, taxis, and police."
    },
    {
      "id": "DEL_PERRO",
      "name": "Del Perro",
      "county": "Los Santos County",
      "category": "West Los Santos",
      "map": "city",
      "pin": [
        470.01,
        1167.66
      ],
      "popcycle": [
        "DEL_PERRO",
        "Del_Perro_Beach",
        "DEL_PERRO_PROM"
      ],
      "popgroups": [
        "Del_Perro_StreetGeneral",
        "Del_Perro_Beach",
        "Del_Perro_Bums"
      ],
      "landmarks": [
        "Del Perro Pier",
        "Beachfront",
        "Del Perro Freeway"
      ],
      "notes": "Beach city district. Use a blend of rich/mid/poor cars, beach peds, bikes, taxis, and light police/cycle cops."
    },
    {
      "id": "LITTLE_SEOUL",
      "name": "Little Seoul",
      "county": "Los Santos County",
      "category": "West Los Santos",
      "map": "city",
      "pin": [
        479.39,
        1165.87
      ],
      "popcycle": [
        "LITTLE_SEOUL"
      ],
      "popgroups": [
        "Little_Seoul_Koreatown",
        "Little_Seoul_StreetGeneral",
        "RESTAURANT_NIGHT"
      ],
      "landmarks": [
        "Koreatown blocks",
        "Olympic Freeway edge",
        "Between Del Perro and Downtown"
      ],
      "notes": "Dense urban west-central district. Good for poor/mid cars, restaurant/night peds, couriers, taxis, and moderate cops."
    },
    {
      "id": "MORNINGWOOD",
      "name": "Morningwood",
      "county": "Los Santos County",
      "category": "West Los Santos",
      "map": "city",
      "pin": [
        402.58,
        1098.52
      ],
      "popcycle": [
        "MORNINGWOOD"
      ],
      "popgroups": [
        "Morningwood_StreetGeneral",
        "Rockford_Residential_BevHills"
      ],
      "landmarks": [
        "West of Rockford Hills",
        "North of Del Perro",
        "Residential-commercial transition"
      ],
      "notes": "Good bridge between rich Rockford traffic and beach/Del Perro traffic."
    },
    {
      "id": "PUERTO_DEL_SOL",
      "name": "Puerto Del Sol",
      "county": "Los Santos County",
      "category": "West Los Santos",
      "map": "city",
      "pin": [
        606.06,
        1304.96
      ],
      "popcycle": [
        "PUERTO_DEL_SOL"
      ],
      "popgroups": [
        "Puerto_Del_Sol_StreetGeneral"
      ],
      "landmarks": [
        "Marina",
        "Docks/slips",
        "Between Vespucci and La Puerta"
      ],
      "notes": "Marina district. Mix mid/rich cars, light worker traffic, and boats nearby."
    },
    {
      "id": "VESPUCCI",
      "name": "Vespucci / Vespucci Beach",
      "county": "Los Santos County",
      "category": "West Los Santos",
      "map": "city",
      "pin": [
        446.51,
        1254.09
      ],
      "popcycle": [
        "VESPUCCI",
        "VESPUCCI_BEACH",
        "Vespucci_Canals"
      ],
      "popgroups": [
        "Vespucci_StreetGeneral",
        "Vespucci_Beach",
        "Vespucci_Canals_StreetGeneral"
      ],
      "landmarks": [
        "Vespucci Beach",
        "Canals",
        "Beachfront paths / marina edge"
      ],
      "notes": "Beach and canal area. Bikes, bicycles, beach peds, mid/poor cars, taxis, and some rich cars are believable."
    }
  ]
};

// [END DATA: POPCYCLE_AREA_MAP_DATA]
