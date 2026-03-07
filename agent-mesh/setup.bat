sam plugin add flight-status-db --plugin sam-sql-database
sam plugin add em-gateway --plugin sam-event-mesh-gateway
mkdir logs
xcopy /s agents configs\agents /Y
xcopy /s gateways configs\gateways /Y