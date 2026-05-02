import os

def create_minimal_pdf(filename, text):
    content = f"""%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length {len(text) + 44} >>
stream
BT /F1 24 Tf 100 700 Td ({text}) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000056 00000 n 
0000000111 00000 n 
0000000212 00000 n 
0000000289 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
{382 + len(text)}
%%EOF
"""
    with open(filename, "wb") as f:
        f.write(content.encode("ascii", errors="replace"))

if __name__ == "__main__":
    os.makedirs("test_files", exist_ok=True)
    create_minimal_pdf("test_files/resume1.pdf", "John Doe - Software Engineer - Python, FastAPI, React")
    create_minimal_pdf("test_files/resume2.pdf", "Jane Smith - Project Manager - Agile, Scrum, Kanban")
    create_minimal_pdf("test_files/resume3.pdf", "Bob Johnson - DevOps Engineer - AWS, Docker, Kubernetes")
    
    # Scanned PDF - just text for now, but I'll label it
    create_minimal_pdf("test_files/scanned.pdf", "SCANNED CONTENT - This should ideally be an image but we use text for testing extraction fallback")
    
    # Broken PDF
    with open("test_files/broken.pdf", "wb") as f:
        f.write(b"%PDF-1.1\nNOT A REAL PDF CONTENT")
    
    print("Test PDFs created in test_files/")
