docker run --name developer-document -p 8064:8061 -d --restart=always --env-file ./server/.env -e DB_HOST=host.docker.internal ghcr.io/kne-union/developer-document
