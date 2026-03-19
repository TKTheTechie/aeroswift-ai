
# Install Solace Agent Mesh
pip install solace-agent-mesh

# Initialize Solace Agent Mesh
sam init --skip

# Install required Solace Agent Mesh plugins
sam plugin install sam-sql-database-tool
sam plugin add em-gateway --plugin sam-event-mesh-gateway

# Install the MCP Filesystem Server
npm i @modelcontextprotocol/server-filesystem

# Copy the agent and gateway files to the right directory
cp agents/* configs/agents/
cp gateways/* configs/gateways/

# Create and pre-load the PostgreSQL databases; Frequent Flyer and Flight Information
docker run -d --name aeroswift_ffmembers -p 5431:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aeroswift_ffmembers -v ./data/ff_data:/data -v ./pgdata/ff_data.sql:/docker-entrypoint-initdb.d/init.sql postgres:14.22-trixie
docker run -d --name aeroswift_flightdata -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aeroswift_flightdata -v ./data/flight_data:/data -v ./pgdata/flight_data.sql:/docker-entrypoint-initdb.d/init.sql postgres:14.22-trixie

