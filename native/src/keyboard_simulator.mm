#import "keyboard_simulator.h"
#import <ApplicationServices/ApplicationServices.h>
#import <CoreGraphics/CoreGraphics.h>

Napi::Value SimulatePaste(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);

    // Key down: Cmd + V
    CGEventRef cmdVDown = CGEventCreateKeyboardEvent(source, (CGKeyCode)9, true);  // V key
    CGEventSetFlags(cmdVDown, kCGEventFlagMaskCommand);
    CGEventPost(kCGHIDEventTap, cmdVDown);
    CFRelease(cmdVDown);

    // Small delay
    usleep(10000);  // 10ms

    // Key up: Cmd + V
    CGEventRef cmdVUp = CGEventCreateKeyboardEvent(source, (CGKeyCode)9, false);
    CGEventSetFlags(cmdVUp, kCGEventFlagMaskCommand);
    CGEventPost(kCGHIDEventTap, cmdVUp);
    CFRelease(cmdVUp);

    if (source) CFRelease(source);

    return env.Undefined();
}

Napi::Value SimulateTyping(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String argument required").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    std::u16string text = info[0].As<Napi::String>().Utf16Value();
    CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);

    for (size_t i = 0; i < text.length(); i++) {
        UniChar ch = text[i];
        CGEventRef keyDown = CGEventCreateKeyboardEvent(source, 0, true);
        CGEventRef keyUp = CGEventCreateKeyboardEvent(source, 0, false);

        CGEventKeyboardSetUnicodeString(keyDown, 1, &ch);
        CGEventKeyboardSetUnicodeString(keyUp, 1, &ch);

        CGEventPost(kCGHIDEventTap, keyDown);
        usleep(2000);  // 2ms delay between characters
        CGEventPost(kCGHIDEventTap, keyUp);
        usleep(2000);

        CFRelease(keyDown);
        CFRelease(keyUp);
    }

    if (source) CFRelease(source);

    return env.Undefined();
}
