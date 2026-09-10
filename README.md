# Trustlens-AI
TrustLens AI is an AI-powered Google Chrome extension that examines product reviews for any signs of fake or suspicious reviews. TrustLens AI works by examining the reviews on shopping websites and determining whether the reviews are legitimate, suspicious, or fake.

## Setup

Run all commands from the repository root.

1. Install dependencies

   ```
   pip install -r requirements.txt
   ```

2. Train the model (writes `model/model.pkl` and `model/vectorizer.pkl`)

   ```
   python model/train.py
   ```

3. Start the local API on port 5000

   ```
   python api/app.py
   ```

4. Load the extension: open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select the `extension/` folder. Then open a product page on a shopping site and click the TrustLens icon.
