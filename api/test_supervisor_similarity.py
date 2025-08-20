#!/usr/bin/env python3
"""
Controlled test to verify supervisor similarity check data flow
"""

import requests
import json

def test_supervisor_similarity():
    """Test the supervisor similarity API with controlled data"""
    
    print("🧪 CONTROLLED SUPERVISOR SIMILARITY TEST")
    print("=" * 50)
    
    # Test data - identical content
    test_document = """
    Machine Learning in Healthcare Applications
    
    This research explores the application of machine learning algorithms in healthcare diagnostics.
    The study focuses on neural networks, deep learning, and predictive analytics for medical diagnosis.
    Key findings include improved accuracy in disease detection and patient outcome prediction.
    
    Keywords: machine learning, healthcare, neural networks, medical diagnosis, predictive analytics
    """
    
    # Mock repository project with identical content
    test_projects = [
        {
            "id": "test-001",
            "title": "Machine Learning in Healthcare Applications",
            "author": "Test Author",
            "year": 2024,
            "description": "This research explores the application of machine learning algorithms in healthcare diagnostics. The study focuses on neural networks, deep learning, and predictive analytics for medical diagnosis. Key findings include improved accuracy in disease detection and patient outcome prediction.",
            "tags": ["machine learning", "healthcare", "neural networks", "medical diagnosis", "predictive analytics"],
            "document_url": None  # No URL - will use metadata
        },
        {
            "id": "test-002", 
            "title": "Agricultural Automation Systems",
            "author": "Different Author",
            "year": 2023,
            "description": "Study of automated farming techniques using IoT sensors and robotics for crop monitoring and harvesting optimization.",
            "tags": ["agriculture", "automation", "IoT", "robotics", "farming"],
            "document_url": None
        }
    ]
    
    # Test API call
    try:
        print(f"📤 Sending test data to API...")
        print(f"📄 Document length: {len(test_document)} characters")
        print(f"📊 Repository size: {len(test_projects)} projects")
        print(f"🎯 Expected result: HIGH similarity for project 1, LOW for project 2")
        
        response = requests.post(
            'http://localhost:8000/check-similarity',
            headers={'Content-Type': 'application/json'},
            json={
                'text': test_document,
                'projects': test_projects
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ API Response received:")
            print(f"📊 Overall similarity: {result['overall_similarity']}%")
            print(f"🎯 Matches found: {len(result['matches'])}")
            
            print(f"\n📋 Individual Results:")
            for i, match in enumerate(result['matches']):
                print(f"  {i+1}. \"{match['title']}\" - {match['similarity_score']}%")
                
            # Analyze results
            if len(result['matches']) >= 2:
                first_score = result['matches'][0]['similarity_score']
                second_score = result['matches'][1]['similarity_score']
                
                print(f"\n🔍 ANALYSIS:")
                if first_score > 70:
                    print(f"✅ PASS: Identical document detected ({first_score}%)")
                else:
                    print(f"❌ FAIL: Identical document not detected ({first_score}%)")
                    
                if second_score < 30:
                    print(f"✅ PASS: Different document correctly identified ({second_score}%)")
                else:
                    print(f"⚠️  WARN: Different document similarity too high ({second_score}%)")
            
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: API server not running on localhost:8000")
        print("Please start the API server with: python app.py")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    test_supervisor_similarity()
