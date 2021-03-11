const fetch = require("node-fetch");

const getCICSites = () => {
  return {
    "Fenway Park": "fenway-hynes",
    "Hynes Convention Center": "fenway-hynes",
    "Gillette Stadium - East": "gillettestadium",
    "Gillette Stadium - West": "gillettestadium",
    "Reggie Lewis Center": "reggielewis",
  };
};

async function getCICHealthAvailability() {
  const sites = getCICSites();
  const responses = await Promise.all(
    Object.keys(sites).map((site) => {
      return fetch(
        `https://home.color.com/api/v1/vaccination_appointments/availability?claim_token=b96a21288d4f809c27b98bdb383de3cc6eb0&collection_site=${site}&dob=1987-12-12`
      );
    })
  );
  const results = await Promise.all(
    responses.map((response) => response.json())
  );

  const availability = {};

  results.forEach((result, index) => {
    const site = Object.keys(sites)[index];
    availability[site] = result.results.length > 0;
  });

  return availability;
}

module.exports = { getCICHealthAvailability, getCICSites };
