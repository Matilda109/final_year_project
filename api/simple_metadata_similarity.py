#!/usr/bin/env python3
"""
Simple metadata-only similarity check for student dashboard
Compares only title and description, not full documents
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Dict, Any

def preprocess_text_simple(text: str) -> str:
    """Simple text preprocessing for metadata comparison"""
    if not text:
        return ""
    
    # Convert to lowercase and remove extra whitespace
    text = text.lower().strip()
    
    # Remove special characters but keep spaces and basic punctuation
    text = re.sub(r'[^\w\s\-\.]', ' ', text)
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text

def calculate_metadata_similarity(query_title: str, query_description: str, projects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Calculate similarity based only on title and description metadata
    Simple and fast comparison for student dashboard
    """
    
    # Prepare query text (title + description)
    query_text = f"{query_title}. {query_description}"
    query_text = preprocess_text_simple(query_text)
    
    if len(query_text.strip()) < 10:
        print("Query text too short for meaningful comparison")
        return []
    
    results = []
    
    # Prepare all texts for vectorization
    all_texts = [query_text]
    project_texts = []
    
    for project in projects:
        # Combine title and description for each project
        project_title = project.get('title', '') or ''
        project_desc = project.get('description', '') or ''
        project_text = f"{project_title}. {project_desc}"
        project_text = preprocess_text_simple(project_text)
        
        all_texts.append(project_text)
        project_texts.append(project_text)
    
    try:
        # Use TF-IDF for simple, fast similarity calculation
        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=500,
            ngram_range=(1, 2),  # Include bigrams for better matching
            min_df=1
        )
        
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        
        # Calculate similarity between query and each project
        query_vector = tfidf_matrix[0:1]
        project_vectors = tfidf_matrix[1:]
        
        similarities = cosine_similarity(query_vector, project_vectors)[0]
        
        # Create results with similarity scores
        for i, project in enumerate(projects):
            similarity_score = float(similarities[i]) * 100  # Convert to percentage
            
            if similarity_score > 5:  # Only include if there's some similarity
                project_result = project.copy()
                project_result['similarity_score'] = similarity_score
                results.append(project_result)
        
        # Sort by similarity score (highest first)
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        print(f"Metadata similarity check completed. Found {len(results)} matches above 5% similarity")
        
        return results
        
    except Exception as e:
        print(f"Error in metadata similarity calculation: {e}")
        return []

def get_metadata_similarity_report(query_title: str, query_description: str, projects: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a similarity report for metadata-only comparison
    """
    
    matches = calculate_metadata_similarity(query_title, query_description, projects)
    
    # Calculate overall similarity (highest match or 0)
    overall_similarity = matches[0]['similarity_score'] if matches else 0.0
    
    # Filter for significant matches (>20% similarity)
    significant_matches = [m for m in matches if m['similarity_score'] > 20]
    
    report = {
        "overall_similarity": round(overall_similarity, 1),
        "matches": matches,
        "significant_matches": len(significant_matches),
        "total_matches": len(matches),
        "database_size": len(projects),
        "methodology": "TF-IDF Metadata Comparison",
        "query_length": len(f"{query_title}. {query_description}".split()),
        "comparison_type": "title_and_description_only"
    }
    
    return report
