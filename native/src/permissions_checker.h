#pragma once

#include <napi.h>

Napi::Value CheckAccessibility(const Napi::CallbackInfo& info);
Napi::Value RequestAccessibility(const Napi::CallbackInfo& info);
Napi::Value CheckInputMonitoring(const Napi::CallbackInfo& info);
Napi::Value RequestInputMonitoring(const Napi::CallbackInfo& info);
