package it.pizzalab.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Diagnostica dei promemoria: dice se Android limita PizzaLab in background
 * (ottimizzazione della batteria) e apre le pagine di sistema giuste per sistemarlo.
 * Non chiede permessi speciali: legge solo lo stato e apre le impostazioni.
 */
@CapacitorPlugin(name = "ReminderHealth")
public class ReminderHealthPlugin extends Plugin {

    @PluginMethod
    public void status(PluginCall call) {
        Context context = getContext();
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        JSObject result = new JSObject();
        result.put("batteryUnrestricted", power != null && power.isIgnoringBatteryOptimizations(context.getPackageName()));
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("model", Build.MODEL);
        result.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(result);
    }

    /** Pagina «Info app» di PizzaLab: da lì si arriva a Batteria e Notifiche su ogni marca. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    /** Elenco delle app con ottimizzazione della batteria (non richiede permessi). */
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception ignored) {
            openAppSettings(call);
            return;
        }
        call.resolve();
    }
}
