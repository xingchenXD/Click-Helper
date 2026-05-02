const DEFAULT_SETTINGS = {
  year: 2026,
  month: 5,
  day: 15,
  court: "6号场",
  time: "19:10-20:10"
};

const dateInput = document.querySelector("#date");
const courtSelect = document.querySelector("#court");
const timeSelect = document.querySelector("#time");
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

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  dateInput.value = toDateValue(settings);
  courtSelect.value = settings.court;
  timeSelect.value = settings.time;
}

async function saveSettings() {
  if (!dateInput.value) {
    throw new Error("请选择日期");
  }

  const date = fromDateValue(dateInput.value);

  await chrome.storage.sync.set({
    ...date,
    court: courtSelect.value,
    time: timeSelect.value
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
