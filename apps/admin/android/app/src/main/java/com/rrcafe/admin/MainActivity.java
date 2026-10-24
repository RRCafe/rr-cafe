package com.rrcafe.admin;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new AndroidPrintBridge(), "AndroidPrinter");
        }

        SwipeRefreshLayout swipeRefresh = findViewById(R.id.swipe_refresh);
        if (swipeRefresh != null) {
            swipeRefresh.setOnRefreshListener(() -> {
                WebView wv = getBridge().getWebView();
                if (wv != null) {
                    wv.reload();
                }
                // Stop the refreshing animation after a short delay
                swipeRefresh.postDelayed(() -> swipeRefresh.setRefreshing(false), 1000);
            });
        }
    }

    public class AndroidPrintBridge {
        @JavascriptInterface
        public void printReceiptHtml(final String htmlContent) {
            runOnUiThread(() -> {
                WebView printWebView = new WebView(MainActivity.this);
                printWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (printManager != null) {
                            PrintDocumentAdapter printAdapter = printWebView.createPrintDocumentAdapter("RR_Cafe_Receipt");
                            PrintAttributes.Builder builder = new PrintAttributes.Builder();
                            // 58mm width is 2.283 inches = 2283 mils
                            builder.setMediaSize(new PrintAttributes.MediaSize("ROLL_58MM", "58mm Roll", 2283, 7874));
                            builder.setMinMargins(new PrintAttributes.Margins(0, 0, 0, 0));
                            printManager.print("RR_Cafe_Receipt", printAdapter, builder.build());
                        }
                    }
                });
                printWebView.loadDataWithBaseURL("https://rr-cafe.vercel.app/", htmlContent, "text/html", "UTF-8", null);
            });
        }
    }
}
