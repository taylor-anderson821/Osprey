# Osprey Flight Analytics

Osprey is a web app that generates soaring analytics for RC sailplanes. It analyzes altitude and variometer telemetry data from [Spektrum receivers](https://www.spektrumrc.com/aircraft-receivers/) to track thermalling performance and progression over time.

![Session Detail](images/session-detail.png)

## Features

- **Session Charts** — Altitude profiles with thermal start/end markers for every flying session
- **Thermal Detection** — Automatically identifies thermals, launches, and troughs from variometer data
- **Weather Snapshot** — Weather conditions based on soaring location and session start time
- **Daily Summary** — Bar charts showing thermal gain and duration by day
- **Soaring Log** — Lifetime totals for flight time, thermal gain, and thermal duration
- **Session & Thermal Maximums** — Personal records with one-click navigation to session details
- **AI / MCP Access** — Query your flight data in natural language via an [MCP](https://modelcontextprotocol.io/) server that plugs into Claude and other AI assistants
- **Imperial / Metric** — Select units of measure **Settings**

## How It Works

Osprey parses `.TLM` files from Spektrum receivers. It downsamples altitude and variometer data at 1 Hz and then identifies:

- **Thermal peaks** — local altitude maxima above a minimum height threshold
- **Launch peaks** — points associated with high climb rates (motor launches)
- **Trough bottoms** — local altitude minima between events

Caught thermals are identified by working backwards from each thermal peak to find the corresponding launch peak or trough bottom. This processed telemetry is then stored in a PostgreSQL database and served via a FastAPI backend to a React frontend.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, Recharts, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| AI Access | MCP (Model Context Protocol) |
| Deployment | Docker Compose |

## MCP Server

Osprey includes an [MCP](https://modelcontextprotocol.io/) server (`backend/mcp_server.py`) that exposes your flight data as tools an AI assistant like Claude can call directly. Instead of clicking through charts and session lists, you can just ask:

- "What were the weather conditions at my favorite flying field during my 5 best thermals?"
- "Compare the average climb rates across all my models."
- "Where did I fly the most last year?"

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A Spektrum receiver that records vario telemetry (see [compatible receivers](https://www.spektrumrc.com/radios/aircraft/receivers/?cgid=radios-aircraft-receivers&prefn1=integratedVariometer&prefv1=Yes))

### Running Locally

1. Clone the repo:
```bash
   git clone https://github.com/taylor-anderson821/Osprey.git
   cd Osprey
```

2. Copy the environment file and configure if needed:
```bash
   cp .env.example .env
```

3. Start all services:
```bash
   docker-compose up
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

5. Install the backend and MCP dependencies, then point the server at your database and account:

```bash
pip install -r backend/requirements.txt "mcp[cli]"
```

```bash
DATABASE_URL=postgresql://osprey:osprey_dev_password@localhost:5432/osprey
OSPREY_USER_EMAIL=you@example.com
```

6. Register the MCP server with your MCP client, using those environment variables.

   **Claude Code CLI:**
   ```bash
   claude mcp add osprey -- python backend/mcp_server.py
   ```

   **Claude Desktop:** add an entry to your `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows: `%APPDATA%\Claude\claude_desktop_config.json`), then restart Claude Desktop:
   ```json
   {
     "mcpServers": {
       "osprey": {
         "command": "python",
         "args": ["/absolute/path/to/Osprey/backend/mcp_server.py"],
         "env": {
           "DATABASE_URL": "postgresql://osprey:osprey_dev_password@localhost:5432/osprey",
           "OSPREY_USER_EMAIL": "you@example.com"
         }
       }
     }
   }
   ```

## Setting Up Your Transmitter to Capture Telemetry

In your Spektrum transmitter's **Telemetry** view, go to **File Settings** and configure:
- A file name for the TLM output
- A trigger switch to start/stop recording (e.g. a throttle cut switch)

### Uploading Data to Osprey

1. After flying, copy the `.TLM` file from your Spektrum transmitter's memory card to your computer.
2. In Osprey, navigate to **Upload** and select the TLM file.  You can also find sample TLM files under `/sample data`.
3. Osprey processes the file and adds all sessions to the database.

## Screenshots

![Session Profile](images/pilot-profile.png)

![Session Summary](images/daily-summary.png)

![Thermal Summary](images/session-list.png)

## Notes

- Osprey distinguishes between launches and thermals based on the rate of ascent. If you launch at a shallow or moderate climb rate (e.g. < 20 ft/s), Osprey will classify the launch as a thermal.
- Osprey was developed using telemetry from electric gliders. DLG glider data should also work, though the thermal detection algorithm has not been tested on that data.
