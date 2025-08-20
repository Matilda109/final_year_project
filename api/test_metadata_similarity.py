#!/usr/bin/env python3
"""
Test the new metadata similarity endpoint for student dashboard
"""

import requests
import json

def test_metadata_similarity():
    """Test the metadata similarity endpoint with sample data"""
    
    # Test data - title and description that should match something in repository
    test_data = {
        "title": "AI-Driven Customer Experience Optimization",
        "description": "This project focuses on developing an AI-powered system to enhance customer experience through personalized recommendations and automated support.",
        "projects": [
            {
                "id": "1",
                "title": "AI-Driven Customer Experience Optimization",
                "author": "John Doe",
                "year": "2023",
                "description": "This project focuses on developing an AI-powered system to enhance customer experience through personalized recommendations and automated support.",
                "tags": ["AI", "Customer Experience", "Machine Learning"],
                "document_url": None
            },
            {
                "id": "2",
                "title": "Machine Learning in Healthcare",
                "author": "Jane Smith",
                "year": "2023", 
                "description": "A comprehensive study on applying machine learning techniques to improve healthcare outcomes.",
                "tags": ["Machine Learning", "Healthcare"],
                "document_url": None
            },
            {
                "id": "3",
                "title": "Blockchain Supply Chain Management",
                "author": "Bob Wilson",
                "year": "2023",
                "description": "A blockchain solution for tracking supply chain operations with smart contracts.",
                "tags": ["Blockchain", "Supply Chain"],
                "document_url": None
            }
        ]
    }
    
    print("🧪 Testing Metadata Similarity Endpoint")
    print("=" * 50)
    print(f"📝 Test Title: {test_data['title']}")
    print(f"📝 Test Description: {test_data['description']}")
    print(f"📚 Repository Projects: {len(test_data['projects'])}")
    print()
    
    try:
        response = requests.post(
            'http://localhost:8000/check-metadata-similarity',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response Success!")
            print(f"📊 Overall Similarity: {result.get('overall_similarity', 'N/A')}%")
            print(f"🎯 Total Matches: {result.get('total_matches', 'N/A')}")
            print(f"⭐ Significant Matches (>20%): {result.get('significant_matches', 'N/A')}")
            print(f"🔧 Methodology: {result.get('methodology', 'N/A')}")
            print(f"📏 Comparison Type: {result.get('comparison_type', 'N/A')}")
            print()
            
            matches = result.get('matches', [])
            if matches:
                print("🏆 Top Matches:")
                for i, match in enumerate(matches[:3]):
                    print(f"  {i+1}. \"{match['title']}\" - {match['similarity_score']:.1f}%")
                    print(f"      by {match['author']} ({match['year']})")
            else:
                print("❌ No matches found!")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Error Details: {response.text}")
            
    except Exception as e:
        print(f"❌ Request Failed: {e}")

if __name__ == "__main__":
    test_metadata_similarity()
