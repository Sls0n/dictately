{
  "targets": [
    {
      "target_name": "dictately_native",
      "sources": [
        "src/addon.mm",
        "src/fn_key_monitor.mm",
        "src/keyboard_simulator.mm",
        "src/permissions_checker.mm"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        ["OS==\"mac\"", {
          "xcode_settings": {
            "OTHER_CFLAGS": ["-ObjC++", "-std=c++17"],
            "OTHER_LDFLAGS": [
              "-framework IOKit",
              "-framework CoreFoundation",
              "-framework ApplicationServices",
              "-framework CoreGraphics",
              "-framework AppKit"
            ]
          }
        }]
      ]
    }
  ]
}
