package com.hairintel.ai;

import android.content.Intent;
import android.net.Uri;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String PRODUCT_STARTER = "hairintel_starter_monthly";
    private static final String PRODUCT_PRO = "hairintel_pro_monthly";
    private static final String PRODUCT_STUDIO = "hairintel_studio_monthly";

    private BillingClient billingClient;
    private boolean connecting = false;
    private final List<QueuedAction> queuedActions = new ArrayList<>();
    private final Map<String, ProductDetails> productCache = new HashMap<>();
    private PluginCall pendingPurchaseCall;

    private static final class QueuedAction {
        final Runnable action;
        final PluginCall call;

        QueuedAction(Runnable action, PluginCall call) {
            this.action = action;
            this.call = call;
        }
    }

    @Override
    public void load() {
        PendingPurchasesParams pendingPurchases = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .enablePrepaidPlans()
            .build();

        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(pendingPurchases)
            .enableAutoServiceReconnection()
            .build();

        ensureReady(null, null);
    }

    private void ensureReady(Runnable action, PluginCall call) {
        if (billingClient != null && billingClient.isReady()) {
            if (action != null) getActivity().runOnUiThread(action);
            return;
        }

        if (action != null) queuedActions.add(new QueuedAction(action, call));
        if (connecting || billingClient == null) return;

        connecting = true;
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                connecting = false;
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    List<QueuedAction> actions = new ArrayList<>(queuedActions);
                    queuedActions.clear();
                    for (QueuedAction queued : actions) {
                        getActivity().runOnUiThread(queued.action);
                    }
                } else {
                    String message = "Google Play Billing unavailable: " + billingResult.getDebugMessage();
                    List<QueuedAction> actions = new ArrayList<>(queuedActions);
                    queuedActions.clear();
                    for (QueuedAction queued : actions) {
                        if (queued.call != null) queued.call.reject(message);
                    }
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                connecting = false;
            }
        });
    }

    private List<String> requestedProductIds(PluginCall call) {
        List<String> ids = new ArrayList<>();
        JSArray requested = call.getArray("productIds");
        if (requested != null) {
            for (int i = 0; i < requested.length(); i++) {
                try {
                    String id = requested.getString(i);
                    if (id != null && !id.trim().isEmpty()) ids.add(id.trim());
                } catch (Exception ignored) {}
            }
        }
        if (ids.isEmpty()) {
            ids.add(PRODUCT_STARTER);
            ids.add(PRODUCT_PRO);
            ids.add(PRODUCT_STUDIO);
        }
        return ids;
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        ensureReady(() -> queryProducts(call, requestedProductIds(call)), call);
    }

    private void queryProducts(PluginCall call, List<String> ids) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : ids) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(BillingClient.ProductType.SUBS)
                .build());
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build();

        billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
            @Override
            public void onProductDetailsResponse(BillingResult billingResult, QueryProductDetailsResult result) {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Could not load Play subscriptions: " + billingResult.getDebugMessage());
                    return;
                }

                JSArray output = new JSArray();
                for (ProductDetails details : result.getProductDetailsList()) {
                    productCache.put(details.getProductId(), details);
                    output.put(productToJS(details));
                }

                JSObject response = new JSObject();
                response.put("products", output);
                call.resolve(response);
            }
        });
    }

    private ProductDetails.SubscriptionOfferDetails selectOffer(ProductDetails details) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;

        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            for (ProductDetails.PricingPhase phase : phases) {
                if (phase.getPriceAmountMicros() == 0L) return offer;
            }
        }
        return offers.get(0);
    }

    private JSObject productToJS(ProductDetails details) {
        JSObject item = new JSObject();
        item.put("productId", details.getProductId());
        item.put("title", details.getTitle());
        item.put("description", details.getDescription());

        ProductDetails.SubscriptionOfferDetails offer = selectOffer(details);
        if (offer == null) {
            item.put("available", false);
            return item;
        }

        List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
        ProductDetails.PricingPhase renewalPhase = phases.isEmpty() ? null : phases.get(phases.size() - 1);
        boolean hasFreeTrial = false;
        for (ProductDetails.PricingPhase phase : phases) {
            if (phase.getPriceAmountMicros() == 0L) {
                hasFreeTrial = true;
                break;
            }
        }

        item.put("available", renewalPhase != null);
        item.put("basePlanId", offer.getBasePlanId());
        item.put("offerId", offer.getOfferId() == null ? "" : offer.getOfferId());
        item.put("offerToken", offer.getOfferToken());
        item.put("hasFreeTrial", hasFreeTrial);
        if (renewalPhase != null) {
            item.put("formattedPrice", renewalPhase.getFormattedPrice());
            item.put("billingPeriod", renewalPhase.getBillingPeriod());
            item.put("priceAmountMicros", renewalPhase.getPriceAmountMicros());
            item.put("priceCurrencyCode", renewalPhase.getPriceCurrencyCode());
        }
        return item;
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId", "");
        if (!PRODUCT_STARTER.equals(productId) && !PRODUCT_PRO.equals(productId) && !PRODUCT_STUDIO.equals(productId)) {
            call.reject("Unknown HairIntel subscription product.");
            return;
        }

        ensureReady(() -> queryAndLaunchPurchase(call, productId), call);
    }

    private void queryAndLaunchPurchase(PluginCall call, String productId) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build();

        billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
            @Override
            public void onProductDetailsResponse(BillingResult billingResult, QueryProductDetailsResult result) {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || result.getProductDetailsList().isEmpty()) {
                    call.reject("This Google Play subscription is not available yet. Publish the subscription/base plan in Play Console first.");
                    return;
                }

                ProductDetails details = result.getProductDetailsList().get(0);
                ProductDetails.SubscriptionOfferDetails offer = selectOffer(details);
                if (offer == null) {
                    call.reject("No eligible Google Play base plan or offer is available for this account.");
                    return;
                }

                if (pendingPurchaseCall != null) {
                    call.reject("Another Google Play purchase is already in progress.");
                    return;
                }

                BillingFlowParams.ProductDetailsParams productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(details)
                    .setOfferToken(offer.getOfferToken())
                    .build();

                List<BillingFlowParams.ProductDetailsParams> productParamsList = new ArrayList<>();
                productParamsList.add(productParams);

                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(productParamsList)
                    .build();

                pendingPurchaseCall = call;
                BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);
                if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    pendingPurchaseCall = null;
                    call.reject("Google Play purchase could not start: " + launchResult.getDebugMessage());
                }
            }
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        ensureReady(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

            billingClient.queryPurchasesAsync(params, new PurchasesResponseListener() {
                @Override
                public void onQueryPurchasesResponse(BillingResult billingResult, List<Purchase> purchases) {
                    if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        call.reject("Could not restore Google Play subscriptions: " + billingResult.getDebugMessage());
                        return;
                    }
                    JSArray output = new JSArray();
                    for (Purchase purchase : purchases) output.put(purchaseToJS(purchase));
                    JSObject response = new JSObject();
                    response.put("purchases", output);
                    call.resolve(response);
                }
            });
        }, call);
    }

    @PluginMethod
    public void manageSubscriptions(PluginCall call) {
        String productId = call.getString("productId", "");
        String url = "https://play.google.com/store/account/subscriptions?package=com.hairintel.ai";
        if (PRODUCT_STARTER.equals(productId) || PRODUCT_PRO.equals(productId) || PRODUCT_STUDIO.equals(productId)) {
            url += "&sku=" + Uri.encode(productId);
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not open Google Play subscription management.");
        }
    }

    private JSObject purchaseToJS(Purchase purchase) {
        JSObject item = new JSObject();
        String productId = purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0);
        item.put("productId", productId);
        item.put("purchaseToken", purchase.getPurchaseToken());
        item.put("purchaseState", purchase.getPurchaseState());
        item.put("acknowledged", purchase.isAcknowledged());
        item.put("autoRenewing", purchase.isAutoRenewing());
        item.put("purchaseTime", purchase.getPurchaseTime());
        item.put("orderId", purchase.getOrderId() == null ? "" : purchase.getOrderId());
        return item;
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        JSObject event = new JSObject();
        event.put("responseCode", billingResult.getResponseCode());
        event.put("debugMessage", billingResult.getDebugMessage());

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
            JSObject purchase = purchaseToJS(purchases.get(0));
            event.put("purchase", purchase);
            notifyListeners("purchaseUpdated", event);
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.resolve(purchase);
                pendingPurchaseCall = null;
            }
            return;
        }

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            event.put("cancelled", true);
            notifyListeners("purchaseUpdated", event);
            if (pendingPurchaseCall != null) {
                JSObject cancelled = new JSObject();
                cancelled.put("cancelled", true);
                pendingPurchaseCall.resolve(cancelled);
                pendingPurchaseCall = null;
            }
            return;
        }

        notifyListeners("purchaseUpdated", event);
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.reject("Google Play purchase failed: " + billingResult.getDebugMessage());
            pendingPurchaseCall = null;
        }
    }
}
