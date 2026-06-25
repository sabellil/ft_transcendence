.PHONY: all clean fclean start stop backend frontend prisma check_dockers




all: .env \
secrets/db_user \
secrets/db_password \
secrets/db_name \
secrets/jwt_secret \
secrets/hash_secret \
secrets/server.key \
secrets/server.crt




.env:
	@echo "Generating .env file..."

	@DOMAIN="$${DOMAIN:-localhost}"; echo "DOMAIN=$$DOMAIN" > .env

	@DB_PORT="$${DB_PORT:-5432}"; echo "DB_PORT=$$DB_PORT" >> .env
	@BACKEND_PORT="$${BACKEND_PORT:-3000}"; echo "BACKEND_PORT=$$BACKEND_PORT" >> .env
	@FRONTEND_PORT="$${FRONTEND_PORT:-443}"; echo "FRONTEND_PORT=$$FRONTEND_PORT" >> .env

	@chmod 600 .env

	@echo ".env file created successfully."




secrets/db_user \
secrets/db_password \
secrets/db_name \
secrets/jwt_secret \
secrets/hash_secret \
secrets/server.key \
secrets/server.crt: .env
	@echo "Generating secret files..."

	@set -a; . ./.env; set +a

	@mkdir -p secrets

	@DB_USER="$${DB_USER:-user}"; echo "$$DB_USER" > secrets/db_user
	@DB_PASS="$${DB_PASS:-pass}"; echo "$$DB_PASS" > secrets/db_password
	@DB_NAME="$${DB_NAME:-transcendence}"; echo "$$DB_NAME" > secrets/db_name

	@JWT_SECRET="$${JWT_SECRET:-$$(openssl rand -hex 32)}"; echo "$$JWT_SECRET" > secrets/jwt_secret
	@HASH_SECRET="$${HASH_SECRET:-$$(openssl rand -hex 30)}"; echo "$$HASH_SECRET" > secrets/hash_secret

	@DOMAIN="$${DOMAIN:-localhost}"; openssl req -x509 \
		-newkey rsa:4096 \
		-keyout secrets/server.key \
		-out secrets/server.crt \
		-days 3650 \
		-nodes \
		-subj "/CN=$$DOMAIN" \
		-addext "subjectAltName=DNS:$$DOMAIN"

	@chmod 600 secrets/*

	@echo "Secret files created successfully."




clean:
	@echo "Cleaning..."
	docker compose down -v 2>/dev/null || true
	@rm -rf node_modules backend/node_modules frontend/node_modules
	@rm -rf secrets .env
	@echo "Successfully."




fclean: clean
	docker compose build --no-cache backend frontend




start: all
	@echo "Starting..."
	docker compose up --build -d
	@echo "Successfully."




stop:
	@echo "Stopping..."
	docker compose down 2>/dev/null || true
	@echo "Successfully."




backend:
	@echo "Opening backend container shell..."
	docker exec -it transcendence_backend sh
	@echo "Shell session ended."




frontend:
	@echo "Opening frontend container shell..."
	docker exec -it transcendence_frontend sh
	@echo "Shell session ended."




prisma:
	@echo "Running Prisma migrations..."
	docker exec -it transcendence_backend npm run migrate
	@echo "Successfully."




check_dockers:
	@echo "----DOCKER INFOS----" && \
	docker ps -a --format "table {{.Names}}\t{{.RunningFor}}\t{{.Status}}\t\t" && echo "---" && \
	docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t" && \
	echo "----IMAGES----" && \
	docker image ls && \
	echo "----VOLUMES----" && \
	docker volume ls