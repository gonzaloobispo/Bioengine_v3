import undetected_chromedriver as uc
try:
    print(f"Detected Chrome version: {uc.Patcher().get_chrome_version()}")
except Exception as e:
    print(f"Error detecting version: {e}")
