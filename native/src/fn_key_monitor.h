#pragma once

#include <napi.h>

Napi::Value StartFnMonitor(const Napi::CallbackInfo& info);
Napi::Value StopFnMonitor(const Napi::CallbackInfo& info);
