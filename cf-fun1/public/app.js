import { newWebSocketRpcSession } from "./vendor/capnweb.js";

const makeBtn = document.getElementById("make");
const listEl = document.getElementById("counters");

const wsUrl = `${location.origin.replace(/^http/, "ws")}/counterRegistry`;
const api = newWebSocketRpcSession(wsUrl);

function render(counter) {
  const row = document.createElement("div");
  row.className = "counter";

  const label = document.createElement("span");
  label.textContent = "#counter ";

  const val = document.createElement("strong");
  val.textContent = "–";

  const incr = document.createElement("button");
  incr.textContent = "+";
  incr.addEventListener("click", async () => {
    val.textContent = String(await counter.increment());
  });

  const decr = document.createElement("button");
  decr.textContent = "-";
  decr.addEventListener("click", async () => {
    val.textContent = String(await counter.decrement());
  });

  counter.getValue().then((v) => (val.textContent = String(v)));
  row.append(label, val, incr, decr);
  return row;
}

makeBtn.addEventListener("click", async () => {
  const counter = await api.makeCounter();
  listEl.append(render(counter));
});

async function load() {
  listEl.textContent = "";
  const counters = await api.listCounters();
  for (const counter of counters) {
    listEl.append(render(counter));
  }
}

load();
