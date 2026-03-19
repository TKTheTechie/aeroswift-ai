
@REM Install Solace Agent Mesh
pip install solace-agent-mesh

@REM Initialize Solace Agent Mesh
sam init --skip

@REM Install required Solace Agent Mesh plugins
sam plugin install sam-sql-database-tool
sam plugin add em-gateway --plugin sam-event-mesh-gateway

@REM Install the MCP Filesystem Server
npm i @modelcontextprotocol/server-filesystem

@REM Copy the agent and gateway files to the right directory
xcopy /s agents configs\agents /Y
xcopy /s gateways configs\gateways /Y

@REM Create and pre-load the PostgreSQL databases; Frequent Flyer and Flight Information
docker run -d --name aeroswift_ffmembers -p 5431:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aeroswift_ffmembers -v ./data/ff_data:/data -v ./postgresql/ff_data.sql:/docker-entrypoint-initdb.d/init.sql postgres:latest
docker run -d --name aeroswift_flightdata -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aeroswift_flightdata -v ./data/flight_data:/data -v ./postgresql/flight_data.sql:/docker-entrypoint-initdb.d/init.sql postgres:latest

