"""
Simple text similarity module that uses TF-IDF and cosine similarity
as a fallback when BERT is not available
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
from typing import List, Dict, Any

def preprocess_text(text: str) -> str:
    """Clean and preprocess text for TF-IDF."""
    # Remove special characters and extra whitespace
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return text

def extract_keywords_simple(text: str) -> List[str]:
    """Extract important keywords from text using simple TF-IDF."""
    try:
        # Simple keyword extraction using TF-IDF
        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=20,
            ngram_range=(1, 2)
        )
        
        # Need at least 2 documents for TF-IDF, so duplicate the text
        tfidf_matrix = vectorizer.fit_transform([text, text])
        feature_names = vectorizer.get_feature_names_out()
        
        # Get TF-IDF scores for the first document
        scores = tfidf_matrix[0].toarray()[0]
        
        # Get top keywords
        keyword_scores = list(zip(feature_names, scores))
        keyword_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top keywords with non-zero scores
        return [kw for kw, score in keyword_scores if score > 0][:10]
    except:
        # Fallback to simple word extraction
        words = text.lower().split()
        return [w for w in words if len(w) > 3][:10]

def calculate_keyword_overlap_simple(keywords1: List[str], keywords2: List[str]) -> float:
    """Calculate keyword overlap between two lists."""
    if not keywords1 or not keywords2:
        return 0.0
    
    set1 = set(keywords1)
    set2 = set(keywords2)
    
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    return intersection / union if union > 0 else 0.0

def get_tfidf_similarity(query_text: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compare query text with documents using enhanced TF-IDF and keyword analysis.
    
    Args:
        query_text: The text to compare against the repository
        documents: List of documents with at least 'description' and 'title' fields
        
    Returns:
        List of documents with similarity scores added
    """
    print(f"Processing {len(documents)} documents for enhanced TF-IDF similarity comparison")
    
    # Preprocess query text
    query_text_clean = preprocess_text(query_text)
    query_keywords = extract_keywords_simple(query_text_clean)
    
    # Create document texts with better structure
    doc_texts = []
    doc_keywords_list = []
    
    for i, doc in enumerate(documents):
        # Build document text with proper structure
        doc_text = ""
        
        if 'title' in doc and doc['title']:
            doc_text += doc['title'] + ". "
            
        if 'description' in doc and doc['description']:
            doc_text += doc['description']
            
        if 'tags' in doc and doc['tags']:
            doc_text += ". Tags: " + ", ".join(doc['tags'])
        
        # Skip very short documents
        if len(doc_text.strip()) < 20:
            doc_texts.append("")
            doc_keywords_list.append([])
            continue
            
        cleaned_doc_text = preprocess_text(doc_text)
        doc_texts.append(cleaned_doc_text)
        doc_keywords_list.append(extract_keywords_simple(cleaned_doc_text))
    
    # If no valid documents, return empty results
    if not any(doc_texts):
        return [dict(doc, similarity_score=0.0, similarity_details={"reason": "No valid documents for comparison"}) for doc in documents]
    
    try:
        # Create enhanced TF-IDF vectorizer
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),  # Include bigrams for better context
            max_features=1000,   # Limit features to avoid overfitting
            min_df=1,           # Include terms that appear at least once
            max_df=0.95         # Exclude very common terms
        )
        
        # Filter out empty documents for vectorization
        valid_texts = [query_text_clean] + [text for text in doc_texts if text]
        valid_indices = [i for i, text in enumerate(doc_texts) if text]
        
        if len(valid_texts) < 2:  # Need at least query + 1 document
            return [dict(doc, similarity_score=0.0, similarity_details={"reason": "Insufficient valid documents"}) for doc in documents]
        
        # Generate TF-IDF matrix
        tfidf_matrix = vectorizer.fit_transform(valid_texts)
        
        # Calculate cosine similarity between query and each valid document
        cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        # Prepare results with enhanced scoring
        results = []
        valid_sim_index = 0
        
        for i, doc in enumerate(documents):
            doc_with_score = doc.copy()
            
            if i in valid_indices:
                base_similarity = cosine_similarities[valid_sim_index]
                
                # Calculate keyword overlap
                keyword_overlap = calculate_keyword_overlap_simple(query_keywords, doc_keywords_list[i])
                
                # Apply enhanced scoring similar to BERT version
                if keyword_overlap < 0.1:  # Very low keyword overlap
                    # Heavily penalize if there's no keyword overlap
                    enhanced_similarity = base_similarity * 0.3
                elif keyword_overlap < 0.2:  # Low keyword overlap
                    # Moderate penalty
                    enhanced_similarity = (base_similarity * 0.6 + keyword_overlap * 0.4) * 0.7
                else:
                    # Normal scoring when there's reasonable keyword overlap
                    enhanced_similarity = base_similarity * 0.7 + keyword_overlap * 0.3
                
                # Apply length-aware scaling
                query_words = len(query_text_clean.split())
                doc_words = len(doc_texts[i].split())
                
                if query_words > 0 and doc_words > 0:
                    length_ratio = min(query_words, doc_words) / max(query_words, doc_words)
                    length_factor = 0.7 + (0.3 * length_ratio)
                    final_similarity = enhanced_similarity * length_factor
                else:
                    final_similarity = enhanced_similarity
                
                # Convert to percentage and add details
                doc_with_score['similarity_score'] = float(min(final_similarity * 100, 100.0))
                doc_with_score['similarity_details'] = {
                    "method": "Enhanced TF-IDF with Keyword Analysis",
                    "base_similarity": round(base_similarity * 100, 2),
                    "keyword_overlap": round(keyword_overlap * 100, 2),
                    "enhanced_similarity": round(enhanced_similarity * 100, 2),
                    "length_factor": round(length_factor if query_words > 0 and doc_words > 0 else 1.0, 3),
                    "query_keywords": query_keywords[:5],
                    "doc_keywords": doc_keywords_list[i][:5]
                }
                
                # Debug logging for high similarity scores
                if final_similarity * 100 > 50:
                    print(f"  High TF-IDF similarity detected ({final_similarity*100:.1f}%):")
                    print(f"    Base TF-IDF: {base_similarity*100:.1f}%")
                    print(f"    Keywords: {keyword_overlap*100:.1f}%")
                    print(f"    Query keywords: {query_keywords[:3]}")
                    print(f"    Doc keywords: {doc_keywords_list[i][:3]}")
                
                valid_sim_index += 1
            else:
                # Document was too short or invalid
                doc_with_score['similarity_score'] = 0.0
                doc_with_score['similarity_details'] = {
                    "method": "Enhanced TF-IDF",
                    "reason": "Document too short for meaningful comparison"
                }
            
            results.append(doc_with_score)
        
        # Sort by similarity score (descending)
        results.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return results
    
    except Exception as e:
        print(f"Error in enhanced TF-IDF similarity calculation: {e}")
        # Return documents with zero similarity as fallback
        return [dict(doc, similarity_score=0.0, similarity_details={"error": str(e), "method": "TF-IDF fallback"}) for doc in documents]

def get_simple_similarity_report(query_text: str, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a similarity report using TF-IDF instead of BERT.
    
    Args:
        query_text: The text to check for similarity
        documents: List of documents to compare against
        
    Returns:
        Dictionary with similarity analysis results
    """
    # Get documents with similarity scores
    scored_docs = get_tfidf_similarity(query_text, documents)
    
    # Calculate overall similarity score (weighted average of top matches)
    top_matches = scored_docs[:5] if len(scored_docs) >= 5 else scored_docs
    
    if not top_matches:
        return {
            "overall_similarity": 0,
            "matches": [],
            "word_count": len(query_text.split()),
            "database_size": len(documents)
        }
    
    # Weight by similarity (higher similarity gets more weight)
    weights = [match['similarity_score'] for match in top_matches]
    total_weight = sum(weights) if sum(weights) > 0 else 1
    overall_similarity = sum(match['similarity_score'] * (match['similarity_score']/total_weight) 
                           for match in top_matches)
    
    # Prepare match results
    matches = [{
        "id": doc.get('id', ''),
        "title": doc['title'],
        "author": doc['author'],
        "year": doc['year'],
        "similarity_score": doc['similarity_score'],
        "document_url": doc.get('document_url', None)
    } for doc in top_matches]
    
    return {
        "overall_similarity": min(overall_similarity, 100),  # Cap at 100%
        "matches": matches,
        "word_count": len(query_text.split()),
        "database_size": len(documents)
    }
