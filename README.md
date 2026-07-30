# NEXUS Relay – WebSocket Server (Render)

NEXUS Relay is a robust WebSocket relay server purpose-built for the NEXUS C2 framework. It maintains persistent, real-time connections to client devices (droppers), instantly forwards commands issued from the dashboard, and acts as a resilient intermediary by storing commands in the backend REST API as a fallback mechanism.

## Deployment

Deploying the relay server to Render is quick and straightforward:

1. Push your local repository to a new or existing GitHub repository.
2. Log in to your Render dashboard, click **New +**, and select **Web Service**.
3. Connect your GitHub repository to the new Web Service.
4. In the environment variables section, add `BACKEND_URL` and set it to your Vercel backend URL (e.g., `https://your-backend.vercel.app`).
5. *(Optional)* You can define a `PORT` variable, though Render will automatically assign and manage one for you.
6. Click **Deploy Web Service**.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BACKEND_URL` | Yes | The base URL of your Vercel REST API backend used for command storage. |
| `PORT` | No | The port the HTTP/WebSocket server listens on (Default: `8080`). |

## Endpoints

### WebSocket Protocol

* **Connect:** `wss://your-relay.onrender.com?deviceId=YOUR_DEVICE_ID`
  * **Description:** Initiates a persistent connection. The relay stores the active connection in an in-memory map, keyed by the provided `deviceId`, ensuring commands are routed to the correct target.

### HTTP REST

* **POST `/send-command`**
  * **Payload:** `{ "deviceId": "target-device-id", "command": "your_command_string" }`
  * **Description:** Receives a command from the dashboard. The relay first stores the command in the backend database via a POST request to `/api/send-command`. If the target device is currently connected, it immediately forwards the command over the active WebSocket session.
* **GET `/health`**
  * **Description:** Returns JSON detailing server health, including the total number of connected `clients` and the current server `uptime`.
* **GET `/`**
  * **Description:** Serves a modern, styled HTML status page. This page includes a built-in WebSocket tester, allowing operators to manually test relay connectivity, simulate device connections, and monitor raw socket traffic.

## Dependencies

The relay is built on a lightweight Node.js stack using the following core packages:

* `express`: For serving HTTP endpoints and the status page.
* `ws`: For robust WebSocket server implementation.
* `axios`: For making HTTP requests to the backend API.

## Local Development

To run and test the relay server on your local machine:

1. Clone the repository to your local environment.
2. Run `npm install` to install all dependencies.
3. Start the server, passing your local or remote backend URL:
   ```bash
   BACKEND_URL=http://localhost:3000 node relay.js
   ```
4. Connect a test WebSocket client:
   ```url
   ws://localhost:8080?deviceId=test
   ```
5. Dispatch a command using `curl` to verify routing:
   ```bash
   curl -X POST http://localhost:8080/send-command      -H "Content-Type: application/json"      -d '{"deviceId": "test", "command": "ping"}'
   ```

## How It Works

1. **Connection:** Client devices (droppers) initiate a persistent WebSocket connection to the relay upon execution.
2. **Dispatch:** The operator uses the NEXUS Dashboard to dispatch a command, hitting the relay's HTTP `/send-command` endpoint.
3. **Storage & Forwarding:** The relay simultaneously logs the command to the backend database (for persistence) and forwards it directly to the target device via the active WebSocket channel.
4. **Execution:** The device executes the forwarded command and can optionally send the execution results back through the WebSocket connection to be relayed to the database.

## Project Structure

```text
.
├── relay.js       # Main server and WebSocket routing logic
├── package.json   # Dependencies and npm scripts
└── README.md      # This documentation file
```

## Security Considerations

* **Authentication:** This relay server currently implements no authentication on the WebSocket or HTTP endpoints. It is designed for use in tightly controlled or isolated network environments.
* **Exposure:** If deployed to the public internet, it is highly recommended to implement API key validation or IP whitelisting to prevent unauthorized command injection.
* **State Management:** The relay relies on an in-memory map to track active connections. If the Render service restarts or spins down, all active connections are dropped and must be re-established by the client devices.

## License

For educational and authorized testing purposes only. Use responsibly.
