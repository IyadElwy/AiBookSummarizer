FROM debian:12.10 AS base

RUN apt update && apt upgrade -y \
    && apt install -y git


FROM base AS frontend
RUN apt install -y curl build-essential


RUN curl -o- \
    https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh \
    | bash && export NVM_DIR="$HOME/.nvm" && \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" && \
    nvm install 22
WORKDIR /app
COPY frontend/package*.json ./
RUN export NVM_DIR="$HOME/.nvm" && \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    npm install

COPY frontend/ ./
RUN export NVM_DIR="$HOME/.nvm" && \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    npm run build

EXPOSE 3000
CMD ["bash", "-c", "export NVM_DIR=\"$HOME/.nvm\" && [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\" && npm start"]


FROM python:3.11-slim AS backend-base
RUN apt update && apt upgrade -y && \
    apt install -y build-essential

WORKDIR /app
COPY backend/ ./
RUN pip install -e .


# Main server stage
FROM backend-base AS main-server
EXPOSE 8000
CMD ["python", "services/main_server/run.py"]

# Scraper worker stage
FROM backend-base AS scraper-worker
COPY backend/services/scraper_worker/health_check.sh /app/health_check.sh
RUN chmod +x /app/health_check.sh
CMD ["python", "services/scraper_worker/main.py"]

# Summary worker stage
FROM backend-base AS summary-worker
COPY backend/services/summary_worker/health_check.sh /app/health_check.sh
RUN chmod +x /app/health_check.sh
CMD ["python", "services/summary_worker/main.py"]

FROM base AS dev-container

RUN apt install -y curl build-essential \
    python3-dev libmagic1 postgresql-client && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    . $HOME/.local/bin/env && \
    uv python install 3.11 --default --preview


RUN curl -o- \
    https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh \
    | bash && export NVM_DIR="$HOME/.nvm" && \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && \
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" && \
    nvm install 22


WORKDIR /app