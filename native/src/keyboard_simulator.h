#pragma once

#include <napi.h>

Napi::Value SimulatePaste(const Napi::CallbackInfo& info);
Napi::Value SimulateTyping(const Napi::CallbackInfo& info);
