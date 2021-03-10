const { Client, MessageEmbed } = require("discord.js");
const { createLogger, format, transports } = require("winston");
require("dotenv").config();

const bot = new Client();

const { readFile, writeFile } = require("fs").promises;

const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const botLogger = createLogger({
  transports: [
    new transports.File({
      filename: "bot.log",
      format: combine(timestamp(), myFormat),
    }),
  ],
});

const cvsLogger = createLogger({
  transports: [
    new transports.File({
      filename: "cvs.log",
      format: combine(timestamp(), myFormat),
    }),
  ],
});

const cicLogger = createLogger({
  transports: [
    new transports.File({
      filename: "cic.log",
      format: combine(timestamp(), myFormat),
    }),
  ],
});

const { getCVSAvailability } = require("./cvs.js");
const { getCICHealthAvailability, getCICSites } = require("./cic-health.js");

const CIC = "819026828143493130";
const CVS = "818627725602324490";
const VAX_FINDER = "";
const CURRATIVE = "";

async function checkCVSAvailability(storedResults) {
  try {
    const results = await getCVSAvailability();

    const newAvailability = Object.keys(results).filter(
      (city) => storedResults[city] === false && results[city] === true
    );

    cvsLogger.info("CVS checking...");
    cvsLogger.info(newAvailability);

    if (newAvailability.length > 0) {
      const embed = new MessageEmbed()
        .setTitle(`New CVS availability`)
        .setDescription(newAvailability.join(", "))
        .setColor(0xa50000)
        .setURL(
          "https://www.cvs.com/vaccine/intake/store/cvd-schedule?icid=coronavirus-lp-vaccine-sd-statetool"
        );
      bot.channels.cache.get(CVS).send(embed);
    }

    return results;
  } catch (error) {
    cvsLogger.log(error);
  }
}

async function checkCICAvailability(storedResults) {
  try {
    const results = await getCICHealthAvailability();

    const newAvailability = Object.keys(results).filter(
      (city) => storedResults[city] === false && results[city] === true
    );

    cicLogger.info("CIC checking...");
    cicLogger.info(newAvailability);

    const sites = getCICSites();

    newAvailability.forEach((availability) => {
      const id = sites[availability];
      const embed = new MessageEmbed()
        .setTitle(`CIC Health: New vaccine window(s)`)
        .setDescription(availability)
        .setColor(0xa50000)
        .setURL(
          `https://home.color.com/vaccine/register/${id}/vaccination-history`
        );
      bot.channels.cache.get(CIC).send(embed);
    });

    return results;
  } catch (error) {
    cicLogger.log(error);
  }
}

async function checkAvailability(file, callback, waitTime) {
  try {
    const store = await readFile(file, { encoding: "utf8" });
    const storedResults = JSON.parse(store);
    const results = await callback(storedResults);

    await writeFile(file, JSON.stringify({ ...storedResults, ...results }), {
      encoding: "utf8",
    });
  } catch (error) {
    botLogger.info(error);
  } finally {
    setTimeout(() => {
      checkAvailability(file, callback, waitTime);
    }, waitTime);
  }
}

(async () => {
  bot.on("ready", async () => {
    checkAvailability("cvs.json", checkCVSAvailability, 30000);
    checkAvailability("cic-health.json", checkCICAvailability, 30000);
  });
  bot.on("message", async (message) => {
    try {
      botLogger.info(message.content);
      const command = message.content.toLowerCase();

      // CVS
      if (command === "!availability" || command === "!cvs-availability") {
        const availabilityResults = await getCVSAvailability();
        const availabilityLocations = Object.keys(availabilityResults).filter(
          (city) => availabilityResults[city] === true
        );
        const embed = new MessageEmbed()
          .setTitle(
            availabilityLocations.length > 0
              ? "CVS has availability"
              : "No CVS availability"
          )
          .setDescription(availabilityLocations.join(", "))
          .setColor(0xa50000)
          .setURL(
            "https://www.cvs.com/vaccine/intake/store/cvd-schedule?icid=coronavirus-lp-vaccine-sd-statetool"
          );
        message.channel.send(embed);
      }

      // CIC-Health
      if (command === "!cic-availability") {
        const availabilityResults = await getCICHealthAvailability();
        const sites = getCICSites();
        const availabilityLocations = Object.keys(availabilityResults).filter(
          (city) => availabilityResults[city] === true
        );
        const embed = new MessageEmbed()
          .setTitle(
            availabilityLocations.length > 0
              ? "CIC has availability"
              : "No CIC availability"
          )
          .setDescription(
            availabilityLocations
              .map(
                (location) =>
                  `[${location}](https://home.color.com/vaccine/register/${sites[location]}/vaccination-history)`
              )
              .join("\n")
          )
          .setColor(0xa50000);
        message.channel.send(embed);
      }
    } catch (error) {
      botLogger.info(error);
    }
  });
  bot.login(process.env.BOT_TOKEN);
})();
