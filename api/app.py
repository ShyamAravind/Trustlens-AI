from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from scipy.sparse import hstack, csr_matrix
import re
import os

# Resolve model files relative to this file so the API works from any working directory
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'model')
model = joblib.load(os.path.join(MODEL_DIR, 'model.pkl'))
vectorizer = joblib.load(os.path.join(MODEL_DIR, 'vectorizer.pkl'))

def extract_features(text):
    if not isinstance(text, str):
        text = ''
    exclamation_count = text.count('!')
    question_count    = text.count('?')
    caps_word_count   = len(re.findall(r'\b[A-Z]{2,}\b', text))
    word_count        = len(text.split())
    char_count        = len(text)
    exclamation_ratio = exclamation_count / (word_count + 1)
    caps_ratio        = caps_word_count / (word_count + 1)
    avg_word_length   = char_count / (word_count + 1)
    return [exclamation_count, question_count, caps_word_count,
            word_count, exclamation_ratio, caps_ratio, avg_word_length]

app = Flask(__name__)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    data   = request.get_json(silent=True) or {}
    review = data.get('review', '')
    if not isinstance(review, str) or not review.strip():
        return jsonify({'error': 'No review provided'}), 400

    tfidf_vec = vectorizer.transform([review])
    extra     = np.array([extract_features(review)])
    combined  = hstack([tfidf_vec, csr_matrix(extra)]).toarray()
    prob      = model.predict_proba(combined)[0]
    cg_index  = list(model.classes_).index('CG')
    fake_prob = round(prob[cg_index] * 100, 2)

    word_count = len(review.split())
    if word_count <= 5:
        fake_prob = min(fake_prob + 40, 99)
    elif word_count <= 10:
        fake_prob = min(fake_prob + 20, 99)
    elif word_count <= 15:
        fake_prob = min(fake_prob + 10, 99)

    return jsonify({
        'fake_probability': fake_prob,
        'label': 'FAKE' if fake_prob >= 50 else 'REAL'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)