import os
import sys

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from src.classifier import FakeReviewClassifier

def main():
    classifier = FakeReviewClassifier()
    if not classifier.load_model():
        print("Failed to load model.")
        return

    test_cases = [
        ("Amazing place, loved it!", 5),
        ("Great food and service.", 5),
        ("Worst experience ever, avoid at all costs.", 1),
        ("Highly recommended!", 5),
        ("SPAM SPAM SPAM buy cheap watches here", 5),
        ("I love this place so much I visited 100 times today!!!!!!!", 5),
        ("This is a beautiful quaint little restaurant on a pretty street. If you're strolling through soho around lunchtime, this would be a great place to stop for a bite.", 5)
    ]

    print(f"{'Text':<60} | {'Rating':<6} | {'Score':<6} | {'Fake?'}")
    print("-" * 85)
    for text, rating in test_cases:
        score = classifier.predict(text, {'rating': rating})
        is_suspicious = score > classifier.threshold
        print(f"{text[:60]:<60} | {rating:<6} | {score:<6.3f} | {is_suspicious}")

if __name__ == "__main__":
    main()
