<template>
  <div v-if="!order" class="alert alert-warning">Order does not exist or the query token is invalid.</div>
  <div v-else class="space-y-6">
    <section class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <div class="flex items-start justify-between gap-4 max-md:flex-col">
          <div>
            <p class="text-sm uppercase tracking-[0.2em] text-primary">Order</p>
            <h1 class="text-2xl font-bold">{{ order.orderNo }}</h1>
          </div>
          <div class="flex gap-2">
            <StatusTag :type="getOrderStatusType(order.status)">{{ getOrderStatusLabel(order.status) }}</StatusTag>
            <StatusTag :type="getPaymentStatusType(order.paymentStatus)">{{ getPaymentStatusLabel(order.paymentStatus) }}</StatusTag>
            <StatusTag :type="getDeliveryStatusType(order.deliveryStatus)">{{ getDeliveryStatusLabel(order.deliveryStatus) }}</StatusTag>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-2">
      <article class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title">Order Information</h2>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span>Product</span><span>{{ order.productName }}</span></div>
            <div class="flex justify-between"><span>Quantity</span><span>{{ order.quantity }}</span></div>
            <div class="flex justify-between"><span>Subtotal</span><span>{{ formatCents(order.originalAmount || order.amount) }}</span></div>
            <div v-if="order.discountCodeStr" class="flex justify-between text-orange-400">
              <span>Discount Code</span>
              <span>{{ order.discountCodeStr }}</span>
            </div>
            <div v-if="order.discountAmount" class="flex justify-between text-orange-400">
              <span>Discount</span>
              <span>-{{ formatCents(order.discountAmount) }}</span>
            </div>
            <div class="flex justify-between font-bold">
              <span>Amount Paid</span>
              <span class="text-primary">{{ formatCents(order.amount) }}</span>
            </div>
            <div class="flex justify-between"><span>Payment Method</span><span>{{ getPaymentProviderLabel(order.paymentProvider) }}</span></div>
          </div>
          <div v-if="order.paymentStatus === 'UNPAID'" class="mt-4">
            <AppButton v-if="order.paymentProvider !== 'ALIPAY_FACE'" size="sm" variant="primary" :loading="paying" @click="handleContinuePay">Continue Payment</AppButton>
            <div v-if="order.paymentProvider === 'ALIPAY_FACE'" class="space-y-3">
              <div v-if="qrCodeUrl">
                <p class="text-sm text-base-content/70">Please scan the QR code below with Alipay to complete payment</p>
                <div class="flex justify-center my-3">
                  <img :src="qrCodeUrl" alt="Alipay QR Code" class="w-48 h-48 rounded-box border border-base-300" />
                </div>
                <p class="text-xs text-center text-base-content/50">QR code valid for 2 hours</p>
              </div>
              <div v-if="paying && !qrCodeUrl" class="flex justify-center py-8">
                <span class="loading loading-spinner loading-lg"></span>
              </div>
              <!-- <div v-if="qrCodeUrl" class="text-center">
                <AppButton size="sm" variant="outline" :loading="paying" @click="renderQrImage">Refresh QR Code</AppButton>
              </div> -->
            </div>
            <p v-if="paymentError" class="mt-2 text-sm text-error">{{ paymentError }}</p>
          </div>
        </div>
      </article>

      <article class="card bg-base-100 shadow-sm">
        <div class="card-body">
          <h2 class="card-title">Delivery Content</h2>
          <div v-if="order.deliveryContents.length" class="space-y-2">
            <pre v-for="content in order.deliveryContents" :key="content" class="rounded-box bg-base-200 p-3 text-sm">{{ content }}</pre>
          </div>
          <p v-else class="text-sm text-base-content/60">This order has not been paid or auto-delivered yet.</p>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { normalizeTelefuncError } from "../../../lib/app-error";
import { ref, onMounted, onUnmounted } from "vue";
import AppButton from "../../../components/AppButton.vue";
import { useData } from "vike-vue/useData";
import { formatCents } from "../../../lib/utils/money";
import { getDeliveryStatusLabel, getDeliveryStatusType, getOrderStatusLabel, getOrderStatusType, getPaymentProviderLabel, getPaymentStatusLabel, getPaymentStatusType } from "../../../lib/utils/order-status";
import { updateLocalOrder } from "../../../lib/local-orders";
import StatusTag from "../../../components/StatusTag.vue";
import { onCreatePayment } from "./createPayment.telefunc";
import { onQueryAlipayPayment } from "./queryAlipayPayment.telefunc";
import type { Data } from "./+data";

const { order } = useData<Data>();
const paying = ref(false);
const paymentError = ref("");
const qrCodeUrl = ref("");

const POLL_INTERVAL = 5000; // 5 seconds
let pollTimer: ReturnType<typeof setInterval> | null = null;
let alipayQrCode = ""; // 保存支付宝返回的原始二维码链接

function getQrCacheKey() {
  return order ? `alipay_face_qr_${order.orderNo}` : "";
}

function loadCachedQrCode() {
  const key = getQrCacheKey();
  if (!key) return "";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function saveQrCode(qrCode: string) {
  const key = getQrCacheKey();
  if (!key) return;
  try {
    localStorage.setItem(key, qrCode);
  } catch {}
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (!order || order.paymentStatus !== "UNPAID") return;
    try {
      const result = await onQueryAlipayPayment({ orderNo: order.orderNo });
      if (result.isPaid || result.alreadyPaid) {
        try { localStorage.removeItem(getQrCacheKey()); } catch {}
        window.location.reload();
      }
    } catch {}
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

onMounted(async () => {
  if (!order) return;

  updateLocalOrder({
    orderNo: order.orderNo,
    queryToken: order.queryToken,
    productName: order.productName,
    amount: order.amount,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryStatus: order.deliveryStatus,
  });

  if (order.paymentStatus === 'UNPAID' && order.paymentProvider === 'ALIPAY_FACE') {
    // 先尝试从缓存加载，避免重复调用 precreate
    const cached = loadCachedQrCode();
    if (cached) {
      alipayQrCode = cached;
      renderQrImage();
    } else {
      await fetchQrCode();
    }
    startPolling();
    return;
  }

  if (order.paymentStatus !== "UNPAID" || order.paymentProvider !== "ALIPAY") return;
  const params = new URLSearchParams(window.location.search);
  if (!params.get("out_trade_no")) return;
  try {
    const result = await onQueryAlipayPayment({ orderNo: order.orderNo });
    if (result.isPaid || result.alreadyPaid) window.location.reload();
  } catch {}
});

onUnmounted(() => {
  stopPolling();
});

// 从支付宝获取二维码（只调用一次）
async function fetchQrCode() {
  if (!order) return;

  paying.value = true;
  paymentError.value = "";

  try {
    const result = await onCreatePayment({ orderId: order.id });
    if (result.payUrl) {
      alipayQrCode = result.payUrl;
      saveQrCode(alipayQrCode);
      renderQrImage();
      return;
    }
    paymentError.value = "Failed to retrieve payment QR code";
  } catch (error) {
    paymentError.value = normalizeTelefuncError(error, "Failed to generate QR code");
  } finally {
    paying.value = false;
  }
}

// 用已有链接重新生成二维码图片
function renderQrImage() {
  if (!alipayQrCode) return;
  const text = encodeURIComponent(alipayQrCode);
  qrCodeUrl.value = `https://quickchart.io/qr?text=${text}&size=300&ecLevel=M`;
}

async function handleContinuePay() {
  if (!order) return;

  paying.value = true;
  paymentError.value = "";

  try {
    const result = await onCreatePayment({ orderId: order.id });
    if (result.payUrl) {
      window.location.href = result.payUrl;
      return;
    }
    paymentError.value = "Payment link not obtained";
  } catch (error) {
    paymentError.value = normalizeTelefuncError(error, "Failed to launch payment");
  } finally {
    paying.value = false;
  }
}
</script>
