sam plugin install sam-sql-database-tool
sam plugin add em-gateway --plugin sam-event-mesh-gateway
mkdir logs
xcopy /s agents configs\agents /Y
xcopy /s gateways configs\gateways /Y