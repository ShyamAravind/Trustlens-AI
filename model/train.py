import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from scipy.sparse import hstack, csr_matrix
import joblib
import re

df = pd.read_csv('dataset/reviews.csv')

def extract_features(text):
    if not isinstance(text, str):
        text = ''
    exclamation_count  = text.count('!')
    question_count     = text.count('?')
    caps_word_count    = len(re.findall(r'\b[A-Z]{2,}\b', text))
    word_count         = len(text.split())
    char_count         = len(text)
    exclamation_ratio  = exclamation_count / (word_count + 1)
    caps_ratio         = caps_word_count / (word_count + 1)
    avg_word_length    = char_count / (word_count + 1)
    return [
        exclamation_count,
        question_count,
        caps_word_count,
        word_count,
        exclamation_ratio,
        caps_ratio,
        avg_word_length
    ]

print("Extracting features...")
extra_features = np.array([extract_features(t) for t in df['text_']])

X_text = df['text_']
y      = df['label']

indices = np.arange(len(df))
idx_train, idx_test = train_test_split(indices, test_size=0.2, random_state=42)

X_text_train = X_text.iloc[idx_train]
X_text_test  = X_text.iloc[idx_test]
y_train      = y.iloc[idx_train]
y_test       = y.iloc[idx_test]
extra_train  = extra_features[idx_train]
extra_test   = extra_features[idx_test]

print("Vectorizing text...")
vectorizer   = TfidfVectorizer(max_features=10000, ngram_range=(1, 2))
X_tfidf_train = vectorizer.fit_transform(X_text_train)
X_tfidf_test  = vectorizer.transform(X_text_test)

X_train_combined = hstack([X_tfidf_train, csr_matrix(extra_train)])
X_test_combined  = hstack([X_tfidf_test,  csr_matrix(extra_test)])

print("Training model (this will take a few minutes)...")
model = RandomForestClassifier(
    n_estimators=200,
    n_jobs=-1,        
    random_state=42
)
model.fit(X_train_combined.toarray(), y_train)

y_pred = model.predict(X_test_combined.toarray())
print(f"\nAccuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")
print(classification_report(y_test, y_pred))

joblib.dump(model,      'model/model.pkl')
joblib.dump(vectorizer, 'model/vectorizer.pkl')
print("Model and vectorizer saved!")