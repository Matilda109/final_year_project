import torch
from transformers import AutoTokenizer, AutoModel
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict, Any
import re
import string
import requests
import PyPDF2
import io
from urllib.parse import urlparse
import os
import statistics
import math

# Load pre-trained model and tokenizer - defer loading until needed to avoid startup issues
MODEL_NAME = "bert-base-uncased"
tokenizer = None
model = None

def load_model_if_needed():
    global tokenizer, model
    if tokenizer is None or model is None:
        try:
            tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            model = AutoModel.from_pretrained(MODEL_NAME)
        except Exception as e:
            print(f"Error loading BERT model: {e}")
            raise

def extract_document_content(document_url: str) -> str:
    """
    Extract text content from a document URL.
    Supports PDF files and text files.
    """
    if not document_url:
        return ""
    
    try:
        print(f"📄 Extracting content from: {document_url}")
        
        # Download the document
        response = requests.get(document_url, timeout=30)
        response.raise_for_status()
        
        # Determine file type from URL or content type
        parsed_url = urlparse(document_url)
        file_extension = os.path.splitext(parsed_url.path)[1].lower()
        content_type = response.headers.get('content-type', '').lower()
        
        # Extract text based on file type
        if file_extension == '.pdf' or 'pdf' in content_type:
            return extract_pdf_text(response.content)
        elif file_extension in ['.txt', '.md'] or 'text' in content_type:
            return response.text
        else:
            print(f"⚠️ Unsupported file type for {document_url}")
            return ""
            
    except Exception as e:
        print(f"❌ Error extracting content from {document_url}: {e}")
        return ""

def extract_pdf_text(pdf_content: bytes) -> str:
    """
    Extract text from PDF content.
    """
    try:
        pdf_file = io.BytesIO(pdf_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        print(f"❌ Error extracting PDF text: {e}")
        return ""

def preprocess_text(text: str, preserve_structure: bool = False) -> str:
    """Clean and preprocess text while preserving important academic content."""
    if preserve_structure:
        # Preserve important punctuation for academic texts
        # Keep periods, commas, semicolons, colons, and quotation marks
        text = re.sub(r'[^\w\s.,;:"\'-]', ' ', text)
        # Normalize multiple spaces but preserve sentence structure
        text = re.sub(r'\s+', ' ', text).strip()
    else:
        # Original aggressive cleaning for fallback
        text = re.sub(r'[^\w\s]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_keywords(text: str) -> List[str]:
    """Extract important keywords from text using TF-IDF."""
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

def calculate_keyword_overlap(keywords1: List[str], keywords2: List[str]) -> float:
    """Calculate keyword overlap between two lists."""
    if not keywords1 or not keywords2:
        return 0.0
    
    set1 = set(keywords1)
    set2 = set(keywords2)
    
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    return intersection / union if union > 0 else 0.0

def get_bert_embedding(text: str, max_length: int = 512) -> np.ndarray:
    """Generate BERT embedding for a text."""
    # Load model if not already loaded
    load_model_if_needed()
    
    # Preprocess text
    text = preprocess_text(text)
    
    # Tokenize and prepare for BERT
    inputs = tokenizer(text, return_tensors="pt", max_length=max_length, 
                      padding="max_length", truncation=True)
    
    # Get BERT embeddings
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Use the [CLS] token embedding as document representation
    # This is a common approach for document-level embeddings
    embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()
    return embedding[0]  # Return as 1D array

def calculate_enhanced_similarity(query_text: str, doc_text: str) -> Dict[str, float]:
    """Calculate enhanced similarity using multiple methods."""
    
    # 1. BERT Semantic Similarity
    query_embedding = get_bert_embedding(query_text)
    doc_embedding = get_bert_embedding(doc_text)
    bert_similarity = cosine_similarity([query_embedding], [doc_embedding])[0][0]
    
    # 2. Keyword Overlap Analysis
    query_keywords = extract_keywords(query_text)
    doc_keywords = extract_keywords(doc_text)
    keyword_overlap = calculate_keyword_overlap(query_keywords, doc_keywords)
    
    # 3. Length-based penalty for very different document lengths
    query_words = len(query_text.split())
    doc_words = len(doc_text.split())
    
    if query_words == 0 or doc_words == 0:
        length_factor = 0.0
    else:
        length_ratio = min(query_words, doc_words) / max(query_words, doc_words)
        length_factor = 0.7 + (0.3 * length_ratio)  # Scale between 0.7 and 1.0
    
    # 4. TF-IDF Similarity for additional validation
    try:
        vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
        tfidf_matrix = vectorizer.fit_transform([query_text, doc_text])
        tfidf_similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    except:
        tfidf_similarity = 0.0
    
    # 5. Combined scoring with conservative weighting
    # Require both semantic and keyword similarity for high scores
    if keyword_overlap < 0.1:  # Very low keyword overlap
        # Heavily penalize if there's no keyword overlap
        combined_score = bert_similarity * 0.3
    elif keyword_overlap < 0.2:  # Low keyword overlap
        # Moderate penalty
        combined_score = (bert_similarity * 0.6 + keyword_overlap * 0.4) * 0.7
    else:
        # Normal scoring when there's reasonable keyword overlap
        combined_score = (
            bert_similarity * 0.4 +
            keyword_overlap * 0.3 +
            tfidf_similarity * 0.2 +
            length_factor * 0.1
        )
    
    # Apply length factor
    final_score = combined_score * length_factor
    
    return {
        'bert_similarity': bert_similarity,
        'keyword_overlap': keyword_overlap,
        'tfidf_similarity': tfidf_similarity,
        'length_factor': length_factor,
        'combined_score': combined_score,
        'final_score': final_score,
        'query_keywords': query_keywords,
        'doc_keywords': doc_keywords
    }

def compare_documents(query_text: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compare query text with a list of documents using enhanced similarity analysis.
    """
    print(f"\n🔄 ENHANCED SIMILARITY MODEL DEBUG:")
    print(f"📊 Processing {len(documents)} documents for enhanced similarity comparison")
    print(f"📝 Query text preview: '{query_text[:200]}...'")
    
    query_text_clean = preprocess_text(query_text, preserve_structure=True)
    print(f"🧹 Cleaned query text preview: '{query_text_clean[:200]}...'")
    
    results = []
    for i, doc in enumerate(documents):
        print(f"Processing document {i+1}/{len(documents)}: {doc.get('title', 'Untitled')[:50]}...")
        
        # Try to get full document content first
        doc_text = ""
        full_content_extracted = False
        
        # Check if document has a URL and try to extract full content
        if 'document_url' in doc and doc['document_url']:
            print(f"  📄 Found document URL, extracting full content...")
            full_document_content = extract_document_content(doc['document_url'])
            if full_document_content and len(full_document_content.strip()) > 100:
                doc_text = full_document_content
                full_content_extracted = True
                print(f"  ✅ Extracted {len(doc_text)} characters from full document")
            else:
                print(f"  ⚠️ Failed to extract meaningful content from document URL")
        
        # Fallback to enhanced metadata if full content extraction failed
        if not full_content_extracted:
            print(f"  📝 Using enhanced metadata comparison as fallback")
            
            # Create a more comprehensive metadata representation
            metadata_parts = []
            
            if 'title' in doc and doc['title']:
                # Repeat title multiple times to increase its weight in similarity
                title = doc['title']
                metadata_parts.extend([title, title, title])
                
            if 'description' in doc and doc['description']:
                description = doc['description']
                metadata_parts.append(description)
                # If description is substantial, add it multiple times
                if len(description) > 100:
                    metadata_parts.append(description)
                    
            if 'tags' in doc and doc['tags']:
                tags_text = " ".join(doc['tags'])
                metadata_parts.extend([tags_text, tags_text])  # Repeat tags for weight
                
            if 'author' in doc and doc['author']:
                author = doc['author']
                metadata_parts.append(f"Author: {author}")
                
            doc_text = ". ".join(metadata_parts)
            print(f"  📄 Enhanced metadata length: {len(doc_text)} characters")
        
        # Skip very short documents
        if len(doc_text.strip()) < 20:
            doc_with_score = doc.copy()
            doc_with_score['similarity_score'] = 0.0
            doc_with_score['similarity_details'] = {
                "reason": "Document too short for meaningful comparison"
            }
            results.append(doc_with_score)
            continue
        
        # Clean document text
        doc_text_clean = preprocess_text(doc_text, preserve_structure=True)
        
        # Special check for potentially identical documents
        # If we're using metadata and there are strong indicators of similarity
        is_potentially_identical = False
        if not full_content_extracted:
            # Check for strong title similarity
            query_title_words = set(query_text_clean.lower().split())
            doc_title = doc.get('title', '').lower()
            doc_title_words = set(doc_title.split())
            
            # If titles share many words, this might be the same document
            if doc_title_words and query_title_words:
                title_overlap = len(query_title_words.intersection(doc_title_words))
                title_similarity = title_overlap / max(len(query_title_words), len(doc_title_words))
                
                if title_similarity > 0.7:  # 70% word overlap in titles
                    is_potentially_identical = True
                    print(f"  🎯 Potential identical document detected (title similarity: {title_similarity:.2f})")
        
        try:
            # Calculate enhanced similarity
            similarity_analysis = calculate_enhanced_similarity(query_text_clean, doc_text_clean)
            similarity_score = similarity_analysis['final_score'] * 100
            
            # Boost score for potentially identical documents
            if is_potentially_identical and similarity_score > 30:
                original_score = similarity_score
                similarity_score = min(similarity_score * 2.5, 95.0)  # Cap at 95%
                print(f"  🚀 Boosted similarity from {original_score:.1f}% to {similarity_score:.1f}% (potential identical document)")
            
            # Add detailed results to document
            doc_with_score = doc.copy()
            doc_with_score['similarity_score'] = float(min(similarity_score, 100.0))
            doc_with_score['similarity_details'] = {
                "bert_similarity": round(similarity_analysis['bert_similarity'] * 100, 2),
                "keyword_overlap": round(similarity_analysis['keyword_overlap'] * 100, 2),
                "tfidf_similarity": round(similarity_analysis['tfidf_similarity'] * 100, 2),
                "length_factor": round(similarity_analysis['length_factor'], 3),
                "query_keywords": similarity_analysis['query_keywords'][:5],
                "doc_keywords": similarity_analysis['doc_keywords'][:5],
                "method": "Enhanced Multi-Method Analysis"
            }
            
            # Debug logging for high similarity scores
            if similarity_score > 50:
                print(f"  High similarity detected ({similarity_score:.1f}%):")
                print(f"    BERT: {similarity_analysis['bert_similarity']*100:.1f}%")
                print(f"    Keywords: {similarity_analysis['keyword_overlap']*100:.1f}%")
                print(f"    Query keywords: {similarity_analysis['query_keywords'][:3]}")
                print(f"    Doc keywords: {similarity_analysis['doc_keywords'][:3]}")
            
        except Exception as e:
            print(f"Error processing document {i+1}: {e}")
            # Fallback to zero similarity
            doc_with_score = doc.copy()
            doc_with_score['similarity_score'] = 0.0
            doc_with_score['similarity_details'] = {
                "error": str(e),
                "method": "Error - fallback to zero"
            }
        
        results.append(doc_with_score)
    
    # Sort by similarity score (descending)
    results.sort(key=lambda x: x['similarity_score'], reverse=True)
    
    return results

def get_similarity_report(query_text: str, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a comprehensive similarity report.
    
    Args:
        query_text: The text to check for similarity
        documents: List of documents to compare against
        
    Returns:
        Dictionary with similarity analysis results
    """
    # Get documents with similarity scores
    scored_docs = compare_documents(query_text, documents)
    
    # Calculate overall similarity score (weighted average of top matches)
    top_matches = scored_docs[:5] if len(scored_docs) >= 5 else scored_docs
    
    if not top_matches:
        return {
            "overall_similarity": 0,
            "matches": [],
            "word_count": len(query_text.split()),
            "database_size": len(documents)
        }
    
    # Calculate overall similarity as the highest match score
    # This is more intuitive than a weighted average for duplication detection
    if top_matches:
        overall_similarity = max(match['similarity_score'] for match in top_matches)
    else:
        overall_similarity = 0
    
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
