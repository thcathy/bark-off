# Store screenshots

`fastlane ios metadata` and `fastlane android metadata` upload whatever is in this repo. They do not download the live listing back over these files.

App Store screenshots go here. One PNG per shot, named with the device:

```
fastlane/screenshots/en-US/iPhone 16 Pro Max-01.png
fastlane/screenshots/zh-Hant/
fastlane/screenshots/zh-Hans/
```

Pixel size: 1320 × 2868.

Play phone screenshots go here. At least two per language, 1080 × 1920:

```
fastlane/metadata/android/en-US/images/phoneScreenshots/01.png
fastlane/metadata/android/zh-HK/images/phoneScreenshots/
fastlane/metadata/android/zh-CN/images/phoneScreenshots/
```

Play feature graphic, 1024 × 500, when you have one:

```
fastlane/metadata/android/en-US/images/featureGraphic.png
```

Same path under `zh-HK` and `zh-CN`.

If a screenshot folder has no PNG, that upload leaves the images already on the store alone.
