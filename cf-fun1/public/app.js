import { newWebSocketRpcSession } from "./vendor/capnweb.js";

// STYLE: separate confined use of objects from ambient setup?
const valueEl = document.getElementById("value");
const incrEl = document.getElementById("incr");
const decrEl = document.getElementById("decr");

const wsUrl = `${location.origin.replace(/^http/, "ws")}/api`;
const api = newWebSocketRpcSession(wsUrl);

// STYLE: try something preact-ish?

async function refresh() {
  valueEl.textContent = String(await api.getValue());
}

incrEl.addEventListener("click", async () => {
  valueEl.textContent = String(await api.increment());
});

decrEl.addEventListener("click", async () => {
  valueEl.textContent = String(await api.decrement());
});

refresh();
