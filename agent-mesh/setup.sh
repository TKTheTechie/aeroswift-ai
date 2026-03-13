sam plugin add flight-status-db --plugin sam-sql-database
sam plugin add em-gateway --plugin sam-event-mesh-gateway
mkdir logs
mkdir configs/agents
mkdir configs/gateways
cp agents/* configs/agents/
cp gateways/* configs/gateways/