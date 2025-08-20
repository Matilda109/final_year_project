#!/usr/bin/env python3
"""
Debug script to check repository structure and document URLs
"""

import json
import requests
import os
from urllib.parse import urlparse

def check_sample_data():
    """Check if sample data exists and what it contains"""
    sample_path = "sample_data.json"
    if os.path.exists(sample_path):
        with open(sample_path, 'r') as f:
            data = json.load(f)
        print(f"📁 Found sample_data.json with {len(data)} projects")
        
        if data:
            first_project = data[0]
            print(f"🎯 First project structure: {list(first_project.keys())}")
            print(f"📄 Has document_url: {'document_url' in first_project}")
            if 'document_url' in first_project:
                print(f"🔗 Document URL: {first_project['document_url']}")
                
                # Test if URL is accessible
                if first_project['document_url']:
                    try:
                        response = requests.head(first_project['document_url'], timeout=10)
                        print(f"✅ URL accessible: {response.status_code}")
                        print(f"📋 Content-Type: {response.headers.get('content-type', 'Unknown')}")
                    except Exception as e:
                        print(f"❌ URL not accessible: {e}")
        return data
    else:
        print("❌ No sample_data.json found")
        return []

def test_document_extraction():
    """Test document extraction with a simple example"""
    print("\n🧪 Testing document extraction...")
    
    # Test with a simple text URL (if available)
    test_urls = [
        "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        "https://httpbin.org/robots.txt"
    ]
    
    for url in test_urls:
        try:
            print(f"\n🔗 Testing: {url}")
            response = requests.get(url, timeout=10)
            print(f"✅ Status: {response.status_code}")
            print(f"📋 Content-Type: {response.headers.get('content-type', 'Unknown')}")
            print(f"📏 Content Length: {len(response.content)} bytes")
        except Exception as e:
            print(f"❌ Failed: {e}")

if __name__ == "__main__":
    print("🔍 REPOSITORY DIAGNOSTIC TOOL")
    print("=" * 50)
    
    # Check sample data
    projects = check_sample_data()
    
    # Test document extraction
    test_document_extraction()
    
    print("\n" + "=" * 50)
    print("✅ Diagnostic complete!")
