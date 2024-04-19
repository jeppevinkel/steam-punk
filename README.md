# Setup
This is an example docker compose setup.
```yaml
version: "3.2"
services:
  steam-punk:
    image: ghcr.io/jeppevinkel/steam-punk:latest
    restart: always
    environment:
      - DISCORD_TOKEN=<discord_bot_token>
      - DISCORD_CLIENT_ID=<discord_client_id>
      - STEAM_API_KEY=<steam_api_key>
    volumes:
      - /local/path:/steampunk/data
```