import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__)))

from src.classifier import FakeReviewClassifier

def main():
    classifier = FakeReviewClassifier()
    csv_path = os.path.join(os.path.dirname(__file__), "data", "Labelled Yelp Dataset.csv")
    
    if os.path.exists(csv_path):
        # sample down to 50,000 for faster training
        success = classifier.train_from_csv(csv_path, sample_size=50000)
        if success:
            print("Training completed successfully.")
        else:
            print("Training failed.")
    else:
        print(f"Dataset not found at {csv_path}")

if __name__ == "__main__":
    main()
