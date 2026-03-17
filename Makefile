SHELL := /bin/zsh

.DEFAULT_GOAL := help

.PHONY: help install dev build preview test test-run test-unit test-e2e lint lint-fix format format-fix ci audio clean

help:
	@printf "Kitty Defense commands:\n"
	@printf "  make install     Install project dependencies\n"
	@printf "  make dev         Start the Vite dev server\n"
	@printf "  make build       Build the production bundle\n"
	@printf "  make preview     Preview the production build\n"
	@printf "  make test        Run tests in watch mode\n"
	@printf "  make test-run    Run the full test suite once\n"
	@printf "  make test-unit   Run unit tests only\n"
	@printf "  make test-e2e    Run UI-level tests\n"
	@printf "  make lint        Run ESLint\n"
	@printf "  make lint-fix    Apply ESLint fixes\n"
	@printf "  make format      Check formatting\n"
	@printf "  make format-fix  Apply Prettier formatting\n"
	@printf "  make ci          Run lint, tests, and build\n"
	@printf "  make audio       Regenerate WAV assets\n"
	@printf "  make clean       Remove build output\n"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

test:
	npm test

test-run:
	npm run test:run

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

format-fix:
	npm run format:fix

ci:
	npm run ci

audio:
	npm run generate:audio

clean:
	rm -rf dist
