#!/usr/bin/env python3
"""
Test script for the enhanced similarity checking system to verify accuracy
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

# Test cases with clearly different projects
test_cases = [
    {
        "name": "Machine Learning vs Agriculture (Should be LOW similarity)",
        "query": "Machine Learning Applications in Healthcare Diagnosis. This research investigates the use of neural networks and deep learning algorithms for medical image analysis and patient diagnosis systems.",
        "document": {
            "id": "test1",
            "title": "Sustainable Agriculture Practices in Rural Communities",
            "author": "Smith, J.",
            "year": 2023,
            "description": "This study examines traditional farming methods and crop rotation techniques used by rural farmers to improve soil fertility and increase agricultural productivity.",
            "tags": ["agriculture", "farming", "sustainability", "rural development"]
        }
    },
    {
        "name": "Similar ML Projects (Should be HIGH similarity)",
        "query": "Machine Learning Applications in Healthcare Diagnosis. This research investigates the use of neural networks and deep learning algorithms for medical image analysis and patient diagnosis systems.",
        "document": {
            "id": "test2", 
            "title": "Deep Learning for Medical Image Classification",
            "author": "Johnson, M.",
            "year": 2024,
            "description": "This research explores the application of convolutional neural networks and machine learning techniques for automated medical diagnosis and healthcare image analysis.",
            "tags": ["machine learning", "healthcare", "deep learning", "medical imaging"]
        }
    },
    {
        "name": "Web Development vs Data Science (Should be LOW similarity)",
        "query": "E-commerce Website Development using React and Node.js. Building a modern online shopping platform with user authentication, payment processing, and inventory management.",
        "document": {
            "id": "test3",
            "title": "Statistical Analysis of Climate Change Data",
            "author": "Brown, K.",
            "year": 2023,
            "description": "This research analyzes temperature and precipitation data over the past century to identify climate change patterns and predict future environmental trends.",
            "tags": ["climate change", "statistics", "data analysis", "environment"]
        }
    }
]

def test_enhanced_similarity():
    """Test the enhanced similarity algorithm"""
    print("=" * 80)
    print("TESTING ENHANCED SIMILARITY ALGORITHM")
    print("=" * 80)
    
    try:
        # Test BERT-based similarity
        print("\n🔬 Testing BERT-based Enhanced Similarity...")
        from similarity_model import compare_documents
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n--- Test Case {i}: {test_case['name']} ---")
            
            # Run similarity check
            results = compare_documents(test_case['query'], [test_case['document']])
            
            if results:
                result = results[0]
                similarity_score = result['similarity_score']
                details = result.get('similarity_details', {})
                
                print(f"📊 Overall Similarity: {similarity_score:.1f}%")
                
                if 'bert_similarity' in details:
                    print(f"   🧠 BERT Semantic: {details['bert_similarity']:.1f}%")
                if 'keyword_overlap' in details:
                    print(f"   🔑 Keyword Overlap: {details['keyword_overlap']:.1f}%")
                if 'tfidf_similarity' in details:
                    print(f"   📝 TF-IDF: {details['tfidf_similarity']:.1f}%")
                if 'length_factor' in details:
                    print(f"   📏 Length Factor: {details['length_factor']:.3f}")
                
                if 'query_keywords' in details and 'doc_keywords' in details:
                    print(f"   🔍 Query Keywords: {details['query_keywords']}")
                    print(f"   📄 Doc Keywords: {details['doc_keywords']}")
                
                # Evaluate result
                if "Should be LOW" in test_case['name']:
                    if similarity_score < 40:
                        print("   ✅ PASS: Correctly identified as low similarity")
                    else:
                        print(f"   ❌ FAIL: Expected low similarity but got {similarity_score:.1f}%")
                elif "Should be HIGH" in test_case['name']:
                    if similarity_score > 60:
                        print("   ✅ PASS: Correctly identified as high similarity")
                    else:
                        print(f"   ❌ FAIL: Expected high similarity but got {similarity_score:.1f}%")
            else:
                print("   ❌ ERROR: No results returned")
                
    except Exception as e:
        print(f"❌ BERT similarity test failed: {e}")
        import traceback
        traceback.print_exc()
    
    try:
        # Test TF-IDF fallback similarity
        print(f"\n{'='*80}")
        print("🔬 Testing TF-IDF Enhanced Similarity (Fallback)...")
        from simple_similarity import get_tfidf_similarity
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n--- Test Case {i}: {test_case['name']} ---")
            
            # Run similarity check
            results = get_tfidf_similarity(test_case['query'], [test_case['document']])
            
            if results:
                result = results[0]
                similarity_score = result['similarity_score']
                details = result.get('similarity_details', {})
                
                print(f"📊 Overall Similarity: {similarity_score:.1f}%")
                
                if 'base_similarity' in details:
                    print(f"   📝 Base TF-IDF: {details['base_similarity']:.1f}%")
                if 'keyword_overlap' in details:
                    print(f"   🔑 Keyword Overlap: {details['keyword_overlap']:.1f}%")
                if 'enhanced_similarity' in details:
                    print(f"   ⚡ Enhanced Score: {details['enhanced_similarity']:.1f}%")
                if 'length_factor' in details:
                    print(f"   📏 Length Factor: {details['length_factor']:.3f}")
                
                if 'query_keywords' in details and 'doc_keywords' in details:
                    print(f"   🔍 Query Keywords: {details['query_keywords']}")
                    print(f"   📄 Doc Keywords: {details['doc_keywords']}")
                
                # Evaluate result
                if "Should be LOW" in test_case['name']:
                    if similarity_score < 40:
                        print("   ✅ PASS: Correctly identified as low similarity")
                    else:
                        print(f"   ❌ FAIL: Expected low similarity but got {similarity_score:.1f}%")
                elif "Should be HIGH" in test_case['name']:
                    if similarity_score > 60:
                        print("   ✅ PASS: Correctly identified as high similarity")
                    else:
                        print(f"   ❌ FAIL: Expected high similarity but got {similarity_score:.1f}%")
            else:
                print("   ❌ ERROR: No results returned")
                
    except Exception as e:
        print(f"❌ TF-IDF similarity test failed: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\n{'='*80}")
    print("🏁 TESTING COMPLETE")
    print("If you see FAIL results, the algorithm needs further tuning.")
    print("The goal is to have LOW similarity for unrelated projects and HIGH similarity for related ones.")
    print("='*80")

if __name__ == "__main__":
    test_enhanced_similarity()
