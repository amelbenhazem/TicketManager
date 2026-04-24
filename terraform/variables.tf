# =============================================================================
# TicketManager — variables Terraform (Azure / déploiement applicatif)
# =============================================================================

variable "location" {
  description = "Région Azure pour les ressources (ex. westeurope, francecentral)."
  type        = string
  default     = "westeurope"
}

variable "environment" {
  description = "Nom d'environnement (dev, staging, prod). Sert au nommage et aux tags."
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.environment))
    error_message = "environment doit être en minuscules, chiffres ou tirets uniquement."
  }
}

variable "project_name" {
  description = "Préfixe court pour les noms de ressources Azure (ex. ticketmanager)."
  type        = string
  default     = "ticketmanager"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.project_name))
    error_message = "project_name doit commencer par une lettre et rester court (lettres minuscules, chiffres, tirets)."
  }
}

variable "tags" {
  description = "Tags communs appliqués aux ressources."
  type        = map(string)
  default     = {}
}

# -----------------------------------------------------------------------------
# Groupe de ressources (créé par Terraform ou référencé selon votre main.tf)
# -----------------------------------------------------------------------------

variable "resource_group_name" {
  description = "Nom du groupe de ressources Azure."
  type        = string
}

# -----------------------------------------------------------------------------
# Secrets / configuration applicative (alignés sur backend/.env.example)
# -----------------------------------------------------------------------------

variable "mongodb_uri" {
  description = "URI MongoDB complète (Cosmos API MongoDB, Atlas, ou VM). Ne jamais commiter la valeur réelle : utiliser TF_VAR_mongodb_uri ou un backend secrets."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Clé secrète JWT pour le backend NestJS."
  type        = string
  sensitive   = true
}

variable "jwt_expires_in" {
  description = "Durée de validité des JWT (ex. 7d)."
  type        = string
  default     = "7d"
}

variable "cors_origin" {
  description = "Origines CORS autorisées pour le backend, séparées par des virgules si plusieurs."
  type        = string
}

variable "next_public_api_url" {
  description = "URL publique de l'API telle qu'exposée au navigateur (NEXT_PUBLIC_API_URL pour le build Next.js)."
  type        = string
}

variable "cloudinary_cloud_name" {
  description = "Nom du cloud Cloudinary (optionnel)."
  type        = string
  default     = ""
}

variable "cloudinary_api_key" {
  description = "Clé API Cloudinary (optionnel)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "cloudinary_api_secret" {
  description = "Secret API Cloudinary (optionnel)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "node_env" {
  description = "NODE_ENV pour les conteneurs / App Service (development, production)."
  type        = string
  default     = "production"
}

variable "backend_port" {
  description = "Port d'écoute du backend (aligné sur docker-compose : 3001)."
  type        = number
  default     = 3001
}

variable "frontend_port" {
  description = "Port d'écoute du frontend Next.js (aligné sur docker-compose : 3000)."
  type        = number
  default     = 3000
}

# -----------------------------------------------------------------------------
# Réseau + AKS (main.tf)
# -----------------------------------------------------------------------------

variable "vnet_address_space" {
  description = "Espace d'adressage du réseau virtuel."
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "aks_subnet_address_prefixes" {
  description = "Préfixes du sous-réseau dédié aux nœuds AKS (kubenet : pas besoin d'un / très large pour les pods)."
  type        = list(string)
  default     = ["10.0.1.0/24"]
}

variable "aks_node_count" {
  description = "Nombre de nœuds du pool par défaut."
  type        = number
  default     = 2

  validation {
    condition     = var.aks_node_count >= 1 && var.aks_node_count <= 10
    error_message = "aks_node_count doit être entre 1 et 10 pour ce modèle."
  }
}

variable "aks_vm_size" {
  description = "Taille des machines du pool par défaut (ex. Standard_B2s, Standard_D2s_v5)."
  type        = string
  default     = "Standard_B2s"
}

variable "aks_kubernetes_version" {
  description = "Version Kubernetes AKS (null = version par défaut supportée par Azure dans la région)."
  type        = string
  default     = null
}
