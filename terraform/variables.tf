# =============================================================================
# 02 — Variables d'entrée (valeurs sensibles : tfvars local + variables pipeline)
# =============================================================================

variable "subscription_id" {
  description = "ID d'abonnement Azure Stack Hub."
  type        = string
}

variable "tenant_id" {
  description = "ID du tenant Azure AD."
  type        = string
}

variable "client_id" {
  description = "Client ID du Service Principal Azure AD."
  type        = string
  sensitive   = true
}

variable "client_secret" {
  description = "Secret du Service Principal Azure AD."
  type        = string
  sensitive   = true
}

variable "stack_metadata_host" {
  description = "Hôte des métadonnées Stack (sans https), ex. management.<location>.xpressazure.com"
  type        = string
  default     = "management.dc2.xpressazure.com"
}

variable "stack_arm_environment_name" {
  description = "Champ \"name\" retourné par /metadata/endpoints?api-version=2020-06-01"
  type        = string
}

variable "resource_group_name" {
  description = "Groupe de ressources existant où déployer l'infrastructure (ex. AmalBH-RG)."
  type        = string
  default     = "AmalBH-RG"
}

variable "location" {
  description = "Région / emplacement Azure Stack Hub (ex. dc2)."
  type        = string
  default     = "dc2"
}

variable "project_prefix" {
  description = "Préfixe de nommage pour éviter les collisions avec des ressources déjà présentes."
  type        = string
  default     = "ticketmanager-iac"
}

variable "vnet_address_space" {
  description = "Espace d'adressage du réseau virtuel dédié à ce module."
  type        = list(string)
  default     = ["10.1.0.0/16"]
}

variable "subnet_mgmt_cidr" {
  description = "CIDR du sous-réseau administration (VM-gestion, Ansible, supervision)."
  type        = string
  default     = "10.1.1.0/24"
}

variable "subnet_db_cidr" {
  description = "CIDR du sous-réseau base de données (MongoDB, sans exposition Internet)."
  type        = string
  default     = "10.1.2.0/24"
}

variable "subnet_aks_cidr" {
  description = "CIDR du sous-réseau réservé au futur cluster Kubernetes (AKS Engine / nœuds)."
  type        = string
  default     = "10.1.3.0/24"
}

variable "admin_username" {
  description = "Compte administrateur Linux sur les VM."
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "Clé publique SSH (ligne complète ssh-rsa / ssh-ed25519)."
  type        = string
}

variable "vm_gestion_attach_existing_os_disk" {
  description = "Si true, recrée vm-gestion en rattachant le disque OS existant (préserve les installations)."
  type        = bool
  default     = true
}

variable "vm_size_gestion" {
  description = "Taille de la VM d'administration (réduire si FabricVmPlacementError sur Stack Hub)."
  type        = string
  default     = "Standard_D1_v2"
}

variable "vm_size_db" {
  description = "Taille de la VM base de données. Le resize nécessite l'arrêt de la VM (deallocate) sur Stack Hub."
  type        = string
  default     = "Standard_D2s_v3"
}

variable "ssh_source_address_prefix" {
  description = "Source autorisée pour SSH sur la VM-gestion (ex. * pour démonstration académique)."
  type        = string
  default     = "*"
}

# ✅ CORRECTION : publisher, offer et sku corrigés pour Azure Stack Hub
variable "image_publisher" {
  type    = string
  default = "canonical"
}

variable "image_offer" {
  type    = string
  default = "0001-com-ubuntu-server-focal"
}

variable "image_sku" {
  type    = string
  default = "20_04-lts"
}

variable "image_version" {
  type    = string
  default = "latest"
}