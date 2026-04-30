terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurestack = {
      source  = "hashicorp/azurestack"
      version = "~> 1.0"
    }
  }
}

provider "azurestack" {
  features {}

  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  metadata_host   = var.stack_metadata_host

  # Keep this aligned with your Stack metadata name (api-version=2020-06-01).
  environment = var.stack_arm_environment_name

  skip_provider_registration = true
}
