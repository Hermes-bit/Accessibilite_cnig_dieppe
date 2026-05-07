.PHONY: help dev prod down logs shell-backend test lint security-scan gen-password init-git

COMPOSE_DEV  = docker compose -f docker-compose.yml -f docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker-compose.yml

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Démarrer l'environnement de développement
	cp -n .env.example .env || true
	$(COMPOSE_DEV) up --build

prod: ## Démarrer l'environnement de production
	$(COMPOSE_PROD) up -d --build

down: ## Arrêter tous les services
	$(COMPOSE_PROD) down

logs: ## Voir les logs (services=backend nginx redis)
	$(COMPOSE_PROD) logs -f $(services)

shell-backend: ## Ouvrir un shell dans le conteneur backend
	$(COMPOSE_PROD) exec backend /bin/sh

test: ## Lancer les tests
	cd backend && python -m pytest tests/ -v --cov=app

lint: ## Linter le code Python
	cd backend && black --check app/ && flake8 app/ --max-line-length=100

security-scan: ## Audit de sécurité local (Bandit + Safety)
	cd backend && bandit -r app/ -ll
	cd backend && safety check -r requirements.txt

gen-password: ## Générer un hash de mot de passe pour ADMIN_PASSWORD_HASH
	@python -c "from werkzeug.security import generate_password_hash; import getpass; print(generate_password_hash(getpass.getpass('Mot de passe: ')))"

init-git: ## Initialiser le dépôt git et faire le premier commit
	git init
	git add .
	git commit -m "feat: initial project setup — CNIG Accessibilité"
	@echo "Ajoutez votre remote: git remote add origin https://github.com/VOTRE_COMPTE/cnig-accessibilite.git"
	@echo "Puis poussez: git push -u origin main"
