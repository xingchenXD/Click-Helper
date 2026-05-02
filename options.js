const COURTS = [
  "1\u53f7\u573a",
  "2\u53f7\u573a",
  "3\u53f7\u573a",
  "4\u53f7\u573a",
  "5\u53f7\u573a",
  "6\u53f7\u573a",
  "7\u53f7\u573a",
  "8\u53f7\u573a"
];

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

const DEFAULT_SETTINGS = {
  year: 2026,
  month: 5,
  day: 15,
  slots: [
    {
      court: "6\u53f7\u573a",
      time: "19:10-20:10"
    },
    {
      court: "7\u53f7\u573a",
      time: ""
    }
  ]
};

const dateInput = document.querySelector("#date");
const courtSelects = [
  document.querySelector("#court-1"),
  document.querySelector("#court-2")
];
const timeSelects = [
  document.querySelector("#time-1"),
  document.querySelector("#time-2")
];
const saveButton = document.querySelector("#save");
const statusText = document.querySelector("#status");

function normalizeCourtName(value, fallback) {
  const courtNumber = Number(String(value || "").match(/\d+/)?.[0]);

  if (courtNumber >= 1 && courtNumber <= 8) {
    return `${courtNumber}\u53f7\u573a`;
  }

  return fallback;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateValue(settings) {
  return `${settings.year}-${pad(settings.month)}-${pad(settings.day)}`;
}

function fromDateValue(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function setStatus(text) {
  statusText.textContent = text;
}

function fillSelect(select, values, blankLabel = "") {
  select.textContent = "";

  if (blankLabel) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = blankLabel;
    select.append(option);
  }

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function normalizeSettings(settings) {
  const slots = Array.isArray(settings.slots) && settings.slots.length
    ? settings.slots
    : [
        {
          court: settings.court || DEFAULT_SETTINGS.slots[0].court,
          time: settings.time || DEFAULT_SETTINGS.slots[0].time
        }
      ];

  const normalizedSlots = DEFAULT_SETTINGS.slots.map((fallback, index) => {
    const slot = slots[index] || fallback;

    return {
      court: normalizeCourtName(slot.court, fallback.court),
      time: slot.time || fallback.time
    };
  });

  return {
    year: Number(settings.year) || DEFAULT_SETTINGS.year,
    month: Number(settings.month) || DEFAULT_SETTINGS.month,
    day: Number(settings.day) || DEFAULT_SETTINGS.day,
    slots: normalizedSlots
  };
}

async function loadSettings() {
  courtSelects.forEach((select) => fillSelect(select, COURTS));
  fillSelect(timeSelects[0], TIME_RANGES);
  fillSelect(timeSelects[1], TIME_RANGES, "\u4E0D\u9009\u7B2C\u4E8C\u4E2A\u65F6\u6BB5");

  const settings = normalizeSettings(
    await chrome.storage.sync.get(DEFAULT_SETTINGS)
  );

  dateInput.value = toDateValue(settings);
  settings.slots.forEach((slot, index) => {
    courtSelects[index].value = slot.court;
    timeSelects[index].value = slot.time;
  });
}

async function saveSettings() {
  if (!dateInput.value) {
    throw new Error("\u8BF7\u9009\u62E9\u65E5\u671F");
  }

  const slots = courtSelects
    .map((courtSelect, index) => ({
      court: courtSelect.value,
      time: timeSelects[index].value
    }))
    .filter((slot, index) => index === 0 || slot.time);

  if (slots.length > 1 && slots[0].time === slots[1].time) {
    throw new Error("\u4E24\u4E2A\u65F6\u95F4\u4E0D\u80FD\u4E00\u6837");
  }

  const date = fromDateValue(dateInput.value);

  await chrome.storage.sync.set({
    ...date,
    slots
  });
}

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  setStatus("\u6B63\u5728\u4FDD\u5B58...");

  try {
    await saveSettings();
    setStatus("\u5DF2\u4FDD\u5B58\uFF0C\u70B9\u51FB\u63D2\u4EF6\u56FE\u6807\u4F1A\u76F4\u63A5\u8FD0\u884C");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "\u4FDD\u5B58\u5931\u8D25");
  } finally {
    saveButton.disabled = false;
  }
});

loadSettings().catch((error) => {
  console.error(error);
  setStatus("\u8BFB\u53D6\u8BBE\u7F6E\u5931\u8D25");
});
