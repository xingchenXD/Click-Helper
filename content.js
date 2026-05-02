(() => {
const DEFAULT_SETTINGS = {
  year: 2026,
  month: 5,
  day: 15,
  court: "6\u53f7\u573a",
  time: "19:10-20:10"
};

const TIME_RANGES = [
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:10-15:10",
  "15:10-16:10",
  "16:10-17:10",
  "17:10-18:10",
  "18:10-19:10",
  "19:10-20:10",
  "20:10-21:10",
  "21:10-22:10"
];

function findElement(selector, text) {
  const elements = [...document.querySelectorAll(selector)];

  return text
    ? elements.find((item) =>
        [item, ...item.querySelectorAll("*")].some(
          (node) => node.textContent.trim() === text
        )
      )
    : elements[0];
}

function focusAndClickElement(selector, text) {
  const el = findElement(selector, text);

  if (!el) {
    console.log("[click-helper] Element not found:", selector, text);
    return false;
  }

  return clickElement(el);
}

function clickElement(el) {
  if (!el.hasAttribute("tabindex")) {
    el.tabIndex = -1;
  }

  el.scrollIntoView({ block: "center", inline: "center" });
  el.focus({ preventScroll: true });

  ["mousedown", "mouseup", "click"].forEach((type) => {
    el.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
  });

  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getSettings() {
  try {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

    return {
      year: Number(settings.year) || DEFAULT_SETTINGS.year,
      month: Number(settings.month) || DEFAULT_SETTINGS.month,
      day: Number(settings.day) || DEFAULT_SETTINGS.day,
      court: settings.court || DEFAULT_SETTINGS.court,
      time: settings.time || DEFAULT_SETTINGS.time
    };
  } catch (error) {
    console.log("[click-helper] Failed to read settings:", error);
    return DEFAULT_SETTINGS;
  }
}

async function waitForElement(selector, timeout = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const el = document.querySelector(selector);
    if (el) {
      return el;
    }

    await sleep(100);
  }

  return null;
}

function isVisible(el) {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity || 1) > 0.01 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function hasVisibleLoadingMask() {
  return [...document.querySelectorAll(".el-loading-mask")].some(isVisible);
}

function getCalendarSnapshot() {
  const calendar = document.querySelector(".right_calendar");
  return calendar?.innerText.replace(/\s+/g, " ").trim() || "";
}

async function waitForLoadingToStart(timeout = 4000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    if (hasVisibleLoadingMask()) {
      return true;
    }

    await sleep(50);
  }

  return false;
}

async function waitForLoadingDone(timeout = 15000) {
  const startedAt = Date.now();
  let clearSince = null;

  while (Date.now() - startedAt < timeout) {
    if (hasVisibleLoadingMask()) {
      clearSince = null;
    } else {
      clearSince ??= Date.now();

      if (Date.now() - clearSince >= 300) {
        return true;
      }
    }

    await sleep(100);
  }

  console.log("[click-helper] Loading mask wait timed out");
  return false;
}

async function waitForCalendarStable(previousSnapshot = "", timeout = 15000) {
  const startedAt = Date.now();
  let lastSnapshot = "";
  let stableSince = null;

  while (Date.now() - startedAt < timeout) {
    const snapshot = getCalendarSnapshot();

    if (!snapshot || snapshot === previousSnapshot || hasVisibleLoadingMask()) {
      stableSince = null;
      lastSnapshot = snapshot;
      await sleep(100);
      continue;
    }

    if (snapshot !== lastSnapshot) {
      stableSince = Date.now();
      lastSnapshot = snapshot;
    } else if (stableSince && Date.now() - stableSince >= 500) {
      return true;
    }

    await sleep(100);
  }

  console.log("[click-helper] Calendar stable wait timed out");
  return false;
}

async function waitForCalendarRefresh(previousSnapshot = "") {
  const loadingStarted = await waitForLoadingToStart();

  if (loadingStarted) {
    await waitForLoadingDone();
  } else {
    console.log("[click-helper] Loading mask did not appear, waiting for table state");
  }

  await waitForCalendarStable(previousSnapshot);
}

async function confirmInitialDialog(timeout = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    const dialog = [...document.querySelectorAll(".el-dialog")]
      .find(isVisible);

    if (dialog) {
      const confirmButton = [...dialog.querySelectorAll("button")]
        .find((button) => button.textContent.trim() === "\u786e\u5b9a");

      if (!confirmButton) {
        console.log("[click-helper] Initial dialog found, confirm button not found");
        return false;
      }

      console.log("[click-helper] confirming initial dialog");
      clickElement(confirmButton);
      await waitForLoadingDone();
      return true;
    }

    await sleep(100);
  }

  console.log("[click-helper] Initial dialog not found, continue");
  return true;
}

function getVisiblePickerMonth() {
  const labels = [...document.querySelectorAll(".el-date-picker__header-label")]
    .map((el) => el.textContent.trim());

  const year = Number(labels[0]?.match(/\d+/)?.[0]);
  const month = Number(labels[1]?.match(/\d+/)?.[0]);

  return { year, month };
}

async function selectDate(year, month, day) {
  console.log("[click-helper] selecting date:", year, month, day);

  const clickedInput =
    focusAndClickElement(".el-date-editor--date input.el-input__inner") ||
    focusAndClickElement('input[placeholder="\u9009\u62e9\u9884\u7ea6\u65e5\u671f"]');

  if (!clickedInput) {
    return false;
  }

  await sleep(300);

  for (let i = 0; i < 24; i++) {
    const visible = getVisiblePickerMonth();

    if (visible.year === year && visible.month === month) {
      break;
    }

    if (!visible.year || !visible.month) {
      console.log("[click-helper] Date picker month not found");
      return false;
    }

    const visibleValue = visible.year * 12 + visible.month;
    const targetValue = year * 12 + month;
    const buttonSelector =
      visibleValue < targetValue
        ? ".el-date-picker__next-btn.el-icon-arrow-right"
        : ".el-date-picker__prev-btn.el-icon-arrow-left";

    focusAndClickElement(buttonSelector);
    await sleep(200);
  }

  const visible = getVisiblePickerMonth();
  if (visible.year !== year || visible.month !== month) {
    console.log("[click-helper] Target month not reached:", visible);
    return false;
  }

  const dateCells = [
    ...document.querySelectorAll(
      ".el-date-table td.available:not(.prev-month):not(.next-month)"
    )
  ];
  const targetCell = dateCells.find(
    (td) => td.textContent.trim() === String(day)
  );

  if (!targetCell) {
    console.log("[click-helper] Date cell not found:", year, month, day);
    return false;
  }

  return clickElement(targetCell);
}

function getCourtIndex(courtName) {
  const headers = [...document.querySelectorAll(".right_calendar .tit > div")];
  return headers.findIndex((header) => header.textContent.trim() === courtName);
}

function getVisibleCourtTables() {
  return [...document.querySelectorAll(".right_calendar .one_versions")]
    .filter(isVisible);
}

function getCourtTable(courtName) {
  return getVisibleCourtTables().find((table) =>
    [...table.querySelectorAll(".tit > div")].some(
      (header) => header.textContent.trim() === courtName
    )
  );
}

function getCourtIndexInTable(table, courtName) {
  const headers = [...table.querySelectorAll(".tit > div")];
  return headers.findIndex((header) => header.textContent.trim() === courtName);
}

async function showCourtIfNeeded(courtName) {
  if (getCourtTable(courtName)) {
    return true;
  }

  const nextButton = document.querySelector(".hnu_btns_right");
  if (!nextButton) {
    return false;
  }

  console.log("[click-helper] Court not visible, switching court page:", courtName);
  const previousSnapshot = getCalendarSnapshot();
  clickElement(nextButton);
  await waitForCalendarRefresh(previousSnapshot);

  return Boolean(getCourtTable(courtName));
}

function getLineTime(line, index) {
  const text = line.querySelector(".reserve-info-pop p")?.textContent || "";
  return text.match(/\d{2}:\d{2}-\d{2}:\d{2}/)?.[0] || TIME_RANGES[index] || "";
}

async function selectCourtTime(courtName, timeRange) {
  console.log("[click-helper] selecting court time:", courtName, timeRange);

  const calendar = await waitForElement(".right_calendar");
  if (!calendar) {
    console.log("[click-helper] Calendar table not found");
    return false;
  }

  if (!(await showCourtIfNeeded(courtName))) {
    console.log("[click-helper] Court not found:", courtName);
    return false;
  }

  const courtTable = getCourtTable(courtName);
  const courtIndex = getCourtIndexInTable(courtTable, courtName);
  if (courtIndex < 0) {
    console.log("[click-helper] Court not found:", courtName);
    return false;
  }

  const lines = [...courtTable.querySelectorAll(".lines")];
  const targetLine = lines.find((line, index) => getLineTime(line, index) === timeRange);
  if (!targetLine) {
    console.log("[click-helper] Time row not found:", timeRange);
    return false;
  }

  const cell = targetLine.children[courtIndex];
  if (!cell) {
    console.log("[click-helper] Court cell not found:", courtName, timeRange);
    return false;
  }

  if (cell.querySelector(".disable, .full, .due")) {
    console.log(
      "[click-helper] Court cell is not bookable:",
      courtName,
      timeRange,
      cell.textContent.trim()
    );
    return false;
  }

  const clickable = cell.querySelector(".el-popover__reference, .noShow") || cell;
  return clickElement(clickable);
}

async function runClickStage() {
  console.log("[click-helper] click stage started");

  const settings = await getSettings();

  await confirmInitialDialog();
  await waitForLoadingDone();
  const previousSnapshot = getCalendarSnapshot();
  await selectDate(settings.year, settings.month, settings.day);
  await waitForCalendarRefresh(previousSnapshot);
  await selectCourtTime(settings.court, settings.time);


  await sleep(500);
}

async function run() {
  console.log("[click-helper] content.js started");
  await runClickStage();
}

run();
})();
