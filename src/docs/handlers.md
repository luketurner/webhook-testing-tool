# Handler Documentation

Handlers are Typescript functions that process incoming HTTP requests in the Webhook Testing Tool. They execute in a secure, sandboxed environment and can modify responses, validate data, and maintain state.

## How Handlers Work

### Execution Flow

1. **Request Received** - An HTTP request arrives at WTT
2. **Handler Matching** - Handlers are matched against the request path and method
3. **Sequential Execution** - Matching handlers execute in order based on their `order` field
4. **Response Generation** - The final response is sent back to the client

### Execution Environment

Handlers run in a **sandboxed VM context** for security:
- No access to Node.js modules or filesystem
- No network access (cannot make HTTP requests)
- Isolated from the main application
- Console output is captured and stored

## Available Global Objects

### Request Object (`req`)

The request object contains incoming HTTP request data and is **read-only**.

```javascript
// Access request method
console.log(req.method); // "GET", "POST", etc.

// Access full URL
console.log(req.url); // "https://example.com/api/webhook?param=value"

// Access headers (array of [key, value] pairs)
req.headers.forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});

// Find specific header
const contentType = req.headers.find(([key]) => 
  key.toLowerCase() === 'content-type'
)?.[1];

// Access query parameters
req.query.forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

// Access request body
console.log(req.body);

// Access route parameters (when using parameterized paths)
console.log(req.params.id);     // For path "/users/:id"
console.log(req.params.userId); // For path "/users/:userId/posts/:postId"
```

### Response Object (`resp`)

The response object allows you to modify the HTTP response sent back to the client.

```javascript
// Set status code
resp.status = 201;

// Set status message (optional)
resp.statusMessage = "Created";

// Add headers
resp.headers.push(["Content-Type", "application/json"]);
resp.headers.push(["X-Custom-Header", "custom-value"]);

// Set response body
resp.body = {
  success: true,
  message: "Request processed successfully"
};

// Or set text response
resp.body = "Hello, World!";

// Set binary response body (base64 encoded)
resp.body_raw = "SGVsbG8gV29ybGQ="; // "Hello World" in base64
```

#### Response Body Options

The response object supports two body properties:

- **`resp.body`** - For text/JSON responses. Content is automatically encoded to base64.
- **`resp.body_raw`** - For binary responses. Content must be base64-encoded string.

When both are set, `resp.body_raw` takes precedence:

```javascript
// Text response (automatically encoded)
resp.body = "Hello, World!";

// JSON response (automatically encoded)
resp.body = { message: "Success", data: [1, 2, 3] };

// Binary response (must be base64 encoded)
resp.body_raw = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="; // 1x1 pixel PNG

// body_raw takes precedence when both are set
resp.body = "This will be ignored";
resp.body_raw = "SGVsbG8gV29ybGQ="; // This will be returned
```

### Context Object (`ctx`)

The context object provides additional request information and is **read-only**.

```javascript
// Access full request event data
console.log(ctx.requestEvent.id); // Request ID
console.log(ctx.requestEvent.request_timestamp); // When request was received
console.log(ctx.requestEvent.tls_info); // TLS connection information

// Access JWT verification results (if JWT configured)
if (ctx.jwtVerification) {
  console.log(ctx.jwtVerification.isValid);
  console.log(ctx.jwtVerification.error);
}
```

### Locals Object (`locals`)

Share data between handlers within the same request.

```javascript
// Store data in first handler
locals.userId = "12345";
locals.validationResult = { isValid: true };

// Access data in subsequent handlers
if (locals.userId) {
  console.log("User ID:", locals.userId);
}
```

### Shared State (`shared`)

Persist data across all requests and handlers. Data survives server restarts.

```javascript
// Initialize counter if not exists
if (!shared.requestCount) {
  shared.requestCount = 0;
}

// Increment counter
shared.requestCount++;

// Store user data
shared.users = shared.users || {};
shared.users[userId] = { name: "John Doe", lastSeen: new Date() };

console.log("Total requests:", shared.requestCount);
```

### Console Object (`console`)

Capture debug information and logs.

```javascript
console.log("Processing request");
console.info("User authenticated successfully");
console.warn("Rate limit approaching");
console.error("Validation failed");
console.debug("Debug information");
```

Output is captured and stored with the handler execution, viewable in the admin interface.

## JWT Authentication

If your handler is configured with JWT verification, use the `jwt` utilities:

```javascript
// Check if JWT is valid
if (jwt.isJWTVerified()) {
  console.log("JWT is valid");
} else {
  console.log("JWT verification failed:", jwt.getJWTError());
}

// Get JWT details
console.log("Algorithm:", jwt.getJWTAlgorithm());
console.log("Key ID:", jwt.getJWTKeyId());

// Require valid JWT (throws error if invalid)
try {
  jwt.requireJWTVerification();
  // Continue processing...
} catch (error) {
  // JWT verification failed
}
```

## Error Handling

Throw HTTP errors to stop processing and return error responses:

```javascript
// Validate request
if (!req.body || !req.body.email) {
  throw new BadRequestError("Email is required");
}

// Check authorization
if (!isAuthorized(req)) {
  throw new UnauthorizedError("Invalid credentials");
}

// Validate permissions
if (!hasPermission(req)) {
  throw new ForbiddenError("Insufficient permissions");
}

// Handle not found
if (!resource) {
  throw new NotFoundError("Resource not found");
}

// Handle validation errors
if (!isValidData(req.body)) {
  throw new UnprocessableEntityError("Invalid data format");
}

// Handle rate limiting
if (rateLimitExceeded(req)) {
  throw new TooManyRequestsError("Rate limit exceeded");
}

// Handle server errors
if (serverError) {
  throw new InternalServerError("Server error occurred");
}
```

### Available Error Classes

- `BadRequestError` (400) - Invalid request
- `UnauthorizedError` (401) - Authentication required
- `ForbiddenError` (403) - Insufficient permissions
- `NotFoundError` (404) - Resource not found
- `MethodNotAllowedError` (405) - HTTP method not allowed
- `PayloadTooLargeError` (413) - Request payload too large
- `UnsupportedMediaTypeError` (415) - Unsupported content type
- `UnprocessableEntityError` (422) - Validation failed
- `TooManyRequestsError` (429) - Rate limit exceeded
- `InternalServerError` (500) - Server error
- `NotImplementedError` (501) - Feature not implemented
- `ServiceUnavailableError` (503) - Service unavailable
- `GatewayTimeoutError` (504) - Gateway timeout

## Handler Configuration

### Path Matching

Handlers support Express.js-style path patterns with parameter extraction:

```javascript
// Exact match
"/api/webhook"

// Single parameter
"/api/users/:id"

// Multiple parameters
"/api/users/:userId/posts/:postId"

// Parameters with separators
"/flights/:from-:to"           // matches /flights/LAX-SFO
"/files/:name.:ext"            // matches /files/document.pdf

// Nested parameters
"/api/v:version/users/:userId/posts/:postId/comments/:commentId"

// Parameters with underscores
"/users/:user_id/posts/:post_id"
```

#### Parameter Features

- **Automatic URL decoding**: Parameters are automatically decoded (e.g., `hello%20world` becomes `hello world`)
- **String type**: All parameters are strings, regardless of numeric content
- **Special characters**: Supports underscores, hyphens, and dots in parameter values
- **Access via `req.params`**: Parameters are available as properties on the `req.params` object

```javascript
// Handler for /users/:id/profile
console.log(req.params.id); // Extracted parameter value

// Handler for /api/v:version/users/:userId
console.log(req.params.version); // API version
console.log(req.params.userId);  // User ID

// Parameter validation example
const orderId = req.params.orderId;
if (!/^\d+$/.test(orderId)) {
  throw new BadRequestError("Order ID must be numeric");
}
```

### Method Matching

- Specific methods: `GET`, `POST`, `PUT`, `DELETE`, etc.
- All methods: `*`

### JWT Configuration

Configure JWT verification by setting:
- **JKU (JSON Web Key Set URL)**: URL to fetch public keys
- **JWKS (JSON Web Key Set)**: Inline JSON with public keys

## Example Handlers

### Basic Response Handler

```javascript
// Set custom response
resp.status = 200;
resp.headers.push(["Content-Type", "application/json"]);
resp.body = {
  message: "Hello from WTT!",
  timestamp: new Date().toISOString(),
  method: req.method,
  url: req.url
};
```

### Request Validation Handler

```javascript
// Validate JSON payload
if (req.method === "POST") {
  if (!req.body) {
    throw new BadRequestError("Request body is required");
  }
  
  if (!req.body.email || !req.body.name) {
    throw new UnprocessableEntityError("Email and name are required");
  }
  
  // Store validated data for next handler
  locals.validatedData = req.body;
}
```

### Artificially Delayed Response Handler

```javascript
await sleep(1000); // wait 1 second
resp.status = 200;
```

### Rate Limiting Handler

```javascript
// Simple rate limiting using shared state
const clientIP = req.headers.find(([key]) => 
  key.toLowerCase() === 'x-forwarded-for'
)?.[1] || 'unknown';

shared.rateLimits = shared.rateLimits || {};
shared.rateLimits[clientIP] = shared.rateLimits[clientIP] || { count: 0, lastReset: Date.now() };

const rateLimit = shared.rateLimits[clientIP];
const now = Date.now();
const windowMs = 60 * 1000; // 1 minute window

// Reset counter if window has passed
if (now - rateLimit.lastReset > windowMs) {
  rateLimit.count = 0;
  rateLimit.lastReset = now;
}

rateLimit.count++;

if (rateLimit.count > 10) {
  throw new TooManyRequestsError("Rate limit exceeded: max 10 requests per minute");
}

console.log(`Request ${rateLimit.count}/10 from ${clientIP}`);
```

### JWT Authentication Handler

```javascript
// Require valid JWT
jwt.requireJWTVerification();

// Extract user info from JWT payload
const userId = ctx.jwtVerification.payload?.sub;
const userRole = ctx.jwtVerification.payload?.role;

if (!userId) {
  throw new UnauthorizedError("User ID not found in JWT");
}

// Store user context for subsequent handlers
locals.currentUser = {
  id: userId,
  role: userRole,
  algorithm: jwt.getJWTAlgorithm(),
  keyId: jwt.getJWTKeyId()
};

console.log(`Authenticated user: ${userId} with role: ${userRole}`);
```

### Request Logging Handler

```javascript
// Log request details
console.log(`${req.method} ${req.url}`);
console.log("Headers:", req.headers.length);
console.log("Query params:", req.query.length);

// Log to shared state for analytics
shared.requestLog = shared.requestLog || [];
shared.requestLog.push({
  timestamp: new Date().toISOString(),
  method: req.method,
  url: req.url,
  userAgent: req.headers.find(([key]) => 
    key.toLowerCase() === 'user-agent'
  )?.[1] || 'unknown'
});

// Keep only last 100 requests
if (shared.requestLog.length > 100) {
  shared.requestLog = shared.requestLog.slice(-100);
}
```

### Parameter Handling Handler

```javascript
// Handler for /api/v:version/users/:userId/posts/:postId
// Demonstrates parameter extraction and validation

// Extract all parameters
const { version, userId, postId } = req.params;

// Validate API version
if (!["1", "2"].includes(version)) {
  throw new BadRequestError("Unsupported API version");
}

// Validate user ID format
if (!/^user_\d+$/.test(userId)) {
  throw new BadRequestError("Invalid user ID format");
}

// Validate post ID is numeric
if (!/^\d+$/.test(postId)) {
  throw new BadRequestError("Post ID must be numeric");
}

// Store extracted data in locals for other handlers
locals.apiVersion = version;
locals.userId = userId;
locals.postId = parseInt(postId);

// Build response
resp.body = {
  api_version: version,
  user_id: userId,
  post_id: parseInt(postId),
  resource_path: `/api/v${version}/users/${userId}/posts/${postId}`
};
```

### Binary Response Handler

```javascript
// Return a small PNG image
resp.status = 200;
resp.headers.push(["Content-Type", "image/png"]);
resp.body_raw = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Return PDF content
resp.status = 200;
resp.headers.push(["Content-Type", "application/pdf"]);
resp.headers.push(["Content-Disposition", "attachment; filename=\"document.pdf\""]);
resp.body_raw = "JVBERi0xLjQKJcOkw7zDssO..."; // Base64 encoded PDF content
```