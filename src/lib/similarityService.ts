import { RepositoryProject } from './projectRepository';

export interface SimilarityMatch {
  id: string;
  title: string;
  author: string;
  year: number;
  similarity_score: number;
  document_url?: string;
}

export interface SimilarityReport {
  overall_similarity: number;
  matches: SimilarityMatch[];
  word_count: number;
  database_size: number;
}

// Formatted project structure for similarity API
export interface FormattedProject {
  id: string;
  title: string;
  author: string;
  year: number;
  description: string;
  tags: string[];
  document_url: string | null;
}

/**
 * Check document similarity against the project repository
 * @param text The document text to check
 * @param projects The projects to compare against (can be RepositoryProject[] or FormattedProject[])
 * @returns Similarity report with matches and scores
 */
export async function checkDocumentSimilarity(
  text: string,
  projects: RepositoryProject[] | FormattedProject[]
): Promise<SimilarityReport> {
  try {
    const response = await fetch('http://localhost:8000/check-similarity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        projects,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to check similarity');
    }

    const data = await response.json();
    return data as SimilarityReport;
  } catch (error) {
    console.error('Error checking document similarity:', error);
    // Return a default report if the API fails
    return {
      overall_similarity: 0,
      matches: [],
      word_count: text.split(/\s+/).length,
      database_size: projects.length,
    };
  }
}

/**
 * Extract text content from a file
 * @param file The file to extract text from
 * @returns The extracted text content
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    console.log(`📄 Extracting text from file: ${file.name} (${file.type})`);
    
    // Handle different file types
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      console.log('🔍 PDF detected - using backend extraction service');
      return await extractPDFText(file);
    } else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
      console.log('📝 Text file detected - using direct text extraction');
      return await file.text();
    } else {
      console.log('⚠️ Unsupported file type - attempting text extraction');
      // Try text extraction as fallback
      const text = await file.text();
      
      // Check if it looks like binary data (contains PDF signature or other binary markers)
      if (text.startsWith('%PDF') || text.includes('\x00') || text.includes('����')) {
        console.log('❌ Binary data detected - using backend extraction service');
        return await extractPDFText(file);
      }
      
      return text;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error('Failed to extract text from file');
  }
}

/**
 * Extract text from PDF using backend service
 * @param file The PDF file to extract text from
 * @returns The extracted text content
 */
async function extractPDFText(file: File): Promise<string> {
  try {
    console.log('📤 Sending PDF to backend for text extraction...');
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://localhost:8000/extract-pdf-text', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`PDF extraction failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Extracted ${result.text.length} characters from PDF`);
    
    return result.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF file');
  }
}
