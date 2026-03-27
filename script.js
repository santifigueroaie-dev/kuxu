const TIME_ZONE = "Europe/Dublin";
const TARGET_MONTH = 5;
const TARGET_DAY = 15;
const STORAGE_PREFIX = "kiana-heart-";
const STAR_COUNT = 34;
const DAY_MS = 86400000;

const daysEl = document.getElementById("days");
const daysLabelEl = document.getElementById("days-label");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const flightDateEl = document.getElementById("flight-date");
const countdownNoteEl = document.getElementById("countdown-note");
const starsEl = document.getElementById("stars");
const heartButtons = document.querySelectorAll("[data-heart-key]");

let targetSpec = null;
let targetMs = 0;

function partsToObject(parts) {
  return parts.reduce((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const values = partsToObject(formatter.formatToParts(date));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function getTimeZoneOffsetMs(date, timeZone) {
  const values = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToUtcMs(target, timeZone) {
  let utcGuess = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second
  );

  for (let index = 0; index < 3; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
    const adjusted = Date.UTC(
      target.year,
      target.month - 1,
      target.day,
      target.hour,
      target.minute,
      target.second
    ) - offset;

    if (Math.abs(adjusted - utcGuess) < 1000) {
      return adjusted;
    }

    utcGuess = adjusted;
  }

  return utcGuess;
}

function startOfDublinDayUtcMs(parts) {
  return zonedDateTimeToUtcMs({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
    second: 0
  }, TIME_ZONE);
}

function getUpcomingTarget() {
  const now = new Date();
  const nowParts = getZonedParts(now, TIME_ZONE);
  let candidate = {
    year: nowParts.year,
    month: TARGET_MONTH,
    day: TARGET_DAY,
    hour: 0,
    minute: 0,
    second: 0
  };
  let candidateMs = zonedDateTimeToUtcMs(candidate, TIME_ZONE);

  if (Date.now() >= candidateMs) {
    candidate = {
      year: nowParts.year + 1,
      month: TARGET_MONTH,
      day: TARGET_DAY,
      hour: 0,
      minute: 0,
      second: 0
    };
    candidateMs = zonedDateTimeToUtcMs(candidate, TIME_ZONE);
  }

  return { target: candidate, targetMs: candidateMs };
}

function formatTargetDate(timestamp) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(timestamp));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getCalendarDayDifference(now, target) {
  const nowParts = getZonedParts(now, TIME_ZONE);
  const todayStartMs = startOfDublinDayUtcMs(nowParts);
  const targetStartMs = zonedDateTimeToUtcMs(target, TIME_ZONE);
  return Math.round((targetStartMs - todayStartMs) / DAY_MS);
}

function updateCountdown() {
  const now = new Date();
  const diff = targetMs - now.getTime();

  if (diff <= 0) {
    daysEl.textContent = "0";
    daysLabelEl.textContent = "dias";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    secondsEl.textContent = "00";
    countdownNoteEl.textContent = "Ella ya deberia estar camino a Malta.";
    return;
  }

  const calendarDays = getCalendarDayDifference(now, targetSpec);
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  daysEl.textContent = String(calendarDays);
  daysLabelEl.textContent = calendarDays === 1 ? "dia" : "dias";
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
  secondsEl.textContent = pad(seconds);
}

function createStars() {
  for (let index = 0; index < STAR_COUNT; index += 1) {
    const star = document.createElement("span");
    const size = (Math.random() * 1.2 + 0.9).toFixed(2);
    const left = (Math.random() * 100).toFixed(2);
    const top = (Math.random() * 100).toFixed(2);
    const duration = (Math.random() * 16 + 18).toFixed(2);
    const delay = (Math.random() * -24).toFixed(2);
    const twinkle = (Math.random() * 4 + 3).toFixed(2);

    star.className = "ambient-heart";
    star.textContent = "♥";
    star.style.fontSize = size + "rem";
    star.style.left = left + "%";
    star.style.top = top + "%";
    star.style.animationDuration = duration + "s, " + twinkle + "s";
    star.style.animationDelay = delay + "s, " + delay + "s";
    starsEl.appendChild(star);
  }
}

function getStoredCount(key) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    const count = Number.parseInt(raw || "0", 10);
    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    return 0;
  }
}

function setStoredCount(key, count) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, String(count));
  } catch (error) {
    return;
  }
}

function burstHearts(button) {
  const burstTotal = 9;

  for (let index = 0; index < burstTotal; index += 1) {
    const heart = document.createElement("span");
    const xShift = (Math.random() * 80 - 40).toFixed(0) + "px";
    const yShift = (Math.random() * -30).toFixed(0) + "px";
    const rotate = (Math.random() * 50 - 25).toFixed(0) + "deg";
    const delay = (Math.random() * 160).toFixed(0) + "ms";

    heart.className = "burst-heart";
    heart.textContent = "♥";
    heart.style.setProperty("--x-shift", xShift);
    heart.style.setProperty("--y-shift", yShift);
    heart.style.setProperty("--rotate", rotate);
    heart.style.animationDelay = delay;
    button.appendChild(heart);

    heart.addEventListener("animationend", () => {
      heart.remove();
    }, { once: true });
  }
}

function setupHearts() {
  heartButtons.forEach((button) => {
    const key = button.dataset.heartKey;
    const countEl = button.querySelector("[data-heart-count]");
    let count = getStoredCount(key);

    countEl.textContent = String(count);

    button.addEventListener("click", () => {
      count += 1;
      countEl.textContent = String(count);
      setStoredCount(key, count);
      burstHearts(button);
    });
  });
}

function init() {
  const upcomingTarget = getUpcomingTarget();
  targetSpec = upcomingTarget.target;
  targetMs = upcomingTarget.targetMs;

  flightDateEl.textContent = formatTargetDate(targetMs);
  countdownNoteEl.textContent = "Contando hasta las 00:00 en Irlanda del " + formatTargetDate(targetMs) + ".";

  createStars();
  setupHearts();
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
}

init();
