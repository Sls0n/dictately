#import "fn_key_monitor.h"
#import <IOKit/hid/IOHIDManager.h>
#import <CoreFoundation/CoreFoundation.h>

static IOHIDManagerRef hidManager = nullptr;
static Napi::ThreadSafeFunction tsfn;
static bool fnIsDown = false;

static void HIDInputValueCallback(void* context, IOReturn result, void* sender, IOHIDValueRef value) {
    IOHIDElementRef element = IOHIDValueGetElement(value);
    uint32_t usagePage = IOHIDElementGetUsagePage(element);
    uint32_t usage = IOHIDElementGetUsage(element);

    // Apple vendor-specific Fn key: usage page 0xFF (Apple vendor), usage 0x03 (Fn)
    if (usagePage == 0xFF && usage == 0x03) {
        CFIndex intValue = IOHIDValueGetIntegerValue(value);
        bool isDown = intValue != 0;

        if (isDown == fnIsDown) return;  // No state change
        fnIsDown = isDown;

        const char* event = isDown ? "fnDown" : "fnUp";

        tsfn.BlockingCall([event](Napi::Env env, Napi::Function callback) {
            callback.Call({Napi::String::New(env, event)});
        });
    }
}

Napi::Value StartFnMonitor(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "Callback function required").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (hidManager) {
        return Napi::Boolean::New(env, true);  // Already running
    }

    tsfn = Napi::ThreadSafeFunction::New(
        env,
        info[0].As<Napi::Function>(),
        "FnKeyCallback",
        0,  // Unlimited queue
        1   // One thread
    );

    hidManager = IOHIDManagerCreate(kCFAllocatorDefault, kIOHIDOptionsTypeNone);
    if (!hidManager) {
        Napi::Error::New(env, "Failed to create IOHIDManager").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Match keyboard devices
    CFMutableDictionaryRef matchDict = CFDictionaryCreateMutable(
        kCFAllocatorDefault, 0,
        &kCFTypeDictionaryKeyCallBacks,
        &kCFTypeDictionaryValueCallBacks
    );

    int32_t usagePage = kHIDPage_GenericDesktop;
    int32_t usage = kHIDUsage_GD_Keyboard;
    CFNumberRef pageNum = CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &usagePage);
    CFNumberRef usageNum = CFNumberCreate(kCFAllocatorDefault, kCFNumberSInt32Type, &usage);

    CFDictionarySetValue(matchDict, CFSTR(kIOHIDDeviceUsagePageKey), pageNum);
    CFDictionarySetValue(matchDict, CFSTR(kIOHIDDeviceUsageKey), usageNum);

    CFRelease(pageNum);
    CFRelease(usageNum);

    IOHIDManagerSetDeviceMatching(hidManager, matchDict);
    CFRelease(matchDict);

    IOHIDManagerRegisterInputValueCallback(hidManager, HIDInputValueCallback, nullptr);
    IOHIDManagerScheduleWithRunLoop(hidManager, CFRunLoopGetMain(), kCFRunLoopDefaultMode);

    IOReturn ret = IOHIDManagerOpen(hidManager, kIOHIDOptionsTypeNone);
    if (ret != kIOReturnSuccess) {
        CFRelease(hidManager);
        hidManager = nullptr;
        Napi::Error::New(env, "Failed to open IOHIDManager").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    fnIsDown = false;
    return Napi::Boolean::New(env, true);
}

Napi::Value StopFnMonitor(const Napi::CallbackInfo& info) {
    if (hidManager) {
        IOHIDManagerUnscheduleFromRunLoop(hidManager, CFRunLoopGetMain(), kCFRunLoopDefaultMode);
        IOHIDManagerClose(hidManager, kIOHIDOptionsTypeNone);
        CFRelease(hidManager);
        hidManager = nullptr;
    }

    if (tsfn) {
        tsfn.Release();
    }

    fnIsDown = false;
    return info.Env().Undefined();
}
