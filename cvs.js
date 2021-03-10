const fetch = require("node-fetch");

async function getCVSAvailability() {
  const state = "ma";
  const response = await fetch(
    `https://www.cvs.com/immunizations/covid-19-vaccine/immunizations/covid-19-vaccine.vaccine-status.${state}.json?vaccineinfo`
  );
  const results = await response.json();
  const stateKey = state.toUpperCase();
  const stateResults = results.responsePayloadData.data[stateKey];

  const proxLocations = [
    "BOSTON",
    "CAMBRIDGE",
    "BRAINTREE",
    "BROCKTON",
    "CAMBRIDGE",
    "CHELSEA",
    "DEDHAM",
    "EAST BOSTON",
    "HANOVER",
    "HAVERHILL",
    "HOLBROOK",
    "HUDSON",
    "HYDE PARK",
    "IPSWICH",
    "LOWELL",
    "LYNN",
    "MALDEN",
    "MAYNARD",
    "MEDFIELD",
    "MEDFORD",
    "METHUEN",
    "NEWTON",
    "NORTH EASTON",
    "PEABODY",
    "RANDOLPH",
    "REVERE",
    "SALEM",
    "WALTHAM",
    "WATERTOWN",
    "WAYLAND",
    "WEST BRIDGEWATER",
    "WEYMOUTH",
    "WORCESTER",
  ];

  const availability = stateResults
    .filter((location) => proxLocations.includes(location.city))
    .reduce((accumulator, location) => {
      accumulator[location.city] =
        location.status.toLowerCase() === "available";
      return accumulator;
    }, {});

  return availability;
}

module.exports = { getCVSAvailability };
