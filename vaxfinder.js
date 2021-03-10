const puppeteer = require("puppeteer");
const { Client, MessageEmbed } = require("discord.js");
require("dotenv").config();

const bot = new Client();
const { readFile, writeFile } = require("fs").promises;

// Snippets: https://www.codota.com/code/javascript/functions/puppeteer/Browser/close

// (async () => {
//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();
//   await page.goto(
//     "https://vaxfinder.mass.gov/?zip_or_city=02143&vaccines_available=on&q="
//   );
//   const data = await page.$$eval(
//     "table tr td div.location-summary a",
//     (anchors) =>
//       anchors.map((anchor) => {
//         return {
//           name: anchor.innerText,
//           link: `https://vaxfinder.mass.gov/${anchor.getAttribute("href")}`,
//         };
//       })
//   );
//   console.log(data);
//   await browser.close();
// })();

const excludedList = [
  "Danvers: Doubletree Hotel",
  "Springfield: Eastfield Mall",
  "Dartmouth: Circuit City",
];

async function getAvailability() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.goto(
    "https://vaxfinder.mass.gov/?zip_or_city=02143&vaccines_available=on&q="
  );
  const data = await page.$$eval(
    "table tr td div.location-summary a",
    (anchors) =>
      anchors
        .filter((anchor) => !excludedList.includes(anchor.innerText))
        .map((anchor) => {
          return {
            location: anchor.innerText,
            link: `https://vaxfinder.mass.gov${anchor.getAttribute("href")}`,
          };
        })
  );
  await browser.close();
  return data.filter((location) => location);
}

async function hasAppoints(
  url = "https://vaxfinder.mass.gov/locations/eastfield-mall-springfield/"
) {
  console.log(url);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.goto(url);
  const appointmentsCells = await page.$$eval(
    "table tr td.align-right",
    (cells) =>
      cells.map((cell) => {
        return cell.innerText;
      })
  );
  console.log(appointmentsCells);
  const appointments = appointmentsCells.map((cell) => parseInt(cell));
  console.log(appointments);
  const _hasAppoints = appointments.some((appointment) => appointment > 1);
  await browser.close();
  return _hasAppoints;
}

async function checkAvailability() {
  try {
    const store = await readFile("./vaxFinderStore.json", { encoding: "utf8" });
    const storedResults = JSON.parse(store);
    const results = await getAvailability();
    const availableLocations = results.map((result) => result.location);

    const newAvailability = results.filter(
      (result) => storedResults.indexOf(result.location) < 0
    );

    console.log("vaxfinder check...");
    console.log(newAvailability);

    if (newAvailability.length > 0) {
      // const testChannel = "816823850305585163";
      const vaxFinderChannel = "817140898387329044";

      newAvailability.forEach(async (item) => {
        const _hasAppoints = await hasAppoints(item.link);
        if (!_hasAppoints) return;
        const embed = new MessageEmbed()
          .setTitle("New Vaxfinder Opening")
          .setDescription(item.location)
          .setColor(0xa50000)
          .setURL(item.link);
        bot.channels.cache.get(vaxFinderChannel).send(embed);
      });
    }

    await writeFile(
      "./vaxFinderStore.json",
      JSON.stringify(availableLocations),
      {
        encoding: "utf8",
      }
    );
  } catch (error) {
    console.log(error);
  } finally {
    setTimeout(() => {
      checkAvailability();
    }, 20000);
  }
}

(async () => {
  bot.on("ready", async () => {
    checkAvailability();
  });
  bot.on("message", async (message) => {
    if (message.content === "!vaxfinder-availability") {
      const availabilityResults = await getAvailability();
      const availabilityLocations = availabilityResults.map(
        (result) => result.location
      );
      const embed = new MessageEmbed()
        .setTitle(
          availabilityLocations.length > 0
            ? "Current vaxfinder availability"
            : "No availability on vaxfinder"
        )
        .setDescription(availabilityLocations.join(", "))
        .setColor(0xa50000)
        .setURL(
          "https://vaxfinder.mass.gov/?zip_or_city=02143&vaccines_available=on&q="
        );
      message.channel.send(embed);
    }
  });
  bot.login(process.env.BOT_TOKEN);
})();
