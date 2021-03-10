const fetch = require("node-fetch");

const getCICSites = () => {
  return {
    "Fenway Park": "shdk8qoyo0mxguo4",
    "Hynes Convention Center": "shdk8qoyo0mxguo4",
    "Gillette Stadium - East": "sbo91shys1qhb0gi100123871238",
    "Gillette Stadium - West": "sbo91shys1qhb0gi100123871238",
    "Reggie Lewis Center": "datygzcebcivrplwlvikuqrfp",
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
