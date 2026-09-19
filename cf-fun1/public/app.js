import { newWebSocketRpcSession } from "./vendor/capnweb.js";

const valueEl = document.getElementById("value");
const incrEl = document.getElementById("incr");
const decrEl = document.getElementById("decr");

const wsUrl = `${location.origin.replace(/^http/, "ws")}/api`;
const api = newWebSocketRpcSession(wsUrl);

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
