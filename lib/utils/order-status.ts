export function getOrderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "PAID":
      return "PAID";
    case "DELIVERED":
      return "DELIVERED";
    case "CLOSED":
      return "CLOSED";
    case "FAILED":
      return "FAILED";
    default:
      return status;
  }
}

export function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "UNPAID":
      return "UNPAID";
    case "PAID":
      return "PAID";
    case "FAILED":
      return "FAILED";
    default:
      return status;
  }
}

export function getDeliveryStatusLabel(status: string) {
  switch (status) {
    case "NOT_DELIVERED":
      return "NOT_DELIVERED";
    case "DELIVERED":
      return "DELIVERED";
    case "FAILED":
      return "FAILED";
    default:
      return status;
  }
}

export function getPaymentProviderLabel(provider: string) {
  switch (provider) {
    case "EPAY":
      return "EPAY";
    case "ALIPAY":
      return "ALIPAY";
    case "ALIPAY_FACE":
      return "ALIPAY_FACE";
    case "STRIPE":
      return "Stripe";
    case "BEPUSDT":
      return "Crypto Pay";
    case "FREE_PAY":
      return "FREE_PAY";
    default:
      return provider;
  }
}

export function getOrderStatusType(status: string): "warning" | "success" | "primary" | "danger" | "default" {
  switch (status) {
    case "PENDING": return "warning";
    case "PAID": return "success";
    case "DELIVERED": return "success";
    case "CLOSED": return "default";
    case "FAILED": return "danger";
    default: return "default";
  }
}

export function getPaymentStatusType(status: string): "warning" | "success" | "danger" | "default" {
  switch (status) {
    case "UNPAID": return "warning";
    case "PAID": return "success";
    case "FAILED": return "danger";
    default: return "default";
  }
}

export function getDeliveryStatusType(status: string): "warning" | "success" | "danger" | "default" {
  switch (status) {
    case "NOT_DELIVERED": return "warning";
    case "DELIVERED": return "success";
    case "FAILED": return "danger";
    default: return "default";
  }
}

export function getVerifyStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "VERIFIED":
      return "VERIFIED";
    case "FAILED":
      return "FAILED";
    default:
      return status;
  }
}

