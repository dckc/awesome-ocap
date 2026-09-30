import { newWebSocketRpcSession } from "./vendor/capnweb.js";
import { srToUrl, isSwissnum } from "./vendor/ocapn.js";

const makeBtn = document.getElementById("make");
const listEl = document.getElementById("counters");
const importField = document.getElementById("importUrl");
const importBtn = document.getElementById("import");

const wsUrl = `${location.origin.replace(/^http/, "ws")}/counterRegistry`;
const api = newWebSocketRpcSession(wsUrl);

function render(entry) {
  const { counter, webkey } = entry;
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

  const copy = document.createElement("button");
  copy.textContent = "copy url";
  copy.addEventListener("click", async () => {
    if (isSwissnum(webkey)) {
      // Local capability: make and serialize a sturdyref — the registry mints
      // ["ocapn:sturdyref", swissnum, hints] as data, and the URL is derived
      // from it with the swissnum in the fragment.
      const sturdyref = await api.sturdyrefFor(webkey);
      await navigator.clipboard.writeText(srToUrl(location.origin, sturdyref));
    } else {
      // Remote ref: its webkey is already a dereferenceable web-key URL.
      await navigator.clipboard.writeText(webkey);
    }
  });

  counter.getValue().then((v) => (val.textContent = String(v)));
  row.append(label, val, incr, decr, copy);
  return row;
}

makeBtn.addEventListener("click", async () => {
  const counter = await api.makeCounter();
  const entry = { counter, webkey: (await api.listCounters()).at(-1).webkey };
  listEl.append(render(entry));
});

// Import a capability from a web-key URL: the importing worker's registry holds
// a durable remote ref, so the import survives reload and proxies to the owner.
importBtn.addEventListener("click", async () => {
  const raw = importField.value.trim();
  if (!raw) return;
  const counter = await api.importCounter(raw);
  listEl.append(render({ counter, webkey: raw }));
});

async function load() {
  listEl.textContent = "";
  const entries = await api.listCounters();
  for (const entry of entries) {
    listEl.append(render(entry));
  }
}

load();
