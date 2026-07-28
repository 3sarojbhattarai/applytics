.DEFAULT_GOAL := help
.PHONY: help install dev build start lint seed clean reset


help:
	@grep -E '^##' -A1 $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS="\n"} /^##/{desc=substr($$0,4)} /^[a-zA-Z_-]+:/{split($$0,a,":"); printf "  \033[36m%-10s\033[0m %s\n", a[1], desc}'


install:
	npm install

dev:
	npm run dev


build:
	npm run build


start:
	npm run start


lint:
	npm run lint


seed:
	npm run seed -- $(ARGS)


clean:
	rm -rf .next tsconfig.tsbuildinfo


reset: clean
	rm -rf node_modules package-lock.json
	npm install
