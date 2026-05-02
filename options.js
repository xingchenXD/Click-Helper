const COURTS = [
  "1号场",
  "2号场",
  "3号场",
  "4号场",
  "5号场",
  "6号场",
  "7号场",
  "8号场"
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
      court: "6号场",
      time: "19:10-20:10"
    },
    {
      court: "7号场",
      time: "20:10-21:10"
    }
  ]
};

function normalizeCourtName(value, fallback) {
  const courtNumber = Number(String(value || "").match(/\d+/)?.[0]);

  if (courtNumber >= 1 && courtNumber <= 8) {
    return `${courtNumber}号场`;
  }

  return fallback;
}

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

function fillSelect(select, values) {
  select.textContent = "";

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function normalizeSettings(settings) {
  const slots = Array.isArray(settings.slots) && settings.slots.length >= 2
    ? settings.slots
    : [
        {
          court: settings.court || DEFAULT_SETTINGS.slots[0].court,
          time: settings.time || DEFAULT_SETTINGS.slots[0].time
        },
        DEFAULT_SETTINGS.slots[1]
      ];

  return {
    year: Number(settings.year) || DEFAULT_SETTINGS.year,
    month: Number(settings.month) || DEFAULT_SETTINGS.month,
    day: Number(settings.day) || DEFAULT_SETTINGS.day,
    slots: slots.slice(0, 2).map((slot, index) => ({
      court: normalizeCourtName(slot.court, DEFAULT_SETTINGS.slots[index].court),
      time: slot.time || DEFAULT_SETTINGS.slots[index].time
    }))
  };
}

async function loadSettings() {
  courtSelects.forEach((select) => fillSelect(select, COURTS));
  timeSelects.forEach((select) => fillSelect(select, TIME_RANGES));

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
    throw new Error("请选择日期");
  }

  const slots = courtSelects.map((courtSelect, index) => ({
    court: courtSelect.value,
    time: timeSelects[index].value
  }));

  if (slots[0].time === slots[1].time) {
    throw new Error("两个时间不能一样");
  }

  const date = fromDateValue(dateInput.value);

  await chrome.storage.sync.set({
    ...date,
    slots
  });
}

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  setStatus("正在保存...");

  try {
    await saveSettings();
    setStatus("已保存，点击插件图标会直接运行");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "保存失败");
  } finally {
    saveButton.disabled = false;
  }
});

loadSettings().catch((error) => {
  console.error(error);
  setStatus("读取设置失败");
});
