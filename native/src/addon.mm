#import <napi.h>
#import "fn_key_monitor.h"
#import "keyboard_simulator.h"
#import "permissions_checker.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Fn key monitor
    exports.Set("startFnMonitor", Napi::Function::New(env, StartFnMonitor));
    exports.Set("stopFnMonitor", Napi::Function::New(env, StopFnMonitor));

    // Keyboard simulation
    exports.Set("simulatePaste", Napi::Function::New(env, SimulatePaste));
    exports.Set("simulateTyping", Napi::Function::New(env, SimulateTyping));

    // Permission checks
    exports.Set("checkAccessibility", Napi::Function::New(env, CheckAccessibility));
    exports.Set("requestAccessibility", Napi::Function::New(env, RequestAccessibility));
    exports.Set("checkInputMonitoring", Napi::Function::New(env, CheckInputMonitoring));
    exports.Set("requestInputMonitoring", Napi::Function::New(env, RequestInputMonitoring));

    return exports;
}

NODE_API_MODULE(dictately_native, Init)
