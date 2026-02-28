# Bug: Server hangs from stale SSE/proxy connections

**Reported:** 2026-02-24
**Severity:** High (requires manual server restart)
**Frequency:** "This ALWAYS happens" (Parker)

## Symptom

The markdown viewer page loads as a blank/stuck page. The URL works after killing the server process and restarting. Happens repeatedly over time, especially when tabs are left open.

## Root Cause

Three problems compound into one hang:

### 1. TCP proxy idle timeout kills SSE connections

`server.js` lines 428-429:
```js
clientSocket.setTimeout(IDLE_TIMEOUT, () => clientSocket.destroy());
serverSocket.setTimeout(IDLE_TIMEOUT, () => serverSocket.destroy());
```

SSE connections are long-lived by design. The 30-second keepalive ping (line 70-77) writes data from server to client, which resets `serverSocket`'s timeout. But `clientSocket` (browser side) never sends data back on an SSE connection. So after 5 minutes of no browser-to-server traffic, the proxy destroys the client socket, which cascades to destroy the server socket via `clientSocket.on("close")`.

The browser's `connectSSE()` reconnects after 2 seconds, creating a new connection pair. But the old pair may not clean up fully (half-open state), and this cycle repeats every 5 minutes.

### 2. Half-open connections from closed browser tabs

When a browser tab is closed (or the machine sleeps), the TCP connection may not send a FIN. The proxy doesn't detect this. The SSE response object stays in the `watchers` map. The keepalive timer tries to write to dead sockets, catches the error, removes the client from the Set ... but the proxy socket pair stays allocated.

Without TCP keepalive enabled on the proxy sockets, half-open connections can persist indefinitely.

### 3. No connection limit on the proxy

Each page load creates at least 2 proxy connections (one for the page, one for SSE). Over time, stale connections accumulate. Node.js has a default max of ~16K file descriptors, but well before that limit, the proxy can become unresponsive if too many connections are in a wedged state.

## Fix

Three changes to `server.js`:

### Fix 1: Don't timeout SSE proxy connections

The proxy shouldn't impose idle timeouts on connections it can't distinguish. Instead, let the HTTP server manage SSE lifecycle. Remove the `setTimeout` on proxy sockets, or set TCP keepalive instead:

```js
// Replace setTimeout with TCP keepalive
clientSocket.setKeepAlive(true, 60_000);  // OS-level probe every 60s
serverSocket.setKeepAlive(true, 60_000);
```

TCP keepalive detects dead peers at the OS level. If the browser is gone, the OS will RST the connection after a few failed probes.

### Fix 2: Reduce SSE keepalive interval

Change from 30s to 15s. Faster dead-client detection:

```js
setInterval(() => {
  for (const [, entry] of watchers) {
    for (const client of entry.clients) {
      try { client.write(`:keepalive\n\n`); }
      catch { entry.clients.delete(client); }
    }
  }
}, 15_000);  // was 30_000
```

### Fix 3: Add periodic stale-watcher cleanup

Watchers with zero clients should be cleaned up on a timer, not just on client disconnect:

```js
// Clean up watchers with no clients every 60s
setInterval(() => {
  for (const [path, entry] of watchers) {
    if (entry.clients.size === 0) {
      if (entry.watcher) entry.watcher.close();
      watchers.delete(path);
    }
  }
}, 60_000);
```

## Testing

1. Open a markdown file in the viewer
2. Close the browser tab (don't navigate away, close it)
3. Wait 5+ minutes
4. Open the same URL again
5. Should load immediately (currently hangs)

Also test:
- Leave tab open for 30+ minutes, edit the file, confirm live reload still works
- Open 10+ tabs to different files, close them all, confirm server recovers
