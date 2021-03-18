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

const curativeLogger = createLogger({
  transports: [
    new transports.File({
      filename: "curative.log",
      format: combine(timestamp(), myFormat),
    }),
  ],
});

const { getCVSAvailability } = require("./cvs.js");
const { getCICHealthAvailability, getCICSites } = require("./cic-health.js");
const { getCurativeAvailability, getCurativeSites } = require("./curative.js");

const CIC = "819026828143493130";
const CVS = "818627725602324490";
const CURATIVE = "818731446675832835";
const VAX_FINDER = "";

const cicSites = getCICSites();
const curativeSites = getCurativeSites();

async function checkCVSAvailability(storedResults) {
  const results = await getCVSAvailability();

  const newAvailability = Object.keys(results).filter(
    (location) =>
      storedResults[location] === false && results[location] === true
  );

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
}

async function checkCICAvailability(storedResults) {
  const results = await getCICHealthAvailability();

  const newAvailability = Object.keys(results).filter(
    (location) =>
      storedResults[location] === false && results[location] === true
  );

  newAvailability.forEach((availability) => {
    const id = cicSites[availability];
    const embed = new MessageEmbed()
      .setTitle(`CIC Health: New vaccine window(s)`)
      .setDescription(availability)
      .setColor(0xa50000)
      .setURL(`https://home.color.com/vaccine/register/${id}`);
    bot.channels.cache.get(CIC).send(embed);
  });

  return results;
}

async function checkCurativeAvailability(storedResults) {
  const results = await getCurativeAvailability();

  const newAvailability = Object.keys(results).filter(
    (location) =>
      storedResults[location] === false && results[location] === true
  );

  newAvailability.forEach((availability) => {
    const embed = new MessageEmbed()
      .setTitle(`Curative: New vaccine window(s)`)
      .setDescription(curativeSites[availability])
      .setColor(0xa50000)
      .setURL(`https://curative.com/sites/${availability}`);
    bot.channels.cache.get(CURATIVE).send(embed);
  });

  return results;
}

async function checkAvailability(file, callback, logger, waitTime) {
  try {
    const store = await readFile(file, { encoding: "utf8" });
    const storedResults = JSON.parse(store);
    const results = await callback(storedResults);

    logger.info("Checking...");
    logger.info(JSON.stringify(results));

    await writeFile(file, JSON.stringify({ ...storedResults, ...results }), {
      encoding: "utf8",
    });
  } catch (error) {
    botLogger.info(error);
  } finally {
    setTimeout(() => {
      checkAvailability(file, callback, logger, waitTime);
    }, waitTime);
  }
}

(async () => {
  bot.on("ready", async () => {
    checkAvailability("cvs.json", checkCVSAvailability, cvsLogger, 5000);
    checkAvailability(
      "cic-health.json",
      checkCICAvailability,
      cicLogger,
      30000
    );
    checkAvailability(
      "curative.json",
      checkCurativeAvailability,
      curativeLogger,
      30000
    );
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
                  `[${location}](https://home.color.com/vaccine/register/${cicSites[location]})`
              )
              .join("\n")
          )
          .setColor(0xa50000);
        message.channel.send(embed);
      }

      // Curative
      if (message.content === "!curative-availability") {
        const availabilityResults = await getCurativeAvailability();
        const availabilityLocations = Object.keys(availabilityResults).filter(
          (city) => availabilityResults[city] === true
        );
        const embed = new MessageEmbed()
          .setTitle(
            availabilityLocations.length > 0
              ? "Curative has availability"
              : "No Curative availability"
          )
          .setDescription(
            availabilityLocations
              .map(
                (location) =>
                  `[${curativeSites[location]}](https://curative.com/sites/${location})`
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
