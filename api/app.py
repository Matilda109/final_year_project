from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import os
from fastapi.middleware.cors import CORSMiddleware

# Try to import BERT similarity, fall back to simple similarity if it fails
try:
    from similarity_model import get_similarity_report, compare_documents
    USING_BERT = True
    print("Using BERT similarity model")
except Exception as e:
    print(f"Failed to import BERT model: {e}")
    from simple_similarity import get_simple_similarity_report
    from simple_metadata_similarity import get_metadata_similarity_report
    USING_BERT = False
    print("Using simple TF-IDF similarity model as fallback")

app = FastAPI(title="Document Similarity API")

# Add CORS middleware to allow cross-origin requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load sample data if needed for testing
SAMPLE_DATA_PATH = os.path.join(os.path.dirname(__file__), "sample_data.json")

def load_sample_data():
    """Load sample project data if available"""
    if os.path.exists(SAMPLE_DATA_PATH):
        with open(SAMPLE_DATA_PATH, "r") as f:
            return json.load(f)
    return []

class DocumentRequest(BaseModel):
    text: str
    projects: Optional[List[Dict[str, Any]]] = None

class SimilarityResponse(BaseModel):
    overall_similarity: float
    matches: List[Dict[str, Any]]
    word_count: int
    database_size: int

@app.post("/check-similarity", response_model=SimilarityResponse)
async def check_similarity(request: DocumentRequest = Body(...)):
    """
    Check document similarity against repository projects
    """
    try:
        # Use provided projects or fallback to sample data
        projects = request.projects
        print(f"\n🔍 SUPERVISOR DASHBOARD SIMILARITY CHECK DEBUG:")
        print(f"📊 Received {len(projects) if projects else 0} projects from frontend")
        print(f"📄 Query text length: {len(request.text)} characters")
        print(f"📝 Query text preview: '{request.text[:200]}...'")
        
        # DETAILED PROJECT ANALYSIS
        if projects and len(projects) > 0:
            print(f"\n📁 DETAILED PROJECT ANALYSIS:")
            for i, proj in enumerate(projects[:3]):  # Show first 3 projects
                print(f"  Project {i+1}:")
                print(f"    Title: '{proj.get('title', 'N/A')}'")
                print(f"    Description length: {len(str(proj.get('description', '')))}")
                print(f"    Tags: {proj.get('tags', [])}")
                print(f"    Has document_url: {bool(proj.get('document_url'))}")
                if proj.get('document_url'):
                    print(f"    Document URL: {proj.get('document_url')[:100]}...")
        
        if not projects:
            print("No projects provided, falling back to sample data")
            projects = load_sample_data()
            if not projects:
                raise HTTPException(status_code=400, detail="No projects provided and no sample data available")
        
        # Debug: Log first project structure
        if projects and len(projects) > 0:
            first_project = projects[0]
            print(f"🎯 First project structure: {list(first_project.keys())}")
            print(f"🎯 First project title: '{first_project.get('title', 'N/A')}'")
            print(f"🎯 First project description preview: '{str(first_project.get('description', 'N/A'))[:100]}...'")
        
        # Validate input text
        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Text content too short for meaningful comparison")
        
        try:
            # Get similarity report using appropriate model
            if USING_BERT:
                try:
                    report = get_similarity_report(request.text, projects)
                except Exception as bert_error:
                    print(f"BERT model error: {bert_error}")
                    print("Falling back to simple similarity model")
                    report = get_simple_similarity_report(request.text, projects)
            else:
                report = get_simple_similarity_report(request.text, projects)
                
            return report
        except Exception as model_error:
            print(f"All similarity models failed: {model_error}")
            # Ultimate fallback with empty results
            return SimilarityResponse(
                overall_similarity=report["overall_similarity"],
                matches=report["matches"],
                database_size=report["database_size"],
                methodology=report["methodology"],
                word_count=report.get("word_count", len(request.text.split()))
            )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in similarity check: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/check-metadata-similarity")
async def check_metadata_similarity(request: dict):
    """
    Simple metadata-only similarity check for student dashboard
    Compares only title and description, not full documents
    """
    try:
        from simple_metadata_similarity import get_metadata_similarity_report
        
        title = request.get('title', '')
        description = request.get('description', '')
        projects = request.get('projects', [])
        
        print(f"\n🎓 STUDENT DASHBOARD METADATA SIMILARITY CHECK:")
        print(f"📝 Title: '{title}'")
        print(f"📝 Description length: {len(description)} characters")
        print(f"📚 Repository projects: {len(projects)}")
        
        if not title and not description:
            raise HTTPException(status_code=400, detail="Title or description required")
        
        if not projects:
            raise HTTPException(status_code=400, detail="No projects provided for comparison")
        
        # Get metadata similarity report
        report = get_metadata_similarity_report(title, description, projects)
        
        print(f"✅ Metadata similarity check completed:")
        print(f"   Overall similarity: {report['overall_similarity']}%")
        print(f"   Total matches: {report['total_matches']}")
        print(f"   Significant matches (>20%): {report['significant_matches']}")
        
        return {
            "overall_similarity": report["overall_similarity"],
            "matches": report["matches"],
            "database_size": report["database_size"],
            "methodology": report["methodology"],
            "total_matches": report["total_matches"],
            "significant_matches": report["significant_matches"],
            "query_length": report["query_length"],
            "comparison_type": report["comparison_type"]
        }
        
    except Exception as e:
        print(f"Error in metadata similarity check: {e}")
        raise HTTPException(status_code=500, detail=f"Metadata similarity error: {str(e)}")

@app.post("/extract-pdf-text")
async def extract_pdf_text(file: UploadFile = File(...)):
    """
    Extract text content from an uploaded PDF file
    """
    try:
        print(f"\n📄 PDF TEXT EXTRACTION REQUEST:")
        print(f"📎 File: {file.filename}")
        print(f"📊 Content Type: {file.content_type}")
        
        # Validate file type
        if not (file.content_type == 'application/pdf' or file.filename.lower().endswith('.pdf')):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Read file content
        content = await file.read()
        print(f"📁 File size: {len(content)} bytes")
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file received")
        
        # Check if it's actually a PDF
        if not content.startswith(b'%PDF'):
            raise HTTPException(status_code=400, detail="File does not appear to be a valid PDF")
        
        # Extract text using the same function as similarity model
        try:
            from similarity_model import extract_pdf_text as extract_pdf_content
            print(f"🔄 Starting PDF text extraction...")
            extracted_text = extract_pdf_content(content)
            print(f"🔄 PDF extraction completed")
        except ImportError as ie:
            print(f"❌ Import error: {ie}")
            raise HTTPException(status_code=500, detail="PDF extraction module not available")
        except Exception as ee:
            print(f"❌ PDF extraction error: {ee}")
            raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(ee)}")
        
        if not extracted_text or len(extracted_text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Could not extract meaningful text from PDF")
        
        print(f"✅ Successfully extracted {len(extracted_text)} characters")
        print(f"📝 Text preview: '{extracted_text[:200]}...'")
        
        return {
            "text": extracted_text,
            "length": len(extracted_text),
            "filename": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected PDF extraction error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "BERT" if USING_BERT else "TF-IDF"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
