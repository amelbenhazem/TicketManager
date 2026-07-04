#!/usr/bin/env bash
# Seed MongoDB (idempotent) + smoke tests NodePort après rollout K8s.
# Variables : K8S_MONGODB_URI, K8S_NODE_IP, K8S_WORKER_PUBLIC_IP (optionnel), NPM_CACHE_FOLDER
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NPM_CACHE="${NPM_CACHE_FOLDER:-/home/azureuser/.cache/ticketmanager-npm}"

: "${K8S_MONGODB_URI:?K8S_MONGODB_URI requis}"
: "${K8S_NODE_IP:?K8S_NODE_IP requis (ex. 10.1.3.4)}"

FRONTEND_URL="http://${K8S_NODE_IP}:30080"
BACKEND_URL="http://${K8S_NODE_IP}:30081"

PUBLIC_IP="${K8S_WORKER_PUBLIC_IP:-}"
if [[ "$PUBLIC_IP" == "PUT_WORKER_PIP_HERE" || -z "$PUBLIC_IP" ]]; then
  PUBLIC_IP=""
fi

echo "==> Seed MongoDB (upsert users, tickets si collection vide)"
mkdir -p "$NPM_CACHE"
cd "$ROOT/backend"
npm ci --cache "$NPM_CACHE" --prefer-offline

SEED_URI="$K8S_MONGODB_URI"
PF_PID=""
cleanup_port_forward() {
  if [[ -n "$PF_PID" ]]; then
    kill "$PF_PID" 2>/dev/null || true
    wait "$PF_PID" 2>/dev/null || true
  fi
}
trap cleanup_port_forward EXIT

# Depuis vm-gestion, le DNS K8s "mongodb" n'est pas résolu — port-forward local
if [[ "$SEED_URI" == mongodb://mongodb:* ]]; then
  kubectl wait --for=condition=ready pod -l app=mongodb -n ticketmanager --timeout=120s
  kubectl port-forward -n ticketmanager --address 127.0.0.1 svc/mongodb 27017:27017 &
  PF_PID=$!
  sleep 3
  SEED_URI="mongodb://127.0.0.1:27017/ticketmanager"
fi

MONGODB_URI="$SEED_URI" npm run seed
cleanup_port_forward
trap - EXIT

echo "==> Smoke test: backend NodePort ${BACKEND_URL}"
curl -sf "${BACKEND_URL}/" | grep -q "Hello World"

echo "==> Smoke test: frontend NodePort ${FRONTEND_URL}"
frontend_code="$(curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/")"
if [[ "$frontend_code" != "200" && "$frontend_code" != "307" ]]; then
  echo "##[error]Frontend NodePort attendu 200/307, obtenu: ${frontend_code}" >&2
  exit 1
fi
echo "Frontend HTTP ${frontend_code}"

echo "==> Smoke test: POST /auth/login"
login_response="$(curl -sf -X POST "${BACKEND_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -d '{"email":"admin@rfc.com","password":"Admin123!"}')"
if ! echo "$login_response" | grep -q "access_token"; then
  echo "##[error]Login smoke test échoué: ${login_response}" >&2
  exit 1
fi
echo "Login OK (access_token reçu)"

if [[ -n "$PUBLIC_IP" ]]; then
  PUBLIC_FRONTEND="http://${PUBLIC_IP}:30080"
  PUBLIC_BACKEND="http://${PUBLIC_IP}:30081"
  echo "==> Smoke test (accès public): frontend ${PUBLIC_FRONTEND}"
  public_frontend_code="$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${PUBLIC_FRONTEND}/")"
  if [[ "$public_frontend_code" != "200" && "$public_frontend_code" != "307" ]]; then
    echo "##[warning]Frontend via PIP attendu 200/307, obtenu: ${public_frontend_code} (NSG ou PIP worker ?)" >&2
  else
    echo "Frontend public HTTP ${public_frontend_code}"
  fi

  echo "==> Smoke test (accès public): backend ${PUBLIC_BACKEND}"
  if curl -sf --connect-timeout 10 "${PUBLIC_BACKEND}/" | grep -q "Hello World"; then
    echo "Backend public OK"
  else
    echo "##[warning]Backend via PIP inaccessible (vérifier NSG aks ports 30080/30081)" >&2
  fi
fi

echo ""
echo "==> Post-deploy verification OK"
echo "    Frontend (interne): ${FRONTEND_URL}"
echo "    Backend  (interne): ${BACKEND_URL}"
if [[ -n "$PUBLIC_IP" ]]; then
  echo "    Frontend (public):  http://${PUBLIC_IP}:30080"
  echo "    Backend  (public):  http://${PUBLIC_IP}:30081"
fi
