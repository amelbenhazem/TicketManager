#!/usr/bin/env bash
# Migration optionnelle : copie les données MongoDB depuis vm-db (10.1.2.4) vers le pod K8s.
# Usage sur vm-gestion (vm-db doit être accessible) :
#   chmod +x k8s/migrate-mongodb-from-vm-db.sh
#   export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
#   ./k8s/migrate-mongodb-from-vm-db.sh
set -euo pipefail

SOURCE_URI="${SOURCE_MONGODB_URI:-mongodb://10.1.2.4:27017/ticketmanager}"
NAMESPACE="${NAMESPACE:-ticketmanager}"
DUMP_DIR="${DUMP_DIR:-/tmp/ticketmanager-mongo-migrate}"

export KUBECONFIG="${KUBECONFIG:-$HOME/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json}"

echo "==> Attente pod MongoDB K8s"
kubectl wait --for=condition=ready pod -l app=mongodb -n "$NAMESPACE" --timeout=300s

echo "==> Dump depuis vm-db : $SOURCE_URI"
rm -rf "$DUMP_DIR"
mkdir -p "$DUMP_DIR"
chmod 777 "$DUMP_DIR"
docker run --rm --user root \
  -v "$DUMP_DIR:/dump" \
  mongo:8 \
  mongodump --uri="$SOURCE_URI" --out=/dump
chmod -R a+rX "$DUMP_DIR"

echo "==> Restore vers pod mongodb-0"
kubectl cp "$DUMP_DIR/ticketmanager" "$NAMESPACE/mongodb-0:/tmp/ticketmanager-restore"
kubectl exec -n "$NAMESPACE" mongodb-0 -- \
  mongorestore --drop --db ticketmanager /tmp/ticketmanager-restore
kubectl exec -n "$NAMESPACE" mongodb-0 -- rm -rf /tmp/ticketmanager-restore

rm -rf "$DUMP_DIR"
echo "==> Migration terminée"
