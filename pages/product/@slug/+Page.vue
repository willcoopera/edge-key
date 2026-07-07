<template>
  <div v-if="!product" class="alert alert-warning">Product does not exist or is not available for sale.</div>
  <div v-else class="grid gap-6 lg:grid-cols-[2fr_1fr]">
    <section class="card bg-base-100 shadow-sm overflow-hidden">
      <figure class="w-full bg-base-200">
        <img :src="product.coverImage || emptyCoverUrl" :alt="product.name" class="w-full object-cover max-h-96" />
      </figure>
      <div class="card-body space-y-4">
        <div>
          <p class="text-sm uppercase tracking-[0.2em] text-primary">Product</p>
          <h1 class="text-3xl font-bold">{{ product.name }}</h1>
          <p class="mt-2 text-base-content/70">{{ product.subtitle }}</p>
        </div>
        <div class="prose max-w-none text-base-content/80" v-html="descriptionHtml"></div>
        <div class="rounded-box bg-base-200 p-4 text-sm text-base-content/80">
          {{ product.purchaseNote || 'A pending payment order will be generated after checkout. A notification will be sent to your email upon successful payment.' }}
        </div>
      </div>
    </section>

    <aside>
      <div class="lg:sticky lg:top-24 card bg-base-100 shadow-sm">
        <div class="card-body space-y-4">
          <div>
            <div class="text-sm text-base-content/60">Current Price</div>
            <div class="text-3xl font-bold text-primary">{{ formatCents(product.price) }}</div>
          </div>
          <div class="flex">
              <!-- <div class="text-sm text-base-content/70">限购 {{ product.minBuy }} - {{ product.maxBuy }} 件</div> -->
              <div class="text-sm text-base-content/70">Limit {{ product.maxBuy }} per purchase,</div>
              <div class="text-sm text-base-content/70">Shipping Method: {{ getDeliveryTypeLabel(product.deliveryType) }}</div>
          </div>
          <div class="divider my-0"></div>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">Contact Email</span>
            <input v-model="form.contactValue" type="email" class="input input-bordered w-full" placeholder="name@example.com" />
          </label>
          <p class="-mt-2 text-xs text-base-content/60">Required. Auto-delivery and after-sales notifications will be sent to this email.</p>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">Purchase Quantity</span>
            <input v-model.number="form.quantity" type="number" :min="product.minBuy" :max="product.maxBuy" class="input input-bordered w-full" />
          </label>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">Discount Code</span>
            <div class="flex gap-2">
              <input 
                v-model="form.discountCode" 
                type="text" 
                class="input input-bordered flex-1" 
                placeholder="Enter Discount Code (Optional)"
                :disabled="discountPreview.loading"
              />
              <button 
                class="btn btn-outline btn-sm" 
                :disabled="!form.discountCode.trim() || discountPreview.loading"
                @click="handlePreviewDiscount"
              >
                {{ discountPreview.loading ? 'Verifying...' : 'Verify' }}
              </button>
            </div>
          </label>
          <p v-if="discountPreview.error" class="-mt-2 text-xs text-error">{{ discountPreview.error }}</p>
          <p v-if="discountPreview.valid" class="-mt-2 text-xs text-orange-400">Valid discount code {{ formatCents(discountPreview.discount) }}</p>

          <label class="flex flex-col gap-1.5">
            <span class="label-text font-medium">Remarks</span>
            <textarea v-model="form.buyerNote" class="textarea textarea-bordered w-full" rows="3" placeholder="You may leave your contact information"></textarea>
          </label>

          <div v-if="!isFreeOrder" class="space-y-2">
            <div class="text-sm font-medium">Payment Method</div>
            <div class="grid gap-3">
              <label v-for="method in paymentMethods" :key="method.provider" class="rounded-box border border-base-300 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span>{{ method.label }}</span>
                  <input v-model="form.paymentProvider" type="radio" class="radio radio-primary radio-sm" :value="method.provider" />
                </div>
              </label>
            </div>
          </div>

          <div v-if="!isFreeOrder && form.paymentProvider === 'EPAY'" class="space-y-2">
            <div class="text-sm font-medium">Epay Channel</div>
            <div class="grid gap-3 md:grid-cols-2">
              <label v-for="channel in epayChannels" :key="channel.value" class="rounded-box border border-base-300 p-4">
                <div class="flex items-center justify-between gap-3">
                  <span class="flex items-center gap-2">
                    <svg v-if="channel.icon === 'alipay'" class="h-5 w-5 text-[#1677ff]" viewBox="0 0 1024 1024" fill="currentColor" aria-hidden="true">
                      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64Zm234.5 610.9c-26.2-8.6-61.5-21.8-101.9-39.9-45.6 52.5-103.4 83.2-173.5 83.2-76.6 0-126.2-40.5-126.2-98.8 0-56.6 47.8-99.4 124.5-99.4 38.1 0 79.7 8.3 124.8 24.9 18.4-32.3 33.1-69.8 44.1-112.5H318.7v-58.8h169.1v-61.9H282.2v-60.2h205.6v-82.1h67.3v82.1h207.1v60.2H555.1v61.9h171.6c-14.8 76.6-39.3 140.7-73.5 192.3 38.5 16.4 77.9 31.1 118.2 44.2l-24.9 64.8ZM468.8 579.2c-39.4 0-62.5 15.2-62.5 39.7 0 25.9 24.3 43.5 63.7 43.5 43.1 0 79.7-18.1 109.8-54.4-42.1-19.2-79.1-28.8-111-28.8Z" />
                    </svg>
                    <svg v-else-if="channel.icon === 'wechat'" class="h-5 w-5" viewBox="0 0 1024 1024" aria-hidden="true">
                      <path fill="#07c160" d="M420 190c-190 0-344 123-344 276 0 88 51 166 131 217l-31 94 112-55c41 13 86 20 132 20 190 0 344-123 344-276S610 190 420 190Z" />
                      <path fill="#07c160" d="M690 431c151 0 274 97 274 216 0 70-42 132-108 171l25 77-90-45c-32 9-66 14-101 14-151 0-274-97-274-217s123-216 274-216Z" />
                      <circle cx="300" cy="380" r="34" fill="#fff" />
                      <circle cx="520" cy="380" r="34" fill="#fff" />
                      <circle cx="606" cy="590" r="28" fill="#fff" />
                      <circle cx="778" cy="590" r="28" fill="#fff" />
                    </svg>
                    {{ channel.label }}
                  </span>
                  <input v-model="form.paymentChannel" type="radio" class="radio radio-primary radio-sm" :value="channel.value" />
                </div>
              </label>
            </div>
          </div>

          <div v-if="discountPreview.valid" class="rounded-box bg-base-200 p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-base-content/70">Subtotal</span>
              <span>{{ formatCents(product.price * form.quantity) }}</span>
            </div>
            <div class="flex justify-between text-sm text-orange-400">
              <span>Discount</span>
              <span>-{{ formatCents(discountPreview.discount) }}</span>
            </div>
            <div class="divider my-0"></div>
            <div class="flex justify-between font-bold">
              <span>Amount Paid</span>
              <span class="text-primary">{{ formatCents(discountPreview.finalAmount) }}</span>
            </div>
          </div>

          <p v-if="product.deliveryType === 'CARD_AUTO' && product.availableStock >= 0 && product.availableStock < 10" class="text-sm" :class="product.availableStock === 0 ? 'text-error' : 'text-warning'">
            {{ product.availableStock === 0 ? 'This item is sold out, check other products' : `Low stock, only ${product.availableStock} left` }}
          </p>
          <p v-else-if="product.deliveryType === 'FIXED_CARD'" class="text-sm text-success">Auto delivery, sufficient stock.</p>
          <p v-else-if="product.deliveryType === 'MANUAL'" class="text-sm text-success">{{ product.manualDeliveryHint || 'After payment, we will process your order as soon as possible. Please wait patiently.' }}</p>

          <AppButton variant="primary" :loading="submitting" :disabled="(!isFreeOrder && !paymentMethods.length) || (product.deliveryType === 'CARD_AUTO' && product.availableStock === 0)" @click="handleCreateOrder">
            {{ product.deliveryType === 'CARD_AUTO' && product.availableStock === 0 ? 'Sold Out' : isFreeOrder ? 'Get for Free' : 'Submit Order' }}
          </AppButton>
          <p v-if="!isFreeOrder && !paymentMethods.length" class="text-sm text-warning">No payment methods available at present.</p>
          <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import AppButton from "../../../components/AppButton.vue";
import { normalizeTelefuncError } from "../../../lib/app-error";
import { reactive, ref, computed } from "vue";
import { useData } from "vike-vue/useData";
import { isEmail } from "../../../lib/validators/email";
import { formatCents } from "../../../lib/utils/money";
import { onCreateOrder } from "./createOrder.telefunc";
import { onPreviewDiscount } from "./previewDiscount.telefunc";
import type { PaymentProvider } from "../../../modules/payment/types";
import { isMobile } from "../../../lib/utils/device";
import { onMounted, watch } from "vue";
import { saveLocalOrder } from "../../../lib/local-orders";
import type { Data } from "./+data";

import emptyCoverUrl from "../../../assets/empty.jpg";

const { product, paymentMethods } = useData<Data>();
const submitting = ref(false);
const errorMessage = ref("");
const epayChannels = [
  { value: "alipay", label: "Alipay", icon: "alipay" },
  { value: "wxpay", label: "WeChat Pay", icon: "wechat" },
] as const;

const discountPreview = reactive({
  loading: false,
  valid: false,
  error: "",
  discount: 0,
  finalAmount: 0,
});

const form = reactive({
  quantity: product?.minBuy ?? 1,
  contactValue: "",
  buyerNote: "",
  discountCode: "",
  paymentProvider: paymentMethods[0]?.provider ?? "",
  paymentChannel: getDefaultPaymentChannel(paymentMethods[0]?.provider ?? ""),
});

function getDeliveryTypeLabel(type: string) {
  return ({ CARD_AUTO: "Auto Delivery", FIXED_CARD: "Auto Delivery", MANUAL: "Manual Delivery" } as Record<string, string>)[type] || type;
}

let mobile = false;

function getDefaultPaymentChannel(provider: PaymentProvider | "") {
  if (provider === "EPAY") return "alipay";
  if (provider === "ALIPAY") return mobile ? "alipay_h5" : "alipay_pc";
  if (provider === "ALIPAY_FACE") return "";
  return "";
}

onMounted(() => {
  mobile = isMobile();
  form.paymentChannel = getDefaultPaymentChannel(form.paymentProvider);
});

watch(() => form.paymentProvider, (provider) => {
  form.paymentChannel = getDefaultPaymentChannel(provider);
});

watch(() => form.discountCode, () => {
  discountPreview.valid = false;
  discountPreview.error = "";
  discountPreview.discount = 0;
  discountPreview.finalAmount = 0;
});

const descriptionHtml = formatDescriptionHtml(product?.description || "");

const isFreeOrder = computed(() => {
  return discountPreview.valid && discountPreview.finalAmount === 0;
});

async function handlePreviewDiscount() {
  if (!product || !form.discountCode.trim()) return;

  discountPreview.loading = true;
  discountPreview.error = "";
  discountPreview.valid = false;

  try {
    const result = await onPreviewDiscount(form.discountCode, product.id, product.price * form.quantity);
    if (result.valid) {
      discountPreview.valid = true;
      discountPreview.discount = result.discount;
      discountPreview.finalAmount = result.finalAmount;
    } else {
      discountPreview.error = result.error;
    }
  } catch (error) {
    discountPreview.error = "Verification failed, please try again";
  } finally {
    discountPreview.loading = false;
  }
}

async function handleCreateOrder() {
  if (!product || submitting.value) return;

  // 免费订单不需要支付方式
  if (!isFreeOrder.value && !form.paymentProvider) {
    errorMessage.value = "No payment methods available.";
    return;
  }

  const contactEmail = form.contactValue.trim();
  if (!contactEmail) {
    errorMessage.value = "Contact email cannot be empty";
    return;
  }

  if (!isEmail(contactEmail)) {
    errorMessage.value = "Invalid contact email format";
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    // 免费订单使用 FREE_PAY 作为占位符（服务端会跳过支付）
    const paymentProvider = isFreeOrder.value ? "FREE_PAY" : form.paymentProvider;
    
    const result = await onCreateOrder({
      productId: product.id,
      quantity: form.quantity,
      paymentProvider,
      paymentChannel: paymentProvider === "EPAY" || paymentProvider === "ALIPAY" ? form.paymentChannel : undefined,
      contactType: "EMAIL",
      contactValue: contactEmail,
      buyerNote: form.buyerNote,
      discountCode: form.discountCode.trim() || undefined,
    });

    saveLocalOrder({
      orderNo: result.orderNo,
      queryToken: result.queryToken,
      productName: product.name,
      amount: result.amount,
      createdAt: new Date().toISOString(),
      paymentStatus: result.paymentStatus ?? 'UNPAID',
    });

    if (result.payUrl && form.paymentProvider !== 'ALIPAY_FACE') {
      window.location.href = result.payUrl;
      return;
    }

    window.location.href = `/order/${result.orderNo}?token=${encodeURIComponent(result.queryToken)}`;
  } catch (error) {
    errorMessage.value = normalizeTelefuncError(error, "Failed to place order");
  } finally {
    submitting.value = false;
  }
}

function formatDescriptionHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "<p>No product description available.</p>";
  }

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }

  return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, "<br>")}</p>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
</script>

<style scoped>
:deep(.prose img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1rem auto;
  border-radius: 0.85rem;
}
</style>
