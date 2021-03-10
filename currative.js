const fetch = require("node-fetch");
const { Client, MessageEmbed } = require("discord.js");
require("dotenv").config();

const bot = new Client();
const { readFile, writeFile } = require("fs").promises;

// https://github.com/ginkgobioworks/vaccinetime/blob/main/lib/sites/curative.rb
// https://labtools.curativeinc.com/api/v1/testing_sites/24181

const sites = {
  24181: "DoubleTree Hotel - Danvers",
  24182: "Eastfield Mall - Springfield",
  25336: "Circuit City - Dartmouth",
};

async function getAvailability() {
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

async function checkAvailability() {
  try {
    const store = await readFile("./currativeStore.json", { encoding: "utf8" });
    const storedResults = JSON.parse(store);
    const results = await getAvailability();

    const newAvailability = Object.keys(results).filter(
      (locations) =>
        storedResults[locations] === false && results[locations] === true
    );

    console.log("Currative...");
    console.log(newAvailability);

    newAvailability.forEach((availability) => {
      const embed = new MessageEmbed()
        .setTitle(`Currative: New vaccine windows`)
        .setDescription(sites[availability])
        .setColor(0xa50000)
        .setURL(`https://curative.com/sites/${availability}`);
      bot.channels.cache.get("818731446675832835").send(embed);
    });

    await writeFile(
      "./currativeStore.json",
      JSON.stringify({ ...storedResults, ...results }),
      {
        encoding: "utf8",
      }
    );
  } catch (error) {
    console.log(error);
  } finally {
    setTimeout(() => {
      checkAvailability();
    }, 5000);
  }
}

(async () => {
  bot.on("ready", async () => {
    checkAvailability();
  });
  bot.on("message", async (message) => {
    console.log(message.content);
    if (message.content === "!currative-availability") {
      const availabilityResults = await getAvailability();
      const availabilityLocations = Object.keys(availabilityResults).filter(
        (city) => availabilityResults[city] === true
      );
      const embed = new MessageEmbed()
        .setTitle(
          availabilityLocations.length > 0
            ? "Current availability"
            : "No availability"
        )
        .setDescription(
          availabilityLocations
            .map(
              (location) =>
                `[${sites[location]}](https://curative.com/sites/${location})`
            )
            .join("\n")
        )
        .setColor(0xa50000);
      message.channel.send(embed);
    }
  });
  bot.login(process.env.BOT_TOKEN);
})();
