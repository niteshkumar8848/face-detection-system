import React from "react";

const Privacy = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-subtitle">Your privacy is important to us</p>
      </div>

      <div className="privacy-content">
        <div className="card">
          <div className="privacy-section">
            <h2>🔒 Data Protection Commitment</h2>
            <p>
              We are committed to protecting your privacy. This application is designed with 
              privacy-first principles, ensuring that your facial data never leaves your device 
              unless you explicitly choose to contribute to analytics.
            </p>
          </div>

          <div className="privacy-section">
            <h2>📷 What We Collect</h2>
            <ul className="privacy-list">
              <li>
                <span className="privacy-icon">✓</span>
                <span><strong>Age Estimate</strong> - Numerical age approximation</span>
              </li>
              <li>
                <span className="privacy-icon">✓</span>
                <span><strong>Gender</strong> - Binary gender classification</span>
              </li>
              <li>
                <span className="privacy-icon">✓</span>
                <span><strong>Emotion</strong> - Detected facial expression</span>
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h2>🚫 What We DON'T Collect</h2>
            <ul className="privacy-list">
              <li>
                <span className="privacy-icon">✗</span>
                <span><strong>Facial Images</strong> - No photos or videos are stored</span>
              </li>
              <li>
                <span className="privacy-icon">✗</span>
                <span><strong>Biometric Templates</strong> - Face embeddings are discarded</span>
              </li>
              <li>
                <span className="privacy-icon">✗</span>
                <span><strong>Personal Identifiers</strong> - No names or identification</span>
              </li>
              <li>
                <span className="privacy-icon">✗</span>
                <span><strong>Session Data</strong> - No tracking between visits</span>
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h2>⚙️ Your Control</h2>
            <p>
              You have full control over your data:
            </p>
            <ul className="privacy-list" style={{ marginTop: "1rem" }}>
              <li>
                <span className="privacy-icon">📋</span>
                <span><strong>Consent Required</strong> - Camera access is only enabled with your explicit permission</span>
              </li>
              <li>
                <span className="privacy-icon">🗑️</span>
                <span><strong>Data Deletion</strong> - Contact us to request deletion of your contributed data</span>
              </li>
              <li>
                <span className="privacy-icon">🔄</span>
                <span><strong>No Persistence</strong> - Data is only saved when you actively submit a scan</span>
              </li>
            </ul>
          </div>

          <div className="privacy-section">
            <h2>📜 Legal Compliance</h2>
            <p>
              This application complies with relevant privacy regulations including GDPR principles. 
              All data processing occurs locally on your device, and only aggregated, anonymized 
              statistics are stored on our servers.
            </p>
          </div>

          <div style={{ 
            marginTop: "2rem", 
            padding: "1.5rem", 
            background: "linear-gradient(135deg, #065f46 0%, #047857 100%)", 
            borderRadius: "12px",
            textAlign: "center"
          }}>
            <h3 style={{ marginBottom: "0.5rem" }}>✅ Summary</h3>
            <p>
              Your facial images are never stored. Only age, gender, and emotion metadata 
              are collected for analytics purposes, and only with your explicit consent.
            </p>
          </div>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Have questions about our privacy practices?
          </p>
          <button className="btn btn-primary">
            📧 Contact Us
          </button>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

