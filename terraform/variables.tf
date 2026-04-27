variable "location" {
  type    = string
  default = "westeurope"
}

variable "environment" {
  type = string
  default = "dev"
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.environment))
    error_message = "environment: minuscules, chiffres et tirets uniquement."
  }
}

variable "project_name" {
  type    = string
  default = "ticketmanager"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.project_name))
    error_message = "project_name: lettre minuscule puis lettres/chiffres/tirets."
  }
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "resource_group_name" {
  type = string
}

variable "vnet_address_space" {
  type    = list(string)
  default = ["10.0.0.0/16"]
}

variable "aks_subnet_address_prefixes" {
  type    = list(string)
  default = ["10.0.1.0/24"]
}

variable "aks_node_count" {
  type    = number
  default = 2
  validation {
    condition     = var.aks_node_count >= 1 && var.aks_node_count <= 10
    error_message = "aks_node_count entre 1 et 10."
  }
}

variable "aks_vm_size" {
  type    = string
  default = "Standard_B2s"
}

variable "aks_kubernetes_version" {
  type = string
}

variable "mongodb_uri" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "cors_origin" {
  type = string
}

variable "next_public_api_url" {
  type = string
}
