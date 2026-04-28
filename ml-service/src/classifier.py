import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib
import os

class FakeReviewClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.model = LogisticRegression()
        self.is_trained = False
        self.model_path = "model.joblib"
        self.vectorizer_path = "vectorizer.joblib"

    def train_initial(self):
        # Mock data for initial training
        # 1 = Fake, 0 = Real
        texts = [
            "Amazing place, loved it!",
            "Great food and service.",
            "Worst experience ever, avoid at all costs.",
            "Highly recommended!",
            "SPAM SPAM SPAM buy cheap watches here",
            "Fake review for testing purposes",
            "I love this place so much I visited 100 times today",
            "The food was okay, nothing special.",
            "GREAT GREAT GREAT GREAT GREAT GREAT",
            "Best restaurant in the city, five stars!",
            "GREAT GREAT GREAT GREAT FFFF FFFF"
        ]
        labels = [0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1]
        
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)
        self.is_trained = True
        self.save_model()

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
                self.train_initial()
        
        X = self.vectorizer.transform([text])
        prob = self.model.predict_proba(X)[0][1] # Probability of class 1 (Fake)
        
        # Add simple heuristic based on metadata if provided
        # For example, if rating deviation is very high
        if metadata:
            rating_dev = metadata.get('rating_deviation', 0)
            if rating_dev > 2:
                prob = min(1.0, prob + 0.2)
        
        return float(prob)

# Singleton instance
classifier = FakeReviewClassifier()
