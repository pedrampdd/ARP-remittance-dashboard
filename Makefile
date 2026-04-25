.PHONY: install dev stop

install:
	cd backend && npm install
	cd frontend && npm install

dev: install
	@trap 'kill 0' SIGINT; \
	cd backend && npm start & \
	cd frontend && npm run dev & \
	wait

stop:
	@pkill -f "node src/index.js" 2>/dev/null || true
	@pkill -f "vite" 2>/dev/null || true
