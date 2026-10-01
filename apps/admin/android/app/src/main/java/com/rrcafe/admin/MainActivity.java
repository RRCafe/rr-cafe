package com.rrcafe.admin;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SwipeRefreshLayout swipeRefresh = findViewById(R.id.swipe_refresh);
        if (swipeRefresh != null) {
            swipeRefresh.setOnRefreshListener(() -> {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.reload();
                }
                // Stop the refreshing animation after a short delay
                swipeRefresh.postDelayed(() -> swipeRefresh.setRefreshing(false), 1000);
            });
        }
    }
}
