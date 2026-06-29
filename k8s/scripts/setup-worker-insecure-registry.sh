#!/usr/bin/env bash
# Configure containerd sur les nœuds workers pour pull HTTP depuis Nexus (10.1.1.4:8082).
# Idempotent : peut être exécuté à chaque déploiement pipeline.
#
# Usage:
#   K8S_WORKER_IPS="10.1.3.4 10.1.3.5" ./k8s/scripts/setup-worker-insecure-registry.sh
#   ./k8s/scripts/setup-worker-insecure-registry.sh 10.1.3.4 10.1.3.5
set -euo pipefail

REGISTRY="${K8S_REGISTRY:-10.1.1.4:8082}"
SSH_USER="${K8S_NODE_SSH_USER:-azureuser}"
SSH_KEY="${K8S_NODE_SSH_KEY:-}"
SSH_OPTS=(-o StrictHostKeyChecking=no -o ConnectTimeout=15 -o BatchMode=yes)
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

if [[ $# -ge 1 ]]; then
  WORKERS=("$@")
elif [[ -n "${K8S_WORKER_IPS:-}" ]]; then
  read -ra WORKERS <<< "$K8S_WORKER_IPS"
else
  echo "Usage: K8S_WORKER_IPS=\"10.1.3.4 10.1.3.5\" $0" >&2
  echo "   ou: $0 <worker-ip> [worker-ip...]" >&2
  exit 1
fi

REMOTE_SCRIPT=$(cat <<'EOF'
set -euo pipefail
REGISTRY="$1"
HOSTS_FILE="/etc/containerd/certs.d/${REGISTRY}/hosts.toml"
EXPECTED=$(cat <<TOML
server = "http://${REGISTRY}"

[host."http://${REGISTRY}"]
  capabilities = ["pull", "resolve", "push"]
  skip_verify = true
TOML
)

if [[ -f "$HOSTS_FILE" ]] && diff -q <(printf '%s\n' "$EXPECTED") "$HOSTS_FILE" >/dev/null 2>&1; then
  echo "OK: déjà configuré pour ${REGISTRY}"
  exit 0
fi

sudo mkdir -p "/etc/containerd/certs.d/${REGISTRY}"
printf '%s\n' "$EXPECTED" | sudo tee "$HOSTS_FILE" > /dev/null
sudo systemctl restart containerd
echo "OK: containerd configuré pour ${REGISTRY}"
EOF
)

for NODE_IP in "${WORKERS[@]}"; do
  echo "==> Configuration nœud ${NODE_IP}"
  if ! ssh "${SSH_OPTS[@]}" "${SSH_USER}@${NODE_IP}" "bash -s" -- "$REGISTRY" <<< "$REMOTE_SCRIPT"; then
    echo "##[error]Échec SSH vers ${NODE_IP} (${SSH_USER}). Vérifiez la clé SSH de l'agent vers les workers." >&2
    exit 1
  fi
done

echo "Terminé — registre ${REGISTRY} prêt sur ${#WORKERS[@]} nœud(s)."
