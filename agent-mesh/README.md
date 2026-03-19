# Agent Mesh - Event Driven Agentic AI

An event-triggered agentic AI deployment providing a personalized experience to frequent flyers. The deployment provides flight rebooking recommendations in the case of delayed or canceled flights, directions to airport lounges, and calls upon services based on the frequent flyer tier.

## Features

- **Flight Rebooking Recommendations**: Provides flight recommendations if a passengers existing flight is delayed or canceled
- **Airport Directions**: Provides directions to various points in the airport, for example frequent flyer lounges
- **Intelligent Agent Orchestration**: Coordination of tasks across the various agents
- **Deterministic Workflows**: Provides a repeatable process for common triggers
- **Business Process Automation**: Trigger an AI workflow based off a business event, such as a passenger check-in

## Tech Stack

- **Agent Coordination**: Solace Agent Mesh Orchestrator
- **Data Sources**: PostgreSQL Database & Local Filesystem
- **Messaging**: Solace Event Broker

## Prerequisites

- Python with pip (v3.12.9 recommended)
- Access to a Solace PubSub broker
- Docker for PostgreSQL databases
- npm for MCP Server install

## Installation

1. Create a Python virtual environment
```bash
python -m venv .venv
```

2. Activate the environment
```bash
source .venv/bin/activate

.venv/Scripts/activate  # Windows users
```

3. Run the setup script:
```bash
./setup.sh

./setup.bat  # Windows users
```

4. Copy `.env_sample` as `.env` and update your environment variables:
```env
# LLM Configuration
LLM_SERVICE_ENDPOINT=""
LLM_SERVICE_API_KEY=""

# Solace PubSub Broker
SOLACE_BROKER_URL=""
SOLACE_BROKER_VPN=""
SOLACE_BROKER_USERNAME=""
SOLACE_BROKER_PASSWORD=""

# Solace PubSub Gateway Broker (can be the same as above)
EVENT_MESH_GW_SOLACE_BROKER_URL=""
EVENT_MESH_GW_SOLACE_BROKER_VPN=""
EVENT_MESH_GW_SOLACE_BROKER_USERNAME=""
EVENT_MESH_GW_SOLACE_BROKER_PASSWORD=""
```

## Usage

### Development Mode

Run Solace Agent Mesh in the foreground:
```bash
sam run
```

The application will be available at `http://localhost:8000`

### Production Build

Run Solace Agent Mesh in the background:
```bash
nohup sam run &
```

## Components

### Orchestrator Agent
The default orchestrator agent from Solace Agent Mesh. Features:
- Agent discovery through agent card consumption
- Prompt decomposition and task delegation to connected agents
- Response analysis and aggregation

### Frequent Flyer Agent
Accesses a database of frequent flyer information, including:
- Tiers
- Benefits
- Member Profiles
- Member Statuses

### Flight Information Agent
Accesses a database of flight information, including:
- Flight source & destination
- Flight arrival
- Flight status

### Airport Maps Agent
Accesses a local directory for airport maps, providing information on:
- Location of lounges/clubs
- Location of facilities

## Solace PubSub+ Integration

The application uses Solace PubSub for real-time messaging:

### Topics

- **Solace Agent Mesh**: `Pre-built topics that Solace Agent Mesh leverages` - Provides the communication between all agents and gateways
- **Frequent Flyer Identified**: `aeroswift/terminal1/v1/face/match/result` - Receives a frequent flyer ID from the facial recognition component
- **Agent Mesh Response**: `aeroswift/terminal1/v1/passenger/lookup/response/x` - Publishes the result of the Agent Mesh processing

## Troubleshooting

### Connection Issues

If you're having trouble connecting to Solace:
1. Verify your Solace broker URL and credentials in `.env`
2. Check that the Solace broker is running and accessible
3. Ensure the VPN name matches your Solace configuration
4. Try enabling demo mode to verify the UI works independently

## License

MIT

## Related Projects

- [Solace Agent Mesh](https://github.com/SolaceLabs/solace-agent-mesh) - Open-source framework for building event-driven agentic AI
- [MCP Filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) - MCP server for looking in a local directory
