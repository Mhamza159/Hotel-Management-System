const form = document.getElementById('hub-form');
const input = document.getElementById('hub-url');
const testButton = document.getElementById('test-btn');
const saveButton = document.getElementById('save-btn');
const statusBox = document.getElementById('status');

const showStatus = (type, message) => {
  statusBox.className = `status ${type}`;
  statusBox.textContent = message;
};

const setBusy = (busy) => {
  testButton.disabled = busy;
  saveButton.disabled = busy;
  input.disabled = busy;
};

const run = async (action) => {
  const value = input.value.trim();
  if (!value) {
    showStatus('error', 'Please enter the Hub address.');
    input.focus();
    return;
  }

  setBusy(true);
  showStatus('info', action === 'save' ? 'Checking Hub and saving…' : 'Checking Hub…');

  try {
    const result =
      action === 'save'
        ? await window.hubSettings.save(value)
        : await window.hubSettings.test(value);
    showStatus(result.ok ? 'ok' : 'error', result.message);
  } catch (error) {
    showStatus('error', error.message || 'Unexpected error while contacting the Hub.');
  } finally {
    setBusy(false);
  }
};

testButton.addEventListener('click', () => run('test'));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  run('save');
});

window.hubSettings.get().then(({ hubUrl }) => {
  if (hubUrl) {
    input.value = hubUrl;
  }
  input.focus();
});
