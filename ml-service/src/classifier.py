import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from scipy.sparse import hstack
import joblib
import os

class FakeReviewClassifier:
    def __init__(self, threshold=0.75):
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words='english'
        )
        self.model = LogisticRegression(
            max_iter=1000
        )
        self.is_trained = False
        self.model_path = os.path.join(os.path.dirname(__file__), "..", "model.joblib")
        self.vectorizer_path = os.path.join(os.path.dirname(__file__), "..", "vectorizer.joblib")
        self.threshold = threshold

    def _extract_metadata_features(self, texts, ratings):
        lengths = np.array([len(str(t)) for t in texts]).reshape(-1, 1)
        ratings = np.array(ratings).reshape(-1, 1)
        exclamations = np.array([str(t).count('!') for t in texts]).reshape(-1, 1)
        
        lengths = lengths / 1000.0 
        exclamations = exclamations / 10.0
        
        return np.hstack([lengths, ratings, exclamations])

    def _build_features(self, texts, ratings, fit=False):
        if fit:
            text_features = self.vectorizer.fit_transform(texts)
        else:
            text_features = self.vectorizer.transform(texts)
            
        meta_features = self._extract_metadata_features(texts, ratings)
        return hstack([text_features, meta_features])

    def train(self, texts, labels, ratings):
        X = self._build_features(texts, ratings, fit=True)
        self.model.fit(X, labels)
        self.is_trained = True
        self.save_model()

    def train_from_csv(self, file_path, sample_size=50000):
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return False

        print(f"Loading dataset from {file_path}...")
        df = pd.read_csv(file_path)
        
        df['Label'] = df['Label'].map({-1: 1, 1: 0})
        
        if len(df) > sample_size:
            print(f"Sampling {sample_size} rows...")
            df = df.sample(n=sample_size, random_state=42)
            
        texts = df['Review'].fillna('').tolist()
        labels = df['Label'].tolist()
        ratings = df['Rating'].tolist()

        X_text_train, X_text_test, y_train, y_test, r_train, r_test = train_test_split(
            texts, labels, ratings, test_size=0.2, random_state=42
        )

        X_train = self._build_features(X_text_train, r_train, fit=True)
        X_test = self._build_features(X_text_test, r_test, fit=False)

        print(f"Training on {X_train.shape[0]} samples with {X_train.shape[1]} features...")
        self.model.fit(X_train, y_train)
        self.is_trained = True

        y_pred = self.model.predict(X_test)
        print("\nModel Evaluation:")
        print(classification_report(y_test, y_pred))

        self.save_model()
        return True

    def save_model(self):
        joblib.dump(self.model, self.model_path)
        joblib.dump(self.vectorizer, self.vectorizer_path)

    def load_model(self):
        if os.path.exists(self.model_path) and os.path.exists(self.vectorizer_path):
            self.model = joblib.load(self.model_path)
            self.vectorizer = joblib.load(self.vectorizer_path)
            self.is_trained = True
            return True
        return False

    def predict(self, text, metadata=None):
        if not self.is_trained:
            if not self.load_model():
                # Auto-train if no model exists
                csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "Labelled Yelp Dataset.csv")
                if not self.train_from_csv(csv_path):
                     # Fallback
                     texts = ["Good food", "Great service", "SPAM SPAM", "FAKE FAKE"]
                     labels = [0, 0, 1, 1]
                     ratings = [5, 5, 1, 1]
                     self.train(texts, labels, ratings)
        
        rating = metadata.get('rating', 3) if metadata else 3
        X = self._build_features([text], [rating], fit=False)
        
        prob = self.model.predict_proba(X)[0][1] 
        
        if metadata:
            if metadata.get('rating_deviation', 0) > 2:
                prob += 0.2
            if len(text) < 10:
                prob += 0.1
        
        import re
        repeats = re.findall(r'(\b\w+\b)(?:\s+\1)+', text, re.IGNORECASE)
        if repeats:
            prob += 0.15 * len(repeats)

        vowels = set("aeiou")
        words = [w for w in text.lower().split() if len(w) > 4]
        nonsense_count = 0
        for w in words:
            v_count = sum(1 for char in w if char in vowels)
            if v_count == 0 or len(w) / v_count > 5:
                nonsense_count += 1
        
        if nonsense_count > 0:
            prob += 0.2 * nonsense_count
                
        prob = max(0.0, min(1.0, float(prob)))
        
        return prob
classifier = FakeReviewClassifier()
