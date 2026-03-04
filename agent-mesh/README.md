# Agent Mesh - Event Driven Agentic AI

An event-triggered agentic AI deployment providing a personalized experience to frequent flyers. The deployment provides flight rebooking recommendations in the case of delayed or canceled flights, directions to airport lounges, and calls upon services based on the frequent flyer tier.

## Features

- **Flight Rebooking Recommendations**: Provides real-time flight recommendations is a passengers existing flight is delayed or canceled
- **Airport Directions**: Provides directions to various points in the airport, for example frequent flyer lounges
- **Airport Concierge**: Calls upon frequent flyer services based on the passenger's loyalty tier
- **Real-time Flight Information**: Live flight data as published by the FAA
- **Intelligent Agent Orchestration**: Coordination of tasks across the various agents
- **Business Process Automation**: Trigger an AI workflow based off a business event, such as a passenger check-in

## Tech Stack

- **Agent Coordination**: Solace Agent Mesh Orchestrator
- **Data Sources**: SQLite Database
- **Messaging**: Solace Event Broker

## Prerequisites

- Python with pip (v12.9 recommended)
- Access to a Solace PubSub broker (or use demo mode)

## Installation

1. Install Solace Agent Mesh:
```bash
pip install solace-agent-mesh
```

2. Initialise Solace Agent Mesh:
```bash
sam init --skip
```

3. Run the setup script:
```bash
./setup.sh
```

4. Update configs/agents/main_orchestrator.yaml, Line X
```bash
allow_list: ["AeroswiftOperations"]
deny_list: ["*"]
```

5. Copy `.env_sample` as `.env` and update your environment variables:
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

## Demo Mode

To run the application without a Solace connection (useful for development and testing):

1. Set `SOLACE_DEV_MODE=true` in your `.env` file

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

### FDPS Agent
Accesses a database of real-time flight information, including:
- Flight source & destination
- Flight arrival
- Flight status

## Solace PubSub+ Integration

The application uses Solace PubSub for real-time messaging:

### Topics

- **Solace Agent Mesh**: `Pre-built topics that Solace Agent Mesh leverages` - Provides the communication between all agents and gateways

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
