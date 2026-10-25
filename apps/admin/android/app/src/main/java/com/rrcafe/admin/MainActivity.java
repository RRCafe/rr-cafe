package com.rrcafe.admin;

import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "RR_CAFE_ADMIN_PREFS";
    private static final String PREF_PRINTER_MAC = "selected_printer_mac";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int REQUEST_BLUETOOTH_PERMS = 101;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        
        // Status bar background color (#F5EEDC) with dark icons
        window.setStatusBarColor(Color.parseColor("#F5EEDC"));
        
        // Navigation bar background color (#FFFFFF) with dark icons (restores edge-to-edge white bottom bar)
        window.setNavigationBarColor(Color.parseColor("#FFFFFF"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }

        WindowInsetsControllerCompat insetsController = new WindowInsetsControllerCompat(window, window.getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
        insetsController.setAppearanceLightNavigationBars(true);

        // Prompt Bluetooth runtime permissions proactively on Android 12+ (API 31+)
        checkAndRequestBluetoothPermissions();

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);

            // WhatsApp-like offline cache:
            // When online: use network and update disk cache (LOAD_DEFAULT)
            // When offline: serve cached application and data (LOAD_CACHE_ELSE_NETWORK)
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo activeNetwork = cm != null ? cm.getActiveNetworkInfo() : null;
            boolean isConnected = activeNetwork != null && activeNetwork.isConnectedOrConnecting();
            if (isConnected) {
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            } else {
                settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
            }

            webView.addJavascriptInterface(new AndroidPrintBridge(), "AndroidPrinter");
        }

        SwipeRefreshLayout swipeRefresh = findViewById(R.id.swipe_refresh);
        if (swipeRefresh != null) {
            swipeRefresh.setOnRefreshListener(() -> {
                WebView wv = getBridge().getWebView();
                if (wv != null) {
                    wv.reload();
                }
                swipeRefresh.postDelayed(() -> swipeRefresh.setRefreshing(false), 1000);
            });
        }
    }

    private boolean checkAndRequestBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            List<String> needed = new ArrayList<>();
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.BLUETOOTH_CONNECT);
            }
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                needed.add(android.Manifest.permission.BLUETOOTH_SCAN);
            }
            if (!needed.isEmpty()) {
                ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), REQUEST_BLUETOOTH_PERMS);
                return false;
            }
        }
        return true;
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.evaluateJavascript("window.location.pathname", path -> {
                String cleanPath = path != null ? path.replace("\"", "").trim() : "";
                // If on Live Orders (root), close the application
                if (cleanPath.equals("/") || cleanPath.equals("/admin") || cleanPath.equals("/admin/") || cleanPath.isEmpty()) {
                    finish();
                } else {
                    // Navigate to the previous page in history
                    if (webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        webView.evaluateJavascript("window.history.back()", null);
                    }
                }
            });
        } else {
            super.onBackPressed();
        }
    }

    public class AndroidPrintBridge {
        /**
         * Direct Bluetooth Thermal Printing via RFCOMM (SPP)
         * Sends raw ESC/POS bytes directly to paired 58mm printer
         */
        @JavascriptInterface
        public void printBluetoothThermal(final String base64EscPosData) {
            runOnUiThread(() -> {
                try {
                    // Check runtime Bluetooth permissions on Android 12+
                    if (!checkAndRequestBluetoothPermissions()) {
                        Toast.makeText(MainActivity.this, "Please allow Bluetooth permissions to connect to printer", Toast.LENGTH_LONG).show();
                        return;
                    }

                    BluetoothAdapter btAdapter = BluetoothAdapter.getDefaultAdapter();
                    if (btAdapter == null) {
                        Toast.makeText(MainActivity.this, "Bluetooth not supported on this device", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    if (!btAdapter.isEnabled()) {
                        Toast.makeText(MainActivity.this, "Please turn on Bluetooth to print", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    Set<BluetoothDevice> pairedDevices;
                    try {
                        pairedDevices = btAdapter.getBondedDevices();
                    } catch (SecurityException se) {
                        Toast.makeText(MainActivity.this, "Bluetooth permission required. Please grant it in App Settings.", Toast.LENGTH_LONG).show();
                        return;
                    }

                    if (pairedDevices == null || pairedDevices.isEmpty()) {
                        Toast.makeText(MainActivity.this, "No paired Bluetooth printers found. Please pair your printer in Android Bluetooth Settings first.", Toast.LENGTH_LONG).show();
                        return;
                    }

                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                    String savedMac = prefs.getString(PREF_PRINTER_MAC, null);

                    BluetoothDevice targetDevice = null;
                    if (savedMac != null) {
                        for (BluetoothDevice d : pairedDevices) {
                            if (d.getAddress().equalsIgnoreCase(savedMac)) {
                                targetDevice = d;
                                break;
                            }
                        }
                    }

                    // If previously chosen device exists, print directly
                    if (targetDevice != null) {
                        sendEscPosToDevice(targetDevice, base64EscPosData);
                    } else if (pairedDevices.size() == 1) {
                        // Only 1 paired device, auto select
                        BluetoothDevice singleDevice = pairedDevices.iterator().next();
                        prefs.edit().putString(PREF_PRINTER_MAC, singleDevice.getAddress()).apply();
                        sendEscPosToDevice(singleDevice, base64EscPosData);
                    } else {
                        // Prompt user to pick printer from paired devices list
                        List<BluetoothDevice> deviceList = new ArrayList<>(pairedDevices);
                        String[] deviceNames = new String[deviceList.size()];
                        for (int i = 0; i < deviceList.size(); i++) {
                            BluetoothDevice d = deviceList.get(i);
                            String name = d.getName() != null ? d.getName() : "Unknown Device";
                            deviceNames[i] = name + "\n" + d.getAddress();
                        }

                        new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Select 58mm Thermal Printer")
                            .setItems(deviceNames, (dialog, which) -> {
                                BluetoothDevice chosen = deviceList.get(which);
                                prefs.edit().putString(PREF_PRINTER_MAC, chosen.getAddress()).apply();
                                sendEscPosToDevice(chosen, base64EscPosData);
                            })
                            .setNegativeButton("Cancel", null)
                            .show();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    Toast.makeText(MainActivity.this, "Bluetooth error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }

        private void sendEscPosToDevice(BluetoothDevice device, String base64Data) {
            new Thread(() -> {
                BluetoothSocket socket = null;
                try {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Connecting to " + (device.getName() != null ? device.getName() : "Printer") + "...", Toast.LENGTH_SHORT).show());

                    byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                    socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                    socket.connect();

                    OutputStream os = socket.getOutputStream();
                    // Stream in 512-byte chunks with brief throttle to ensure hardware thermal printer buffer never overflows
                    int offset = 0;
                    int chunkSize = 512;
                    while (offset < data.length) {
                        int len = Math.min(chunkSize, data.length - offset);
                        os.write(data, offset, len);
                        os.flush();
                        offset += len;
                        try {
                            Thread.sleep(15);
                        } catch (InterruptedException ignored) {}
                    }

                    Thread.sleep(800); // Give printer buffer time to complete print
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Receipt printed successfully!", Toast.LENGTH_SHORT).show());
                } catch (Exception e) {
                    e.printStackTrace();
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Print failed: " + e.getMessage(), Toast.LENGTH_LONG).show());
                } finally {
                    if (socket != null) {
                        try { socket.close(); } catch (Exception ignored) {}
                    }
                }
            }).start();
        }

        /**
         * Save PDF directly to Android Downloads folder
         */
        @JavascriptInterface
        public void savePdfToDownloads(final String base64Pdf, final String fileName) {
            runOnUiThread(() -> {
                try {
                    byte[] pdfBytes = Base64.decode(base64Pdf, Base64.DEFAULT);
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!downloadsDir.exists()) {
                        downloadsDir.mkdirs();
                    }
                    File file = new File(downloadsDir, fileName);
                    FileOutputStream fos = new FileOutputStream(file);
                    fos.write(pdfBytes);
                    fos.flush();
                    fos.close();

                    MediaScannerConnection.scanFile(MainActivity.this, 
                        new String[]{file.getAbsolutePath()}, 
                        new String[]{"application/pdf"}, 
                        null);

                    Toast.makeText(MainActivity.this, "Receipt saved to Downloads: " + fileName, Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    e.printStackTrace();
                    Toast.makeText(MainActivity.this, "Failed to save PDF: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
