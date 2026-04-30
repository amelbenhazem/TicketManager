variable "subscription_id" {
  description = "Azure Stack subscription ID."
  type        = string
}

variable "tenant_id" {
  description = "Azure AD tenant ID."
  type        = string
}

variable "stack_metadata_host" {
  description = "Azure Stack metadata host without protocol."
  type        = string
  default     = "management.dc2.xpressazure.com"
}

variable "stack_arm_environment_name" {
  description = "Environment name returned by Stack metadata endpoint (2020-06-01)."
  type        = string
  default     = "AzureStack-User-ee8e5b2b-3e31-4a83-93b6-28f3739efd6d"
}

variable "resource_group_name" {
  description = "Existing resource group name."
  type        = string
  default     = "AmalBH"
}

variable "location" {
  description = "Azure Stack location."
  type        = string
  default     = "dc2"
}

variable "existing_vnet_name" {
  description = "Existing virtual network name."
  type        = string
  default     = "ticketmanager-vnet"
}

variable "existing_subnet_name" {
  description = "Existing subnet name in the existing VNet."
  type        = string
  default     = "default"
}

variable "admin_username" {
  description = "Admin username for Linux virtual machines."
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "SSH public key for VM admin access."
  type        = string
}

variable "vm_size_gestion" {
  description = "VM size for vm-gestion."
  type        = string
  default     = "Standard_D2s_v3"
}

variable "vm_size_db" {
  description = "VM size for vm-db."
  type        = string
  default     = "Standard_D2s_v3"
}

variable "image_publisher" {
  description = "Image publisher."
  type        = string
  default     = "Canonical"
}

variable "image_offer" {
  description = "Image offer."
  type        = string
  default     = "UbuntuServer"
}

variable "image_sku" {
  description = "Image SKU."
  type        = string
  default     = "20.04-LTS"
}

variable "image_version" {
  description = "Image version."
  type        = string
  default     = "latest"
}
