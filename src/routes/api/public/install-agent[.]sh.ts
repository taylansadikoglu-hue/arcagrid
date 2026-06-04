import { createFileRoute } from "@tanstack/react-router";

const SCRIPT = `#!/bin/bash
# install-agent.sh - Universal ArcaGrid Deployer & Self-Healer

WORKSPACE_DIR="/workspace"
mkdir -p $WORKSPACE_DIR/btx
mkdir -p $WORKSPACE_DIR/.btx

# 1. DYNAMIC NAMING CONVENTION GENERATION
GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits | head -n 1 | tr -d ' ' | tr -d 'NVIDIA' | cut -d'-' -f1)
SHORT_ID=$(cat /proc/sys/kernel/random/uuid | cut -c1-4)
if [ -d "/lib/modules" ] && grep -q "clore" /proc/version 2>/dev/null; then
    PROVIDER="Clore"
else
    PROVIDER="Vast"
fi
NODE_ID="\${PROVIDER}-\${GPU_NAME:-GPU}-\${SHORT_ID}"
echo "=> Generated Node Identity: $NODE_ID"

# 2. AUTO-INSTALL DOCKER IF MISSING
if ! command -v docker &> /dev/null; then
  echo "=> Docker engine missing. Installing native ubuntu package..."
  apt-get update && apt-get install -y docker.io
  systemctl start docker && systemctl enable docker
fi

# 3. FAST-SYNC BOOTSTRAP FROM CLOUDFLARE R2
echo "=> Syncing 61.35 GB blockchain bootstrap from Cloudflare R2..."
curl -L -s "https://pub-cdb2783aacb641278a1d8984b37a1589.r2.dev/btx-bootstrap.tar.gz" | tar -xz -C $WORKSPACE_DIR/.btx/

# 4. FETCH LIVE PEER MAP FROM HETZNER SEED
echo "=> Fetching fresh network peer map cache..."
curl -s http://37.27.0.36/network/live-peer-cache.txt > $WORKSPACE_DIR/.btx/peers.dat

# 5. PULL FAT-BINARY CONTAINER LAYERS
echo "=> Pulling multi-architecture cross-compiled container image..."
docker pull taylans/btx-oneclick-miner:latest

# 6. WRITE INTEGRATED WATCHDOG & TUNING DAEMON
cat << 'WATCHDOG_EOF' > $WORKSPACE_DIR/btx/arca-watchdog.sh
#!/bin/bash
NODE_ID=$1
HETZNER_API="http://37.27.0.36/api"
while true; do
  TUNE_PARAMS=$(curl -s "$HETZNER_API/tune.php?node_id=$NODE_ID")
  POWER_LIMIT=$(echo "$TUNE_PARAMS" | grep -o '"power_cap":[0-9]*' | awk -F: '{print $2}')
  if [ ! -z "$POWER_LIMIT" ] && [ "$POWER_LIMIT" -ne 0 ]; then
    nvidia-smi -pm 1 >/dev/null 2>&1
    nvidia-smi -pl "$POWER_LIMIT" >/dev/null 2>&1
  fi
  if ! docker ps | grep -q "btx-miner-engine"; then
    echo "=> Target engine fault detected. Purging lock states and reviving..."
    docker rm -f btx-miner-engine >/dev/null 2>&1
    rm -f /workspace/.btx/.lock
    docker run -d --name btx-miner-engine \\
      --gpus all \\
      --restart unless-stopped \\
      -v /workspace/.btx:/workspace/.btx \\
      taylans/btx-oneclick-miner:latest
    STATUS="Auto-Recovered"
  else
    STATUS="Protected"
  fi
  GPU_INFO=$(nvidia-smi --query-gpu=temperature.gpu,power.draw,utilization.gpu --format=csv,noheader,nounits 2>/dev/null || echo "0, 0, 0")
  TEMP=$(echo "$GPU_INFO" | awk -F', ' '{print $1}')
  POWER=$(echo "$GPU_INFO" | awk -F', ' '{print $2}')
  UTIL=$(echo "$GPU_INFO" | awk -F', ' '{print $3}')
  BLOCK=$(docker exec btx-miner-engine btx-cli -datadir=/workspace/.btx getblockcount 2>/dev/null || echo 0)
  PAYLOAD="{\\"node_id\\":\\"$NODE_ID\\",\\"status\\":\\"$STATUS\\",\\"temp\\":$TEMP,\\"power\\":$POWER,\\"util\\":$UTIL,\\"block\\":$BLOCK,\\"last_seen\\":$(date +%s)}"
  curl -s -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$HETZNER_API/telemetry.php"
  sleep 10
done
WATCHDOG_EOF

# 7. KICK OFF BACKGROUND PROCESS EXECUTION LOOP
chmod +x $WORKSPACE_DIR/btx/arca-watchdog.sh
nohup bash $WORKSPACE_DIR/btx/arca-watchdog.sh "$NODE_ID" > /dev/null 2>&1 &
echo "=> ArcaGrid Orchestrator running flawlessly under Node ID: $NODE_ID"
`;

export const Route = createFileRoute("/api/public/install-agent.sh")({
  server: {
    handlers: {
      GET: async () =>
        new Response(SCRIPT, {
          status: 200,
          headers: {
            "Content-Type": "text/x-shellscript; charset=utf-8",
            "Cache-Control": "public, max-age=60",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});