docker stop hermes-router
docker rm hermes-router
docker build -t hermes-router .
docker run -d --name hermes-router -p 20128:20128 --env-file .env -v hermes-router-data:/app/data hermes-router