#!/usr/bin/env python3
"""
Test script to check and create test drafts for similarity testing
"""

import os
import json
from supabase import create_client, Client
from datetime import datetime

# Load environment variables (you may need to set these)
SUPABASE_URL = "https://your-project.supabase.co"  # Replace with actual URL
SUPABASE_KEY = "your-anon-key"  # Replace with actual key

def test_drafts_database():
    """Test the drafts database and create test data if needed"""
    
    print("🔍 Testing Drafts Database Connection")
    print("=" * 50)
    
    # Note: This is a Python script, but the actual app uses JavaScript/TypeScript
    # We'll create a simple test to verify the concept
    
    # Test data for drafts
    test_drafts = [
        {
            "user_id": "test-user-1",
            "title": "AI-Driven Customer Experience Optimization",
            "description": "This project focuses on developing an AI-powered system to enhance customer experience through personalized recommendations and automated support. The system uses machine learning algorithms to analyze customer behavior and provide real-time assistance.",
            "tags": ["AI", "Customer Experience", "Machine Learning"],
            "status": "draft",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        },
        {
            "user_id": "test-user-1", 
            "title": "Blockchain-Based Supply Chain Management",
            "description": "A comprehensive blockchain solution for tracking and managing supply chain operations. This project implements smart contracts to ensure transparency and traceability in the supply chain process.",
            "tags": ["Blockchain", "Supply Chain", "Smart Contracts"],
            "status": "draft",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ]
    
    print("📝 Test Drafts to Create:")
    for i, draft in enumerate(test_drafts, 1):
        print(f"  {i}. {draft['title']}")
        print(f"     Description: {draft['description'][:100]}...")
        print(f"     Tags: {', '.join(draft['tags'])}")
        print()
    
    print("💡 To test the similarity check:")
    print("1. Ensure these drafts exist in your project_drafts table")
    print("2. Make sure the first draft matches content in your project repository")
    print("3. Test the similarity check on the student dashboard")
    print()
    print("🔧 Manual steps to create test drafts:")
    print("1. Go to student dashboard")
    print("2. Create a new draft with the title and description above")
    print("3. Save the draft")
    print("4. Test the similarity check")

if __name__ == "__main__":
    test_drafts_database()
