const fetch = require("node-fetch");
require("dotenv").config();

const getCurativeSites = () => {
  return {
    24181: "DoubleTree Hotel - Danvers",
    24182: "Eastfield Mall - Springfield",
    25336: "Circuit City - Dartmouth",
  };
};

async function getCurativeAvailability() {
  const sites = getCurativeSites();
  const responses = await Promise.all(
    Object.keys(sites).map((site) => {
      return fetch(
        `https://labtools.curativeinc.com/api/v1/testing_sites/${site}`
      );
    })
  );
  const results = await Promise.all(
    responses.map((response) => response.json())
  );

  const availability = {};

  results.forEach((result) => {
    const availableWindows = result.appointment_windows.filter(
      (window) =>
        window.public_slots_available > 0 && window.status === "Active"
    );

    availability[result.id] = availableWindows.length > 0;
  });

  return availability;
}

module.exports = { getCurativeAvailability, getCurativeSites };
