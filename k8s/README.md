# Déploiement TicketManager sur Kubernetes (AKS Engine / Azure Stack Hub)

Manifests pour le namespace `ticketmanager` : backend NestJS, frontend Next.js, **MongoDB in-cluster** (StatefulSet).

> **vm-db** (`10.1.2.4`) + Ansible `mongodb.yml` restent optionnels (legacy). L'application utilise désormais `mongodb://mongodb:27017/ticketmanager` dans le cluster.

## Prérequis

- `kubectl` configuré (`KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json`)
- Cluster Ready, Nexus sur vm-gestion (`10.1.1.4:8082`)
- Images : `ticket-backend:latest`, `ticket-frontend:latest`

## 1. Registre insecure sur les nœuds workers

Les agents doivent pull depuis `10.1.1.4:8082` (HTTP). **Automatisé** par le pipeline (`Configure insecure registry on K8s workers`) via `k8s/scripts/setup-worker-insecure-registry.sh`.

Prérequis : l'agent Azure DevOps sur vm-gestion doit pouvoir `ssh azureuser@10.1.3.4` (et `.5`) avec la clé privée du cluster AKS Engine.

Configuration manuelle (dépannage) :

```bash
# Exemple containerd — adapter si votre cluster utilise une autre config
sudo mkdir -p /etc/containerd/certs.d/10.1.1.4:8082
sudo tee /etc/containerd/certs.d/10.1.1.4:8082/hosts.toml <<'EOF'
server = "http://10.1.1.4:8082"
[host."http://10.1.1.4:8082"]
  capabilities = ["pull", "resolve", "push"]
  skip_verify = true
EOF
sudo systemctl restart containerd
```

Alternative rapide (test) : configurer `insecure-registries` dans `/etc/docker/daemon.json` si les nœuds utilisent Docker (peu probable avec containerd).

## 2. Frontend — URL API (important)

`NEXT_PUBLIC_API_URL` est **figée au build** Docker. L'image `latest` du pipeline utilise `http://localhost:3001` par défaut.

Pour accès via NodePort depuis un navigateur, **reconstruire et pousser** le frontend :

```bash
# Sur vm-gestion — adapter l'IP d'un worker si besoin
export API_URL=http://10.1.3.4:30081
docker build --build-arg NEXT_PUBLIC_API_URL=$API_URL -t ticket-frontend:k8s ./frontend
docker tag ticket-frontend:k8s localhost:8082/docker-ticketmanager/ticket-frontend:k8s
docker push localhost:8082/docker-ticketmanager/ticket-frontend:k8s
```

Puis dans `frontend-deployment.yaml`, remplacer l'image par `.../ticket-frontend:k8s` ou mettre à jour le tag `latest` après push.

Mettre à jour `CORS_ORIGIN` dans le secret backend avec l'URL du frontend (ex. `https://app.ticketmanager.local:30443`).

## 2b. HTTPS (Ingress NGINX + TLS)

L'accès public utilise **HTTPS** via NGINX Ingress :

| Service  | URL HTTPS (navigateur)                    | NodePort interne (legacy) |
|----------|-------------------------------------------|---------------------------|
| Frontend | `https://app.ticketmanager.local:30443`   | `http://10.1.3.4:30080`   |
| Backend  | `https://api.ticketmanager.local:30443`   | `http://10.1.3.4:30081`   |

### Première installation Ingress + certificat

```bash
export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
chmod +x k8s/scripts/*.sh
export K8S_WORKER_PUBLIC_IP=102.141.206.164   # PIP worker
./k8s/scripts/setup-ingress-nginx.sh          # installe ingress-nginx + NodePort 30443
./k8s/scripts/ensure-tls-secret.sh            # certificat auto-signé → secret ticketmanager-tls
kubectl apply -f k8s/ingress.yaml
```

### Fichier hosts (poste client)

Ajouter sur votre PC (remplacer par la PIP worker) :

```
102.141.206.164  app.ticketmanager.local
102.141.206.164  api.ticketmanager.local
```

### NSG Azure Stack Hub

Ouvrir **TCP 30443** entrant sur le NSG du cluster (`k8s-master-34739636-nsg`).
Les ports 30080/30081 restent utiles pour les tests internes VNet.

### Certificat auto-signé

Le navigateur affichera un avertissement sécurité — normal en lab.
Pour regénérer : `FORCE_TLS_REGEN=1 ./k8s/scripts/ensure-tls-secret.sh`

## 3. Secrets Kubernetes

```bash
kubectl create namespace ticketmanager --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry nexus-registry \
  -n ticketmanager \
  --docker-server=10.1.1.4:8082 \
  --docker-username=admin \
  --docker-password='VOTRE_MOT_DE_PASSE' \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic backend-secret \
  -n ticketmanager \
  --from-literal=MONGODB_URI='mongodb://mongodb:27017/ticketmanager' \
  --from-literal=JWT_SECRET='change-me-production-secret' \
  --from-literal=JWT_EXPIRES_IN='7d' \
  --from-literal=NODE_ENV='production' \
  --from-literal=PORT='3001' \
  --from-literal=CORS_ORIGIN='https://app.ticketmanager.local:30443,http://10.1.3.4:30080,http://10.1.3.5:30080' \
  --dry-run=client -o yaml | kubectl apply -f -
```

Les fichiers `*.yaml.example` servent de modèle ; ne commitez pas les secrets réels.

## 4. MongoDB in-cluster (StatefulSet)

```bash
kubectl apply -f k8s/mongodb-service.yaml
kubectl apply -f k8s/mongodb-statefulset.yaml
kubectl wait --for=condition=ready pod -l app=mongodb -n ticketmanager --timeout=300s
kubectl get pvc -n ticketmanager
```

Si le PVC `mongodb-data-mongodb-0` reste **Pending** (pas de StorageClass dynamique) :

```bash
# Sur le worker k8s-agentpool-34739636-1
sudo mkdir -p /var/lib/ticketmanager/mongodb && sudo chown 999:999 /var/lib/ticketmanager/mongodb
kubectl apply -f k8s/mongodb-pv-hostpath.yaml
```

### Migration depuis vm-db (données existantes)

```bash
chmod +x k8s/migrate-mongodb-from-vm-db.sh
export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
./k8s/migrate-mongodb-from-vm-db.sh
```

## 5. Déployer

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongodb-service.yaml
kubectl apply -f k8s/mongodb-statefulset.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

kubectl get pods -n ticketmanager -w
kubectl get svc -n ticketmanager
```

## 6. Accès application

| Service  | HTTPS (public)                              | NodePort interne (VNet) |
|----------|---------------------------------------------|-------------------------|
| Frontend | `https://app.ticketmanager.local:30443`     | http://10.1.3.4:30080   |
| Backend  | `https://api.ticketmanager.local:30443`     | http://10.1.3.4:30081   |

### Accès Internet (HTTPS Ingress + PIP worker)

1. Créer une **Adresse IP publique** dans `ticketmanager-k8s-rg` et l'associer à la NIC du worker `10.1.3.4`.
2. Ouvrir **NSG** `k8s-master-34739636-nsg` : TCP **30443** (HTTPS Ingress). Optionnel : 30080/30081 (legacy HTTP).
3. Mettre l'IP dans `azure-pipelines.yml` → variable **`K8S_WORKER_PUBLIC_IP`**.
4. Fichier **hosts** sur le poste client : `app.ticketmanager.local` et `api.ticketmanager.local` → PIP worker.
5. Push sur `main` → pipeline rebuild frontend (`FRONTEND_API_URL=https://api...`) + deploy Ingress/TLS + CORS.
6. Navigateur : `https://app.ticketmanager.local:30443` (accepter le certificat auto-signé).

Depuis le réseau interne / VPN. Seed MongoDB si base vide : automatique via `post-deploy.sh` (pipeline) ou `npm run seed` avec port-forward.

**Démarrage quotidien** : allumer les **workers K8s** suffit pour l'app (plus besoin de vm-db). vm-gestion reste nécessaire pour le pipeline et le monitoring.

## 7. Dépannage

```bash
kubectl describe pod -n ticketmanager -l app=ticket-backend
kubectl logs -n ticketmanager -l app=ticket-backend --tail=100
kubectl logs -n ticketmanager -l app=ticket-frontend --tail=100
```

| Symptôme | Cause probable |
|----------|----------------|
| Login 500 / timeout | MongoDB pod down ou PVC Pending — `kubectl get pods -n ticketmanager -l app=mongodb` |
| `ImagePullBackOff` | Registre insecure non configuré sur nœuds ou secret `nexus-registry` |
| `ErrImagePull` | Mauvais tag ou Nexus injoignable depuis worker |
| Frontend OK, API en échec | `NEXT_PUBLIC_API_URL` incorrecte au build |
| CORS error | Ajuster `CORS_ORIGIN` dans `backend-secret` |

## Fichiers

| Fichier | Rôle |
|---------|------|
| `namespace.yaml` | Namespace ticketmanager |
| `mongodb-service.yaml` | Service ClusterIP MongoDB (`mongodb:27017`) |
| `mongodb-statefulset.yaml` | StatefulSet MongoDB + PVC |
| `mongodb-pv-hostpath.yaml` | PV hostPath optionnel (Stack Hub sans StorageClass) |
| `migrate-mongodb-from-vm-db.sh` | Migration données vm-db → pod K8s |
| `backend-deployment.yaml` | Pod API NestJS |
| `backend-service.yaml` | NodePort 30081 |
| `frontend-deployment.yaml` | Pod Next.js |
| `frontend-service.yaml` | NodePort 30080 (legacy interne) |
| `ingress.yaml` | Ingress HTTPS app.* / api.* |
| `ingress-nginx-service.yaml` | NodePort 30443/30480 pour ingress-nginx |
| `scripts/setup-ingress-nginx.sh` | Installation NGINX Ingress Controller |
| `scripts/ensure-tls-secret.sh` | Secret TLS auto-signé |
| `scripts/generate-tls-cert.sh` | Génération certificat OpenSSL |
| `deploy-pipeline.sh` | CD automatisé (Azure Pipelines) |
| `reload-prod.sh` | Recharge prod manuelle (CORS + rollout pods) |
| `fix-cors-public.sh` | Mise à jour CORS backend uniquement |
| `deploy.sh` | Déploiement manuel local |
| `*-secret.yaml.example` | Modèles secrets |

## CD automatisé (Azure Pipelines)

Le stage **Deploy to Kubernetes** (`DeployK8s`) s'exécute sur `main` après **Push to Nexus**, avec approbation manuelle.

Flux : Build → SonarQube → Docker → Push Nexus → **Deploy K8s** (en parallèle possible avec Terraform).

### Variables à configurer dans Azure DevOps (Library)

| Variable | Secret | Description |
|----------|--------|-------------|
| `NEXUS_USER` | non | Utilisateur Nexus |
| `NEXUS_PASSWORD` | **oui** | Mot de passe Nexus |
| `JWT_SECRET` | **oui** | Secret JWT backend |
| `SONAR_TOKEN` | oui | (existant) |
| `TF_APPROVERS` | non | Emails approbation Terraform + K8s |

Variables déjà dans `azure-pipelines.yml` : `K8S_REGISTRY`, `K8S_KUBECONFIG`, `K8S_MONGODB_URI`, `K8S_CORS_ORIGIN`, `K8S_WORKER_IPS`, `K8S_WORKER_PUBLIC_IP`, `K8S_NODE_HOSTNAME`, `K8S_APP_HOST`, `K8S_API_HOST`, `K8S_APP_URL`, `K8S_API_URL`, `K8S_INGRESS_HTTPS_PORT`, `FRONTEND_API_URL`.

### Reload prod automatique (pipeline)

Chaque **Deploy K8s** :
- utilise le tag image **`$(Build.BuildId)`** (plus `latest` seul) → rollout garanti ;
- applique **nodeSelector** `k8s-agentpool-34739636-1` (worker avec PIP) ;
- **rollout restart** backend + frontend (CORS + nouvelle image).

### Reload prod manuel (vm-gestion)

```bash
export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
chmod +x k8s/reload-prod.sh
K8S_WORKER_PUBLIC_IP=102.141.206.164 IMAGE_TAG=latest ./k8s/reload-prod.sh
```

Remplacer `IMAGE_TAG` par le numéro de build Azure DevOps si besoin.

### Première exécution

1. Ajouter `JWT_SECRET` dans les variables du pipeline.
2. Vérifier que l'agent (`vm-gestion`) peut SSH vers les workers (`K8S_WORKER_IPS`) sans mot de passe.
3. Push sur `main` → approuver le stage **Deploy to Kubernetes** (le pipeline configure automatiquement le registre insecure sur les workers).
4. Vérifier : `kubectl get pods -n ticketmanager` sur vm-gestion.
