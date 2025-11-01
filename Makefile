.PHONY: dev build test lint clean db-generate db-push deploy

dev:
	npm run dev

build:
	npm run build
	docker build -t currency-api .

run: build
	docker run -p 3000:3000 -v $(PWD)/dev.db:/app/dev.db currency-api

test:
	npm test

lint:
	npm run lint

db-generate:
	npm run db:generate

db-push:
	npm run db:push

clean:
	rm -rf node_modules dist *.db
	npm install

deploy:
	docker tag currency-api yourusername/currency-api:latest
	docker push yourusername/currency-api:latest
	@echo "Deploy to Render with Docker (auto-generates Prisma client)."
