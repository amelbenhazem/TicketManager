#!/usr/bin/env bash
# Met à jour CORS_ORIGIN du backend pour HTTPS Ingress + accès NodePort interne.
# Usage sur vm-gestion :
#   export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
#   K8S_WORKER_PUBLIC_IP=102.141.206.164 ./k8s/fix-cors-public.sh
set -euo pipefail

: "${KUBECONFIG:?KUBECONFIG requis}"
PUBLIC_IP="${K8S_WORKER_PUBLIC_IP:?K8S_WORKER_PUBLIC_IP requis (ex. 102.141.206.164)}"
HTTPS_PORT="${K8S_INGRESS_HTTPS_PORT:-30443}"
APP_HOST="${K8S_APP_HOST:-app.ticketmanager.local}"
APP_URL="${K8S_APP_URL:-https://${APP_HOST}:${HTTPS_PORT}}"

CORS="${APP_URL},http://${PUBLIC_IP}:30080,http://10.1.3.4:30080,http://10.1.3.5:30080"

JWT="$(kubectl get secret backend-secret -n ticketmanager -o jsonpath='{.data.JWT_SECRET}' | base64 -d)"
MONGO="$(kubectl get secret backend-secret -n ticketmanager -o jsonpath='{.data.MONGODB_URI}' | base64 -d)"

kubectl create secret generic backend-secret \
  -n ticketmanager \
  --from-literal=MONGODB_URI="$MONGO" \
  --from-literal=JWT_SECRET="$JWT" \
  --from-literal=JWT_EXPIRES_IN="7d" \
  --from-literal=NODE_ENV="production" \
  --from-literal=PORT="3001" \
  --from-literal=CORS_ORIGIN="$CORS" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/ticket-backend -n ticketmanager
kubectl rollout status deployment/ticket-backend -n ticketmanager --timeout=120s

echo "CORS_ORIGIN mis à jour : $CORS"
