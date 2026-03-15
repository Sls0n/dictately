#import "permissions_checker.h"
#import <ApplicationServices/ApplicationServices.h>
#import <CoreGraphics/CoreGraphics.h>

Napi::Value CheckAccessibility(const Napi::CallbackInfo& info) {
    bool trusted = AXIsProcessTrusted();
    return Napi::Boolean::New(info.Env(), trusted);
}

Napi::Value RequestAccessibility(const Napi::CallbackInfo& info) {
    NSDictionary* options = @{(__bridge NSString*)kAXTrustedCheckOptionPrompt: @YES};
    bool trusted = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);
    return Napi::Boolean::New(info.Env(), trusted);
}

Napi::Value CheckInputMonitoring(const Napi::CallbackInfo& info) {
    if (@available(macOS 10.15, *)) {
        bool allowed = CGPreflightListenEventAccess();
        return Napi::Boolean::New(info.Env(), allowed);
    }
    return Napi::Boolean::New(info.Env(), true);  // Pre-Catalina: always allowed
}

Napi::Value RequestInputMonitoring(const Napi::CallbackInfo& info) {
    if (@available(macOS 10.15, *)) {
        bool result = CGRequestListenEventAccess();
        return Napi::Boolean::New(info.Env(), result);
    }
    return Napi::Boolean::New(info.Env(), true);
}
