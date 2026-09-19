import { newWebSocketRpcSession } from "./vendor/capnweb.js";

const makeBtn = document.getElementById("make");
const listEl = document.getElementById("counters");

const wsUrl = `${location.origin.replace(/^http/, "ws")}/api`;
const api = newWebSocketRpcSession(wsUrl);

function render(counter, id) {
  const row = document.createElement("div");
  row.className = "counter";

  const label = document.createElement("span");
  label.textContent = id ? `#counter ${id} ` : "#counter ";

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
  const ids = await api.listCounterIds();
  listEl.append(render(counter, ids[ids.length - 1]));
});

async function load() {
  listEl.textContent = "";
  const ids = await api.listCounterIds();
  for (const id of ids) {
    const counter = await api.getCounter(id);
    if (counter) listEl.append(render(counter, id));
  }
}

load();
