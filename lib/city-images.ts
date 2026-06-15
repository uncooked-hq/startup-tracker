/**
 * Curated landmark background image per startup hub, shown behind each card in
 * the tracker City View directory. URLs are stable Wikimedia Commons CDN
 * thumbnails (already-generated sizes, free to hotlink), keyed by the hub label
 * in lib/startup-hubs.ts. Edit/replace any URL here; missing keys fall back to a
 * plain dark card.
 */
export const CITY_IMAGES: Record<string, string> = {
  "London": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Tower_Bridge_at_Dawn.jpg/330px-Tower_Bridge_at_Dawn.jpg",
  "Paris": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/330px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
  "Berlin": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburger_Tor_abends.jpg/330px-Brandenburger_Tor_abends.jpg",
  "Stockholm": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Stockholms_Stadshuset_City_Hall_Stockholm_2016_01.jpg/330px-Stockholms_Stadshuset_City_Hall_Stockholm_2016_01.jpg",
  "Amsterdam": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/South_facade_of_the_Rijksmuseum_Amsterdam_%28DSCF0528%29.jpg/330px-South_facade_of_the_Rijksmuseum_Amsterdam_%28DSCF0528%29.jpg",
  "Munich": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Rathaus_and_Marienplatz_from_Peterskirche_-_August_2006.jpg/330px-Rathaus_and_Marienplatz_from_Peterskirche_-_August_2006.jpg",
  "Zurich": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Grossm%C3%BCnster_-_M%C3%BCnsterhof_2014-05-23_12-08-43.JPG/330px-Grossm%C3%BCnster_-_M%C3%BCnsterhof_2014-05-23_12-08-43.JPG",
  "Cambridge, UK": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/KingsCollegeChapel.jpg/330px-KingsCollegeChapel.jpg",
  "Oxford": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Radcliffe_Camera%2C_Oxford_-_Oct_2006.jpg/330px-Radcliffe_Camera%2C_Oxford_-_Oct_2006.jpg",
  "Edinburgh": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg/330px-City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg",
  "Manchester": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Manchester_Town_Hall_from_Lloyd_St.jpg/330px-Manchester_Town_Hall_from_Lloyd_St.jpg",
  "Dublin": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/HalfPennyBridge.jpg/330px-HalfPennyBridge.jpg",
  "Helsinki": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Kirkko3.png/330px-Kirkko3.png",
  "Copenhagen": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/The_Nyhavn_Canal_3.jpg/330px-The_Nyhavn_Canal_3.jpg",
  "Lisbon": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Torre_Bel%C3%A9m_April_2009-4a.jpg/330px-Torre_Bel%C3%A9m_April_2009-4a.jpg",
  "Barcelona": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/SF_maig_2_cropped.jpg/330px-SF_maig_2_cropped.jpg",
  "Madrid": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Puerta_de_Alcal%C3%A1_2025.jpg/330px-Puerta_de_Alcal%C3%A1_2025.jpg",
  "Milan": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Milan_Cathedral_from_Piazza_del_Duomo.jpg/330px-Milan_Cathedral_from_Piazza_del_Duomo.jpg",
  "Tallinn": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tallinna_Raekoda_11-06-2013.jpg/330px-Tallinna_Raekoda_11-06-2013.jpg",
  "Vilnius": "https://upload.wikimedia.org/wikipedia/en/thumb/8/84/The_White_Bridge_and_%C5%A0nipi%C5%A1k%C4%97s_district_in_Vilnius_in_2023_by_Augustas_Did%C5%BEgalvis.jpg/330px-The_White_Bridge_and_%C5%A0nipi%C5%A1k%C4%97s_district_in_Vilnius_in_2023_by_Augustas_Did%C5%BEgalvis.jpg",
  "Warsaw": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Pa%C5%82ac_Kultury_i_Nauki_2019.jpg/330px-Pa%C5%82ac_Kultury_i_Nauki_2019.jpg",
  "Vienna": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wien_-_Stephansdom_%281%29.JPG/330px-Wien_-_Stephansdom_%281%29.JPG",
  "Hamburg": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Elbphilharmonie_2025.jpg/330px-Elbphilharmonie_2025.jpg",
  "Bristol": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Clifton_Suspension_Bridge-9350.jpg/330px-Clifton_Suspension_Bridge-9350.jpg",
  "Lausanne": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Lausanne-cathe7.JPG/330px-Lausanne-cathe7.JPG",
  "San Francisco": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/330px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg",
  "Silicon Valley": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Aerial_view_of_Apple_Park_dllu.jpg/330px-Aerial_view_of_Apple_Park_dllu.jpg",
  "New York City": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Empire_State_Building_%28aerial_view%29.jpg/330px-Empire_State_Building_%28aerial_view%29.jpg",
  "Boston": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Massachusetts_State_House_Boston_November_2016.jpg/330px-Massachusetts_State_House_Boston_November_2016.jpg",
  "Los Angeles": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Hollywood_sign_%288485145044%29.jpg/330px-Hollywood_sign_%288485145044%29.jpg",
  "Seattle": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Space_Needle_2011-07-04.jpg/330px-Space_Needle_2011-07-04.jpg",
  "Austin": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/TexasStateCapitol-2010-01.JPG/330px-TexasStateCapitol-2010-01.JPG",
  "Miami": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Freedom_Tower_Downtown_Miami_%2838075844515%29.jpg/330px-Freedom_Tower_Downtown_Miami_%2838075844515%29.jpg",
  "Denver/Boulder": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Denver_union_station.jpg/330px-Denver_union_station.jpg",
  "Atlanta": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/A2ATL20250614-0721_%28cropped%29.jpg/330px-A2ATL20250614-0721_%28cropped%29.jpg",
  "Washington DC": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Capitol_Building_Full_View.jpg/330px-Capitol_Building_Full_View.jpg",
  "San Diego": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/USS_Midway_Museum.jpg/330px-USS_Midway_Museum.jpg",
  "Chicago": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/Cloud_Gate_%28The_Bean%29_from_east%27.jpg/330px-Cloud_Gate_%28The_Bean%29_from_east%27.jpg",
  "Raleigh-Durham": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/2015_North_Carolina_State_Capitol.JPG/330px-2015_North_Carolina_State_Capitol.JPG",
  "Nashville": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Nashville%2C_TN_skyline.jpg/330px-Nashville%2C_TN_skyline.jpg",
  "Phoenix": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Downtown_Phoenix_Aerial_Looking_Northeast.jpg/330px-Downtown_Phoenix_Aerial_Looking_Northeast.jpg",
  "Houston": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Space_Center_Houston_2025.08.jpg/330px-Space_Center_Houston_2025.08.jpg",
  "Dallas": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Reunion-Tower-0262.jpg/330px-Reunion-Tower-0262.jpg",
  "Portland": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Japanese_Garden_-1.jpg/330px-Japanese_Garden_-1.jpg",
  "Minneapolis": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Mill_City_Museum_20_view_of_Stone_Arch_bridge.jpg/330px-Mill_City_Museum_20_view_of_Stone_Arch_bridge.jpg",
  "Philadelphia": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Philadelphia_city_hall.jpg/330px-Philadelphia_city_hall.jpg",
  "Pittsburgh": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Ascending_the_Duquesne_Incline.jpg/330px-Ascending_the_Duquesne_Incline.jpg",
  "Salt Lake City": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Salt_Lake_Temple%2C_Utah_-_Sept_2004.jpg/330px-Salt_Lake_Temple%2C_Utah_-_Sept_2004.jpg",
  "Detroit": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Renaissance_Center%2C_Detroit%2C_Michigan_from_S_2014-12-07.jpg/330px-Renaissance_Center%2C_Detroit%2C_Michigan_from_S_2014-12-07.jpg",
  "Columbus": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Downtown_Columbus_View_from_Main_St_Bridge_-_edit1.jpg/330px-Downtown_Columbus_View_from_Main_St_Bridge_-_edit1.jpg",
};

export function cityImage(label: string): string | undefined {
  return CITY_IMAGES[label];
}
