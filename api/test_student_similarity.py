#!/usr/bin/env python3
"""
Test script to debug student dashboard similarity check issue
"""

import requests
import json
from similarity_model import compare_documents

def test_student_similarity_api():
    """Test the student similarity check with identical content"""
    
    # Simulate what student dashboard sends (title + description only)
    student_query = "AI-Driven Customer Experience Optimization. This project focuses on developing an AI-powered system to enhance customer experience through personalized recommendations and automated support."
    
    # Simulate repository projects (what should be in the database)
    mock_projects = [
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
            "description": "A comprehensive study on applying machine learning techniques to improve healthcare outcomes and patient care.",
            "tags": ["Machine Learning", "Healthcare", "Data Science"],
            "document_url": None
        }
    ]
    
    print("🧪 Testing Student Dashboard Similarity Check")
    print("=" * 60)
    print(f"📝 Student Query: {student_query}")
    print(f"📝 Query Length: {len(student_query)} characters")
    print(f"📚 Repository Projects: {len(mock_projects)}")
    print()
    
    # Test 1: Direct API call (what student dashboard does)
    print("🌐 Test 1: Direct API Call")
    try:
        response = requests.post('http://localhost:8000/check-similarity', 
            json={
                "text": student_query,
                "projects": mock_projects
            },
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Response: {response.status_code}")
            print(f"📊 Overall Similarity: {result.get('overall_similarity', 'N/A')}%")
            print(f"🎯 Total Matches: {len(result.get('matches', []))}")
            
            if result.get('matches'):
                print("🏆 Top Matches:")
                for i, match in enumerate(result['matches'][:3]):
                    print(f"  {i+1}. \"{match['title']}\" - {match['similarity_score']:.1f}%")
            else:
                print("❌ No matches found!")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ API Call Failed: {e}")
    
    print()
    
    # Test 2: Direct function call (bypass API)
    print("🔧 Test 2: Direct Function Call")
    try:
        direct_result = compare_documents(student_query, mock_projects)
        print(f"✅ Direct Function Success")
        print(f"🎯 Total Matches: {len(direct_result)}")
        
        if direct_result:
            print("🏆 Top Matches:")
            for i, match in enumerate(direct_result[:3]):
                print(f"  {i+1}. \"{match['title']}\" - {match['similarity_score']:.1f}%")
        else:
            print("❌ No matches found!")
            
    except Exception as e:
        print(f"❌ Direct Function Failed: {e}")

if __name__ == "__main__":
    test_student_similarity_api()
