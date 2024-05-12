const express = require("express");
const app = express();
const client = require("prom-client");

let register = new client.Registry();

const headsCount = new client.Counter({
  name: "heads_count",
  help: "Number of heads",
});

const tailsCount = new client.Counter({
  name: "tails_count",
  help: "Number of tails",
});

const flipCount = new client.Counter({
  name: "flip_count",
  help: "Number of flips",
});

const errorCounter = new client.Counter({
  name: "error_counter",
  help: "Total number of errors",
});

// Define your metrics
const healthMetric = new client.Gauge({
  name: "application_health",
  help: "Health of the application, 1 for up, 0 for down",
});
// Initially set health to up
healthMetric.set(1);

register.registerMetric(headsCount);
register.registerMetric(tailsCount);
register.registerMetric(flipCount);
register.registerMetric(errorCounter);
register.registerMetric(healthMetric);

register.setDefaultLabels({
  app: "coin-api",
});

client.collectDefaultMetrics({ register });

// Endpoint to flip coins
app.get("/flip-coins", (request, response) => {
  const times = parseInt(request.query.times, 10);

  if (!Number.isNaN(times) && times > 0) {
    flipCount.inc(times);
    let heads = 0;
    let tails = 0;
    for (let i = 0; i < times; i++) {
      let randomNumber = Math.random();
      if (randomNumber < 0.5) {
        heads++;
      } else {
        tails++;
      }
    }
    headsCount.inc(heads);
    tailsCount.inc(tails);
    response.json({ heads, tails });
  } else {
    errorCounter.inc(); // Increment the error counter on invalid input
    response.status(400).json({
      error: "Please provide a valid number of times greater than zero.",
    });
  }
});

app.get("/reset-counters", (req, res) => {
  headsCount.reset();
  tailsCount.reset();
  flipCount.reset();
  res.send("Counters have been reset.");
});

app.get("/current-counts", (req, res) => {
  res.json({
    heads: headsCount.value,
    tails: tailsCount.value,
    total_flips: flipCount.value,
  });
});

app.get("/flip-stats", (req, res) => {
  const totalFlips = flipCount.value;
  const heads = headsCount.value;
  const tails = tailsCount.value;
  const headsPercentage = (heads / totalFlips) * 100;
  const tailsPercentage = (tails / totalFlips) * 100;

  res.json({
    total_flips: totalFlips,
    heads: heads,
    tails: tails,
    heads_percentage: headsPercentage.toFixed(2) + "%",
    tails_percentage: tailsPercentage.toFixed(2) + "%",
  });
});

app.get("/flip-random", (req, res) => {
  const randomTimes = Math.floor(Math.random() * 100) + 1; // Random between 1 and 100
  let heads = 0;
  let tails = 0;

  for (let i = 0; i < randomTimes; i++) {
    if (Math.random() < 0.5) {
      heads++;
    } else {
      tails++;
    }
  }

  flipCount.inc(randomTimes);
  headsCount.inc(heads);
  tailsCount.inc(tails);

  res.json({
    message: `Flipped coins ${randomTimes} times`,
    heads: heads,
    tails: tails,
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const health = { status: "Up", timestamp: new Date().toISOString() };
  // You might want to actually perform checks and set health status accordingly
  healthMetric.set(1); // Set to 0 if the application is considered down
  res.json(health);
});
app.get("/metrics", async (request, response) => {
  response.setHeader("Content-type", register.contentType);
  response.end(await register.metrics());
});

app.listen(5000, () => {
  console.log("Server started. Listening on port 5000.");
});
