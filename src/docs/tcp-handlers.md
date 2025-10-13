# TCP Handler Documentation

TCP handlers are TypeScript functions that process incoming TCP data in the Webhook Testing Tool. They execute in a secure, sandboxed environment and can respond to TCP clients with custom data.

## How TCP Handlers Work

### Execution Environment

TCP handlers are transpiled from TypeScript and executed in a sandboxed context with a limited set of global objects available. They can:

1. Read incoming TCP data from the `data` global variable (as a string).
2. Send data back to the TCP client using the `send()` function.
3. Access globally shared state in `shared`.
4. Use a collection of utilities like `sleep`, `console`, `btoa`, and `atob`.

### Single Handler Model

Unlike HTTP handlers which can be chained, **only one TCP handler can be active at a time**. This handler will execute for every incoming TCP packet received by the server.

### When to Use TCP Handlers

TCP handlers are useful for:
- Testing raw TCP protocol implementations
- Simulating custom binary protocols
- Creating echo servers or custom response patterns
- Testing TCP client behavior with specific server responses
- Debugging low-level network communication

## Available Global Objects

### Data Variable (`data`)

The incoming TCP data as a UTF-8 string. This variable is **read-only**.

```javascript
// Log the received data
console.log("Received:", data);

// Parse JSON data
const jsonData = JSON.parse(data);

// Check for specific patterns
if (data.includes("ping")) {
  send("pong\n");
}

// Handle binary data (represented as string)
const length = data.length;
console.log(`Received ${length} bytes`);
```

### Send Function (`send`)

Send data back to the TCP client. The data will be converted to a UTF-8 buffer and sent immediately.

```javascript
// Send simple text
send("ack\n");

// Send JSON response
send(JSON.stringify({ status: "ok", timestamp: Date.now() }) + "\n");

// Send multiple responses
send("Part 1\n");
send("Part 2\n");

// Echo the received data back
send(data);
```

**Note:** Unlike HTTP, TCP is a streaming protocol. Each `send()` call writes directly to the socket without any protocol headers or framing.

### Shared State (`shared`)

Persist data across all TCP connections and handler executions. Data survives server restarts.

```javascript
// Initialize counter if not exists
if (!shared.tcpCounter) {
  shared.tcpCounter = 0;
}

// Increment counter
shared.tcpCounter++;
send(`Connection #${shared.tcpCounter}\n`);

// Store connection history
shared.history = shared.history || [];
shared.history.push({
  timestamp: Date.now(),
  data: data,
});

// Keep only last 100 messages
if (shared.history.length > 100) {
  shared.history = shared.history.slice(-100);
}

console.log("Total connections:", shared.tcpCounter);
```

### Console Object (`console`)

Capture debug information and logs.

```javascript
console.log("Processing TCP data");
console.info("Client connected successfully");
console.warn("Unusual data pattern detected");
console.error("Failed to parse data");
console.debug("Debug information");
```

Output is captured and displayed in the server logs.

### Sleep utility (`sleep`)

Use `sleep(ms)` to pause execution of the handler, e.g. to create artificial delays.

```javascript
// Delay response by 1 second
await sleep(1000);
send("Delayed response\n");
```

Handler code is automatically wrapped in an `async` function, so you can use top-level `await` in the handler body.

### Base64 Encoding/Decoding (`btoa`, `atob`)

Use `btoa` to encode strings to base64 and `atob` to decode base64 strings.

```javascript
// Encode data to base64
const encoded = btoa(data);
send(encoded + "\n");

// Decode base64 data
try {
  const decoded = atob(data.trim());
  console.log("Decoded:", decoded);
  send(decoded + "\n");
} catch (error) {
  console.error("Invalid base64 data");
  send("error: invalid base64\n");
}
```

## Example TCP Handlers

### Echo Server

```javascript
// Simple echo server
console.log("Received:", data);
send(data);
```

### Custom Protocol Handler

```javascript
// Simple command protocol
const command = data.trim();

switch (command) {
  case "PING":
    send("PONG\n");
    break;

  case "TIME":
    send(`${Date.now()}\n`);
    break;

  case "STATUS":
    send(JSON.stringify({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now()
    }) + "\n");
    break;

  case "QUIT":
    send("Goodbye\n");
    // Connection will close naturally
    break;

  default:
    send("ERROR: Unknown command\n");
}
```

### Connection Counter

```javascript
// Track and display connection count
if (!shared.connectionCount) {
  shared.connectionCount = 0;
}

shared.connectionCount++;

send(`Welcome! You are connection #${shared.connectionCount}\n`);
console.log(`Total connections: ${shared.connectionCount}`);
```

### JSON Request/Response

```javascript
// Parse JSON requests and respond with JSON
try {
  const request = JSON.parse(data);

  const response = {
    status: "success",
    echo: request,
    timestamp: Date.now(),
    messageCount: (shared.messageCount || 0) + 1
  };

  shared.messageCount = response.messageCount;

  send(JSON.stringify(response) + "\n");
} catch (error) {
  send(JSON.stringify({
    status: "error",
    message: "Invalid JSON"
  }) + "\n");
}
```

### Rate Limiter

```javascript
// Simple rate limiting
shared.requests = shared.requests || [];
const now = Date.now();
const windowMs = 60 * 1000; // 1 minute

// Clean old requests
shared.requests = shared.requests.filter(ts => now - ts < windowMs);

// Check rate limit
if (shared.requests.length >= 10) {
  send("ERROR: Rate limit exceeded (max 10/minute)\n");
  console.warn("Rate limit exceeded");
} else {
  shared.requests.push(now);
  send(`OK (${shared.requests.length}/10 requests in window)\n`);
}
```

### Base64 Echo Server

```javascript
// Decode base64 input, process, and encode output
try {
  const decoded = atob(data.trim());
  console.log("Decoded input:", decoded);

  const processed = decoded.toUpperCase();
  const encoded = btoa(processed);

  send(encoded + "\n");
} catch (error) {
  console.error("Invalid base64 input");
  send("ERROR: Invalid base64\n");
}
```

### Delayed Response Server

```javascript
// Simulate slow network or processing
console.log("Received request, processing...");

// Wait 2 seconds before responding
await sleep(2000);

send("Response after delay\n");
console.log("Response sent");
```

### Stateful Chat Simulation

```javascript
// Simple stateful conversation
if (!shared.conversationState) {
  shared.conversationState = "greeting";
}

const message = data.trim().toLowerCase();

switch (shared.conversationState) {
  case "greeting":
    if (message.includes("hello")) {
      send("Hi! What's your name?\n");
      shared.conversationState = "asking_name";
    } else {
      send("Please say hello to start.\n");
    }
    break;

  case "asking_name":
    shared.userName = message;
    send(`Nice to meet you, ${shared.userName}! How can I help you?\n`);
    shared.conversationState = "conversing";
    break;

  case "conversing":
    if (message.includes("bye")) {
      send(`Goodbye, ${shared.userName}!\n`);
      shared.conversationState = "greeting";
    } else {
      send(`I understand, ${shared.userName}. Tell me more or say bye to end.\n`);
    }
    break;
}
```

## Differences from HTTP Handlers

| Feature | HTTP Handlers | TCP Handlers |
|---------|---------------|--------------|
| Number of handlers | Multiple (chained) | Single handler only |
| Request object | Full HTTP request (`req`) | Raw data string (`data`) |
| Response method | HTTP response object (`resp`) | `send()` function |
| Protocol | HTTP/HTTPS | Raw TCP |
| Headers | Supported | Not applicable |
| Status codes | Supported | Not applicable |
| Routing | Path and method matching | All data goes to one handler |
| Error handling | HTTP error classes | Manual error responses |

## Testing TCP Handlers

To test your TCP handler, you can use various TCP client tools:

### Using netcat (nc)

```bash
# Connect to TCP server
echo "hello" | nc localhost 8888

# Interactive session
nc localhost 8888
# Type messages and press Enter
```

### Using telnet

```bash
# Connect to TCP server
telnet localhost 8888
# Type messages and press Enter
```

### Using Python

```python
import socket

# Create TCP client
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('localhost', 8888))

# Send data
sock.send(b'hello\n')

# Receive response
response = sock.recv(1024)
print(response.decode())

sock.close()
```

### Using Node.js

```javascript
const net = require('net');

const client = net.createConnection({ port: 8888 }, () => {
  console.log('Connected to server');
  client.write('hello\n');
});

client.on('data', (data) => {
  console.log('Received:', data.toString());
  client.end();
});

client.on('end', () => {
  console.log('Disconnected');
});
```

## Best Practices

1. **Always handle errors**: Wrap parsing and processing in try-catch blocks to prevent handler crashes.

2. **Use newline delimiters**: Many TCP clients expect newline-terminated messages. Consider adding `\n` to your responses.

3. **Keep handlers simple**: TCP handlers execute for every packet. Keep logic simple and performant.

4. **Log appropriately**: Use `console` methods to track handler execution and debug issues.

5. **Manage shared state carefully**: Remember that `shared` state persists across all connections. Clean up old data to prevent memory issues.

6. **Be aware of encoding**: The `data` variable is UTF-8 decoded. For binary protocols, you may need to use base64 encoding/decoding.

7. **Test thoroughly**: Use multiple TCP clients to test concurrent connections and edge cases.

8. **Enable/disable as needed**: Use the "Enabled" toggle to quickly activate or deactivate the TCP handler without deleting your code.
