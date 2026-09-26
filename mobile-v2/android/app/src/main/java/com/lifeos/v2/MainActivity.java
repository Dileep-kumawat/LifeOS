package com.lifeos.v2;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import androidx.browser.customtabs.CustomTabsIntent;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "LifeOSMainActivity";
    private static final String PREFS_NAME = "lifeos_native_prefs";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_FCM_TOKEN = "fcm_token";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureStatusBar();
        setupWebViewBridge();
        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    /**
     * Configure edge-to-edge display with transparent system bars and dark icons
     * so webview safe-area insets seamlessly handle status bar and gesture navigation bar.
     */
    private void configureStatusBar() {
        Window window = getWindow();
        if (window == null) return;

        // Ensure window lays out edge-to-edge
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false);

        // Set transparent system bars so webview content bleeds through
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Configure dark icons for light theme background
        androidx.core.view.WindowInsetsControllerCompat controller =
            androidx.core.view.WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }
    }

    /**
     * Attaches custom WebViewClient to intercept OAuth navigations and route them
     * through Chrome Custom Tabs instead of embedded WebView.
     */
    private void setupWebViewBridge() {
        if (getBridge() == null) return;

        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                view.evaluateJavascript("window.LIFEOS_APP_SHELL = true;", null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript("window.LIFEOS_APP_SHELL = true;", null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    if (interceptOAuthUrl(request.getUrl())) {
                        return true;
                    }
                }
                return super.shouldOverrideUrlLoading(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null) {
                    if (interceptOAuthUrl(Uri.parse(url))) {
                        return true;
                    }
                }
                return super.shouldOverrideUrlLoading(view, url);
            }
        });
    }

    /**
     * Intercepts Google OAuth initiation requests.
     * Rewrites return_url to lifeos://oauth and launches Chrome Custom Tabs.
     */
    private boolean interceptOAuthUrl(Uri uri) {
        if (uri == null) return false;
        String urlString = uri.toString();

        // Check if user initiated Google OAuth from web UI
        if (urlString.contains("/api/v1/auth/google") || urlString.contains("accounts.google.com/o/oauth2")) {
            Log.i(TAG, "Intercepted Google OAuth URL: " + urlString);

            // Reconstruct URL ensuring return_url is lifeos://oauth
            Uri.Builder builder = uri.buildUpon();
            builder.clearQuery();

            for (String param : uri.getQueryParameterNames()) {
                if (!"return_url".equalsIgnoreCase(param) && !"redirect_uri".equalsIgnoreCase(param)) {
                    builder.appendQueryParameter(param, uri.getQueryParameter(param));
                }
            }
            builder.appendQueryParameter("return_url", "lifeos://oauth");
            Uri customTabsUri = builder.build();

            Log.i(TAG, "Launching Google OAuth in Chrome Custom Tab: " + customTabsUri);

            try {
                CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build();
                customTabsIntent.launchUrl(MainActivity.this, customTabsUri);
                return true; // Cancel webview load to avoid Google 403 disallowed_useragent
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch Chrome Custom Tab for OAuth", e);
                // Fallback to system browser
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, customTabsUri);
                startActivity(browserIntent);
                return true;
            }
        }
        return false;
    }

    /**
     * Handles incoming deep links:
     * e.g. lifeos://oauth?oauth_success=true&accessToken=...&refreshToken=...
     */
    private void handleDeepLink(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri uri = intent.getData();

        if ("lifeos".equalsIgnoreCase(uri.getScheme())) {
            Log.i(TAG, "Deep link received: " + uri);

            String oauthSuccess = uri.getQueryParameter("oauth_success");
            String accessToken = uri.getQueryParameter("accessToken");
            String refreshToken = uri.getQueryParameter("refreshToken");
            String user = uri.getQueryParameter("user");
            String error = uri.getQueryParameter("error");
            String message = uri.getQueryParameter("message");

            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView == null) return;

            if ("true".equalsIgnoreCase(oauthSuccess) && (refreshToken != null || accessToken != null)) {
                // Save access token for FCM background sync
                if (accessToken != null) {
                    getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                        .edit()
                        .putString(KEY_ACCESS_TOKEN, accessToken)
                        .apply();

                    syncFcmTokenWithBackend(accessToken);
                }

                // Shuttle tokens to the website's LoginPage
                Uri.Builder callbackUrl = Uri.parse(getWebBaseUrl() + "/login").buildUpon();
                callbackUrl.appendQueryParameter("oauth_success", "true");
                if (refreshToken != null) callbackUrl.appendQueryParameter("refreshToken", refreshToken);
                if (accessToken != null) callbackUrl.appendQueryParameter("accessToken", accessToken);
                if (user != null) callbackUrl.appendQueryParameter("user", user);

                final String targetUrl = callbackUrl.build().toString();
                Log.i(TAG, "Navigating WebView with OAuth session: " + targetUrl);
                webView.post(() -> webView.loadUrl(targetUrl));
            } else if (error != null) {
                Uri.Builder errUrl = Uri.parse(getWebBaseUrl() + "/login").buildUpon();
                errUrl.appendQueryParameter("error", error);
                if (message != null) errUrl.appendQueryParameter("message", message);

                final String targetUrl = errUrl.build().toString();
                webView.post(() -> webView.loadUrl(targetUrl));
            }
        }
    }

    /**
     * Android Hardware Back Button:
     * - Go back in WebView history if history exists
     * - Show native confirm exit dialog if at root of history
     */
    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                .setTitle("Exit LifeOS")
                .setMessage("Are you sure you want to exit?")
                .setPositiveButton("Exit", (dialog, which) -> finish())
                .setNegativeButton("Cancel", null)
                .show();
        }
    }

    /**
     * Synchronize FCM device registration token with backend endpoint
     */
    public void syncFcmTokenWithBackend(String accessToken) {
        final String fcmToken = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString(KEY_FCM_TOKEN, null);
        if (fcmToken == null || accessToken == null) {
            Log.d(TAG, "Cannot sync FCM token yet (missing token or auth)");
            return;
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(getApiBaseUrl() + "/notifications/fcm-token");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + accessToken);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("token", fcmToken);
                payload.put("deviceType", "android");
                payload.put("deviceName", "Android Capacitor Device");

                OutputStream os = conn.getOutputStream();
                os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();

                int code = conn.getResponseCode();
                Log.i(TAG, "POST /notifications/fcm-token response code: " + code);
            } catch (Exception e) {
                Log.w(TAG, "Error posting FCM device token: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        }).start();
    }

    public void storeFcmToken(String token) {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString(KEY_FCM_TOKEN, token)
            .apply();

        String accessToken = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString(KEY_ACCESS_TOKEN, null);
        if (accessToken != null) {
            syncFcmTokenWithBackend(accessToken);
        }
    }

    private String getWebBaseUrl() {
        if (getBridge() != null && getBridge().getServerUrl() != null) {
            return getBridge().getServerUrl();
        }
        return "https://lifeos.vercel.app";
    }

    private String getApiBaseUrl() {
        return "https://lifeos-api-hqcz.onrender.com/api/v1";
    }
}
