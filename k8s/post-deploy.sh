#!/usr/bin/env bash
# Seed MongoDB (idempotent) + smoke tests NodePort / HTTPS Ingress après rollout K8s.
# Variables : K8S_MONGODB_URI, K8S_NODE_IP, K8S_WORKER_PUBLIC_IP (optionnel),
#   K8S_APP_HOST, K8S_API_HOST, K8S_INGRESS_HTTPS_PORT, K8S_APP_URL, NPM_CACHE_FOLDER
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NPM_CACHE="${NPM_CACHE_FOLDER:-/home/azureuser/.cache/ticketmanager-npm}"

: "${K8S_MONGODB_URI:?K8S_MONGODB_URI requis}"
: "${K8S_NODE_IP:?K8S_NODE_IP requis (ex. 10.1.3.4)}"

APP_HOST="${K8S_APP_HOST:-app.ticketmanager.local}"
API_HOST="${K8S_API_HOST:-api.ticketmanager.local}"
HTTPS_PORT="${K8S_INGRESS_HTTPS_PORT:-30443}"
APP_URL="${K8S_APP_URL:-https://${APP_HOST}:${HTTPS_PORT}}"
API_URL="${K8S_API_URL:-https://${API_HOST}:${HTTPS_PORT}}"

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

echo "==> Smoke test: POST /auth/login (NodePort)"
login_response="$(curl -sf -X POST "${BACKEND_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: ${FRONTEND_URL}" \
  -d '{"email":"admin@rfc.com","password":"Admin123!"}')"
if ! echo "$login_response" | grep -q "access_token"; then
  echo "##[error]Login smoke test échoué: ${login_response}" >&2
  exit 1
fi
echo "Login OK (access_token reçu)"

echo "==> Smoke test: HTTPS Ingress ${APP_URL}"
if curl -sk --connect-timeout 10 --resolve "${APP_HOST}:${HTTPS_PORT}:${K8S_NODE_IP}" \
  "https://${APP_HOST}:${HTTPS_PORT}/" -o /dev/null -w "%{http_code}" | grep -qE '200|307'; then
  echo "Frontend HTTPS OK"
else
  echo "##[warning]Frontend HTTPS inaccessible (Ingress / TLS / NSG ${HTTPS_PORT} ?)" >&2
fi

echo "==> Smoke test: POST /auth/login (HTTPS Ingress)"
https_login="$(curl -sk --connect-timeout 10 \
  --resolve "${API_HOST}:${HTTPS_PORT}:${K8S_NODE_IP}" \
  -X POST "https://${API_HOST}:${HTTPS_PORT}/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: ${APP_URL}" \
  -d '{"email":"admin@rfc.com","password":"Admin123!"}')"
if echo "$https_login" | grep -q "access_token"; then
  echo "Login HTTPS OK"
else
  echo "##[warning]Login HTTPS échoué: ${https_login}" >&2
fi

if [[ -n "$PUBLIC_IP" ]]; then
  PUBLIC_FRONTEND="http://${PUBLIC_IP}:30080"
  PUBLIC_BACKEND="http://${PUBLIC_IP}:30081"
  echo "==> Smoke test (accès public HTTP): frontend ${PUBLIC_FRONTEND}"
  public_frontend_code="$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${PUBLIC_FRONTEND}/")"
  if [[ "$public_frontend_code" != "200" && "$public_frontend_code" != "307" ]]; then
    echo "##[warning]Frontend via PIP attendu 200/307, obtenu: ${public_frontend_code} (NSG ou PIP worker ?)" >&2
  else
    echo "Frontend public HTTP ${public_frontend_code}"
  fi

  echo "==> Smoke test (accès public HTTPS): ${APP_URL}"
  public_https_code="$(curl -sk --connect-timeout 10 \
    --resolve "${APP_HOST}:${HTTPS_PORT}:${PUBLIC_IP}" \
    -o /dev/null -w "%{http_code}" "https://${APP_HOST}:${HTTPS_PORT}/")"
  if [[ "$public_https_code" != "200" && "$public_https_code" != "307" ]]; then
    echo "##[warning]Frontend HTTPS public attendu 200/307, obtenu: ${public_https_code} (NSG port ${HTTPS_PORT} ?)" >&2
  else
    echo "Frontend public HTTPS ${public_https_code}"
  fi

  echo "==> Smoke test (accès public HTTP): backend ${PUBLIC_BACKEND}"
  if curl -sf --connect-timeout 10 "${PUBLIC_BACKEND}/" | grep -q "Hello World"; then
    echo "Backend public OK"
  else
    echo "##[warning]Backend via PIP inaccessible (vérifier NSG aks ports 30080/30081)" >&2
  fi
fi

echo ""
echo "==> Post-deploy verification OK"
echo "    Frontend (HTTPS):   ${APP_URL}"
echo "    Backend  (HTTPS):   ${API_URL}"
echo "    Frontend (interne): ${FRONTEND_URL}"
echo "    Backend  (interne): ${BACKEND_URL}"
if [[ -n "$PUBLIC_IP" ]]; then
  echo "    Frontend (public):  ${APP_URL}  (hosts: ${APP_HOST} → ${PUBLIC_IP})"
  echo "    Backend  (public):  ${API_URL}  (hosts: ${API_HOST} → ${PUBLIC_IP})"
fi
