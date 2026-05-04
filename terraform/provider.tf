provider "azurestack" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  client_id       = var.client_id
  client_secret   = var.client_secret
  metadata_host   = var.stack_metadata_host
  environment     = var.stack_arm_environment_name
  skip_provider_registration = true
}
