
.PHONY: all build run dev
all: build

dev: build run

build:
	docker build -t livepeer/monitoring:dev -f Dockerfile .

run:
	docker run -p 3000:3000 -p 9090:9090 livepeer/monitoring:dev
