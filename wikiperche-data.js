/* Thin loader — keeps file:// compatibility while data lives in wikiperche-data.json */
var data;
(function () {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "wikiperche-data.json", false);   // synchronous so `data` is ready before app.js runs
  xhr.send();
  if (xhr.status === 200 || xhr.status === 0) {      // status 0 = file:// protocol
    data = JSON.parse(xhr.responseText);
  } else {
    console.error("Impossible de charger wikiperche-data.json :", xhr.status);
    data = [];
  }
})();
