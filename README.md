# Osprey Flight Analytics

Osprey is a soaring analytics webapp for RC sailplanes and gliders. It processes vario telemetry from Spektrum receivers to help you understand your thermalling performance and progression over time.

![Session Detail](images/session-detail.png)

## Features

- **Session Charts** — Altitude profiles with thermal start/end markers for every flying session
- **Thermal Detection** — Automatically identifies thermals, launches, and troughs from vario data
- **Daily Summary** — Bar charts showing thermal gain and thermal duration % by day
- **Soaring Log** — Lifetime totals for flight time, thermal gain, and thermal duration
- **Session & Thermal Maximums** — Personal records with one-click navigation to the record session
- **Multi-model Support** — Tracks aircraft model name from TLM file headers
- **Imperial / Metric** — Toggle between ft and m in Settings

## How It Works

Osprey parses `.TLM` files from Spektrum receivers. It reads altitude and climb rate data at 1-second intervals, applies a moving average to smooth the altitude trace, then identifies:

- **Thermal peaks** — local altitude maxima above a minimum height threshold
- **Launch peaks** — points associated with high climb rates (winch/bungee launches)
- **Trough bottoms** — local altitude minima between events

Caught thermals are identified by working backwards from each thermal peak to find the corresponding launch peak or trough bottom. The result is stored in a PostgreSQL database and served via a FastAPI backend to a React frontend.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, Recharts, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Deployment | Docker Compose |

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

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Setting Up Your Transmitter to Capture Telemetry

In your Spektrum transmitter's Telemetry view, go to **File Settings** and configure:
- A file name for the TLM output
- A trigger switch to start/stop recording (e.g. throttle cut switch)

### Uploading Data to Osprey

1. After flying, copy the `.TLM` file from your Spektrum transmitter's memory card to your computer.
2. In Osprey, navigate to **Upload** and select the TLM file.
3. Osprey processes the file and adds all sessions to the database.

> **Tip:** Delete the TLM file from your memory card after each upload to avoid duplicate sessions on the next upload.

## Screenshots

![Session Profile](images/pilot-profile.png)

![Session Summary](images/daily-summary.png)

![Thermal Summary](images/session-list.png)


## Notes

- Osprey was developed using telemetry from electric gliders. DLG glider data should also work, however I haven't tested the thermal detection algorithm on DLG data.
- Please let me know if you think it is worthwhile for this to be hosted.
