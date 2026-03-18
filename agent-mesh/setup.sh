sam plugin install sam-sql-database-tool
sam plugin add em-gateway --plugin sam-event-mesh-gateway
mkdir logs
cp agents/* configs/agents/
cp gateways/* configs/gateways/