import os
import sys

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from src.classifier import FakeReviewClassifier

def main():
    classifier = FakeReviewClassifier()
    csv_path = os.path.join(os.path.dirname(__file__), "data", "Labelled Yelp Dataset.csv")
    
    if os.path.exists(csv_path):
        # We sample it down as requested (50,000 is a good representative sample)
        success = classifier.train_from_csv(csv_path, sample_size=50000)
        if success:
            print("Training completed successfully.")
        else:
            print("Training failed.")
    else:
        print(f"Dataset not found at {csv_path}")

if __name__ == "__main__":
    main()
